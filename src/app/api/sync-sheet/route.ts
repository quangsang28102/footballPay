import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { AppData, Match, Player, Payment } from '@/types';

// Type guard
function isAppData(data: any): data is AppData {
  return (
    data && 
    Array.isArray(data.players) && 
    Array.isArray(data.matches) && 
    Array.isArray(data.payments)
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { spreadsheetId, data, credentials } = body;

    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Missing spreadsheetId' }, { status: 400 });
    }

    if (!credentials || !credentials.client_email || !credentials.private_key) {
      return NextResponse.json({ error: 'Missing service account credentials' }, { status: 400 });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    if (!isAppData(data)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    // --- 1. ENSURE SHEETS EXIST ---
    const sheetNames = ['_APP_DATA_', 'Payments', 'Thống kê'];
    const metadata = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = metadata.data.sheets?.map(s => s.properties?.title) || [];
    
    const requests: any[] = [];
    for (const name of sheetNames) {
      if (!existingSheets.includes(name)) {
        requests.push({ addSheet: { properties: { title: name } } });
      }
    }

    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
    }

    const formatCurrency = (value: number) => {
      if (value === 0) return "0 đ";
      return value.toLocaleString('vi-VN') + " đ";
    };

    // --- 2. UPDATE RAW DATABASE SHEET ---
    // Store the entire JSON stringified in cell A1 of _APP_DATA_
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: '_APP_DATA_!A1',
      valueInputOption: 'RAW',
      requestBody: { values: [[JSON.stringify(data)]] },
    });

    // --- 3. UPDATE VISUAL PAYMENTS SHEET ---
    const groupedPaymentsMap = new Map<string, any>();
    data.payments.forEach(p => {
      const key = `${p.playerId}_${p.matchId}`;
      if (groupedPaymentsMap.has(key)) {
        const existing = groupedPaymentsMap.get(key)!;
        existing.amountOwed += p.amountOwed;
        existing.amountPaid += p.amountPaid;
      } else {
        groupedPaymentsMap.set(key, { ...p });
      }
    });

    const paymentsHeaderVisual = ['STT', 'Tên', 'Cần trả', 'Đã trả', 'Còn nợ', 'Trạng thái'];
    const sortedGroupedPayments = Array.from(groupedPaymentsMap.values())
      .map(p => {
        const player = data.players.find(pl => pl.id === p.playerId);
        const match = data.matches.find(m => m.id === p.matchId);
        return { p, matchDate: match ? new Date(match.date).getTime() : 0, playerName: player?.name || '' };
      })
      .sort((a, b) => b.matchDate - a.matchDate || a.playerName.localeCompare(b.playerName));

    const paymentsRowsVisual = sortedGroupedPayments.map((item, index) => {
      const { p } = item;
      const player = data.players.find(pl => pl.id === p.playerId);
      const remaining = p.amountOwed - p.amountPaid;
      return [
        index + 1,
        player?.name || 'Unknown',
        formatCurrency(p.amountOwed),
        formatCurrency(p.amountPaid),
        formatCurrency(remaining),
        p.amountPaid >= p.amountOwed ? 'Đã trả' : p.amountPaid > 0 ? 'Trả một phần' : 'Chưa trả'
      ];
    });

    await sheets.spreadsheets.values.clear({ spreadsheetId, range: 'Payments' });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Payments!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [paymentsHeaderVisual, ...paymentsRowsVisual] },
    });

    // --- 4. UPDATE VISUAL STATISTICS SHEET ---
    const sortedMatches = [...data.matches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const sortedPlayers = [...data.players].sort((a, b) => a.name.localeCompare(b.name));

    const statsHeader1 = ['STT', 'Thời gian'];
    const statsHeader2 = ['STT', 'Tên'];
    
    sortedMatches.forEach(m => {
      const dateStr = new Date(m.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      statsHeader1.push(dateStr, '');
      statsHeader2.push('Số lượng', 'Giá/slot');
    });

    statsHeader1.push('Tổng', 'Đã trả', 'Nợ');
    statsHeader2.push('Tổng', 'Đã trả', 'Nợ');

    const statsRows = sortedPlayers.map((player, index) => {
      const row: any[] = [index + 1, player.name];
      let totalOwed = 0; let totalPaid = 0;
      sortedMatches.forEach(match => {
        const playerPayments = data.payments.filter(p => p.matchId === match.id && p.playerId === player.id);
        row.push(playerPayments.length, formatCurrency(playerPayments.reduce((s, p) => s + p.amountOwed, 0)));
        totalOwed += playerPayments.reduce((s, p) => s + p.amountOwed, 0);
        totalPaid += playerPayments.reduce((s, p) => s + p.amountPaid, 0);
      });
      row.push(formatCurrency(totalOwed), formatCurrency(totalPaid), formatCurrency(totalOwed - totalPaid));
      return row;
    });

    await sheets.spreadsheets.values.clear({ spreadsheetId, range: 'Thống kê' });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Thống kê!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [statsHeader1, statsHeader2, ...statsRows] }
    });

    // --- 5. ENHANCE FORMATTING (Merging) ---
    const statsSheetId = metadata.data.sheets?.find(s => s.properties?.title === 'Thống kê')?.properties?.sheetId;
    if (statsSheetId !== undefined) {
      const formattingRequests: any[] = [
        // FIRST: Unmerge everything to avoid overlaps
        { unmergeCells: { range: { sheetId: statsSheetId } } },
        // Merge STT (A1:A2)
        { mergeCells: { range: { sheetId: statsSheetId, startRowIndex: 0, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 1 }, mergeType: 'MERGE_ALL' } },
        // Merge Tên (B1:B2)
        { mergeCells: { range: { sheetId: statsSheetId, startRowIndex: 0, endRowIndex: 2, startColumnIndex: 1, endColumnIndex: 2 }, mergeType: 'MERGE_ALL' } },
      ];

      // Merge Date Headers
      sortedMatches.forEach((_, i) => {
        const colIndex = 2 + (i * 2);
        formattingRequests.push({
          mergeCells: { 
            range: { sheetId: statsSheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: colIndex, endColumnIndex: colIndex + 2 }, 
            mergeType: 'MERGE_ALL' 
          }
        });
      });

      // Merge Totals (End columns)
      const lastMatchCol = 2 + (sortedMatches.length * 2);
      for (let i = 0; i < 3; i++) {
        formattingRequests.push({
          mergeCells: { 
            range: { sheetId: statsSheetId, startRowIndex: 0, endRowIndex: 2, startColumnIndex: lastMatchCol + i, endColumnIndex: lastMatchCol + i + 1 }, 
            mergeType: 'MERGE_ALL' 
          }
        });
      }

      // Add Bold and Center Alignment to Row 1 & 2
      formattingRequests.push({
        repeatCell: {
          range: { sheetId: statsSheetId, startRowIndex: 0, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: lastMatchCol + 3 },
          cell: {
            userEnteredFormat: {
              horizontalAlignment: 'CENTER',
              verticalAlignment: 'MIDDLE',
              textFormat: { bold: true }
            }
          },
          fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment,textFormat)'
        }
      });

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: formattingRequests }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const spreadsheetId = searchParams.get('id');

    if (!spreadsheetId) {
      return NextResponse.json({ 
        error: 'Thiếu Spreadsheet ID',
        help: 'Vui lòng truy cập link đầy đủ có mã ?id=... để xem dữ liệu.'
      }, { status: 400 });
    }

    // Normalize credentials from environment variables
    const client_email = process.env.GOOGLE_CLIENT_EMAIL?.trim();
    let private_key = process.env.GOOGLE_PRIVATE_KEY?.trim();

    if (!client_email || !private_key) {
      const missing = [];
      if (!client_email) missing.push('GOOGLE_CLIENT_EMAIL');
      if (!private_key) missing.push('GOOGLE_PRIVATE_KEY');
      return NextResponse.json({ 
        error: `Cấu hình Server chưa hoàn tất. Thiếu: ${missing.join(', ')}`,
        help: 'Bạn hãy vào Vercel Settings -> Env Vars thêm đủ 2 biến này, sau đó ra tab Deployments nhấn REDEPLOY để nạp lại cấu hình nhé!'
      }, { status: 500 });
    }

    // Handle private key formatting (extremely robust)
    // 1. Remove wrapping quotes
    if (private_key.startsWith('"') && private_key.endsWith('"')) {
      private_key = private_key.substring(1, private_key.length - 1);
    }
    // 2. Fix literal \n characters (common when pasting from JSON)
    private_key = private_key.replace(/\\n/g, '\n');
    // 3. Ensure BEGIN/END tags exist (if they were stripped) - less common but safer
    if (!private_key.includes('-----BEGIN PRIVATE KEY-----')) {
      private_key = `-----BEGIN PRIVATE KEY-----\n${private_key}\n-----END PRIVATE KEY-----`;
    }

    const auth = new google.auth.GoogleAuth({
      credentials: { client_email, private_key },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    // Fetch from the raw data sheet tab
    // We use a broader range to find the sheet even if there are weird trailing/leading spaces in name
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '_APP_DATA_!A1',
    });

    const rawData = response.data.values?.[0]?.[0];
    if (!rawData) {
      return NextResponse.json({ error: 'Không tìm thấy dữ liệu trong tab _APP_DATA_!A1' }, { status: 404 });
    }

    try {
      return NextResponse.json(JSON.parse(rawData));
    } catch (e) {
      return NextResponse.json({ error: 'Dữ liệu trong Google Sheet không đúng định dạng JSON' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Fetch Error:', error);
    return NextResponse.json({ 
      error: 'Lỗi truy cập Google Sheets',
      details: error.message || 'Unknown error',
      help: 'Hãy đảm bảo bạn đã CHIA SẺ file Google Sheet cho email Service Account với quyền Người xem (Viewer).'
    }, { status: 500 });
  }
}
