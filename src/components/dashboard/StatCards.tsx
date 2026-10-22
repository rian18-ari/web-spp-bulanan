import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatRupiah, getMonthName } from '../../utils/formatters';
import { Users, Receipt, CheckCircle, AlertTriangle } from 'lucide-react';

export const StatCards: React.FC = () => {
  const { students, bills, settings, setActiveTab } = useApp();

  const currentMonth = settings.activeMonth;
  const currentYear = settings.activeYear;

  // 1. Total siswa/santri aktif
  const activeStudents = students.filter((s) => s.status === 'active');
  const activeStudentsCount = activeStudents.length;

  // 2. Bills for current active month
  const currentMonthBills = bills.filter(
    (b) => b.month === currentMonth && b.year === currentYear
  );

  const totalCurrentMonthBilled = currentMonthBills.reduce((sum, b) => sum + b.amount, 0);

  // 3. Payments already received for current active month
  const totalReceivedCurrentMonth = currentMonthBills.reduce(
    (sum, b) => sum + (b.paidAmount || 0),
    0
  );

  const paymentPercentage =
    totalCurrentMonthBilled > 0
      ? Math.round((totalReceivedCurrentMonth / totalCurrentMonthBilled) * 100)
      : 0;

  const currentMonthPaidCount = currentMonthBills.filter((b) => b.status === 'paid').length;
  const currentMonthPartialCount = currentMonthBills.filter((b) => b.status === 'partial').length;

  // 4. Total tunggakan SPP across all time (including remaining of partial bills)
  const allArrearsBills = bills.filter((b) => b.status !== 'paid');
  const totalArrearsAmount = allArrearsBills.reduce(
    (sum, b) => sum + (b.remainingAmount !== undefined ? b.remainingAmount : (b.amount - (b.paidAmount || 0))),
    0
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Siswa Aktif */}
      <div
        onClick={() => setActiveTab('students')}
        className="bg-white p-5 rounded-lg border border-neutral-200 hover:border-neutral-300 transition-all cursor-pointer group shadow-2xs"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-neutral-500">Siswa & Santri Aktif</span>
          <div className="w-8 h-8 rounded-md bg-neutral-100 text-neutral-700 flex items-center justify-center group-hover:bg-neutral-200 transition-colors">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <span className="text-2xl font-bold tracking-tight text-neutral-900 tabular-nums">
            {activeStudentsCount}
          </span>
          <span className="text-xs text-neutral-500 ml-1.5">santri aktif</span>
        </div>
        <div className="mt-2 text-xs text-neutral-500 flex items-center gap-1.5">
          <span>{activeStudents.filter((s) => s.category === 'asrama_santri').length} Santri Mukim</span>
          <span>·</span>
          <span>{activeStudents.filter((s) => s.category === 'reguler').length} Reguler</span>
        </div>
      </div>

      {/* Card 2: Tagihan Bulan Ini */}
      <div
        onClick={() => setActiveTab('bills')}
        className="bg-white p-5 rounded-lg border border-neutral-200 hover:border-neutral-300 transition-all cursor-pointer group shadow-2xs"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-neutral-500">
            Tagihan {getMonthName(currentMonth)} {currentYear}
          </span>
          <div className="w-8 h-8 rounded-md bg-neutral-100 text-neutral-700 flex items-center justify-center group-hover:bg-neutral-200 transition-colors">
            <Receipt className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <span className="text-2xl font-bold tracking-tight text-neutral-900 font-mono tabular-nums">
            {formatRupiah(totalCurrentMonthBilled)}
          </span>
        </div>
        <div className="mt-2 text-xs text-neutral-500 flex items-center gap-1.5">
          <span>{currentMonthBills.length} Tagihan Terbit</span>
          <span>·</span>
          <span>Jatuh tempo tgl {settings.defaultDueDateDay}</span>
        </div>
      </div>

      {/* Card 3: Pembayaran Diterima */}
      <div
        onClick={() => setActiveTab('history')}
        className="bg-white p-5 rounded-lg border border-neutral-200 hover:border-neutral-300 transition-all cursor-pointer group shadow-2xs"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-neutral-500">Pembayaran Diterima</span>
          <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
            <CheckCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <span className="text-2xl font-bold tracking-tight text-emerald-800 font-mono tabular-nums">
            {formatRupiah(totalReceivedCurrentMonth)}
          </span>
        </div>
        <div className="mt-2 text-xs text-neutral-500 flex items-center gap-1.5">
          <span className="font-semibold text-emerald-700">{paymentPercentage}% Tercapai</span>
          <span>·</span>
          <span>{currentMonthPaidCount} Lunas{currentMonthPartialCount > 0 ? `, ${currentMonthPartialCount} Cicilan` : ''}</span>
        </div>
      </div>

      {/* Card 4: Total Tunggakan */}
      <div
        onClick={() => setActiveTab('bills')}
        className="bg-white p-5 rounded-lg border border-neutral-200 hover:border-rose-300 transition-all cursor-pointer group shadow-2xs"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-neutral-500">Total Tunggakan SPP</span>
          <div className="w-8 h-8 rounded-md bg-rose-50 text-rose-700 flex items-center justify-center group-hover:bg-rose-100 transition-colors">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <span className="text-2xl font-bold tracking-tight text-rose-700 font-mono tabular-nums">
            {formatRupiah(totalArrearsAmount)}
          </span>
        </div>
        <div className="mt-2 text-xs text-neutral-500 flex items-center gap-1.5">
          <span>{allArrearsBills.length} Tagihan Perlu Dilunasi</span>
          <span>·</span>
          <span className="text-rose-600 font-medium">Perlu Tindak Lanjut</span>
        </div>
      </div>
    </div>
  );
};
