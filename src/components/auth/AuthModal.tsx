import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import { Shield, UserCheck, KeyRound, Mail, User, Phone, X, AlertCircle, CheckCircle2, Lock } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    currentUser,
    login,
    loginWithGoogle,
    register,
    quickLoginAs,
    logout,
    users,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'switch'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('bendahara');
  const [phone, setPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email || !password) {
      setErrorMsg('Mohon isi email dan kata sandi.');
      return;
    }

    setIsLoading(true);
    const res = await login(email, password);
    setIsLoading(false);

    if (res.success) {
      setIsAuthModalOpen(false);
      setEmail('');
      setPassword('');
    } else {
      setErrorMsg(res.message || 'Login gagal.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!name || !email || !password) {
      setErrorMsg('Nama lengkap, email, dan kata sandi wajib diisi.');
      return;
    }

    setIsLoading(true);
    const res = await register(name, email, password, role);
    setIsLoading(false);

    if (res.success) {
      setIsAuthModalOpen(false);
      setName('');
      setEmail('');
      setPassword('');
    } else {
      setErrorMsg(res.message || 'Pendaftaran gagal.');
    }
  };

  const handleQuickSwitch = async (targetRole: UserRole) => {
    await quickLoginAs(targetRole);
    setIsAuthModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-neutral-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 bg-neutral-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Autentikasi & Akun Staf</h3>
              <p className="text-[11px] text-neutral-500">
                Akses role Admin atau Bendahara Sistem SPP
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAuthModalOpen(false)}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded hover:bg-neutral-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current User Status Banner */}
        {currentUser && (
          <div className="px-5 py-3 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between text-xs">
            <div>
              <span className="text-[11px] text-emerald-800 block">Sedang Masuk Sebagai:</span>
              <span className="font-bold text-emerald-950">{currentUser.name}</span>
              <span className="ml-1.5 font-semibold text-[10px] px-1.5 py-0.5 rounded bg-emerald-200/80 text-emerald-800 uppercase">
                {currentUser.role}
              </span>
            </div>
            <button
              onClick={logout}
              className="text-xs text-rose-600 hover:text-rose-800 font-medium hover:underline"
            >
              Keluar Akun
            </button>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 border-b border-neutral-200 text-xs text-center font-medium bg-neutral-50/50">
          <button
            type="button"
            onClick={() => {
              setActiveTab('switch');
              setErrorMsg(null);
            }}
            className={`py-2.5 border-b-2 transition-colors ${
              activeTab === 'switch'
                ? 'border-emerald-700 text-emerald-900 font-bold bg-white'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Quick Switch
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setErrorMsg(null);
            }}
            className={`py-2.5 border-b-2 transition-colors ${
              activeTab === 'login'
                ? 'border-emerald-700 text-emerald-900 font-bold bg-white'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Login Email
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setErrorMsg(null);
            }}
            className={`py-2.5 border-b-2 transition-colors ${
              activeTab === 'register'
                ? 'border-emerald-700 text-emerald-900 font-bold bg-white'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Daftar Staf
          </button>
        </div>

        {/* Error message banner */}
        {errorMsg && (
          <div className="mx-5 mt-4 p-2.5 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tab 1: Quick Switch for immediate evaluation */}
        {activeTab === 'switch' && (
          <div className="p-5 space-y-4 text-xs">
            <p className="text-neutral-500 text-[11px]">
              Pilih peran akun untuk menguji perbedaan hak akses Administrator dan Bendahara secara langsung:
            </p>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleQuickSwitch('admin')}
                className={`w-full p-3.5 rounded-lg border text-left transition-all flex items-start justify-between gap-3 ${
                  currentUser?.role === 'admin'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600'
                    : 'border-neutral-200 hover:border-neutral-400 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-neutral-900 text-sm">Administrator</span>
                    <span className="bg-neutral-900 text-white text-[10px] font-bold px-1.5 py-0.2 rounded">
                      FULL ACCESS
                    </span>
                  </div>
                  <span className="text-neutral-500 block text-[11px] mt-0.5">
                    Ust. Ahmad Fauzi, M.Pd. (admin@pesantren.sch.id)
                  </span>
                  <p className="text-[11px] text-neutral-600 mt-1.5">
                    ✓ Kelola seluruh data siswa, tagihan, kasir, laporan, serta <strong>konfigurasi sistem & pengguna</strong>.
                  </p>
                </div>
                {currentUser?.role === 'admin' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => handleQuickSwitch('bendahara')}
                className={`w-full p-3.5 rounded-lg border text-left transition-all flex items-start justify-between gap-3 ${
                  currentUser?.role === 'bendahara'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600'
                    : 'border-neutral-200 hover:border-neutral-400 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-neutral-900 text-sm">Bendahara / Kasir TU</span>
                    <span className="bg-emerald-700 text-white text-[10px] font-bold px-1.5 py-0.2 rounded">
                      OPERASIONAL
                    </span>
                  </div>
                  <span className="text-neutral-500 block text-[11px] mt-0.5">
                    Ust. Rahmat Hidayat, S.E. (bendahara@pesantren.sch.id)
                  </span>
                  <p className="text-[11px] text-neutral-600 mt-1.5">
                    ✓ Terbitkan tagihan, catat pembayaran, cetak kuitansi, dan lihat laporan.
                    <br />
                    ✕ Tidak dapat mengubah pengaturan penting atau hak akses staf.
                  </p>
                </div>
                {currentUser?.role === 'bendahara' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Manual Login */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin} className="p-5 space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Email Staf</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@pesantren.sch.id"
                  className="w-full pl-9 pr-3 py-1.5 border border-neutral-300 rounded-md focus:outline-hidden focus:border-neutral-900"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Kata Sandi</label>
              <div className="relative">
                <KeyRound className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-1.5 border border-neutral-300 rounded-md focus:outline-hidden focus:border-neutral-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-400 rounded-md transition-colors mt-2"
            >
              {isLoading ? 'Memproses...' : 'Masuk ke Sistem'}
            </button>

            <div className="relative flex py-1 items-center">
              <div className="grow border-t border-neutral-200"></div>
              <span className="shrink mx-2 text-[10px] text-neutral-400 uppercase font-medium">atau</span>
              <div className="grow border-t border-neutral-200"></div>
            </div>

            <button
              type="button"
              disabled={isLoading}
              onClick={async () => {
                setErrorMsg(null);
                setIsLoading(true);
                const res = await loginWithGoogle();
                setIsLoading(false);
                if (res.success) {
                  setIsAuthModalOpen(false);
                } else if (res.message) {
                  setErrorMsg(res.message);
                }
              }}
              className="w-full py-2 px-3 text-xs font-medium text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-300 rounded-md transition-colors flex items-center justify-center gap-2 shadow-2xs"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Masuk dengan Akun Google</span>
            </button>
          </form>
        )}

        {/* Tab 3: Register */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegister} className="p-5 space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Nama Lengkap</label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama staf..."
                  className="w-full pl-9 pr-3 py-1.5 border border-neutral-300 rounded-md focus:outline-hidden focus:border-neutral-900"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Email Staf</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staf@pesantren.sch.id"
                  className="w-full pl-9 pr-3 py-1.5 border border-neutral-300 rounded-md focus:outline-hidden focus:border-neutral-900"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Kata Sandi</label>
              <div className="relative">
                <KeyRound className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full pl-9 pr-3 py-1.5 border border-neutral-300 rounded-md focus:outline-hidden focus:border-neutral-900"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Pilih Peran Akun</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-1.5 border border-neutral-300 rounded-md bg-white text-neutral-800"
              >
                <option value="bendahara">Bendahara (Operasional Pembayaran & Laporan)</option>
                <option value="admin">Administrator (Hak Penuh Pengaturan & Pengguna)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:bg-neutral-400 rounded-md transition-colors mt-2"
            >
              {isLoading ? 'Mendaftarkan...' : 'Daftarkan Akun Staf'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
