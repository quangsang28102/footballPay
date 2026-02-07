'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import Sidebar from '@/components/Sidebar';
import Modal from '@/components/Modal';
import { loadData, updatePayment, getPaymentStatus } from '@/lib/storage';
import { formatDate } from '@/lib/utils';
import { AppData, Payment, Player, Match } from '@/types';
import { Search, Check, AlertCircle, Clock, DollarSign, MapPin, User, X } from 'lucide-react';
import CurrencyInput from '@/components/CurrencyInput';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

export default function PaymentsPage() {
  const [data, setData] = useState<AppData>({ players: [], matches: [], payments: [] });
  const [mounted, setMounted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null); // Use any for grouped payment
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [matchFilter, setMatchFilter] = useState<string>('');
  const [payAmount, setPayAmount] = useState(0);
  const [paymentNote, setPaymentNote] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 15;

  useEffect(() => {
    setMounted(true);
    setData(loadData());
  }, []);

  const refreshData = () => setData(loadData());

  // Group payments by match and player
  const groupedPayments = useMemo(() => {
    const map = new Map<string, any>();

    data.payments.forEach(p => {
      const match = data.matches.find(m => m.id === p.matchId);
      const player = data.players.find(pl => pl.id === p.playerId);

      if (!match || !player) return;

      const key = `${p.matchId}-${p.playerId}`;
      if (!map.has(key)) {
        map.set(key, {
          ...p, // copy properties
          quantity: 1,
          amountOwed: p.amountOwed,
          amountPaid: p.amountPaid,
          match,
          player,
        });
      } else {
        const existing = map.get(key);
        existing.quantity += 1;
        existing.amountOwed += p.amountOwed;
        existing.amountPaid += p.amountPaid;
      }
    });

    let result = Array.from(map.values());

    // Filter
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(p => 
        p.player.name.toLowerCase().includes(s) || 
        p.match.location.toLowerCase().includes(s)
      );
    }

    if (matchFilter) {
      result = result.filter(p => p.matchId === matchFilter);
    }

    if (statusFilter) {
      result = result.filter(p => {
        const status = p.amountPaid >= p.amountOwed ? 'paid' : p.amountPaid > 0 ? 'partial' : 'unpaid';
        return status === statusFilter;
      });
    }

    // Sort by date desc (using match date)
    result.sort((a, b) => new Date(b.match.date).getTime() - new Date(a.match.date).getTime());

    return result;
  }, [data.payments, data.matches, data.players, search, matchFilter, statusFilter]);

  const totalPages = Math.ceil(groupedPayments.length / perPage);
  const paginatedPayments = groupedPayments.slice((page - 1) * perPage, page * perPage);

  // Stats calculation based on grouped payments (or raw data, same result)
  const stats = useMemo(() => {
    const totalOwed = data.payments.reduce((sum, p) => sum + p.amountOwed, 0);
    const totalPaid = data.payments.reduce((sum, p) => sum + p.amountPaid, 0);
    return { totalOwed, totalPaid, totalRemaining: totalOwed - totalPaid };
  }, [data.payments]);


  // Debtors logic
  const debtors = useMemo(() => {
    const map = new Map<string, { amount: number, matchIds: Set<string> }>();
    data.payments.forEach(p => {
      const debt = p.amountOwed - p.amountPaid;
      if (debt > 0) {
        const current = map.get(p.playerId) || { amount: 0, matchIds: new Set() };
        current.matchIds.add(p.matchId);
        
        map.set(p.playerId, {
          amount: current.amount + debt,
          matchIds: current.matchIds
        });
      }
    });

    return Array.from(map.entries())
      .map(([id, val]) => ({
        player: data.players.find(p => p.id === id),
        amount: val.amount,
        count: val.matchIds.size
      }))
      .filter(d => d.player && d.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [data]);

  const openPaymentModal = (payment: any) => {
    setSelectedPayment(payment);
    setPayAmount(payment.amountPaid);
    setPaymentNote(payment.note || '');
    setModalOpen(true);
  };

  const markAsPaid = (payment: any) => {
    const success = updatePayment(payment.matchId, payment.playerId, payment.amountOwed);
    if (success) {
      toast.success('Đã đánh dấu là đã trả!');
      refreshData();
    }
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPayment) {
      const success = updatePayment(selectedPayment.matchId, selectedPayment.playerId, payAmount, paymentNote);
      if (success) {
        toast.success('Cập nhật thanh toán thành công!');
        setModalOpen(false);
        refreshData();
      }
    }
  };

  if (!mounted) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen">
      <Sidebar onDataImport={refreshData} />
      <main className="lg:ml-64 min-h-screen">
        <div className="p-6 lg:p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Thanh toán</h1>
            <p className="text-slate-400 mt-1">Theo dõi việc trả tiền của người chơi</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="glass-card p-5 text-center">
              <p className="text-2xl font-bold text-white">{formatCurrency(stats.totalOwed)}</p>
              <p className="text-sm text-slate-400">Tổng cần thu</p>
            </div>
            <div className="glass-card p-5 text-center border-emerald-500/30">
              <p className="text-2xl font-bold text-emerald-400">{formatCurrency(stats.totalPaid)}</p>
              <p className="text-sm text-slate-400">Đã thu</p>
            </div>
            <div className="glass-card p-5 text-center border-amber-500/30">
              <p className="text-2xl font-bold text-amber-400">{formatCurrency(stats.totalRemaining)}</p>
              <p className="text-sm text-slate-400">Còn thiếu</p>
            </div>
          </div>

          {/* Filters */}
          <div className="glass-card p-4 mb-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Tìm người chơi, địa điểm..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  className="input pl-12 pr-10 addPaddingLeft" 
                />
                {search && (
                  <button 
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-40">
                <option value="">Tất cả</option>
                <option value="paid">Đã trả</option>
                <option value="unpaid">Chưa trả</option>
                <option value="partial">Trả một phần</option>
              </select>
              <select value={matchFilter} onChange={e => setMatchFilter(e.target.value)} className="input w-[280px]">
                <option value="">Tất cả trận</option>
                {[...data.matches]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map(m => (
                    <option key={m.id} value={m.id}>{formatDate(m.date)} - {m.location}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Debtors List (Detailed Grid) */}
          {debtors.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2">
                <AlertCircle size={16} className="text-red-400" />
                Thành viên chưa thanh toán ({debtors.length})
              </h3>
              <div className="flex flex-wrap gap-4">
                {debtors.map(({ player, amount, count }, idx) => (
                  <button
                    key={player?.id || `debtor-${idx}`}
                    onClick={() => { setSearch(player?.name || ''); setStatusFilter('unpaid'); }}
                    className="glass-card p-3 flex items-center gap-3 hover:bg-white/10 transition-all text-left group relative overflow-hidden active:scale-95 pr-6"
                    style={{ minWidth: '180px' }}
                  >
                    <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-red-500/10 to-transparent rounded-bl-full -mr-6 -mt-6 pointer-events-none" />
                    
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white font-bold shadow-lg shrink-0 group-hover:scale-105 transition-transform text-sm">
                      {player?.name?.[0] || '?'}
                    </div>
                    
                    <div className="flex-1 min-w-0 z-10">
                      <p className="font-bold text-white text-sm truncate">{player?.name}</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-red-500">{count}</span>
                        <span className="text-xs text-slate-400">trận</span>
                      </div>
                      <p className="text-red-400 font-semibold text-xs">{formatCurrency(amount)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Table */}
          <div className="glass-card overflow-hidden flex flex-col h-[calc(100vh-380px)] min-h-[400px]">
            <div className="overflow-auto flex-1 custom-scrollbar">
              <table className="data-table w-full relative border-collapse">
                <thead className="sticky top-0 z-10 bg-[#0f172a] shadow-sm">
                  <tr>
                    <th className="bg-[#0f172a]">Người chơi</th>
                    <th className="bg-[#0f172a]">Trận đấu</th>
                    <th className="bg-[#0f172a]">Số lượng</th>
                    <th className="bg-[#0f172a]">Số tiền</th>
                    <th className="bg-[#0f172a]">Đã trả</th>
                    <th className="bg-[#0f172a]">Còn nợ</th>
                    <th className="bg-[#0f172a]">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPayments.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-10 text-slate-500">Không có dữ liệu thanh toán</td></tr>
                  ) : paginatedPayments.map((payment, idx) => {
                    const remaining = payment.amountOwed - payment.amountPaid;
                    return (
                    <tr key={`${payment.matchId}-${payment.playerId}-${idx}`}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                            {payment.player?.name?.[0] || '?'}
                          </div>
                          <span className="font-medium">{payment.player?.name || 'Unknown'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="text-sm">
                          <p>{formatDate(payment.match?.date || '')}</p>
                          <p className="text-slate-400 flex items-center gap-1"><MapPin size={12} /> {payment.match?.location}</p>
                        </div>
                      </td>
                      <td className="font-medium text-center text-slate-300">{payment.quantity}</td>
                      <td className="font-semibold text-slate-300">{formatCurrency(payment.amountOwed)}</td>
                      <td className={payment.amountPaid > 0 ? "text-emerald-400 font-medium" : "text-slate-500"}>{formatCurrency(payment.amountPaid)}</td>
                      <td className={`font-bold ${remaining > 0 ? "text-red-500 text-lg" : "text-slate-600"}`}>
                        {formatCurrency(remaining)}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button onClick={() => openPaymentModal(payment)} className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-colors" title="Cập nhật">
                            <DollarSign size={16} />
                          </button>
                          {remaining > 0 && (
                            <button onClick={() => markAsPaid(payment)} className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors" title="Đánh dấu đã trả">
                              <Check size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 p-4 border-t border-white/5">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-lg bg-white/5 disabled:opacity-50">Trước</button>
                <span className="text-sm text-slate-400">Trang {page}/{totalPages}</span>
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg bg-white/5 disabled:opacity-50">Sau</button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Payment Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Cập nhật thanh toán" size="sm">
        {selectedPayment && (
          <form onSubmit={handlePaymentSubmit}>
            <div className="bg-white/5 rounded-xl p-4 mb-6 space-y-2">
              <p className="flex justify-between"><span className="text-slate-400">Người chơi:</span><span className="font-medium">{selectedPayment.player?.name}</span></p>
              <p className="flex justify-between"><span className="text-slate-400">Trận:</span><span>{formatDate(selectedPayment.match?.date || '')}</span></p>
              <p className="flex justify-between border-t border-white/5 pt-2 mt-2">
                  <span className="text-slate-400">Số lượng slot:</span>
                  <span className="font-medium text-white">{selectedPayment.quantity}</span>
              </p>
              <p className="flex justify-between"><span className="text-slate-400">Cần trả:</span><span className="font-bold text-amber-400">{formatCurrency(selectedPayment.amountOwed)}</span></p>
            </div>
            <div className="mb-6">
              <label className="block text-sm text-slate-400 mb-2">Số tiền đã trả</label>
              <CurrencyInput className="input" min={0} value={payAmount} onChange={setPayAmount} />
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setPayAmount(selectedPayment.amountOwed)} className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">Trả đủ</button>
                <button type="button" onClick={() => setPayAmount(0)} className="text-xs px-2 py-1 rounded bg-slate-500/20 text-slate-400 hover:bg-slate-500/30">Reset</button>
              </div>
            </div>
            <div className="mb-6">
                <label className="block text-sm text-slate-400 mb-2">Ghi chú</label>
                <textarea 
                    value={paymentNote} 
                    onChange={e => setPaymentNote(e.target.value)} 
                    className="input w-full min-h-[80px]"
                    placeholder="Nhập ghi chú..."
                />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setModalOpen(false)} className="flex-1 btn btn-secondary">Hủy</button>
              <button type="submit" className="flex-1 btn btn-primary">Lưu</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
