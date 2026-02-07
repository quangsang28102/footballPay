// Types for Football Payment Management

export interface Player {
  id: string;
  name: string;
  phone?: string;
  nickname?: string;
  active: boolean;
  createdAt: string;
}

export interface Match {
  id: string;
  date: string;
  time?: string;
  location: string;
  fieldCost: number;
  drinkCost: number;
  otherCost: number;
  totalCost: number;
  playerIds: string[];
  perPerson: number;
  notes?: string;
  createdAt: string;
}

export interface Payment {
  matchId: string;
  playerId: string;
  amountOwed: number;
  amountPaid: number;
  paidAt?: string;
  note?: string;
}

export interface BankInfo {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  qrUrl?: string;
}

export interface AppData {
  players: Player[];
  matches: Match[];
  payments: Payment[];
  bankInfo?: BankInfo;
}

export type PaymentStatus = 'paid' | 'unpaid' | 'partial';

export interface DashboardStats {
  totalMatches: number;
  totalPlayers: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
}
