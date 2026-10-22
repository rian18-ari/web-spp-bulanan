import React from 'react';
import { useApp } from '../../context/AppContext';
import { Menu, Plus, Calendar, Search, Shield, User, Database, ChevronDown } from 'lucide-react';
import { getMonthName } from '../../utils/formatters';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const {
    activeTab,
    setActiveTab,
    settings,
    searchQuery,
    setSearchQuery,
    setPreselectedStudentForPayment,
    currentUser,
    setIsAuthModalOpen,
    isFirestoreConnected,
  } = useApp();

  const getBreadcrumbTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Dashboard Keuangan';
      case 'students':
        return 'Data Siswa & Santri';
      case 'bills':
        return 'Tagihan SPP Bulanan';
      case 'payment':
        return 'Loket Kasir Pembayaran';
      case 'history':
        return 'Riwayat Transaksi';
      case 'reports':
        return 'Laporan & Rekapitulasi';
      case 'settings':
        return 'Pengaturan Sistem';
      default:
        return 'Dashboard';
    }
  };

  const handleQuickPay = () => {
    setPreselectedStudentForPayment(null);
    setActiveTab('payment');
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-neutral-200 px-4 sm:px-6 flex items-center justify-between gap-4 no-print">
      {/* Left: Mobile hamburger + Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden text-neutral-600 hover:text-neutral-900 p-1.5 rounded-md hover:bg-neutral-100 cursor-pointer"
          aria-label="Buka Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs text-neutral-500 whitespace-nowrap min-w-0">
          <span className="hidden sm:inline">Sistem SPP</span>
          <span className="hidden sm:inline" aria-hidden="true">/</span>
          <h1 className="text-sm font-semibold text-neutral-900 truncate">
            {getBreadcrumbTitle()}
          </h1>
        </div>
      </div>

      {/* Middle: Live search bar */}
      <div className="hidden md:flex items-center flex-1 max-w-xs relative">
        <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari siswa, NIS, kuitansi..."
          className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-md placeholder:text-neutral-400 focus:outline-hidden focus:bg-white focus:border-neutral-400 transition-colors"
        />
      </div>

      {/* Right Controls: Database status, Period, Role profile & Quick Pay */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Firestore Sync Indicator */}
        <div
          title={isFirestoreConnected ? 'Database Cloud Firestore Terhubung & Sinkron' : 'Mode Offline / LocalStorage Aktif'}
          className="hidden sm:flex items-center gap-1.5 px-2 py-1 text-[11px] rounded-md bg-neutral-50 border border-neutral-200 text-neutral-600 font-mono"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <Database className="w-3 h-3 text-neutral-400" />
          <span className="hidden xl:inline">Firestore Aktif</span>
        </div>

        {/* Academic Period */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-neutral-600 bg-neutral-100/70 px-2.5 py-1.5 rounded-md font-mono">
          <Calendar className="w-3.5 h-3.5 text-neutral-500" />
          <span className="font-medium">{settings.academicYear}</span>
          <span className="text-neutral-400">·</span>
          <span>Bulan {getMonthName(settings.activeMonth)}</span>
        </div>

        {/* User Account / Role Trigger */}
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-md border border-neutral-200 hover:bg-neutral-50 transition-colors text-left"
          title="Klik untuk ganti akun atau periksa hak akses"
        >
          <div className="w-6 h-6 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[10px] font-bold">
            {currentUser?.name.charAt(0) || 'A'}
          </div>
          <div className="hidden sm:block text-left">
            <span className="text-xs font-semibold text-neutral-900 block leading-tight max-w-[120px] truncate">
              {currentUser?.name || 'Administrator'}
            </span>
            <span
              className={`text-[10px] font-bold uppercase leading-tight ${
                currentUser?.role === 'admin' ? 'text-neutral-900' : 'text-emerald-700'
              }`}
            >
              {currentUser?.role === 'admin' ? 'Admin' : 'Bendahara'}
            </span>
          </div>
          <ChevronDown className="w-3 h-3 text-neutral-400 hidden sm:block" />
        </button>

        <button
          onClick={handleQuickPay}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Bayar SPP</span>
        </button>
      </div>
    </header>
  );
};
