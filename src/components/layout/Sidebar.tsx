import React from 'react';
import { useApp } from '../../context/AppContext';
import { ActiveTab } from '../../types';
import {
  LayoutDashboard,
  Users,
  Receipt,
  CreditCard,
  History,
  FileText,
  Settings,
  Building2,
  PlusCircle,
  X,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const {
    activeTab,
    setActiveTab,
    settings,
    setPreselectedStudentForPayment,
    currentUser,
    setIsAuthModalOpen,
  } = useApp();

  const menuItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'students', label: 'Data Siswa/Santri', icon: <Users className="w-4 h-4" /> },
    { id: 'bills', label: 'Tagihan SPP', icon: <Receipt className="w-4 h-4" /> },
    { id: 'payment', label: 'Pembayaran', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'history', label: 'Riwayat Pembayaran', icon: <History className="w-4 h-4" /> },
    { id: 'reports', label: 'Laporan', icon: <FileText className="w-4 h-4" /> },
    { id: 'settings', label: 'Pengaturan', icon: <Settings className="w-4 h-4" /> },
  ];

  const handleNavClick = (tabId: ActiveTab) => {
    setActiveTab(tabId);
    if (onClose) onClose();
  };

  const handleQuickPay = () => {
    setPreselectedStudentForPayment(null);
    setActiveTab('payment');
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-neutral-900/40 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-neutral-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } no-print`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-neutral-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="block text-sm font-bold text-neutral-900 tracking-tight truncate">
                {settings.schoolName}
              </span>
              <span className="block text-xs text-neutral-500 truncate">
                Sistem Pembayaran SPP
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-neutral-500 hover:text-neutral-900 p-1 rounded-md"
            aria-label="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Action Button */}
        <div className="p-4 border-b border-neutral-100">
          <button
            onClick={handleQuickPay}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 rounded-lg transition-colors shadow-xs whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Catat Pembayaran</span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">
            Menu Utama
          </div>
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md transition-colors text-left whitespace-nowrap ${
                  isActive
                    ? 'bg-neutral-900 text-white font-semibold'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              >
                <span className={isActive ? 'text-emerald-400' : 'text-neutral-500'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User / Staff Footer */}
        <div className="p-3.5 border-t border-neutral-200 bg-neutral-50/70">
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="w-full flex items-center gap-3 text-left p-1 rounded-md hover:bg-neutral-100/80 transition-colors"
            title="Klik untuk beralih akun atau login"
          >
            <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
              {currentUser?.name.charAt(0) || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-xs font-bold text-neutral-900 truncate">
                {currentUser?.name || settings.treasurerName}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-emerald-800">
                <span>{currentUser?.role === 'admin' ? 'Administrator' : 'Bendahara'}</span>
                <span className="text-neutral-400">·</span>
                <span className="text-neutral-500 font-normal hover:underline">Ganti</span>
              </span>
            </div>
          </button>
        </div>
      </aside>
    </>
  );
};
