'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import StatCard from '@/components/StatCard';
import { loadData, getPaymentStatus } from '@/lib/storage';
import { AppData, Match, Player, Payment } from '@/types';
import { 
  Calendar, 
  Users, 
  DollarSign, 
  CheckCircle,
  MapPin,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function Dashboard() {
  const [data, setData] = useState<AppData>({ players: [], matches: [], payments: [] });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setData(loadData());
  }, []);

  const refreshData = () => {
    setData(loadData());
  };

  // Calculate stats
  const totalMatches = data.matches.length;
  const totalPlayers = data.players.filter(p => p.active).length;
  const totalAmount = data.matches.reduce((sum, m) => sum + m.totalCost, 0);
  const paidAmount = data.payments.reduce((sum, p) => sum + p.amountPaid, 0);

  // Recent matches (last 5)
  const recentMatches = [...data.matches]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // Unpaid payments
  const unpaidPayments = data.payments
    .filter(p => getPaymentStatus(p) !== 'paid')
    .map(p => ({
      ...p,
      player: data.players.find(pl => pl.id === p.playerId),
      match: data.matches.find(m => m.id === p.matchId),
    }))
    .slice(0, 5);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Sidebar onDataImport={refreshData} />
      
      <main className="lg:ml-64 min-h-screen">
        <div className="p-6 lg:p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-slate-400 mt-1">Tổng quan về hoạt động đá banh</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
            <StatCard
              title="Tổng trận đấu"
              value={totalMatches}
              icon={Calendar}
              gradient="blue"
              trend="Tất cả"
            />
            <StatCard
              title="Người chơi"
              value={totalPlayers}
              icon={Users}
              gradient="green"
              trend="Hoạt động"
            />
            <StatCard
              title="Tổng chi phí"
              value={formatCurrency(totalAmount)}
              icon={DollarSign}
              gradient="orange"
            />
            <StatCard
              title="Đã thanh toán"
              value={formatCurrency(paidAmount)}
              icon={CheckCircle}
              gradient="purple"
              trend={totalAmount > 0 ? `${Math.round((paidAmount / totalAmount) * 100)}%` : '0%'}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Matches */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Trận đấu gần đây</h2>
                <Link
                  href="/matches"
                  className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Xem tất cả <ArrowRight size={16} />
                </Link>
              </div>

              {recentMatches.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Calendar className="mx-auto mb-3 opacity-50" size={40} />
                  <p>Chưa có trận đấu nào</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentMatches.map((match) => {
                    const dateStr = formatDate(match.date);
                    return (
                      <div
                        key={match.id}
                        className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
                      >
                        <div className="w-14 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                          <span className="text-xs font-bold leading-none">{dateStr}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{match.location}</h3>
                          <p className="text-sm text-slate-400 flex items-center gap-1">
                            <Users size={14} /> {match.playerIds.length} người
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-amber-400">{formatCurrency(match.totalCost)}</p>
                          <p className="text-xs text-slate-500">{formatCurrency(match.perPerson)}/người</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Unpaid Payments */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Chưa thanh toán</h2>
                <Link
                  href="/payments"
                  className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Xem tất cả <ArrowRight size={16} />
                </Link>
              </div>

              {unpaidPayments.length === 0 ? (
                <div className="text-center py-8 text-emerald-500">
                  <CheckCircle className="mx-auto mb-3" size={40} />
                  <p>Tất cả đã thanh toán!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {unpaidPayments.map((payment, idx) => (
                    <div
                      key={`${payment.matchId}-${payment.playerId}-${idx}`}
                      className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold">
                        {payment.player?.name?.[0] || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{payment.player?.name || 'Unknown'}</h3>
                        <p className="text-sm text-slate-400 flex items-center gap-1">
                          <MapPin size={14} /> {payment.match?.location || 'Unknown'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-red-400">
                          -{formatCurrency(payment.amountOwed - payment.amountPaid)}
                        </p>
                        <span className="badge badge-warning">Chưa trả</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
