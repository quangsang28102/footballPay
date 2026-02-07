'use client';

import { AppData, Player, Match, Payment } from '@/types';

const STORAGE_KEY = 'football-payment-data';

const defaultData: AppData = {
  players: [],
  matches: [],
  payments: [],
};

export function loadData(): AppData {
  if (typeof window === 'undefined') return defaultData;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading data:', error);
  }
  return defaultData;
}

export function saveData(data: AppData): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Player operations
export function addPlayer(player: Omit<Player, 'id' | 'createdAt'>): Player {
  const data = loadData();
  const newPlayer: Player = {
    ...player,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  data.players.push(newPlayer);
  saveData(data);
  return newPlayer;
}

export function updatePlayer(id: string, updates: Partial<Player>): Player | null {
  const data = loadData();
  const index = data.players.findIndex(p => p.id === id);
  if (index === -1) return null;
  
  data.players[index] = { ...data.players[index], ...updates };
  saveData(data);
  return data.players[index];
}

export function deletePlayer(id: string): boolean {
  const data = loadData();
  const index = data.players.findIndex(p => p.id === id);
  if (index === -1) return false;
  
  data.players.splice(index, 1);
  // Also remove related payments
  data.payments = data.payments.filter(p => p.playerId !== id);
  saveData(data);
  return true;
}

// Match operations
export function addMatch(match: Omit<Match, 'id' | 'createdAt' | 'totalCost' | 'perPerson'>): Match {
  const data = loadData();
  const totalCost = match.fieldCost + match.drinkCost + match.otherCost;
  const perPerson = match.playerIds.length > 0 ? Math.ceil(totalCost / match.playerIds.length / 1000) * 1000 : 0;
  
  const newMatch: Match = {
    ...match,
    id: generateId(),
    totalCost,
    perPerson,
    createdAt: new Date().toISOString(),
  };
  
  data.matches.push(newMatch);
  
  // Create payment records for each player
  match.playerIds.forEach(playerId => {
    data.payments.push({
      matchId: newMatch.id,
      playerId,
      amountOwed: perPerson,
      amountPaid: 0,
    });
  });
  
  saveData(data);
  return newMatch;
}

export function updateMatch(id: string, updates: Partial<Match>): Match | null {
  const data = loadData();
  const index = data.matches.findIndex(m => m.id === id);
  if (index === -1) return null;
  
  const oldMatch = data.matches[index];
  const newMatch = { ...oldMatch, ...updates };
  
  // Recalculate costs if needed
  if (updates.fieldCost !== undefined || updates.drinkCost !== undefined || updates.otherCost !== undefined || updates.playerIds !== undefined) {
    newMatch.totalCost = newMatch.fieldCost + newMatch.drinkCost + newMatch.otherCost;
    newMatch.perPerson = newMatch.playerIds.length > 0 ? Math.ceil(newMatch.totalCost / newMatch.playerIds.length / 1000) * 1000 : 0;
    
    // Update payment amounts
    if (updates.playerIds) {
      // Remove old payments
      data.payments = data.payments.filter(p => p.matchId !== id);
      // Create new payments
      newMatch.playerIds.forEach(playerId => {
        data.payments.push({
          matchId: id,
          playerId,
          amountOwed: newMatch.perPerson,
          amountPaid: 0,
        });
      });
    } else {
      // Just update amounts
      data.payments.forEach(p => {
        if (p.matchId === id) {
          p.amountOwed = newMatch.perPerson;
        }
      });
    }
  }
  
  data.matches[index] = newMatch;
  saveData(data);
  return newMatch;
}

export function deleteMatch(id: string): boolean {
  const data = loadData();
  const index = data.matches.findIndex(m => m.id === id);
  if (index === -1) return false;
  
  data.matches.splice(index, 1);
  data.payments = data.payments.filter(p => p.matchId !== id);
  saveData(data);
  return true;
}

// Payment operations
export function updatePayment(matchId: string, playerId: string, totalAmountPaid: number, note?: string): boolean {
  const data = loadData();
  // Filter all payments indices for this player & match
  const indices = data.payments
    .map((p, i) => (p.matchId === matchId && p.playerId === playerId ? i : -1))
    .filter(i => i !== -1);

  if (indices.length === 0) return false;

  let remainingPaid = totalAmountPaid;

  indices.forEach(index => {
    const p = data.payments[index];
    // Allocate payment to this slot (max up to amountOwed)
    // But wait, user might want to overpay? Assuming validation happens mostly on UI.
    // Logic: fill up the first slot, then the next...
    // Actually, simply: min(remaining, owed) is standard. But if user pays FULL for all slots, remaining covers all.
    
    // However, if user pays LESS than full amount of 1st slot? 
    // Just put all into 1st slot.
    // If user pays MORE than 1st slot? Fill 1st, rest to 2nd.

    // Note: If we want to support "overpayment" stored in the last slot, we can do that,
    // but typically amountPaid should not exceed amountOwed unless specific business rule.
    // For now let's cap at amountOwed per slot, unless it's the last one?
    // Let's stick to standard allocation: fill slots one by one.

    const amountToPay = Math.min(remainingPaid, p.amountOwed);
    // If this is the last slot and there is still remaining money? (Overpayment case)
    // We could assign `remainingPaid` directly if we want to allow > owed.
    // But keeping it safe: let's assign amountToPay. 
    
    // Update: user requested simple confirmation. Usually Exact Amount.
    
    p.amountPaid = amountToPay;
    p.paidAt = amountToPay > 0 ? new Date().toISOString() : undefined;
    if (note !== undefined) p.note = note;
    
    remainingPaid -= amountToPay;
  });

  // If there is still remainingPaid (overpayment), we might want to add it to the last slot?
  // Let's assume frontend validates max amount.
  
  saveData(data);
  return true;
}

export function getPaymentStatus(payment: Payment): 'paid' | 'unpaid' | 'partial' {
  if (payment.amountPaid >= payment.amountOwed) return 'paid';
  if (payment.amountPaid > 0) return 'partial';
  return 'unpaid';
}

export function updateBankInfo(info: any): void {
  const data = loadData();
  data.bankInfo = info;
  saveData(data);
}
