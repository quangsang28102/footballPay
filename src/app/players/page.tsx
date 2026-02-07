'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import Sidebar from '@/components/Sidebar';
import Modal, { ConfirmDialog } from '@/components/Modal';
import { loadData, addPlayer, updatePlayer, deletePlayer } from '@/lib/storage';
import { AppData, Player } from '@/types';
import { Plus, Search, Edit2, Trash2, User, Phone, Calendar, X } from 'lucide-react';

export default function PlayersPage() {
  const [data, setData] = useState<AppData>({ players: [], matches: [], payments: [] });
  const [mounted, setMounted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    nickname: '',
    active: true,
  });

  const [sortConfig, setSortConfig] = useState('name-asc');

  useEffect(() => {
    setMounted(true);
    setData(loadData());
  }, []);

  const refreshData = () => setData(loadData());

  const filteredPlayers = useMemo(() => {
    let result = [...data.players];
    
    // Filter
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(s) || 
        p.nickname?.toLowerCase().includes(s) ||
        p.phone?.includes(s)
      );
    }

    // Default Sort: Active first, then Name A-Z
    result.sort((a, b) => {
      if (a.active !== b.active) {
        return a.active ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [data.players, search]);

  const openAddModal = () => {
    setSelectedPlayer(null);
    setFormData({ name: '', phone: '', nickname: '', active: true });
    setModalOpen(true);
  };

  const openEditModal = (player: Player) => {
    setSelectedPlayer(player);
    setFormData({
      name: player.name,
      phone: player.phone || '',
      nickname: player.nickname || '',
      active: player.active,
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPlayer) {
      updatePlayer(selectedPlayer.id, formData);
      toast.success('Cập nhật người chơi thành công!');
    } else {
      addPlayer(formData);
      toast.success('Thêm người chơi thành công!');
    }
    setModalOpen(false);
    refreshData();
  };

  const handleDelete = () => {
    if (deleteId) {
      deletePlayer(deleteId);
      toast.success('Xóa người chơi thành công!');
      refreshData();
    }
  };

  // Calculate player stats
  const getPlayerStats = (playerId: string) => {
    const matches = data.matches.filter(m => m.playerIds.includes(playerId)).length;
    const payments = data.payments.filter(p => p.playerId === playerId);
    const totalOwed = payments.reduce((sum, p) => sum + p.amountOwed, 0);
    const totalPaid = payments.reduce((sum, p) => sum + p.amountPaid, 0);
    return { matches, totalOwed, totalPaid, balance: totalPaid - totalOwed };
  };

  if (!mounted) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen">
      <Sidebar onDataImport={refreshData} />
      <main className="lg:ml-64 min-h-screen">
        <div className="p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Người chơi</h1>
              <p className="text-slate-400 mt-1">Quản lý danh sách người chơi</p>
            </div>
            <button onClick={openAddModal} className="btn btn-primary"><Plus size={18} /> Thêm người chơi</button>
          </div>

          {/* Search */}
          <div className="glass-card p-4 mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Tìm theo tên, biệt danh, SĐT..." 
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
          </div>

          {/* Players Grid */}
          {filteredPlayers.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <User className="mx-auto mb-4 text-slate-500" size={48} />
              <p className="text-slate-400">Chưa có người chơi nào</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredPlayers.map(player => {
                const stats = getPlayerStats(player.id);
                return (
                  <div key={player.id} className="glass-card p-5 hover:-translate-y-1 transition-all duration-300 hover:border-indigo-500/50">
                    {/* Header */}
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold shrink-0 mt-1">
                        {player.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold leading-snug line-clamp-2 min-h-[2.5rem] flex items-center" title={player.name}>
                          {player.name}
                        </h3>
                        <p className="text-sm text-slate-400 truncate h-5">
                          {player.nickname ? `"${player.nickname}"` : ''}
                        </p>
                      </div>
                      <span className={`badge ${player.active ? 'badge-success' : 'badge-danger'} h-fit mt-1`}>
                        {player.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="h-6 mb-3">
                      {player.phone ? (
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <Phone size={14} /> {player.phone}
                        </div>
                      ) : (
                        <div className="text-sm text-slate-600 italic flex items-center gap-2">
                           <Phone size={14} className="opacity-50" /> ---
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
                      <div className="text-center">
                        <p className="text-xl font-bold text-indigo-400">{stats.matches}</p>
                        <p className="text-xs text-slate-500">Trận đấu</p>
                      </div>
                      <div className="text-center">
                        <p className={`text-xl font-bold ${stats.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {new Intl.NumberFormat('vi-VN').format(Math.abs(stats.totalOwed - stats.totalPaid))}đ
                        </p>
                        <p className="text-xs text-slate-500">{stats.balance >= 0 ? 'Đã trả đủ' : 'Còn thiếu'}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => openEditModal(player)} className="flex-1 btn btn-secondary text-sm py-2"><Edit2 size={14} /> Sửa</button>
                      <button onClick={() => { setDeleteId(player.id); setConfirmOpen(true); }} className="p-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30"><Trash2 size={16} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedPlayer ? 'Sửa người chơi' : 'Thêm người chơi'} size="sm">
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Tên *</label>
              <input type="text" required placeholder="Nhập tên" value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Số điện thoại</label>
              <input type="tel" placeholder="Nhập SĐT" value={formData.phone} onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Biệt danh</label>
              <input type="text" placeholder="Nhập biệt danh" value={formData.nickname} onChange={e => setFormData(f => ({ ...f, nickname: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={formData.active} onChange={e => setFormData(f => ({ ...f, active: e.target.checked }))} className="w-5 h-5 rounded bg-white/10 border-white/20 text-indigo-500 focus:ring-indigo-500" />
                <span>Đang hoạt động</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 btn btn-secondary">Hủy</button>
            <button type="submit" className="flex-1 btn btn-primary">Lưu</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleDelete} title="Xóa người chơi" message="Bạn có chắc muốn xóa người chơi này? Các thông tin thanh toán liên quan cũng sẽ bị xóa." confirmText="Xóa" />
    </div>
  );
}
