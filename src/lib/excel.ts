'use client';

import * as XLSX from 'xlsx';
import { AppData, Player, Match, Payment } from '@/types';
import { loadData, saveData, generateId } from './storage';

export function exportToExcel(): void {
  const data = loadData();
  const workbook = XLSX.utils.book_new();

  // Players sheet
  const playersData = data.players.map(p => ({
    'ID': p.id,
    'Tên': p.name,
    'SĐT': p.phone || '',
    'Biệt danh': p.nickname || '',
    'Hoạt động': p.active ? 'Có' : 'Không',
    'Ngày tạo': p.createdAt,
  }));
  const playersSheet = XLSX.utils.json_to_sheet(playersData);
  XLSX.utils.book_append_sheet(workbook, playersSheet, 'Người chơi');

  // Matches sheet
  const matchesData = data.matches.map(m => {
    const playerNames = m.playerIds
      .map(id => data.players.find(p => p.id === id)?.name || id)
      .join(', ');
    return {
      'ID': m.id,
      'Ngày': m.date,
      'Giờ': m.time || '',
      'Địa điểm': m.location,
      'Tiền sân': m.fieldCost,
      'Tiền nước': m.drinkCost,
      'Chi phí khác': m.otherCost,
      'Tổng': m.totalCost,
      'Mỗi người': m.perPerson,
      'Người tham gia': playerNames,
      'Ghi chú': m.notes || '',
    };
  });
  const matchesSheet = XLSX.utils.json_to_sheet(matchesData);
  XLSX.utils.book_append_sheet(workbook, matchesSheet, 'Trận đấu');

  // Payments sheet
  const paymentsData = data.payments.map(p => {
    const player = data.players.find(pl => pl.id === p.playerId);
    const match = data.matches.find(m => m.id === p.matchId);
    return {
      'Người chơi': player?.name || p.playerId,
      'Trận (Ngày)': match?.date || p.matchId,
      'Địa điểm': match?.location || '',
      'Cần trả': p.amountOwed,
      'Đã trả': p.amountPaid,
      'Còn thiếu': p.amountOwed - p.amountPaid,
      'Trạng thái': p.amountPaid >= p.amountOwed ? 'Đã trả' : p.amountPaid > 0 ? 'Trả một phần' : 'Chưa trả',
      'Ngày trả': p.paidAt || '',
      'Ghi chú': p.note || '',
    };
  });
  const paymentsSheet = XLSX.utils.json_to_sheet(paymentsData);
  XLSX.utils.book_append_sheet(workbook, paymentsSheet, 'Thanh toán');

  // Download file
  const filename = `football-payment-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

export function importFromExcel(file: File): Promise<AppData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const workbook = XLSX.read(buffer, { type: 'array' });
        
        const data: AppData = {
          players: [],
          matches: [],
          payments: [],
        };

        // Import Players
        if (workbook.SheetNames.includes('Người chơi')) {
          const sheet = workbook.Sheets['Người chơi'];
          const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);
          
          data.players = rows.map(row => ({
            id: row['ID'] || generateId(),
            name: row['Tên'] || '',
            phone: row['SĐT'] || undefined,
            nickname: row['Biệt danh'] || undefined,
            active: row['Hoạt động'] !== 'Không',
            createdAt: row['Ngày tạo'] || new Date().toISOString(),
          }));
        }

        // Import Matches
        if (workbook.SheetNames.includes('Trận đấu')) {
          const sheet = workbook.Sheets['Trận đấu'];
          const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet);
          
          data.matches = rows.map(row => {
            // Try to match player names to IDs
            const playerNamesStr = String(row['Người tham gia'] || '');
            const playerNames = playerNamesStr.split(',').map(n => n.trim()).filter(Boolean);
            const playerIds = playerNames.map(name => {
              const player = data.players.find(p => p.name === name);
              return player?.id || name;
            });

            const fieldCost = Number(row['Tiền sân']) || 0;
            const drinkCost = Number(row['Tiền nước']) || 0;
            const otherCost = Number(row['Chi phí khác']) || 0;
            const totalCost = fieldCost + drinkCost + otherCost;
            const perPerson = playerIds.length > 0 ? Math.ceil(totalCost / playerIds.length) : 0;

            return {
              id: String(row['ID'] || generateId()),
              date: String(row['Ngày'] || ''),
              time: row['Giờ'] ? String(row['Giờ']) : undefined,
              location: String(row['Địa điểm'] || ''),
              fieldCost,
              drinkCost,
              otherCost,
              totalCost,
              perPerson,
              playerIds,
              notes: row['Ghi chú'] ? String(row['Ghi chú']) : undefined,
              createdAt: new Date().toISOString(),
            };
          });
        }

        // Import or generate Payments
        if (workbook.SheetNames.includes('Thanh toán')) {
          const sheet = workbook.Sheets['Thanh toán'];
          const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet);
          
          data.payments = rows.map(row => {
            const playerName = String(row['Người chơi'] || '');
            const matchDate = String(row['Trận (Ngày)'] || '');
            
            const player = data.players.find(p => p.name === playerName);
            const match = data.matches.find(m => m.date === matchDate);
            
            return {
              playerId: player?.id || playerName,
              matchId: match?.id || matchDate,
              amountOwed: Number(row['Cần trả']) || 0,
              amountPaid: Number(row['Đã trả']) || 0,
              paidAt: row['Ngày trả'] ? String(row['Ngày trả']) : undefined,
              note: row['Ghi chú'] ? String(row['Ghi chú']) : undefined,
            };
          });
        } else {
          // Generate payments from matches
          data.matches.forEach(match => {
            match.playerIds.forEach(playerId => {
              data.payments.push({
                matchId: match.id,
                playerId,
                amountOwed: match.perPerson,
                amountPaid: 0,
              });
            });
          });
        }

        // Save to localStorage
        saveData(data);
        resolve(data);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}
