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
    const { spreadsheetId, data, credentials, action } = body;

    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Missing spreadsheetId' }, { status: 400 });
    }

    if (!credentials || !credentials.client_email || !credentials.private_key) {
      return NextResponse.json({ error: 'Missing service account credentials' }, { status: 400 });
    }

    // Authenticate with Google Sheets API
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // --- PUSH ACTION (Default) ---
    if (!isAppData(data)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    // Check and create sheets if needed
    const ensureSheetsExist = async (sheetNames: string[]) => {
      try {
        const metadata = await sheets.spreadsheets.get({ spreadsheetId });
        const existingSheets = metadata.data.sheets?.map(s => s.properties?.title) || [];
        
        const requests = [];
        for (const name of sheetNames) {
          if (!existingSheets.includes(name)) {
            requests.push({
              addSheet: {
                properties: { title: name }
              }
            });
          }
        }

        if (requests.length > 0) {
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: { requests }
          });
        }
      } catch (error) {
        console.error('Error checking/creating sheets:', error);
      }
    };

    const formatCurrency = (value: number) => {
      if (value === 0) return 0;
      return Math.round(value / 1000).toLocaleString('vi-VN') + "K";
    };

    // 4. Group Payments by Player and Match (Visual)
    const groupedPaymentsMap = new Map<string, {
      playerId: string;
      matchId: string;
      amountOwed: number;
      amountPaid: number;
      paidAt: string;
      note: string;
    }>();

    data.payments.forEach(p => {
      const key = `${p.playerId}_${p.matchId}`;
      if (groupedPaymentsMap.has(key)) {
        const existing = groupedPaymentsMap.get(key)!;
        existing.amountOwed += p.amountOwed;
        existing.amountPaid += p.amountPaid;
        if (p.note) existing.note = p.note;
        if (p.paidAt) existing.paidAt = p.paidAt;
      } else {
        groupedPaymentsMap.set(key, { ...p, note: p.note || '0', paidAt: p.paidAt || '0' });
      }
    });

    const paymentsHeaderVisual = ['STT', 'Tên', 'Cần trả', 'Đã trả', 'Còn nợ', 'Trạng thái'];
    const sortedGroupedPayments = Array.from(groupedPaymentsMap.values())
      .map(p => {
        const player = data.players.find(pl => pl.id === p.playerId);
        const match = data.matches.find(m => m.id === p.matchId);
        return {
          p,
          matchDate: match ? new Date(match.date).getTime() : 0,
          playerName: player?.name || ''
        };
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

    // Helper to clear and update a sheet
    const updateSheet = async (sheetName: string, rows: any[][]) => {
      try {
        await sheets.spreadsheets.values.clear({ spreadsheetId, range: sheetName });
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: rows },
        });
      } catch (e: any) {
        console.error(`Error updating ${sheetName}:`, e);
      }
    };

    await ensureSheetsExist(['Payments', 'Thống kê']);
    
    // Update visual sheets
    await updateSheet('Payments', [paymentsHeaderVisual, ...paymentsRowsVisual]);

    // 5. Statistics (Thống kê - Visual)
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
      let totalOwed = 0;
      let totalPaid = 0;

      sortedMatches.forEach(match => {
        const playerPayments = data.payments.filter(p => p.matchId === match.id && p.playerId === player.id);
        const slots = playerPayments.length;
        const owed = playerPayments.reduce((sum, p) => sum + p.amountOwed, 0);
        const paid = playerPayments.reduce((sum, p) => sum + p.amountPaid, 0);
        totalOwed += owed;
        totalPaid += paid;
        row.push(slots, formatCurrency(owed));
      });

      const remaining = totalOwed - totalPaid;
      row.push(formatCurrency(totalOwed), formatCurrency(totalPaid), formatCurrency(remaining));
      return row;
    });

    const allStatsRows = [statsHeader1, statsHeader2, ...statsRows];

    // Sync "Thống kê" Visual
    try {
      const metadata = await sheets.spreadsheets.get({ spreadsheetId });
      const statsSheet = metadata.data.sheets?.find(s => s.properties?.title === 'Thống kê');
      const sheetId = statsSheet?.properties?.sheetId;

      if (sheetId !== undefined) {
        const numMatches = sortedMatches.length;
        const totalCols = 2 + (numMatches * 2) + 3;
        const numRows = allStatsRows.length;
        const currentSheetSize = statsSheet?.properties?.gridProperties;
        const currentRows = currentSheetSize?.rowCount || 100;
        const currentCols = currentSheetSize?.columnCount || 50;

        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                updateSheetProperties: {
                  properties: { sheetId, gridProperties: { rowCount: Math.max(numRows + 5, 20), columnCount: totalCols } },
                  fields: 'gridProperties(rowCount,columnCount)'
                }
              },
              {
                unmergeCells: { range: { sheetId, startRowIndex: 0, endRowIndex: Math.max(currentRows, 100), startColumnIndex: 0, endColumnIndex: Math.max(currentCols, 50) } }
              }
            ]
          }
        });

        await sheets.spreadsheets.values.clear({ spreadsheetId, range: 'Thống kê' });
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `Thống kê!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: allStatsRows }
        });

        const formatRequests: any[] = [
          {
            repeatCell: {
              range: { sheetId, startRowIndex: 0, endRowIndex: numRows, startColumnIndex: 0, endColumnIndex: totalCols },
              cell: {
                userEnteredFormat: {
                  horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE',
                  borders: { top: { style: 'SOLID' }, bottom: { style: 'SOLID' }, left: { style: 'SOLID' }, right: { style: 'SOLID' } }
                }
              },
              fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment,borders)'
            }
          },
          {
            repeatCell: {
              range: { sheetId, startRowIndex: 0, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: totalCols },
              cell: { userEnteredFormat: { textFormat: { bold: true } } },
              fields: 'userEnteredFormat.textFormat.bold'
            }
          },
          {
            mergeCells: { range: { sheetId, startRowIndex: 0, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 1 }, mergeType: 'MERGE_ALL' }
          },
          ...sortedMatches.map((_, i) => ({
            mergeCells: { range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 2 + i * 2, endColumnIndex: 4 + i * 2 }, mergeType: 'MERGE_ALL' }
          })),
          ...[0, 1, 2].map(i => ({
            mergeCells: { range: { sheetId, startRowIndex: 0, endRowIndex: 2, startColumnIndex: 2 + numMatches * 2 + i, endColumnIndex: 3 + numMatches * 2 + i }, mergeType: 'MERGE_ALL' }
          }))
        ];

        await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: formatRequests } });
      }
    } catch (error) {
      console.error('Error during robust sync of Thống kê:', error);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
