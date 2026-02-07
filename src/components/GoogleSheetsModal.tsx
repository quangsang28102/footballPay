'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import { GoogleConfig } from '@/lib/google-sheets';
import { Settings, Info, ExternalLink, Save, CheckCircle, Lock, ShieldCheck, Eye, EyeOff, CreditCard } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { updateBankInfo, loadData } from '@/lib/storage';
import { BankInfo } from '@/types';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: GoogleConfig) => void;
  initialConfig: GoogleConfig;
}

export default function GoogleSheetsModal({ isOpen, onClose, onSave, initialConfig }: GoogleSheetsModalProps) {
  const { getRawPin, updatePin } = useAuth();
  const [config, setConfig] = useState<GoogleConfig>(initialConfig);
  const [newPin, setNewPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [bankInfo, setBankInfo] = useState<BankInfo>({
    bankName: '',
    accountNumber: '',
    accountHolder: '',
  });

  useEffect(() => {
    setConfig(initialConfig);
    setNewPin(getRawPin());
    setShowPin(false);
    
    // Load Bank Info
    const data = loadData();
    if (data.bankInfo) {
      setBankInfo(data.bankInfo);
    }
  }, [initialConfig, getRawPin, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(config);
    if (newPin && newPin.length >= 4) {
      updatePin(newPin);
    }
    updateBankInfo(bankInfo);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cài đặt hệ thống" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Admin Security & Bank Section (Top) */}
        <div className="pb-6 border-b border-white/10 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PIN Settings */}
            <div>
              <h2 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2 uppercase tracking-wider">
                <ShieldCheck size={18} className="text-indigo-400" /> Bảo mật Admin
              </h2>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Mã PIN Admin (4 số)</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
                <input
                  type={showPin ? 'text' : 'password'}
                  maxLength={4}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={newPin}
                  onChange={e => setNewPin(e.target.value)}
                  className="input w-full pl-10 pr-10 font-mono tracking-widest addPaddingLeft"
                  placeholder="####"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  title={showPin ? "Ẩn mã PIN" : "Hiện mã PIN"}
                >
                  {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="mt-1 text-[10px] text-slate-500 italic">
                 Dùng để đăng nhập trang quản trị.
              </p>
            </div>

            {/* Bank Settings */}
            <div>
              <h2 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2 uppercase tracking-wider">
                <CreditCard size={18} className="text-emerald-400" /> Thông tin bank
              </h2>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Ngân hàng (VD: MB Bank)"
                  value={bankInfo.bankName}
                  onChange={e => setBankInfo({ ...bankInfo, bankName: e.target.value })}
                  className="input w-full text-sm h-10"
                />
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

        {/* Help Banner */}
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4">
          <div className="flex gap-3">
            <Info className="flex-shrink-0 text-indigo-400 mt-0.5" size={20} />
            <div className="space-y-2 text-sm text-slate-300">
              <p>
                <strong>Cấu hình Google Sheets:</strong>
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-400 text-xs">
                <li>Vào <a href="https://console.cloud.google.com/iam-admin/serviceaccounts" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">Google Cloud Console</a>.</li>
                <li>Copy toàn bộ nội dung file JSON Key vào ô bên dưới.</li>
                <li><strong>QUAN TRỌNG:</strong> Chia sẻ file Google Sheet (Quyền Editor) với email của Service Account.</li>
              </ul>
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
            <label className="block text-sm font-medium text-slate-400 mb-1.5">Spreadsheet ID *</label>
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
