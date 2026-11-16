'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Lock, ChevronRight, AlertCircle, Trophy } from 'lucide-react';
import { toast } from 'react-toastify';
import LogoMark from '@/components/LogoMark';

export default function LoginPage() {
  const [pin, setPin] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (await login(pin)) {
        toast.success('Xác thực Admin thành công!');
        router.push('/');
      } else {
        toast.error('Mã PIN không chính xác!');
        setPin('');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans antialiased flex items-center justify-center p-4">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[30%] left-[20%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[30%] right-[20%] w-[30%] h-[30%] bg-purple-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative w-full max-w-md animate-in fade-in zoom-in duration-500">
        <div className="glass-card p-8 text-center bg-white/5 border-white/10">
          <div className="mb-8 flex justify-center">
            <div className="w-16 h-16 flex items-center justify-center transform -rotate-6">
              <LogoMark size={64} priority className="drop-shadow-2xl" />
            </div>
          </div>

          <h1 className="text-3xl font-black mb-2 bg-gradient-to-r from-white via-indigo-200 to-slate-400 bg-clip-text text-transparent uppercase tracking-wider">
            ADMIN ACCESS
          </h1>
          <p className="text-slate-400 text-sm mb-10">Vui lòng nhập mã PIN để truy cập quyền quản trị</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                <Lock size={20} />
              </div>
              <input
                type="password"
                maxLength={4}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="• • • •"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-center text-2xl tracking-[1em] font-mono focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all outline-none"
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              <span>{isLoading ? 'Đang kiểm tra...' : 'Xác nhận'}</span>
              {!isLoading && <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <button 
            onClick={() => router.push('/member')}
            className="mt-8 text-slate-500 hover:text-slate-300 text-xs transition-colors underline-offset-4 hover:underline"
          >
            Quay lại trang thành viên
          </button>
        </div>

        <div className="mt-8 flex items-center gap-2 justify-center text-slate-600">
          <AlertCircle size={14} />
          <span className="text-[10px] uppercase tracking-widest font-semibold">Quyền truy cập hạn chế</span>
        </div>
      </div>
    </div>
  );
}
