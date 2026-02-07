'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import StatCard from '@/components/StatCard';
import { loadData, saveData, getPaymentStatus } from '@/lib/storage';
import { toast } from 'react-toastify';
import { AppData, Match, Player, Payment } from '@/types';
import { 
  Calendar, 
  Users, 
  DollarSign, 
  CheckCircle,
  MapPin,
  ArrowRight,
  AlertCircle,
  Clock
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
    const localData = loadData();
    setData(localData);

    // Auto-fetch if local data is empty but we have a default sheet ID
    const defaultId = process.env.NEXT_PUBLIC_DEFAULT_SPREADSHEET_ID;
    if (localData.players.length === 0 && defaultId) {
      const fetchData = async () => {
        try {
          const res = await fetch(`/api/sync-sheet?id=${defaultId}`);
          if (res.ok) {
            const cloudData = await res.json();
            if (cloudData.players && Array.isArray(cloudData.players)) {
              setData(cloudData);
              saveData(cloudData);
              toast.success('Đã tự động tải dữ liệu từ Google Sheet');
            }
          }
        } catch (error) {
          console.error("Auto-fetch error", error);
        }
      };
      
      fetchData();
    }
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
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Calendar className="text-indigo-400" size={20} />
                  Trận đấu gần đây
                </h2>
                <Link
                  href="/matches"
                  className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-white transition-colors"
                >
                  Xem tất cả <ArrowRight size={14} />
                </Link>
              </div>

              {recentMatches.length === 0 ? (
                <div className="text-center py-12 text-slate-500 bg-white/[0.02] rounded-2xl border border-white/5 border-dashed">
                  <Calendar className="mx-auto mb-3 opacity-20" size={48} />
                  <p className="text-sm">Chưa có trận đấu nào</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentMatches.map((match) => {
                    const date = new Date(match.date);
                    const day = String(date.getDate()).padStart(2, '0');
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    
                    return (
                      <div
                        key={match.id}
                        className="group flex items-center gap-4 p-3 pr-4 rounded-2xl bg-slate-900/40 border border-white/5 hover:bg-slate-800/60 hover:border-indigo-500/30 transition-all duration-300"
                      >
                        {/* Calendar Icon Style */}
                        <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-slate-800 border-2 border-slate-700 group-hover:border-indigo-500 group-hover:scale-105 transition-all shadow-lg text-center flex-shrink-0">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter leading-none mt-0.5">T.{month}</span>
                          <span className="text-2xl font-black text-indigo-400 leading-none">{day}</span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-200 truncate group-hover:text-indigo-300 transition-colors">
                            {match.location}
                          </h3>
                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                            <span className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-full">
                               <Users size={12} /> {match.playerIds.length}
                            </span>
                            <span className="flex items-center gap-1">
                               <Clock size={12} /> {match.time || '--:--'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-right flex flex-col items-end">
                          <p className="font-bold text-emerald-400 font-mono text-sm bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 mb-1">
                            {formatCurrency(match.totalCost)}
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">
                            {formatCurrency(match.perPerson)} / người
                          </p>
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
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <AlertCircle className="text-amber-500" size={20} />
                  Chưa thanh toán
                </h2>
                <Link
                  href="/payments"
                  className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-white transition-colors"
                >
                  Xem tất cả <ArrowRight size={14} />
                </Link>
              </div>

              {unpaidPayments.length === 0 ? (
                <div className="text-center py-12 text-emerald-500 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 border-dashed">
                  <CheckCircle className="mx-auto mb-3 opacity-50" size={48} />
                  <p className="font-bold">Tuyệt vời!</p>
                  <p className="text-sm opacity-80">Tất cả đã thanh toán</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {unpaidPayments.map((payment, idx) => (
                    <div
                      key={`${payment.matchId}-${payment.playerId}-${idx}`}
                      className="group flex items-center gap-4 p-3 pr-4 rounded-2xl bg-slate-900/40 border border-white/5 hover:bg-slate-800/60 hover:border-amber-500/30 transition-all duration-300"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10 flex items-center justify-center text-slate-300 font-bold shadow-lg group-hover:scale-105 transition-transform">
                        {payment.player?.name?.[0] || '?'}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-200 truncate group-hover:text-amber-400 transition-colors">
                            {payment.player?.name || 'Unknown'}
                        </h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1 truncate mt-0.5">
                          <MapPin size={10} /> {payment.match?.location || 'Unknown'}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-bold text-amber-500 font-mono text-sm">
                          -{formatCurrency(payment.amountOwed - payment.amountPaid)}
                        </p>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                            Nợ
                        </span>
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
