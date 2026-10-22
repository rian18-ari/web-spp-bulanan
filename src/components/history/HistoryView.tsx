import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  formatIndonesianDate,
  formatRupiah,
  getMonthName,
  getPaymentMethodLabel,
  getTransactionStatusInfo,
  MONTH_NAMES_ID,
} from '../../utils/formatters';
import { PaymentRecord } from '../../types';
import {
  Printer,
  Search,
  Download,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  X,
  FileText,
  Filter,
} from 'lucide-react';

export const HistoryView: React.FC = () => {
  const { payments, students, setSelectedReceiptForModal, cancelPayment, addNotification } = useApp();

  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState<number>(0);
  const [yearFilter, setYearFilter] = useState<number>(2026);

  // Cancellation modal state
  const [paymentToCancel, setPaymentToCancel] = useState<PaymentRecord | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Detail transaction modal state
  const [paymentDetail, setPaymentDetail] = useState<PaymentRecord | null>(null);

  // Available classes
  const classes = Array.from(new Set(students.map((s) => s.classGrade))).sort();

  // Filter payments
  const filteredPayments = payments.filter((pay) => {
    const q = search.toLowerCase().trim();
    const matchSearch =
      q === '' ||
      pay.receiptNumber.toLowerCase().includes(q) ||
      pay.studentName.toLowerCase().includes(q) ||
      pay.nis.toLowerCase().includes(q) ||
      pay.classGrade.toLowerCase().includes(q);

    const matchMethod =
      methodFilter === 'all' ||
      (methodFilter === 'tunai' && pay.paymentMethod === 'tunai') ||
      (methodFilter === 'transfer_bank' && pay.paymentMethod.startsWith('transfer')) ||
      (methodFilter === 'qris' && pay.paymentMethod === 'qris') ||
      pay.paymentMethod === methodFilter;

    const matchClass = classFilter === 'all' || pay.classGrade === classFilter;
    const matchStatus = statusFilter === 'all' || pay.status === statusFilter;

    const payDate = new Date(pay.paymentDate);
    const matchMonth = monthFilter === 0 || payDate.getMonth() + 1 === monthFilter;
    const matchYear = yearFilter === 0 || payDate.getFullYear() === yearFilter;

    return matchSearch && matchMethod && matchClass && matchStatus && matchMonth && matchYear;
  });

  // KPI summaries
  const validCompletedPayments = filteredPayments.filter((p) => p.status !== 'cancelled');
  const totalCollected = validCompletedPayments.reduce((sum, p) => sum + p.totalAmount, 0);
  const cancelledCount = filteredPayments.filter((p) => p.status === 'cancelled').length;

  const handleExportCSV = () => {
    if (filteredPayments.length === 0) return;

    const headers = [
      'No. Transaksi',
      'Waktu Pembayaran',
      'Nama Siswa',
      'NIS',
      'Kelas',
      'Bulan Tagihan',
      'Total Bayar (Rp)',
      'Metode',
      'Status Transaksi',
      'Alasan Batal (Jika Batal)',
      'Petugas',
    ];

    const rows = filteredPayments.map((p) => [
      p.receiptNumber,
      formatIndonesianDate(p.paymentDate, 'with-time'),
      `"${p.studentName}"`,
      p.nis,
      p.classGrade,
      `"${p.monthsPaid.map((m) => `${getMonthName(m.month)} ${m.year}`).join(', ')}"`,
      p.totalAmount,
      getPaymentMethodLabel(p.paymentMethod),
      p.status === 'cancelled' ? 'DIBATALKAN' : 'BERHASIL',
      `"${p.cancelledReason || '-'}"`,
      `"${p.cashierName}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Riwayat_Pembayaran_SPP_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addNotification('success', 'Ekspor Berhasil', 'File CSV riwayat pembayaran telah diunduh.');
  };

  const handleConfirmCancel = () => {
    if (!paymentToCancel) return;
    if (!cancelReason.trim()) {
      setCancelError('Alasan pembatalan wajib diisi untuk audit keuangan.');
      return;
    }

    const success = cancelPayment(paymentToCancel.id, cancelReason);
    if (success) {
      setPaymentToCancel(null);
      setCancelReason('');
      setCancelError(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Filter & Search Controls */}
      <div className="bg-white p-4 rounded-lg border border-neutral-200 space-y-3 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Live Search */}
          <div className="relative min-w-[260px] flex-1">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari no. transaksi (KWT), nama santri, atau NIS..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-neutral-300 rounded-md focus:outline-hidden focus:border-neutral-900"
            />
          </div>

          {/* Action Export Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:text-neutral-900 border border-neutral-300 rounded-md hover:bg-neutral-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor CSV</span>
            </button>
          </div>
        </div>

        {/* Multi Filter Row: Periode, Kelas, Metode, Status */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-100 text-xs">
          <div className="flex items-center gap-1 text-neutral-500 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-semibold text-neutral-700">Filter:</span>
          </div>

          {/* Filter Bulan */}
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(parseInt(e.target.value))}
            className="px-2.5 py-1 text-xs border border-neutral-300 rounded-md bg-white text-neutral-700 focus:outline-hidden"
          >
            <option value={0}>Semua Bulan Transaksi</option>
            {MONTH_NAMES_ID.map((name, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {name}
              </option>
            ))}
          </select>

          {/* Filter Tahun */}
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(parseInt(e.target.value))}
            className="px-2.5 py-1 text-xs border border-neutral-300 rounded-md bg-white text-neutral-700 focus:outline-hidden"
          >
            <option value={0}>Semua Tahun</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>

          {/* Filter Kelas */}
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-2.5 py-1 text-xs border border-neutral-300 rounded-md bg-white text-neutral-700 focus:outline-hidden"
          >
            <option value="all">Semua Kelas</option>
            {classes.map((cls) => (
              <option key={cls} value={cls}>
                Kelas {cls}
              </option>
            ))}
          </select>

          {/* Filter Metode */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-2.5 py-1 text-xs border border-neutral-300 rounded-md bg-white text-neutral-700 focus:outline-hidden"
          >
            <option value="all">Semua Metode Pembayaran</option>
            <option value="tunai">Tunai</option>
            <option value="transfer_bank">Transfer Bank (Semua Bank)</option>
            <option value="qris">QRIS</option>
          </select>

          {/* Filter Status Transaksi */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1 text-xs border border-neutral-300 rounded-md bg-white text-neutral-700 font-medium focus:outline-hidden"
          >
            <option value="all">Semua Status Transaksi</option>
            <option value="completed">Berhasil / Sah</option>
            <option value="cancelled">Dibatalkan</option>
          </select>

          {/* Summary text */}
          <div className="ml-auto text-neutral-500 font-mono text-[11px]">
            Total Dana Masuk Sah:{' '}
            <strong className="text-emerald-800 text-xs">{formatRupiah(totalCollected)}</strong>
            {cancelledCount > 0 && (
              <span className="text-rose-600 ml-2">({cancelledCount} transaksi dibatalkan)</span>
            )}
          </div>
        </div>
      </div>

      {/* History Ledger Table */}
      <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/80 text-neutral-600 border-b border-neutral-200 font-semibold">
              <tr>
                <th className="py-3 px-4">No. Transaksi</th>
                <th className="py-3 px-4">Waktu Transaksi</th>
                <th className="py-3 px-4">Nama Siswa / Santri</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Tagihan Dibayar</th>
                <th className="py-3 px-4 text-right">Nominal Bayar</th>
                <th className="py-3 px-4">Kanal Pembayaran</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi & Kuitansi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/60">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-neutral-400">
                    Tidak ada riwayat transaksi yang cocok dengan kriteria filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p: PaymentRecord) => {
                  const isCancelled = p.status === 'cancelled';
                  const statusInfo = getTransactionStatusInfo(p.status);

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-neutral-50/60 transition-colors ${
                        isCancelled ? 'bg-neutral-50/50 opacity-70' : ''
                      }`}
                    >
                      {/* Nomor Transaksi Unik */}
                      <td className="py-3 px-4 font-mono font-medium">
                        <span className={`block ${isCancelled ? 'line-through text-neutral-400' : 'text-neutral-900'}`}>
                          {p.receiptNumber}
                        </span>
                        {isCancelled && (
                          <span className="text-[10px] text-rose-600 font-sans block">
                            Dibatalkan: {p.cancelledReason}
                          </span>
                        )}
                      </td>

                      {/* Waktu Pembayaran */}
                      <td className="py-3 px-4 font-mono text-neutral-500 text-[11px]">
                        {formatIndonesianDate(p.paymentDate, 'with-time')}
                      </td>

                      {/* Nama Siswa */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-neutral-900 block">{p.studentName}</span>
                        <span className="text-[11px] text-neutral-400 font-mono">NIS: {p.nis}</span>
                      </td>

                      {/* Kelas */}
                      <td className="py-3 px-4 font-medium text-neutral-800">
                        Kelas {p.classGrade}
                      </td>

                      {/* Bulan Dibayar */}
                      <td className="py-3 px-4 text-neutral-600">
                        <div className="space-y-0.5">
                          {p.monthsPaid.map((m, idx) => (
                            <div key={idx} className="text-[11px]">
                              <span>{getMonthName(m.month)} {m.year}</span>
                              {m.isPartial && (
                                <span className="text-amber-700 font-medium ml-1">
                                  (Cicil {formatRupiah(m.amount)})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Total Nominal */}
                      <td className="py-3 px-4 text-right font-mono font-bold tabular-nums">
                        <span className={isCancelled ? 'line-through text-neutral-400' : 'text-neutral-900'}>
                          {formatRupiah(p.totalAmount)}
                        </span>
                      </td>

                      {/* Kanal Pembayaran */}
                      <td className="py-3 px-4 text-[11px] text-neutral-700">
                        <span className="block font-medium">{getPaymentMethodLabel(p.paymentMethod)}</span>
                        {p.bankName && (
                          <span className="text-[10px] text-neutral-400 block font-mono truncate max-w-[150px]">
                            {p.bankName}
                          </span>
                        )}
                      </td>

                      {/* Status Transaksi */}
                      <td className="py-3 px-4 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded ${statusInfo.badgeClass}`}>
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* Aksi & Tombol Cetak Bukti Pembayaran */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Cetak Bukti Pembayaran */}
                          <button
                            onClick={() => setSelectedReceiptForModal(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded transition-colors"
                            title="Buka & Cetak Kuitansi Resmi"
                          >
                            <Printer className="w-3.5 h-3.5 text-neutral-500" />
                            <span>Cetak</span>
                          </button>

                          {/* Tombol Detail Transaksi */}
                          <button
                            onClick={() => setPaymentDetail(p)}
                            className="p-1 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded"
                            title="Rincian Transaksi Lengkap"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {/* Pembatalan Transaksi dengan Konfirmasi & Pencatatan Alasan */}
                          {!isCancelled && (
                            <button
                              onClick={() => {
                                setPaymentToCancel(p);
                                setCancelReason('');
                                setCancelError(null);
                              }}
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                              title="Batalkan Transaksi Ini"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Pembatalan Transaksi dengan Konfirmasi & Pencatatan Status */}
      {paymentToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 border border-neutral-200 text-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-neutral-100 text-rose-700">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h4 className="text-sm font-bold text-neutral-900">
                Konfirmasi Pembatalan Transaksi Pembayaran
              </h4>
            </div>

            <div className="my-3 space-y-2 text-neutral-600">
              <p>
                Anda akan membatalkan transaksi berikut:
              </p>
              <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 space-y-1">
                <div>
                  No. Bukti: <strong className="font-mono text-neutral-900">{paymentToCancel.receiptNumber}</strong>
                </div>
                <div>
                  Siswa: <strong className="text-neutral-900">{paymentToCancel.studentName}</strong> ({paymentToCancel.classGrade})
                </div>
                <div>
                  Total Nominal: <strong className="font-mono text-emerald-800">{formatRupiah(paymentToCancel.totalAmount)}</strong>
                </div>
                <div>
                  Waktu: <span className="font-mono">{formatIndonesianDate(paymentToCancel.paymentDate, 'with-time')}</span>
                </div>
              </div>

              <div className="p-2.5 bg-amber-50 rounded border border-amber-200 text-[11px] text-amber-800">
                <strong>Catatan Sistem:</strong> Pembatalan ini akan mengembalikan saldo kewajiban tagihan SPP
                siswa secara otomatis ke status sebelum transaksi dibuat. Riwayat transaksi ini akan tetap disimpan
                dengan status <em>Dibatalkan</em> untuk kepatuhan audit bendahara.
              </div>

              <div className="pt-2">
                <label className="block font-semibold text-neutral-800 mb-1">
                  Alasan Pembatalan Transaksi <span className="text-rose-500">*</span>:
                </label>
                <textarea
                  rows={2}
                  value={cancelReason}
                  onChange={(e) => {
                    setCancelReason(e.target.value);
                    setCancelError(null);
                  }}
                  placeholder="Misal: Salah input nominal uang, transfer bank tidak terverifikasi, salah nama siswa..."
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-hidden focus:border-neutral-900 resize-none text-xs"
                />
                {cancelError && <p className="text-rose-600 text-[11px] mt-1">{cancelError}</p>}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setPaymentToCancel(null)}
                className="px-3.5 py-1.5 border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-md transition-colors"
              >
                Ya, Batalkan Transaksi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Detail Lengkap Transaksi */}
      {paymentDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-neutral-200 text-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div>
                <h4 className="text-sm font-bold text-neutral-900">Rincian Transaksi Pembayaran</h4>
                <p className="text-neutral-500 text-[11px] font-mono">{paymentDetail.receiptNumber}</p>
              </div>
              <button
                onClick={() => setPaymentDetail(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Nama Siswa / Santri</span>
                <span className="font-semibold text-neutral-900">{paymentDetail.studentName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Nomor Induk (NIS)</span>
                <span className="font-mono text-neutral-800">{paymentDetail.nis}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Kelas</span>
                <span className="font-medium text-neutral-900">Kelas {paymentDetail.classGrade}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Waktu Pembayaran</span>
                <span className="font-mono text-neutral-800">
                  {formatIndonesianDate(paymentDetail.paymentDate, 'with-time')}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Metode Pembayaran</span>
                <span className="font-medium text-neutral-900">
                  {getPaymentMethodLabel(paymentDetail.paymentMethod)}
                  {paymentDetail.bankName ? ` - ${paymentDetail.bankName}` : ''}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Status Transaksi</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] ${
                    getTransactionStatusInfo(paymentDetail.status).badgeClass
                  }`}
                >
                  {getTransactionStatusInfo(paymentDetail.status).label}
                </span>
              </div>
              {paymentDetail.status === 'cancelled' && (
                <div className="p-2.5 bg-rose-50 rounded border border-rose-200 text-rose-800">
                  <span className="font-semibold block">Catatan Pembatalan:</span>
                  <span>{paymentDetail.cancelledReason}</span>
                  <span className="text-[10px] text-rose-500 block mt-1">
                    Dibatalkan pada {formatIndonesianDate(paymentDetail.cancelledAt, 'with-time')} oleh{' '}
                    {paymentDetail.cancelledBy}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Petugas / Bendahara</span>
                <span className="text-neutral-800">{paymentDetail.cashierName}</span>
              </div>
              {paymentDetail.notes && (
                <div className="flex justify-between py-1 border-b border-neutral-100">
                  <span className="text-neutral-500">Catatan Khusus</span>
                  <span className="text-neutral-800 italic">{paymentDetail.notes}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-t border-neutral-300 font-bold text-sm">
                <span>Total Dana Transaksi</span>
                <span className="font-mono text-emerald-800 tabular-nums">
                  {formatRupiah(paymentDetail.totalAmount)}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-200 flex justify-between items-center">
              <button
                onClick={() => {
                  setSelectedReceiptForModal(paymentDetail);
                  setPaymentDetail(null);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Kuitansi</span>
              </button>

              <button
                onClick={() => setPaymentDetail(null)}
                className="px-4 py-1.5 border border-neutral-300 rounded text-neutral-700 hover:bg-neutral-50"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
