import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatIndonesianDate, formatRupiah, getMonthName, getPaymentMethodLabel, getTransactionStatusInfo } from '../../utils/formatters';
import { PaymentRecord } from '../../types';
import { Printer, ArrowRight } from 'lucide-react';

export const RecentPaymentsTable: React.FC = () => {
  const { payments, setSelectedReceiptForModal, setActiveTab } = useApp();

  const recentPayments = payments.slice(0, 6);

  return (
    <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-2xs">
      <div className="flex items-center justify-between p-5 border-b border-neutral-200">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">Pembayaran Terbaru</h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Daftar transaksi pembayaran SPP yang dicatat oleh kasir/bendahara
          </p>
        </div>
        <button
          onClick={() => setActiveTab('history')}
          className="text-xs text-emerald-800 hover:text-emerald-900 font-medium flex items-center gap-1 transition-colors"
        >
          <span>Semua Riwayat</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-neutral-50/80 text-neutral-600 border-b border-neutral-200 font-semibold">
            <tr>
              <th className="py-3 px-4">No. Transaksi</th>
              <th className="py-3 px-4">Nama Siswa / Santri</th>
              <th className="py-3 px-4">Kelas</th>
              <th className="py-3 px-4">Bulan Tagihan</th>
              <th className="py-3 px-4 text-right">Nominal</th>
              <th className="py-3 px-4">Kanal</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4">Waktu Transaksi</th>
              <th className="py-3 px-4 text-center">Kuitansi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200/60">
            {recentPayments.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-neutral-400">
                  Belum ada transaksi pembayaran yang dicatat.
                </td>
              </tr>
            ) : (
              recentPayments.map((pay: PaymentRecord) => {
                const isCancelled = pay.status === 'cancelled';
                const statusInfo = getTransactionStatusInfo(pay.status);

                return (
                  <tr
                    key={pay.id}
                    className={`hover:bg-neutral-50/80 transition-colors ${
                      isCancelled ? 'bg-neutral-50/50 opacity-70' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-medium">
                      <span className={isCancelled ? 'line-through text-neutral-400' : 'text-neutral-900'}>
                        {pay.receiptNumber}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-neutral-900">{pay.studentName}</span>
                      <span className="block text-[11px] text-neutral-400 font-mono">NIS: {pay.nis}</span>
                    </td>
                    <td className="py-3 px-4 text-neutral-700 font-medium">
                      Kelas {pay.classGrade}
                    </td>
                    <td className="py-3 px-4 text-neutral-600">
                      {pay.monthsPaid.map((m) => getMonthName(m.month)).join(', ')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold tabular-nums">
                      <span className={isCancelled ? 'line-through text-neutral-400' : 'text-neutral-900'}>
                        {formatRupiah(pay.totalAmount)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-neutral-700 text-[11px]">
                      {getPaymentMethodLabel(pay.paymentMethod)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded ${statusInfo.badgeClass}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-neutral-500 font-mono text-[11px]">
                      {formatIndonesianDate(pay.paymentDate, 'with-time')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedReceiptForModal(pay)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded transition-colors"
                        title="Lihat & Cetak Kuitansi"
                      >
                        <Printer className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Cetak</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
