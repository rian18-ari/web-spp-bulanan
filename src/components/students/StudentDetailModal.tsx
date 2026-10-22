import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  extractGradeLevel,
  formatIndonesianDate,
  formatRupiah,
  generateWhatsAppReminderUrl,
  getBillStatusInfo,
  getMonthName,
} from '../../utils/formatters';
import { X, Phone, MessageSquare, CreditCard, Calendar } from 'lucide-react';

export const StudentDetailModal: React.FC = () => {
  const {
    selectedStudentForDetail,
    setSelectedStudentForDetail,
    bills,
    settings,
    setActiveTab,
    setPreselectedStudentForPayment,
  } = useApp();

  if (!selectedStudentForDetail) return null;

  const student = selectedStudentForDetail;

  // Student bills
  const studentBills = bills.filter((b) => b.studentId === student.id);
  const unpaidBills = studentBills.filter((b) => b.status !== 'paid');
  const totalArrears = unpaidBills.reduce(
    (sum, b) =>
      sum +
      (b.remainingAmount !== undefined
        ? b.remainingAmount
        : Math.max(0, b.amount - (b.paidAmount || 0))),
    0
  );

  const handlePayNow = () => {
    setPreselectedStudentForPayment(student.id);
    setSelectedStudentForDetail(null);
    setActiveTab('payment');
  };

  const handleWhatsAppReminder = () => {
    const unpaidMonthNames = unpaidBills.map(
      (b) =>
        `${getMonthName(b.month)} ${b.year}${
          b.status === 'partial' ? ` (Sisa: ${formatRupiah(b.remainingAmount || 0)})` : ''
        }`
    );
    const url = generateWhatsAppReminderUrl(
      student.parentPhone,
      student.parentName,
      student.name,
      student.classGrade,
      unpaidMonthNames,
      totalArrears,
      settings.schoolName,
      settings.bankAccounts
    );
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-neutral-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">
              Rincian Profil & Tagihan Siswa / Santri
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Data pribadi, tanggal masuk, dan rekapitulasi SPP {settings.academicYear}
            </p>
          </div>
          <button
            onClick={() => setSelectedStudentForDetail(null)}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded hover:bg-neutral-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* Identity Grid */}
          <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-neutral-900">{student.name}</h4>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                      student.status === 'active'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-neutral-200 text-neutral-700 border-neutral-300'
                    }`}
                  >
                    {student.status === 'active' ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5">
                  <span className="font-mono">NIS: {student.nis}</span>
                  {student.nisn && (
                    <>
                      <span>·</span>
                      <span className="font-mono">NISN: {student.nisn}</span>
                    </>
                  )}
                  <span>·</span>
                  <span className="font-semibold text-neutral-800">{student.classGrade}</span>
                  <span>·</span>
                  <span>{extractGradeLevel(student.classGrade)}</span>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[11px] text-neutral-500 block">Tarif SPP Bulanan</span>
                <span className="text-base font-bold font-mono text-neutral-900 tabular-nums">
                  {formatRupiah(student.monthlyFee)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-xs">
              <div>
                <span className="text-neutral-500 block">Jenis Kelamin:</span>
                <span className="font-medium text-neutral-800">
                  {student.gender === 'L' ? 'Laki-laki (Santriwan)' : 'Perempuan (Santriwati)'}
                </span>
              </div>

              <div>
                <span className="text-neutral-500 block">Tanggal Masuk:</span>
                <div className="flex items-center gap-1 font-mono text-neutral-800">
                  <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{formatIndonesianDate(student.enrollmentDate, 'long')}</span>
                </div>
              </div>

              <div>
                <span className="text-neutral-500 block">Kategori Siswa:</span>
                <span className="font-medium text-neutral-800">
                  {student.category === 'asrama_santri'
                    ? 'Santri Asrama Mukim'
                    : student.category === 'beasiswa'
                    ? 'Penerima Beasiswa'
                    : 'Siswa Reguler'}
                </span>
              </div>

              {student.dormRoom && (
                <div>
                  <span className="text-neutral-500 block">Kamar Asrama:</span>
                  <span className="font-medium text-neutral-800">{student.dormRoom}</span>
                </div>
              )}

              <div>
                <span className="text-neutral-500 block">Orang Tua / Wali:</span>
                <span className="font-medium text-neutral-800">{student.parentName}</span>
              </div>

              <div>
                <span className="text-neutral-500 block">No. WhatsApp Wali:</span>
                <div className="flex items-center gap-1.5 font-mono text-neutral-800">
                  <Phone className="w-3 h-3 text-emerald-600" />
                  <span>{student.parentPhone}</span>
                </div>
              </div>

              <div className="sm:col-span-2">
                <span className="text-neutral-500 block">Alamat Tinggal:</span>
                <span className="text-neutral-700">{student.address || '-'}</span>
              </div>
            </div>
          </div>

          {/* Arrears Summary & Quick Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-neutral-200 bg-white">
            <div>
              <span className="text-xs text-neutral-500 block">Total Kewajiban / Tunggakan SPP:</span>
              <span
                className={`text-xl font-bold font-mono tabular-nums ${
                  totalArrears > 0 ? 'text-rose-700' : 'text-emerald-700'
                }`}
              >
                {formatRupiah(totalArrears)}
              </span>
              <span className="text-xs text-neutral-500 ml-2">
                ({unpaidBills.length} tagihan belum tuntas)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {totalArrears > 0 && (
                <button
                  onClick={handleWhatsAppReminder}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Kirim WA Pengingat</span>
                </button>
              )}
              {student.status === 'active' && totalArrears > 0 && (
                <button
                  onClick={handlePayNow}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-md transition-colors"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Bayar Sekarang</span>
                </button>
              )}
            </div>
          </div>

          {/* Monthly Bills History Table */}
          <div>
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-2">
              Daftar Tagihan SPP Bulanan
            </h4>
            <div className="border border-neutral-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-200 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Periode</th>
                    <th className="py-2.5 px-3">Jatuh Tempo</th>
                    <th className="py-2.5 px-3 text-right">Total Tagihan</th>
                    <th className="py-2.5 px-3 text-right">Sudah Dibayar</th>
                    <th className="py-2.5 px-3 text-right">Sisa Tagihan</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/60 font-mono text-[11px]">
                  {studentBills.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-5 text-center text-neutral-400 font-sans">
                        Belum ada data tagihan yang diterbitkan untuk siswa ini.
                      </td>
                    </tr>
                  ) : (
                    studentBills.map((b) => {
                      const statusInfo = getBillStatusInfo(b.status);
                      const paidVal = b.paidAmount || 0;
                      const remVal = b.remainingAmount !== undefined ? b.remainingAmount : (b.amount - paidVal);

                      return (
                        <tr key={b.id} className="hover:bg-neutral-50/60">
                          <td className="py-2.5 px-3 font-sans font-medium text-neutral-900">
                            {getMonthName(b.month)} {b.year}
                          </td>
                          <td className="py-2.5 px-3 text-neutral-500 font-mono">
                            {formatIndonesianDate(b.dueDate, 'short')}
                          </td>
                          <td className="py-2.5 px-3 text-right text-neutral-900 font-medium tabular-nums">
                            {formatRupiah(b.amount)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-800 font-medium tabular-nums">
                            {formatRupiah(paidVal)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold tabular-nums">
                            <span className={remVal > 0 ? 'text-rose-700' : 'text-neutral-400'}>
                              {formatRupiah(remVal)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-sans">
                            <span className={`text-[11px] ${statusInfo.badgeClass}`}>
                              {statusInfo.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-200 bg-neutral-50 flex justify-end">
          <button
            onClick={() => setSelectedStudentForDetail(null)}
            className="px-4 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-200 rounded transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
