'use client';

import { useState, useEffect, useMemo } from 'react';
import { loadData } from '@/lib/storage';
import { AppData, Player, Match, Payment } from '@/types';
import { formatDate } from '@/lib/utils';
import { Search, User, Calendar, DollarSign, ArrowLeft, Trophy, Clock, CheckCircle2, AlertCircle, LogIn, CreditCard, Copy, Check, Info, QrCode } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { BankInfo } from '@/types';

export default function MemberViewPage() {
  const { isAdmin } = useAuth();
  const [data, setData] = useState<AppData>({ players: [], matches: [], payments: [] });
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
    setData(loadData());
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ... rest of useMemo for players and playerStats ...

  const players = useMemo(() => {
    return [...data.players].sort((a, b) => a.name.localeCompare(b.name));
  }, [data.players]);

  const filteredPlayers = useMemo(() => {
    if (!search) return players;
    const s = search.toLowerCase();
    return players.filter(p => p.name.toLowerCase().includes(s) || p.nickname?.toLowerCase().includes(s));
  }, [players, search]);

  const playerStats = useMemo(() => {
    if (!selectedPlayerId) return null;
    
    const player = data.players.find(p => p.id === selectedPlayerId);
    if (!player) return null;

    const playerPayments = data.payments.filter(p => p.playerId === selectedPlayerId);
    const totalOwed = playerPayments.reduce((sum, p) => sum + p.amountOwed, 0);
    const totalPaid = playerPayments.reduce((sum, p) => sum + p.amountPaid, 0);
    const debt = totalOwed - totalPaid;

    const matchHistory = playerPayments.map(p => {
      const match = data.matches.find(m => m.id === p.matchId);
      return {
        ...p,
        match,
        status: p.amountPaid >= p.amountOwed ? 'paid' : p.amountPaid > 0 ? 'partial' : 'unpaid'
      };
    }).sort((a, b) => {
      const dateA = a.match?.date || '';
      const dateB = b.match?.date || '';
      return dateB.localeCompare(dateA);
    });

    return {
      player,
      totalOwed,
      totalPaid,
      debt,
      history: matchHistory,
      matchCount: matchHistory.length
    };
  }, [data, selectedPlayerId]);

  const formatCurrency = (amount: number) => {
    if (amount === 0) return '0';
    return amount.toLocaleString('vi-VN') + ' đ';
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans antialiased">
      {/* Subtle Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] bg-purple-500/10 blur-[120px] rounded-full" />
      </div>

      <div className={`relative mx-auto p-4 sm:p-6 lg:p-8 transition-all duration-500 ${selectedPlayerId ? 'max-w-7xl' : 'max-w-4xl'}`}>
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Trophy className="text-white" size={20} />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
               Tra cứu thành viên
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <Link href="/" className="btn btn-ghost text-sm py-2">
                <ArrowLeft size={16} /> Admin Panel
              </Link>
            ) : (
              <Link href="/login" className="btn btn-ghost text-sm py-2 text-slate-400 hover:text-white">
                <LogIn size={16} /> Đăng nhập
              </Link>
            )}
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 min-w-0">
            {!selectedPlayerId ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center mb-10">
                  <h2 className="text-3xl font-bold mb-3 uppercase tracking-tight">Chào mừng bạn!</h2>
                  <p className="text-slate-400">Chọn tên của bạn để xem thống kê và các khoản cần thanh toán.</p>
                </div>

                {/* Search */}
                <div className="glass-card p-2 max-w-md mx-auto mb-8 focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                      type="text" 
                      placeholder="Nhập tên của bạn..." 
                      value={search} 
                      onChange={e => setSearch(e.target.value)} 
                      className="w-full bg-transparent border-none py-3 pl-12 pr-4 focus:ring-0 text-lg"
                    />
                  </div>
                </div>

                {/* Player List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredPlayers.map(player => (
                    <button
                      key={player.id}
                      onClick={() => setSelectedPlayerId(player.id)}
                      className="glass-card p-4 hover:border-indigo-500/50 hover:bg-white/5 transition-all text-left flex items-center gap-4 group"
                    >
                      <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400 font-bold text-lg group-hover:bg-indigo-500 group-hover:text-white transition-all">
                        {player.name[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{player.name}</p>
                        {player.nickname && <p className="text-xs text-slate-500 truncate">"{player.nickname}"</p>}
                      </div>
                    </button>
                  ))}
                  {filteredPlayers.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-500">
                      Không tìm thấy thành viên nào
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Back Button */}
                <button 
                  onClick={() => setSelectedPlayerId(null)}
                  className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors mb-4"
                >
                  <ArrowLeft size={18} /> Chọn người khác
                </button>

                {/* Player Profile Info */}
                <div className="glass-card p-6 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[50px] rounded-full" />
                   <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-xl shadow-indigo-500/20">
                      {playerStats?.player.name[0]}
                   </div>
                   <div className="flex-1 text-center md:text-left">
                      <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                        {playerStats?.player.name}
                      </h2>
                      {playerStats?.player.nickname && (
                        <p className="text-indigo-400 text-lg mt-1 italic font-medium">"{playerStats.player.nickname}"</p>
                      )}
                      <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 border border-white/5 text-xs text-slate-400">
                          <Calendar size={14} className="text-indigo-400" />
                          <span>{playerStats?.matchCount} Trận đấu</span>
                        </div>
                      </div>
                   </div>

                   <div className={`relative overflow-hidden group min-w-[200px] transition-all duration-500`}>
                      {playerStats && playerStats.debt > 0 ? (
                        <div className="glass-card px-6 py-5 border-2 border-amber-500/30 bg-amber-500/5 flex flex-col items-center justify-center animate-in zoom-in-95 duration-500">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1 font-bold">Cần thanh toán</p>
                          <p className="text-3xl font-black text-amber-400 tabular-nums leading-none">
                            {formatCurrency(playerStats.debt)}
                          </p>
                        </div>
                      ) : (
                        <div className="glass-card px-8 py-5 border-2 border-emerald-500/40 bg-emerald-500/10 flex flex-col items-center justify-center animate-in zoom-in-95 duration-500">
                           <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none" />
                           <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-2 shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform duration-500">
                              <CheckCircle2 size={24} className="text-emerald-400" />
                           </div>
                           <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-500/80 font-black mb-0.5">Trạng thái</p>
                           <p className="text-2xl font-black text-emerald-400 uppercase tracking-tighter text-center">Đã sạch nợ</p>
                        </div>
                      )}
                   </div>
                </div>

                {/* Detailed Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="glass-card p-6">
                    <h3 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
                      <DollarSign size={16} /> Tóm tắt tài chính
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-white/5">
                        <span className="text-slate-400">Tổng chi phí</span>
                        <span className="font-semibold text-lg">{formatCurrency(playerStats?.totalOwed || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-white/5">
                        <span className="text-slate-400">Đã thanh toán</span>
                        <span className="font-semibold text-lg text-emerald-400">{formatCurrency(playerStats?.totalPaid || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center py-3">
                        <span className="text-slate-200 font-bold">Còn phải trả</span>
                        <span className="font-black text-2xl text-amber-500">{formatCurrency(playerStats?.debt || 0)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card p-6 bg-indigo-500/5">
                    <h3 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
                       👋 Lưu ý
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      Thông tin trên được cập nhật bởi Admin sau mỗi trận đấu. Nếu có sai sót về số tiền hoặc lịch sử thanh toán, vui lòng liên hệ Admin để được điều chỉnh kịp thời.
                    </p>
                    <div className="mt-6 flex items-center justify-center p-4 rounded-xl bg-white/5 border border-dashed border-white/10">
                       <p className="text-xs text-slate-500 text-center uppercase tracking-[0.2em]">Cảm ơn bạn đã tham gia!</p>
                    </div>
                  </div>
                </div>

                {/* Match History Table */}
                <div className="glass-card overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                     <h3 className="font-bold flex items-center gap-2 italic">
                       LỊCH SỬ TRẬN ĐẤU
                     </h3>
                     <span className="text-xs text-slate-500">Mô tả chi tiết từng trận</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-900/50">
                          <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase">Ngày</th>
                          <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase">Địa điểm</th>
                          <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase">Tiền sân</th>
                          <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase text-center">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {playerStats?.history.map((item, idx) => (
                          <tr key={idx} className="hover:bg-white/5 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                 <Clock size={14} className="text-slate-500" />
                                 <span className="font-medium">{item.match ? formatDate(item.match.date) : 'N/A'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-slate-400 text-sm">{item.match?.location}</span>
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-200">
                              {formatCurrency(item.amountOwed)}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex justify-center">
                                {item.status === 'paid' ? (
                                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold ring-1 ring-emerald-500/20">
                                    <CheckCircle2 size={12} /> Đã trả
                                  </div>
                                ) : item.status === 'partial' ? (
                                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold ring-1 ring-amber-500/20">
                                    <Clock size={12} /> Một phần
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-bold ring-1 ring-red-500/20">
                                    <AlertCircle size={12} /> Chưa trả
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Bank Info (Only show if debt exists) */}
          {selectedPlayerId && playerStats && playerStats.debt > 0 && (
            <aside className="w-full lg:w-80 shrink-0 animate-in fade-in slide-in-from-right-4 duration-500">
               <div className="glass-card p-6 sticky top-8 bg-white/5 border-white/10 overflow-hidden group">
                  <div className="absolute -top-4 -right-4 w-24 h-24 bg-emerald-500/10 blur-2xl rounded-full group-hover:bg-emerald-500/20 transition-all duration-700" />
                  <h3 className="text-sm font-bold text-slate-400 mb-6 flex items-center gap-2 uppercase tracking-[0.15em]">
                    <CreditCard className="text-emerald-400" size={18} /> Chuyển khoản
                  </h3>
                  {data.bankInfo && data.bankInfo.accountNumber ? (
                    <div className="space-y-6">
                      {/* MoMo QR Section (Moved to Top) */}
                      {playerStats && playerStats.debt > 0 && (
                        <div className="animate-in fade-in zoom-in duration-700">
                          <div className="bg-white p-3 rounded-2xl shadow-xl shadow-fuchsia-500/10 mb-3 relative group/qr overflow-hidden flex items-center justify-center">
                             <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/5 to-transparent pointer-events-none" />
                             
                             {/* QR Image */}
                             <img 
                               src={`https://quickchart.io/qr?text=${encodeURIComponent(
                                 "00020101021138630010A000000727013300069710250119PSP26016186000003150208QRIBFTTA5303704" + 
                                 `54${Math.round(playerStats.debt).toString().length.toString().padStart(2, '0')}${Math.round(playerStats.debt)}` + 
                                 "5802VN62190515MOMOW2W531158686304633A"
                               )}&size=300&margin=1`}
                               alt="MoMo QR Code"
                               className="w-full aspect-square rounded-xl relative z-10"
                             />

                             {/* Center Logo Overlay */}
                             <div className="absolute z-20 w-12 h-12 bg-white rounded-xl p-1.5 shadow-lg border border-slate-100 flex items-center justify-center">
                                <img 
                                  src="https://homepage.momocdn.net/fileuploads/svg/momo-file-240411162904.svg" 
                                  alt="MoMo Logo"
                                  className="w-full h-full object-contain"
                                />
                             </div>
                          </div>
                          
                          <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 mb-6">
                             <QrCode size={14} className="text-fuchsia-400" />
                             <span className="text-[10px] font-black uppercase tracking-widest text-fuchsia-300">Quét MoMo để trả nhanh</span>
                          </div>
                          
                          <div className="flex items-center gap-3 mb-6">
                            <div className="h-px flex-1 bg-white/5"></div>
                            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Hoặc chuyển khoản</span>
                            <div className="h-px flex-1 bg-white/5"></div>
                          </div>
                        </div>
                      )}

                      <div className="p-4 rounded-2xl bg-slate-900/50 border border-white/5">
                         <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Ngân hàng</p>
                         <p className="text-xl font-black text-white">{data.bankInfo.accountNumber ? data.bankInfo.bankName : 'N/A'}</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-900/50 border border-white/5">
                         <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Số tài khoản</p>
                         <div className="flex items-center justify-between">
                            <p className="text-2xl font-mono font-black text-emerald-400 tracking-wider">
                              {data.bankInfo.accountNumber}
                            </p>
                            <button 
                              onClick={() => handleCopy(data.bankInfo?.accountNumber || '')}
                              className="p-2 hover:bg-white/10 rounded-lg transition-all text-slate-400 hover:text-white"
                            >
                              {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
                            </button>
                         </div>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-900/50 border border-white/5">
                         <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Chủ tài khoản</p>
                         <p className="text-lg font-black text-slate-200 uppercase tracking-tight">
                           {data.bankInfo.accountHolder}
                         </p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-500 space-y-3">
                       <AlertCircle className="mx-auto text-slate-600" size={32} />
                       <p className="text-xs">Chưa có thông tin nhận tiền</p>
                    </div>
                  )}
               </div>
            </aside>
          )}
        </div>

        <footer className="mt-12 py-8 border-t border-white/5 text-center">
           <p className="text-slate-600 text-xs italic">
             &copy; {new Date().getFullYear()} Football Payment Management. All rights reserved. <br className="md:hidden" />
             <span className="text-indigo-400/50 ml-1">Dev by QS aka Tí</span>
           </p>
        </footer>
      </div>
    </div>
  );
}
