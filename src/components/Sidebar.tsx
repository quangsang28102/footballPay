'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { toast } from 'react-toastify';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  CreditCard, 
  FileSpreadsheet,
  Menu,
  X,
  Upload,
  Download,
  Settings,
  RefreshCw,
  ExternalLink,
  LogOut,
  LogIn
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { exportToExcel, importFromExcel } from '@/lib/excel';
import { loadGoogleScripts, syncToSheet, GoogleConfig } from '@/lib/google-sheets';
import { loadData, saveData } from '@/lib/storage';
import GoogleSheetsModal from './GoogleSheetsModal';

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/matches', icon: Calendar, label: 'Trận đấu' },
  { href: '/players', icon: Users, label: 'Người chơi' },
  { href: '/payments', icon: CreditCard, label: 'Thanh toán' },
  { href: '/member', icon: ExternalLink, label: 'Thành viên (Member)', external: true },
];

interface SidebarProps {
  onDataImport?: () => void;
}

export default function Sidebar({ onDataImport }: SidebarProps) {
  const pathname = usePathname();
  const { isAdmin, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  
  // Google Sheets state
  const [googleConfig, setGoogleConfig] = useState<GoogleConfig>({
    clientId: '',
    apiKey: '',
    spreadsheetId: ''
  });
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Load Google Scripts
    loadGoogleScripts();
    
    // Load config from localStorage
    const savedConfig = localStorage.getItem('google-sheets-config');
    if (savedConfig) {
      try {
        setGoogleConfig(JSON.parse(savedConfig));
      } catch (e) {
        console.error('Error parsing config', e);
      }
    }
  }, []);

  const handleExportFromGoogle = () => {
    if (!googleConfig.spreadsheetId) {
      toast.error('Vui lòng cấu hình Spreadsheet ID trong Settings!');
      setShowGoogleModal(true);
      return;
    }
    // Open the direct export URL for Google Sheets
    const exportUrl = `https://docs.google.com/spreadsheets/d/${googleConfig.spreadsheetId}/export?format=xlsx`;
    window.location.href = exportUrl;
    toast.info('Đang chuẩn bị tải file từ Google Sheets...');
  };

  const handleSaveGoogleConfig = (config: GoogleConfig) => {
    setGoogleConfig(config);
    localStorage.setItem('google-sheets-config', JSON.stringify(config));
    setShowGoogleModal(false);
  };

  const handleSync = async () => {
    // If we have API Key/Client ID for OAuth (Old method)
    if (googleConfig.clientId && googleConfig.apiKey) {
       // ... existing loadData logic? No, let's prioritize Service Account if JSON is present.
       // Actually user wants Service Account now.
    }
    
    // Check if JSON key exists (new method)
    if (!googleConfig.serviceAccountJson) {
      setShowGoogleModal(true);
      return;
    }

    setIsSyncing(true);
    try {
      const data = loadData();
      const response = await fetch('/api/sync-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId: googleConfig.spreadsheetId,
          data,
          credentials: JSON.parse(googleConfig.serviceAccountJson),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Lỗi không xác định');
      }

      toast.success('Đồng bộ thành công!');
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error('Lỗi đồng bộ: ' + (error.message || JSON.stringify(error)));
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      <GoogleSheetsModal 
        isOpen={showGoogleModal} 
        onClose={() => setShowGoogleModal(false)} 
        onSave={handleSaveGoogleConfig}
        initialConfig={googleConfig}
      />

      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-slate-800/80 backdrop-blur-sm text-white"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-slate-900/95 backdrop-blur-xl border-r border-white/10 z-40 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <img src="https://assets.manutd.com/AssetPicker/images/0/0/3/2/197240/Header-Logo1500994616801.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Football Pay
              </h1>
              <p className="text-xs text-slate-500">Quản lý chia tiền</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Action buttons */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-all disabled:opacity-50"
              title="Đồng bộ nhanh với Google Sheets"
            >
              <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
              <span className="text-sm font-medium">{isSyncing ? 'Đang...' : 'Sync Sheet'}</span>
            </button>
            <button
              onClick={() => setShowGoogleModal(true)}
              className="px-3 py-2.5 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              title="Cấu hình Google Sheets"
            >
              <Settings size={18} />
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleExportFromGoogle}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
            >
              <Download size={18} />
              <span className="text-sm font-medium">Export Excel</span>
            </button>
          </div>

          <div className="mt-auto space-y-2">
            {!isAdmin ? (
              <Link
                href="/login"
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              >
                <LogIn size={20} />
                <span className="font-medium">Đăng nhập Admin</span>
              </Link>
            ) : (
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all text-left"
              >
                <LogOut size={20} />
                <span className="font-medium">Đăng xuất Admin</span>
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
