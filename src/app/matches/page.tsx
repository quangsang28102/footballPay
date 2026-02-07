'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import Sidebar from '@/components/Sidebar';
import Modal, { ConfirmDialog } from '@/components/Modal';
import { loadData, addMatch, updateMatch, deleteMatch } from '@/lib/storage';
import { formatDate } from '@/lib/utils';
import { AppData, Match, Player } from '@/types';
import { Plus, Search, Edit2, Trash2, Eye, Users, MapPin, Calendar, Filter, X, Zap } from 'lucide-react';
import CurrencyInput from '@/components/CurrencyInput';
import MultiSelect from '@/components/MultiSelect';

// Tính ngày thứ 3 tiếp theo
function getNextTuesday(): string {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = CN, 1 = T2, 2 = T3, ...
  const daysUntilTuesday = (2 - dayOfWeek + 7) % 7 || 7; // Nếu hôm nay là T3, lấy T3 tuần sau
  const nextTuesday = new Date(today);
  nextTuesday.setDate(today.getDate() + daysUntilTuesday);
  return nextTuesday.toISOString().split('T')[0];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

export default function MatchesPage() {
  const [data, setData] = useState<AppData>({ players: [], matches: [], payments: [] });
  const [mounted, setMounted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;

  // Form state
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    location: '',
    fieldCost: 0,
    drinkCost: 0,
    otherCost: 0,
    playerIds: [] as string[],
    notes: '',
  });

  useEffect(() => {
    setMounted(true);
    setData(loadData());
  }, []);

  const refreshData = () => setData(loadData());

  // Filtered & paginated matches
  const filteredMatches = useMemo(() => {
    let result = [...data.matches];
    
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(m => m.location.toLowerCase().includes(s));
    }
    if (dateFrom) result = result.filter(m => m.date >= dateFrom);
    if (dateTo) result = result.filter(m => m.date <= dateTo);
    
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data.matches, search, dateFrom, dateTo]);

  const totalPages = Math.ceil(filteredMatches.length / perPage);
  const paginatedMatches = filteredMatches.slice((page - 1) * perPage, page * perPage);

  // Form handlers
  const openAddModal = () => {
    setSelectedMatch(null);
    setFormData({ date: '', time: '', location: '', fieldCost: 0, drinkCost: 0, otherCost: 0, playerIds: [], notes: '' });
    setModalOpen(true);
  };

  // Thêm nhanh với giá trị mặc định
  const openQuickAddModal = () => {
    setSelectedMatch(null);
    setFormData({
      date: getNextTuesday(),
      time: '19:00',
      location: 'Sân banh trường đại học Mỹ Thuật',
      fieldCost: 600000,
      drinkCost: 20000,
      otherCost: 0,
      playerIds: data.players.filter(p => p.active).map(p => p.id),
      notes: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (match: Match) => {
    setSelectedMatch(match);
    setFormData({
      date: match.date,
      time: match.time || '',
      location: match.location,
      fieldCost: match.fieldCost,
      drinkCost: match.drinkCost,
      otherCost: match.otherCost,
      playerIds: match.playerIds,
      notes: match.notes || '',
    });
    setModalOpen(true);
  };

  const openDetail = (match: Match) => {
    setSelectedMatch(match);
    setDetailOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMatch) {
      updateMatch(selectedMatch.id, formData);
      toast.success('Cập nhật trận đấu thành công!');
    } else {
      addMatch(formData);
      toast.success('Thêm trận đấu thành công!');
    }
    setModalOpen(false);
    refreshData();
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteMatch(deleteId);
      toast.success('Xóa trận đấu thành công!');
      refreshData();
    }
  };

  const togglePlayer = (playerId: string) => {
    setFormData(prev => ({
      ...prev,
      playerIds: prev.playerIds.includes(playerId)
        ? prev.playerIds.filter(id => id !== playerId)
        : [...prev.playerIds, playerId],
    }));
  };

  const totalCost = formData.fieldCost + formData.drinkCost + formData.otherCost;
  const perPerson = formData.playerIds.length > 0 ? Math.ceil(totalCost / formData.playerIds.length) : 0;

  if (!mounted) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen">
      <Sidebar onDataImport={refreshData} />
      <main className="lg:ml-64 min-h-screen">
        <div className="p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Trận đấu</h1>
              <p className="text-slate-400 mt-1">Quản lý các trận đá banh</p>
            </div>
            <div className="flex gap-2">
              <button onClick={openQuickAddModal} className="btn btn-primary">
                <Plus size={18} /> Thêm trận
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="glass-card p-4 mb-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Tìm kiếm trận đấu..." 
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
              <input 
                type="text" 
                placeholder="Từ ngày" 
                onFocus={(e) => e.target.type = 'date'} 
                onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }} 
                value={dateFrom} 
                onChange={e => setDateFrom(e.target.value)} 
                className="input w-40" 
              />
              <input 
                type="text" 
                placeholder="Đến ngày" 
                onFocus={(e) => e.target.type = 'date'} 
                onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }} 
                value={dateTo} 
                onChange={e => setDateTo(e.target.value)} 
                className="input w-40" 
              />
              {(search || dateFrom || dateTo) && (
                <button onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); }} className="btn btn-ghost"><X size={18} /> Xóa lọc</button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Địa điểm</th>
                    <th>Số người</th>
                    <th>Tổng</th>
                    <th>Giá/slot</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMatches.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-10 text-slate-500">Chưa có trận đấu nào</td></tr>
                  ) : paginatedMatches.map(match => (
                      <tr key={match.id}>
                        <td className="font-medium">{formatDate(match.date)} <span className="text-slate-400 text-xs ml-1">{match.time}</span></td>
                      <td><div className="flex items-center gap-2"><MapPin size={16} className="text-slate-400" />{match.location}</div></td>
                      <td><div className="flex items-center gap-2"><Users size={16} className="text-slate-400" />{match.playerIds.length}</div></td>
                      <td className="font-semibold text-amber-400">{formatCurrency(match.totalCost)}</td>
                      <td className="text-slate-300">{formatCurrency(match.perPerson)}</td>
                      <td>
                        <div className="flex gap-2">
                          <button onClick={() => openDetail(match)} className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"><Eye size={16} /></button>
                          <button onClick={() => openEditModal(match)} className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30"><Edit2 size={16} /></button>
                          <button onClick={() => { setDeleteId(match.id); setConfirmOpen(true); }} className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
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

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedMatch ? 'Sửa trận đấu' : 'Thêm trận đấu'} size="lg">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div><label className="block text-sm text-slate-400 mb-2">Ngày *</label><input type="date" required value={formData.date} onChange={e => setFormData(f => ({ ...f, date: e.target.value }))} className="input" /></div>
            <div><label className="block text-sm text-slate-400 mb-2">Giờ</label><input type="time" value={formData.time} onChange={e => setFormData(f => ({ ...f, time: e.target.value }))} className="input" /></div>
          </div>
          <div className="mb-4"><label className="block text-sm text-slate-400 mb-2">Địa điểm *</label><input type="text" required placeholder="VD: Sân bóng ABC" value={formData.location} onChange={e => setFormData(f => ({ ...f, location: e.target.value }))} className="input" /></div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div><label className="block text-sm text-slate-400 mb-2">Tiền sân *</label><CurrencyInput required min={0} step={10000} value={formData.fieldCost} onChange={(val: number) => setFormData(f => ({ ...f, fieldCost: val }))} className="input" /></div>
            <div><label className="block text-sm text-slate-400 mb-2">Tiền nước</label><CurrencyInput min={0} step={10000} value={formData.drinkCost} onChange={(val: number) => setFormData(f => ({ ...f, drinkCost: val }))} className="input" /></div>
            <div><label className="block text-sm text-slate-400 mb-2">Chi phí khác</label><CurrencyInput min={0} step={10000} value={formData.otherCost} onChange={(val: number) => setFormData(f => ({ ...f, otherCost: val }))} className="input" /></div>
          </div>
          <div className="mb-4">
            <label className="block text-sm text-slate-400 mb-2">Người tham gia (Đã chọn: {formData.playerIds.length} slot)</label>
            <MultiSelect
              options={data.players.filter(p => p.active).map(p => ({ label: p.name, value: p.id }))}
              value={formData.playerIds}
              onChange={(vals) => setFormData(f => ({ ...f, playerIds: vals }))}
              placeholder="Chọn người chơi..."
              enableQuantity={true}
            />
          </div>
          <div className="mb-4"><label className="block text-sm text-slate-400 mb-2">Ghi chú</label><textarea value={formData.notes} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))} className="input min-h-[80px]" /></div>
          
          <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 mb-6">
            <div className="flex justify-between mb-2"><span className="text-slate-400">Tổng chi phí:</span><strong className="text-amber-400">{formatCurrency(totalCost)}</strong></div>
            <div className="flex justify-between mb-2"><span className="text-slate-400">Số người:</span><strong>{formData.playerIds.length}</strong></div>
            <div className="flex justify-between pt-2 border-t border-white/10"><span className="text-slate-300">Mỗi người trả:</span><strong className="text-lg text-emerald-400">{formatCurrency(perPerson)}</strong></div>
          </div>
          
          <div className="flex gap-3">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 btn btn-secondary">Hủy</button>
            <button type="submit" className="flex-1 btn btn-primary">Lưu</button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title="Chi tiết trận đấu" size="md">
        {selectedMatch && (
          <div>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between py-2 border-b border-white/5"><span className="text-slate-400">Ngày:</span><span className="font-medium">{formatDate(selectedMatch.date)} {selectedMatch.time}</span></div>
              <div className="flex justify-between py-2 border-b border-white/5"><span className="text-slate-400">Địa điểm:</span><span className="font-medium">{selectedMatch.location}</span></div>
              <div className="flex justify-between py-2 border-b border-white/5"><span className="text-slate-400">Tiền sân:</span><span>{formatCurrency(selectedMatch.fieldCost)}</span></div>
              <div className="flex justify-between py-2 border-b border-white/5"><span className="text-slate-400">Tiền nước:</span><span>{formatCurrency(selectedMatch.drinkCost)}</span></div>
              <div className="flex justify-between py-2 border-b border-white/5"><span className="text-slate-400">Chi phí khác:</span><span>{formatCurrency(selectedMatch.otherCost)}</span></div>
              <div className="flex justify-between py-2 border-b border-white/5"><span className="text-slate-400">Tổng:</span><span className="font-bold text-amber-400">{formatCurrency(selectedMatch.totalCost)}</span></div>
              <div className="flex justify-between py-2"><span className="text-slate-400">Mỗi người:</span><span className="font-bold text-emerald-400">{formatCurrency(selectedMatch.perPerson)}</span></div>
            </div>
            <div>
              <h4 className="text-sm text-slate-400 mb-2">Người tham gia ({selectedMatch.playerIds.length})</h4>
              <div className="flex flex-wrap gap-2">
                {selectedMatch.playerIds.map(id => {
                  const player = data.players.find(p => p.id === id);
                  return <span key={id} className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-sm">{player?.name || id}</span>;
                })}
              </div>
            </div>
            {selectedMatch.notes && <div className="mt-4 p-3 bg-white/5 rounded-lg text-sm text-slate-400">{selectedMatch.notes}</div>}
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleDelete} title="Xóa trận đấu" message="Bạn có chắc muốn xóa trận đấu này? Các thông tin thanh toán liên quan cũng sẽ bị xóa." confirmText="Xóa" />
    </div>
  );
}
