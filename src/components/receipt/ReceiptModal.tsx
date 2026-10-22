import React, { useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  formatIndonesianDate,
  formatRupiah,
  getMonthName,
  getPaymentMethodLabel,
  numberToWordsIndonesian,
} from '../../utils/formatters';
import { Printer, X, CheckCircle, Share2, Clock, AlertTriangle } from 'lucide-react';

export const ReceiptModal: React.FC = () => {
  const { selectedReceiptForModal, setSelectedReceiptForModal, settings, addNotification } = useApp();
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!selectedReceiptForModal) return null;

  const receipt = selectedReceiptForModal;
  const isCancelled = receipt.status === 'cancelled';
  const hasPartial = receipt.monthsPaid.some((m) => m.isPartial);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const monthsText = receipt.monthsPaid
      .map(
        (m) =>
          `${getMonthName(m.month)} ${m.year}${
            m.isPartial ? ` (Cicil, sisa: ${formatRupiah(m.remaining || 0)})` : ''
          }`
      )
      .join(', ');

    const text = `*BUKTI PEMBAYARAN SPP ${settings.schoolName.toUpperCase()}*
No. Transaksi: ${receipt.receiptNumber}
Tanggal: ${formatIndonesianDate(receipt.paymentDate, 'with-time')}
---------------------------------
Nama: ${receipt.studentName}
NIS: ${receipt.nis}
Kelas: ${receipt.classGrade}
Tagihan: SPP ${monthsText}
Total Bayar: ${formatRupiah(receipt.totalAmount)}
Metode: ${getPaymentMethodLabel(receipt.paymentMethod)}
Status: ${isCancelled ? 'DIBATALKAN (VOID)' : hasPartial ? 'DIBAYAR SEBAGIAN' : 'LUNAS'}
${isCancelled ? `Alasan Batal: ${receipt.cancelledReason}\n` : ''}Kasir/Bendahara: ${receipt.cashierName}
---------------------------------
${isCancelled ? 'Perhatian: Transaksi ini telah dibatalkan.' : 'Terima kasih atas pembayaran yang telah dilakukan.'}`;

    navigator.clipboard.writeText(text);
    addNotification('info', 'Tersalin', 'Rincian kuitansi disalin ke clipboard.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden border border-neutral-200">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-200 bg-neutral-50 no-print">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-900">Kuitansi Bukti Pembayaran</span>
            <span className="text-xs text-neutral-400">·</span>
            <span className="text-xs font-mono text-neutral-600">{receipt.receiptNumber}</span>
            {isCancelled && (
              <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.5 rounded">
                DIBATALKAN
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              className="p-1.5 text-neutral-500 hover:text-neutral-800 rounded hover:bg-neutral-200 transition-colors"
              title="Salin Teks Kuitansi"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak</span>
            </button>
            <button
              onClick={() => setSelectedReceiptForModal(null)}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded hover:bg-neutral-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper */}
        <div className="overflow-y-auto p-6 flex-1 bg-neutral-50/50 print-receipt-container">
          <div
            ref={receiptRef}
            className="bg-white p-6 rounded-lg border border-neutral-200 text-neutral-900 shadow-xs print:border-none print:shadow-none print:p-0 relative"
          >
            {/* Kop Kuitansi */}
            <div className="text-center pb-4 border-b-2 border-neutral-800">
              <h2 className="text-base font-bold tracking-tight text-neutral-900 uppercase">
                {settings.schoolName}
              </h2>
              <p className="text-[11px] text-neutral-600 mt-0.5">{settings.address}</p>
              <p className="text-[10px] text-neutral-500">
                Telp: {settings.phone} · Email: {settings.email}
              </p>
            </div>

            {/* Cancelled Banner if voided */}
            {isCancelled && (
              <div className="my-3 p-3 bg-rose-50 border border-rose-300 rounded text-center text-rose-800 text-xs">
                <div className="font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>TRANSAKSI DIBATALKAN / TIDAK BERLAKU</span>
                </div>
                <div className="text-[11px] text-rose-700 mt-1">
                  Alasan: <strong>{receipt.cancelledReason}</strong>
                </div>
                <div className="text-[10px] text-rose-500 mt-0.5 font-mono">
                  Dibatalkan pada {formatIndonesianDate(receipt.cancelledAt, 'with-time')} oleh {receipt.cancelledBy}
                </div>
              </div>
            )}

            {/* Title & Metadata */}
            <div className="py-3 text-center border-b border-dashed border-neutral-300">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-800 block">
                BUKTI PEMBAYARAN SPP RESMI
              </span>
              <div className="flex justify-between items-center text-[11px] text-neutral-600 mt-2 font-mono">
                <span>No: {receipt.receiptNumber}</span>
                <span>{formatIndonesianDate(receipt.paymentDate, 'with-time')}</span>
              </div>
            </div>

            {/* Student Info Grid */}
            <div className="py-3 text-xs space-y-1.5 border-b border-neutral-200">
              <div className="flex">
                <span className="w-28 text-neutral-500">Nama Siswa/Santri</span>
                <span className="text-neutral-400 mr-2">:</span>
                <span className="font-semibold text-neutral-900">{receipt.studentName}</span>
              </div>
              <div className="flex">
                <span className="w-28 text-neutral-500">Nomor Induk (NIS)</span>
                <span className="text-neutral-400 mr-2">:</span>
                <span className="font-mono text-neutral-800">{receipt.nis}</span>
              </div>
              <div className="flex">
                <span className="w-28 text-neutral-500">Kelas</span>
                <span className="text-neutral-400 mr-2">:</span>
                <span className="text-neutral-800">{receipt.classGrade}</span>
              </div>
              <div className="flex">
                <span className="w-28 text-neutral-500">Metode Bayar</span>
                <span className="text-neutral-400 mr-2">:</span>
                <span className="text-neutral-800">
                  {getPaymentMethodLabel(receipt.paymentMethod)}
                  {receipt.bankName ? ` - ${receipt.bankName}` : ''}
                </span>
              </div>
            </div>

            {/* Payment Items Table */}
            <div className="py-3 border-b border-neutral-200">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 text-neutral-500 text-left">
                    <th className="pb-1.5 font-medium">Uraian Pembayaran</th>
                    <th className="pb-1.5 font-medium text-right">Jumlah Dibayar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-mono">
                  {receipt.monthsPaid.map((item, index) => (
                    <tr key={index}>
                      <td className="py-2 text-neutral-800">
                        <span>SPP Bulan {getMonthName(item.month)} {item.year}</span>
                        {item.isPartial && (
                          <span className="text-[10px] text-amber-700 block font-sans">
                            (Dibayar sebagian · Sisa tagihan: {formatRupiah(item.remaining || 0)})
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-right text-neutral-900 font-medium tabular-nums">
                        {formatRupiah(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-neutral-300 font-bold">
                    <td className="pt-2 text-neutral-900">Total Pembayaran</td>
                    <td
                      className={`pt-2 text-right font-mono tabular-nums text-sm ${
                        isCancelled ? 'line-through text-neutral-400' : 'text-emerald-800'
                      }`}
                    >
                      {formatRupiah(receipt.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Cash & Change if Tunai */}
              {receipt.paymentMethod === 'tunai' && receipt.cashReceived ? (
                <div className="mt-2 pt-2 border-t border-dashed border-neutral-200 text-[11px] font-mono flex justify-between text-neutral-600">
                  <span>Uang Diterima: {formatRupiah(receipt.cashReceived)}</span>
                  <span>Kembalian: {formatRupiah(receipt.changeReturned || 0)}</span>
                </div>
              ) : null}
            </div>

            {/* Terbilang */}
            <div className="py-2.5 bg-neutral-50 px-3 rounded text-[11px] border border-neutral-200/60 my-3">
              <span className="text-neutral-500 italic block text-[10px]">Terbilang:</span>
              <span className="font-medium text-neutral-800 italic">
                "{numberToWordsIndonesian(receipt.totalAmount)}"
              </span>
            </div>

            {/* Stamp and Signatures */}
            <div className="pt-3 flex justify-between items-end text-xs">
              <div
                className={`flex items-center gap-1.5 font-semibold px-3 py-1 rounded border ${
                  isCancelled
                    ? 'text-rose-800 border-rose-300 bg-rose-50/60'
                    : hasPartial
                    ? 'text-amber-800 border-amber-300 bg-amber-50/60'
                    : 'text-emerald-700 border-emerald-300 bg-emerald-50/50'
                }`}
              >
                {isCancelled ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span className="tracking-wider uppercase text-[10px]">DIBATALKAN</span>
                  </>
                ) : hasPartial ? (
                  <>
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span className="tracking-wider uppercase text-[10px]">DIBAYAR SEBAGIAN</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="tracking-widest uppercase text-[10px]">LUNAS</span>
                  </>
                )}
              </div>

              <div className="text-center font-sans">
                <p className="text-[10px] text-neutral-500 mb-8">Bendahara / Petugas TU</p>
                <p className="font-semibold text-neutral-900 text-xs border-t border-neutral-300 pt-1">
                  {receipt.cashierName}
                </p>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="mt-6 pt-3 border-t border-dashed border-neutral-200 text-center text-[10px] text-neutral-400">
              Kuitansi ini adalah bukti pembayaran yang sah yang diterbitkan oleh sistem komputer.
            </div>
          </div>
        </div>

        {/* Modal Bottom Close Button */}
        <div className="px-5 py-3 border-t border-neutral-200 bg-neutral-50 flex justify-end no-print">
          <button
            onClick={() => setSelectedReceiptForModal(null)}
            className="px-4 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-200 rounded transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
