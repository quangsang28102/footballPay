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
    
    // We try to get credentials from environment variables first for public access
    const client_email = process.env.GOOGLE_CLIENT_EMAIL;
    const private_key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    if (!client_email || !private_key) {
      return NextResponse.json({ error: 'Server not configured for cloud fetching' }, { status: 500 });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: { client_email, private_key },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '_APP_DATA_!A1',
    });

    const rawData = response.data.values?.[0]?.[0];
    if (!rawData) {
      return NextResponse.json({ error: 'No data found in sheet' }, { status: 404 });
    }

    return NextResponse.json(JSON.parse(rawData));
  } catch (error: any) {
    console.error('Fetch Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
