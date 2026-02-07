'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import { GoogleConfig } from '@/lib/google-sheets';
import { Settings, Info, ExternalLink, Save, CheckCircle, Lock, ShieldCheck, Eye, EyeOff, CreditCard, Copy, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { updateBankInfo, loadData } from '@/lib/storage';
import { BankInfo } from '@/types';
import { toast } from 'react-toastify';

const BANK_LIST = [
  { id: 'VCB', name: 'Vietcombank' },
  { id: 'ICB', name: 'VietinBank' },
  { id: 'BIDV', name: 'BIDV' },
  { id: 'MB', name: 'MB Bank' },
  { id: 'ACB', name: 'ACB' },
  { id: 'VPB', name: 'VPBank' },
  { id: 'TPB', name: 'TPBank' },
  { id: 'TCB', name: 'Techcombank' },
  { id: 'VIB', name: 'VIB' },
  { id: 'STB', name: 'Sacombank' },
  { id: 'LPB', name: 'LienVietPostBank' },
];

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: GoogleConfig) => void;
  initialConfig: GoogleConfig;
}

export default function GoogleSheetsModal({ isOpen, onClose, onSave, initialConfig }: GoogleSheetsModalProps) {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const { getRawPin } = useAuth(); // kept for interface compatibility if needed, but unused
  const [config, setConfig] = useState<GoogleConfig>(initialConfig);
  const [bankInfo, setBankInfo] = useState<BankInfo>({
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    momoNumber: '',
  });

  useEffect(() => {
    setConfig(initialConfig);
    // Load Bank Info
    const data = loadData();
    if (data.bankInfo) {
      setBankInfo(data.bankInfo);
    }
  }, [initialConfig, getRawPin, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(config);
    updateBankInfo(bankInfo);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cài đặt hệ thống" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Admin Security & Bank Section (Top) */}
        <div className="pb-6 border-b border-white/10 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PIN Settings - NOW MANAGED VIA ENV VAR */}
            <div>
              <h2 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2 uppercase tracking-wider">
                <ShieldCheck size={18} className="text-indigo-400" /> Bảo mật Admin
              </h2>
              <div className="bg-slate-900/50 border border-white/5 rounded-xl p-4">
                <p className="text-xs text-slate-400 leading-relaxed mb-2">
                  Để đảm bảo bảo mật đồng bộ trên mọi thiết bị, mật khẩu Admin hiện được quản lý qua <strong>Biến môi trường (Environment Variables)</strong>.
                </p>
                <div className="bg-black/30 rounded p-2 font-mono text-[10px] text-emerald-400 border border-white/5 break-all">
                  ADMIN_PASSWORD = ******
                </div>
                <p className="mt-2 text-[10px] text-slate-500 italic">
                  * Vui lòng truy cập Vercel &gt; Settings &gt; Environment Variables để thay đổi mật khẩu.
                </p>
              </div>
            </div>

            {/* Bank Settings */}
            <div>
              <h2 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2 uppercase tracking-wider">
                <CreditCard size={18} className="text-emerald-400" /> Thông tin bank
              </h2>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Ví MoMo</label>
                  <input
                    type="text"
                    placeholder="Số điện thoại MoMo"
                    value={bankInfo.momoNumber || ''}
                    onChange={e => setBankInfo({ ...bankInfo, momoNumber: e.target.value })}
                    className="input w-full text-sm h-10"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Ngân hàng</label>
                  <select
                    value={bankInfo.bankName}
                    onChange={e => setBankInfo({ ...bankInfo, bankName: e.target.value })}
                    className="input w-full text-sm h-10 bg-[#1e293b] border-white/10"
                  >
                    <option value="">-- Chọn ngân hàng --</option>
                    {BANK_LIST.map(bank => (
                      <option key={bank.id} value={bank.id}>{bank.name}</option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  placeholder="Số tài khoản"
                  value={bankInfo.accountNumber}
                  onChange={e => setBankInfo({ ...bankInfo, accountNumber: e.target.value })}
                  className="input w-full text-sm h-10"
                />
                <input
                  type="text"
                  placeholder="Tên chủ tài khoản"
                  value={bankInfo.accountHolder}
                  onChange={e => setBankInfo({ ...bankInfo, accountHolder: e.target.value })}
                  className="input w-full text-sm h-10 uppercase font-semibold"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-white/10">
          <h2 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2 uppercase tracking-wider">
            <FileSpreadsheet size={18} className="text-indigo-400" /> Cấu hình Google Sheets
          </h2>

          {config.spreadsheetId && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 mb-4">
              <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <ExternalLink size={12} /> Link tra cứu cho thành viên
              </p>
              <div className="flex gap-2">
                <input 
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/member?id=${config.spreadsheetId}`}
                  className="bg-slate-900/50 border border-white/5 rounded-lg text-[11px] px-3 py-2 flex-1 font-mono text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    const link = `${window.location.origin}/member?id=${config.spreadsheetId}`;
                    navigator.clipboard.writeText(link);
                    toast.success('Đã copy link chia sẻ!');
                  }}
                  className="p-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-all"
                  title="Copy Link"
                >
                  <Copy size={16} />
                </button>
              </div>
              <p className="text-[9px] text-slate-500 mt-2 leading-relaxed">
                * Gửi link này cho thành viên. Link này sẽ tự động lấy dữ liệu mới nhất.
              </p>
            </div>
          )}

          {/* Help Banner moved inside */}
          <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4">
            <div className="flex gap-3">
              <Info className="flex-shrink-0 text-indigo-400 mt-0.5" size={20} />
              <div className="space-y-2 text-sm text-slate-300">
                <p>
                  <strong>Hướng dẫn:</strong>
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-400 text-xs">
                  <li>Chia sẻ Google Sheet cho email Service Account.</li>
                  <li>Dán nội dung JSON Key và Spreadsheet ID xuống dưới.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">Service Account JSON Key *</label>
            <textarea
              required
              rows={4}
              placeholder='{ "type": "service_account", ... }'
              value={config.serviceAccountJson || ''}
              onChange={e => setConfig({ ...config, serviceAccountJson: e.target.value })}
              className="input w-full font-mono text-xs"
            />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-sm font-medium text-slate-400">Spreadsheet ID *</label>
              <a 
                href={config.spreadsheetId ? `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/edit` : 'https://docs.google.com/spreadsheets'} 
                target="_blank" 
                rel="noreferrer"
                className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
              >
                Mở Google Sheet <ExternalLink size={10} />
              </a>
            </div>
            <input
              type="text"
              required
              placeholder="VD: 1BxiMVs0XRA5nFMdKbBdB_..."
              value={config.spreadsheetId}
              onChange={e => setConfig({ ...config, spreadsheetId: e.target.value })}
              className="input w-full font-mono text-sm"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 btn btn-ghost"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="flex-1 btn btn-primary flex justify-center items-center gap-2"
          >
            <Save size={18} /> Lưu cấu hình
          </button>
        </div>
      </form>
    </Modal>
  );
}
