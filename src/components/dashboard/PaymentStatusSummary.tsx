import React from 'react';
import { useApp } from '../../context/AppContext';
import { getMonthName, formatRupiah } from '../../utils/formatters';
import { CheckCircle2, Clock, ArrowRight } from 'lucide-react';

export const PaymentStatusSummary: React.FC = () => {
  const { students, bills, settings, setActiveTab, setPreselectedStudentForPayment } = useApp();

  const currentMonth = settings.activeMonth;
  const currentYear = settings.activeYear;

  const activeStudents = students.filter((s) => s.status === 'active');
  const totalStudents = activeStudents.length;

  // Bills for this active month
  const currentMonthBills = bills.filter(
    (b) => b.month === currentMonth && b.year === currentYear
  );

  const paidCurrentMonthStudents = currentMonthBills
    .filter((b) => b.status === 'paid')
    .map((b) => b.studentId);

  const partialCurrentMonthStudents = currentMonthBills
    .filter((b) => b.status === 'partial')
    .map((b) => b.studentId);

  const unpaidCurrentMonthStudents = currentMonthBills
    .filter((b) => b.status === 'unpaid' || b.status === 'overdue')
    .map((b) => b.studentId);

  const paidCount = paidCurrentMonthStudents.length;
  const partialCount = partialCurrentMonthStudents.length;
  const unpaidCount = unpaidCurrentMonthStudents.length;

  const totalCollectedNominal = currentMonthBills.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
  const totalBilledNominal = currentMonthBills.reduce((sum, b) => sum + b.amount, 0);

  const paidPercent = totalBilledNominal > 0 ? Math.round((totalCollectedNominal / totalBilledNominal) * 100) : 0;
  const unpaidPercent = 100 - paidPercent;

  // Unpaid students details for quick follow-up
  const followUpStudents = activeStudents
    .filter((s) => unpaidCurrentMonthStudents.includes(s.id) || partialCurrentMonthStudents.includes(s.id))
    .slice(0, 4);

  const handlePayStudent = (studentId: string) => {
    setPreselectedStudentForPayment(studentId);
    setActiveTab('payment');
  };

  return (
    <div className="bg-white p-5 rounded-lg border border-neutral-200 flex flex-col justify-between shadow-2xs">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">
              Kepatuhan SPP {getMonthName(currentMonth)}
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Rasio siswa yang sudah dan belum membayar
            </p>
          </div>
          <button
            onClick={() => setActiveTab('bills')}
            className="text-xs text-emerald-800 hover:text-emerald-900 font-medium flex items-center gap-1 transition-colors"
          >
            <span>Semua Tagihan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-neutral-600 mb-1.5 font-medium">
            <span>Realisasi Penerimaan Dana</span>
            <span className="font-mono tabular-nums">{paidPercent}%</span>
          </div>
          <div className="h-3 w-full bg-neutral-100 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-700 transition-all duration-500"
              style={{ width: `${paidPercent}%` }}
              title={`Telah Terkumpul: ${paidPercent}%`}
            />
            <div
              className="bg-rose-400 transition-all duration-500"
              style={{ width: `${unpaidPercent}%` }}
              title={`Belum Terkumpul: ${unpaidPercent}%`}
            />
          </div>
        </div>

        {/* Breakdown Metric Rows */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-neutral-100 text-xs">
          <div className="bg-neutral-50 p-3 rounded-md border border-neutral-200/60">
            <div className="flex items-center gap-1.5 text-neutral-600">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Sudah Lunas</span>
            </div>
            <div className="mt-2 text-lg font-bold text-neutral-900 tabular-nums">
              {paidCount}{' '}
              <span className="text-xs font-normal text-neutral-500">
                / {totalStudents} santri
              </span>
            </div>
          </div>

          <div className="bg-neutral-50 p-3 rounded-md border border-neutral-200/60">
            <div className="flex items-center gap-1.5 text-neutral-600">
              <Clock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>Belum Lunas / Cicil</span>
            </div>
            <div className="mt-2 text-lg font-bold text-neutral-900 tabular-nums">
              {unpaidCount + partialCount}{' '}
              <span className="text-xs font-normal text-neutral-500">
                ({partialCount} cicilan)
              </span>
            </div>
          </div>
        </div>

        {/* Santri yang Belum Lunas list snippet */}
        <div className="mt-4 pt-3 border-t border-neutral-100">
          <span className="text-xs font-semibold text-neutral-700 block mb-2">
            Perlu Ditagih / Selesaikan Pembayaran:
          </span>
          <div className="space-y-2">
            {followUpStudents.map((student) => {
              const b = currentMonthBills.find((bill) => bill.studentId === student.id);
              const remaining = b?.remainingAmount !== undefined ? b.remainingAmount : (b?.amount || student.monthlyFee);

              return (
                <div
                  key={student.id}
                  className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-neutral-50 transition-colors text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-medium text-neutral-900 truncate">
                      {student.name}
                    </div>
                    <div className="text-[11px] text-neutral-500 font-mono">
                      Kelas {student.classGrade} · Sisa: {formatRupiah(remaining)}
                    </div>
                  </div>
                  <button
                    onClick={() => handlePayStudent(student.id)}
                    className="px-2.5 py-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors whitespace-nowrap shrink-0"
                  >
                    Bayar
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
