import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  formatIndonesianDate,
  formatRupiah,
  generateWhatsAppReminderUrl,
  getBillStatusInfo,
  getMonthName,
  MONTH_NAMES_ID,
} from '../../utils/formatters';
import { Bill } from '../../types';
import {
  PlusCircle,
  Search,
  MessageSquare,
  CreditCard,
  Eye,
  Trash2,
  AlertTriangle,
  Edit3,
  X,
  ShieldAlert,
} from 'lucide-react';

export const BillListView: React.FC = () => {
  const {
    bills,
    students,
    settings,
    generateBills,
    deleteBill,
    updateBillNominal,
    setActiveTab,
    setPreselectedStudentForPayment,
  } = useApp();

  const [selectedMonth, setSelectedMonth] = useState<number>(settings.activeMonth);
  const [selectedYear, setSelectedYear] = useState<number>(settings.activeYear);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [selectedBillForDetail, setSelectedBillForDetail] = useState<Bill | null>(null);
  const [billToEditNominal, setBillToEditNominal] = useState<Bill | null>(null);
  const [newNominalInput, setNewNominalInput] = useState<number>(0);

  // Generate form state
  const [genTargetType, setGenTargetType] = useState<'all' | 'class' | 'student'>('all');
  const [genClassGrade, setGenClassGrade] = useState<string>('VII-A');
  const [genStudentId, setGenStudentId] = useState<string>('');
  const [genMonth, setGenMonth] = useState<number>(settings.activeMonth);
  const [genYear, setGenYear] = useState<number>(settings.activeYear);
  const [useCustomNominal, setUseCustomNominal] = useState<boolean>(false);
  const [customNominalAmount, setCustomNominalAmount] = useState<number>(650000);

  // Available classes
  const classes = Array.from(new Set(students.map((s) => s.classGrade))).sort();
  const activeStudents = students.filter((s) => s.status === 'active');

  // Filter bills
  const filteredBills = bills.filter((bill) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      q === '' ||
      bill.studentName.toLowerCase().includes(q) ||
      bill.classGrade.toLowerCase().includes(q) ||
      (bill.receiptNumber && bill.receiptNumber.toLowerCase().includes(q));

    const matchMonth = selectedMonth === 0 || bill.month === selectedMonth;
    const matchYear = bill.year === selectedYear;
    const matchClass = selectedClass === 'all' || bill.classGrade === selectedClass;
    const matchStatus = selectedStatus === 'all' || bill.status === selectedStatus;

    return matchSearch && matchMonth && matchYear && matchClass && matchStatus;
  });

  // Rekapitulasi Tagihan Otomatis
  const totalAmountBilled = filteredBills.reduce((sum, b) => sum + b.amount, 0);
  const totalAmountPaid = filteredBills.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
  const totalRemainingArrears = filteredBills.reduce(
    (sum, b) => sum + (b.remainingAmount !== undefined ? b.remainingAmount : (b.amount - (b.paidAmount || 0))),
    0
  );

  const countLunas = filteredBills.filter((b) => b.status === 'paid').length;
  const countSebagian = filteredBills.filter((b) => b.status === 'partial').length;
  const countBelumBayar = filteredBills.filter((b) => b.status === 'unpaid').length;
  const countTerlambat = filteredBills.filter((b) => b.status === 'overdue').length;

  // Check duplicate warning for generator modal
  const checkDuplicateCount = () => {
    let targets: typeof students = [];
    if (genTargetType === 'student' && genStudentId) {
      const s = students.find((st) => st.id === genStudentId);
      if (s) targets = [s];
    } else if (genTargetType === 'class') {
      targets = activeStudents.filter((s) => s.classGrade === genClassGrade);
    } else {
      targets = activeStudents;
    }

    const duplicateStudents = targets.filter((student) =>
      bills.some((b) => b.studentId === student.id && b.month === genMonth && b.year === genYear)
    );

    return {
      targetTotal: targets.length,
      duplicateCount: duplicateStudents.length,
      duplicateNames: duplicateStudents.slice(0, 3).map((s) => s.name),
    };
  };

  const handlePayBill = (studentId: string) => {
    setPreselectedStudentForPayment(studentId);
    setActiveTab('payment');
  };

  const handleSendWhatsApp = (studentId: string, bill: Bill) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;

    const remaining = bill.remainingAmount !== undefined ? bill.remainingAmount : Math.max(0, bill.amount - (bill.paidAmount || 0));
    const monthText = `${getMonthName(bill.month)} ${bill.year}${
      bill.status === 'partial' ? ` (Sisa Pembayaran)` : ''
    }`;

    const url = generateWhatsAppReminderUrl(
      student.parentPhone,
      student.parentName,
      student.name,
      student.classGrade,
      [monthText],
      remaining,
      settings.schoolName,
      settings.bankAccounts
    );
    window.open(url, '_blank');
  };

  const handleConfirmGenerate = () => {
    generateBills({
      month: genMonth,
      year: genYear,
      targetType: genTargetType,
      classGrade: genTargetType === 'class' ? genClassGrade : undefined,
      studentId: genTargetType === 'student' ? genStudentId : undefined,
      customNominal: useCustomNominal ? customNominalAmount : undefined,
    });
    setIsGenerateModalOpen(false);
  };

  const handleSaveNominal = () => {
    if (billToEditNominal && newNominalInput > 0) {
      updateBillNominal(billToEditNominal.id, newNominalInput);
      setBillToEditNominal(null);
    }
  };

  const dupInfo = isGenerateModalOpen ? checkDuplicateCount() : { targetTotal: 0, duplicateCount: 0, duplicateNames: [] };

  return (
    <div className="space-y-4">
      {/* Top Filter and Generator Bar */}
      <div className="bg-white p-4 rounded-lg border border-neutral-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search by Student Name or Receipt */}
          <div className="relative min-w-[210px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari siswa atau no. kuitansi..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-neutral-300 rounded-md focus:outline-hidden focus:border-neutral-900"
            />
          </div>

          {/* Filter Periode Bulan */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-2.5 py-1.5 text-xs border border-neutral-300 rounded-md bg-white text-neutral-700"
          >
            <option value={0}>Semua Bulan</option>
            {MONTH_NAMES_ID.map((name, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {name}
              </option>
            ))}
          </select>

          {/* Filter Tahun */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-2.5 py-1.5 text-xs border border-neutral-300 rounded-md bg-white text-neutral-700"
          >
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>

          {/* Filter Kelas */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-neutral-300 rounded-md bg-white text-neutral-700"
          >
            <option value="all">Semua Kelas</option>
            {classes.map((cls) => (
              <option key={cls} value={cls}>
                Kelas {cls}
              </option>
            ))}
          </select>

          {/* Filter Status Pembayaran: Lunas, Dibayar Sebagian, Belum Bayar, Terlambat */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-neutral-300 rounded-md bg-white text-neutral-700 font-medium"
          >
            <option value="all">Semua Status Tagihan</option>
            <option value="paid">Lunas ({countLunas})</option>
            <option value="partial">Dibayar Sebagian ({countSebagian})</option>
            <option value="unpaid">Belum Bayar ({countBelumBayar})</option>
            <option value="overdue">Terlambat ({countTerlambat})</option>
          </select>
        </div>

        {/* Generate / Terbitkan Tagihan Button */}
        <button
          onClick={() => {
            setGenMonth(settings.activeMonth);
            setGenYear(settings.activeYear);
            setIsGenerateModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-md transition-colors shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Buat Tagihan SPP</span>
        </button>
      </div>

      {/* Rekapitulasi Tagihan KPI Strip (Otomatis Menghitung Total) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-lg border border-neutral-200 text-xs shadow-2xs">
          <span className="text-neutral-500 block">Total Tagihan Diterbitkan:</span>
          <span className="text-base font-bold font-mono text-neutral-900 tabular-nums">
            {formatRupiah(totalAmountBilled)}
          </span>
          <div className="text-[11px] text-neutral-500 mt-1 flex items-center justify-between">
            <span>{filteredBills.length} lembar tagihan</span>
            <span>Periode {selectedMonth > 0 ? getMonthName(selectedMonth) : 'Semua'} {selectedYear}</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-neutral-200 text-xs shadow-2xs">
          <span className="text-neutral-500 block">Total Sudah Terbayar:</span>
          <span className="text-base font-bold font-mono text-emerald-800 tabular-nums">
            {formatRupiah(totalAmountPaid)}
          </span>
          <div className="text-[11px] text-emerald-700 mt-1 flex items-center gap-2">
            <span>{countLunas} Lunas</span>
            <span>·</span>
            <span>{countSebagian} Sebagian</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-neutral-200 text-xs shadow-2xs">
          <span className="text-neutral-500 block">Sisa Tagihan / Tunggakan:</span>
          <span className="text-base font-bold font-mono text-rose-700 tabular-nums">
            {formatRupiah(totalRemainingArrears)}
          </span>
          <div className="text-[11px] text-rose-600 mt-1 flex items-center gap-2">
            <span>{countBelumBayar} Belum Bayar</span>
            <span>·</span>
            <span>{countTerlambat} Lewat Tempo</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-neutral-200 text-xs shadow-2xs flex flex-col justify-between">
          <span className="text-neutral-500 block">Tingkat Kolektibilitas SPP:</span>
          <div className="my-1">
            <span className="text-base font-bold font-mono text-neutral-900 tabular-nums">
              {totalAmountBilled > 0 ? Math.round((totalAmountPaid / totalAmountBilled) * 100) : 0}%
            </span>
            <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-emerald-700"
                style={{
                  width: `${
                    totalAmountBilled > 0
                      ? Math.min(100, Math.round((totalAmountPaid / totalAmountBilled) * 100))
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
          <span className="text-[10px] text-neutral-400">
            Dihitung otomatis dari realisasi bayar
          </span>
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/80 text-neutral-600 border-b border-neutral-200 font-semibold">
              <tr>
                <th className="py-3 px-4">Nama Siswa / Santri</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Bulan Tagihan</th>
                <th className="py-3 px-4">Jatuh Tempo</th>
                <th className="py-3 px-4 text-right">Total Tagihan</th>
                <th className="py-3 px-4 text-right">Sudah Dibayar</th>
                <th className="py-3 px-4 text-right">Sisa Tagihan</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/60">
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-neutral-400">
                    Tidak ada tagihan yang sesuai dengan filter yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredBills.map((bill) => {
                  const statusInfo = getBillStatusInfo(bill.status);
                  const paidVal = bill.paidAmount || 0;
                  const remVal = bill.remainingAmount !== undefined ? bill.remainingAmount : (bill.amount - paidVal);
                  const isFinished = bill.status === 'paid';

                  return (
                    <tr key={bill.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-neutral-900 block">
                          {bill.studentName}
                        </span>
                        {bill.receiptNumber && (
                          <span className="text-[11px] font-mono text-neutral-400 block">
                            Bukti: {bill.receiptNumber}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-medium text-neutral-800">
                        {bill.classGrade}
                      </td>

                      <td className="py-3 px-4 text-neutral-700">
                        {getMonthName(bill.month)} {bill.year}
                      </td>

                      <td className="py-3 px-4 text-neutral-500 font-mono text-[11px]">
                        {formatIndonesianDate(bill.dueDate, 'short')}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-medium text-neutral-900 tabular-nums">
                        {formatRupiah(bill.amount)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-emerald-800 tabular-nums font-medium">
                        {formatRupiah(paidVal)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold tabular-nums">
                        <span className={remVal > 0 ? 'text-rose-700' : 'text-neutral-400'}>
                          {formatRupiah(remVal)}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`text-[11px] ${statusInfo.badgeClass}`}>
                          {statusInfo.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* View Detail Bill */}
                          <button
                            onClick={() => setSelectedBillForDetail(bill)}
                            className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded transition-colors"
                            title="Lihat Detail Tagihan Siswa"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {!isFinished ? (
                            <>
                              {/* Pay Action */}
                              <button
                                onClick={() => handlePayBill(bill.studentId)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded transition-colors"
                              >
                                <CreditCard className="w-3 h-3" />
                                <span>Bayar</span>
                              </button>

                              {/* WhatsApp Reminder */}
                              <button
                                onClick={() => handleSendWhatsApp(bill.studentId, bill)}
                                className="p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded transition-colors"
                                title="Kirim WhatsApp Tagihan ke Wali"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit Nominal if no payments made yet */}
                              {paidVal === 0 && (
                                <button
                                  onClick={() => {
                                    setBillToEditNominal(bill);
                                    setNewNominalInput(bill.amount);
                                  }}
                                  className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded transition-colors"
                                  title="Ubah Nominal Tagihan Ini"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Delete bill if no payment made */}
                              {paidVal === 0 && (
                                <button
                                  onClick={() => deleteBill(bill.id)}
                                  className="p-1.5 text-rose-500 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors"
                                  title="Hapus Tagihan Ini"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="text-[11px] text-neutral-400 font-mono">
                              {bill.paidDate ? formatIndonesianDate(bill.paidDate, 'short') : 'Lunas'}
                            </span>
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

      {/* Modal 1: Buat Tagihan SPP Bulanan dengan PENCEGAHAN TAGIHAN GANDA */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden border border-neutral-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 bg-neutral-50">
              <div>
                <h4 className="text-sm font-bold text-neutral-900">
                  Buat Tagihan SPP Bulanan
                </h4>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Tentukan target siswa, bulan, tahun, dan nominal penagihan
                </p>
              </div>
              <button
                onClick={() => setIsGenerateModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded hover:bg-neutral-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Periode: Bulan dan Tahun */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Periode Bulan</label>
                  <select
                    value={genMonth}
                    onChange={(e) => setGenMonth(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md bg-white focus:outline-hidden"
                  >
                    {MONTH_NAMES_ID.map((m, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Tahun Tagihan</label>
                  <select
                    value={genYear}
                    onChange={(e) => setGenYear(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md bg-white focus:outline-hidden"
                  >
                    <option value={2026}>2026</option>
                    <option value={2027}>2027</option>
                  </select>
                </div>
              </div>

              {/* Target Siswa */}
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Target Penerbitan</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setGenTargetType('all')}
                    className={`py-2 px-3 rounded-md border text-center transition-all ${
                      genTargetType === 'all'
                        ? 'border-neutral-900 bg-neutral-900 text-white font-semibold'
                        : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                    }`}
                  >
                    Semua Siswa Aktif
                  </button>
                  <button
                    type="button"
                    onClick={() => setGenTargetType('class')}
                    className={`py-2 px-3 rounded-md border text-center transition-all ${
                      genTargetType === 'class'
                        ? 'border-neutral-900 bg-neutral-900 text-white font-semibold'
                        : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                    }`}
                  >
                    Berdasarkan Kelas
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGenTargetType('student');
                      if (!genStudentId && activeStudents.length > 0) {
                        setGenStudentId(activeStudents[0].id);
                      }
                    }}
                    className={`py-2 px-3 rounded-md border text-center transition-all ${
                      genTargetType === 'student'
                        ? 'border-neutral-900 bg-neutral-900 text-white font-semibold'
                        : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                    }`}
                  >
                    Per Siswa Tertentu
                  </button>
                </div>
              </div>

              {/* Conditional dropdown if per class */}
              {genTargetType === 'class' && (
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Pilih Kelas</label>
                  <select
                    value={genClassGrade}
                    onChange={(e) => setGenClassGrade(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md bg-white focus:outline-hidden"
                  >
                    {classes.map((cls) => (
                      <option key={cls} value={cls}>
                        Kelas {cls} ({activeStudents.filter((s) => s.classGrade === cls).length} siswa aktif)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Conditional dropdown if per student */}
              {genTargetType === 'student' && (
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Pilih Siswa / Santri</label>
                  <select
                    value={genStudentId}
                    onChange={(e) => setGenStudentId(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md bg-white focus:outline-hidden"
                  >
                    {activeStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} - {s.classGrade} (NIS: {s.nis})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Override Nominal Option */}
              <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                <label className="flex items-center gap-2 cursor-pointer mb-2 font-medium text-neutral-800">
                  <input
                    type="checkbox"
                    checked={useCustomNominal}
                    onChange={(e) => setUseCustomNominal(e.target.checked)}
                    className="rounded border-neutral-300 text-neutral-900 focus:ring-0"
                  />
                  <span>Tentukan nominal SPP seragam untuk tagihan ini</span>
                </label>

                {useCustomNominal ? (
                  <div className="relative mt-2">
                    <span className="absolute left-3 top-2 text-neutral-500 font-mono">Rp</span>
                    <input
                      type="number"
                      step="25000"
                      value={customNominalAmount}
                      onChange={(e) => setCustomNominalAmount(parseInt(e.target.value) || 0)}
                      className="w-full pl-10 pr-3 py-1.5 border border-neutral-300 rounded-md font-mono text-sm font-bold bg-white"
                    />
                  </div>
                ) : (
                  <p className="text-[11px] text-neutral-500">
                    Nominal otomatis menggunakan tarif masing-masing siswa / standar kelas.
                  </p>
                )}
              </div>

              {/* PREVENSI TAGIHAN GANDA (Anti-duplicate warning block) */}
              <div className="p-3 rounded-lg border border-neutral-200 bg-neutral-50">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-neutral-900 block text-xs">
                      Proteksi Tagihan Ganda Aktif
                    </span>
                    <p className="text-[11px] text-neutral-600 mt-0.5 leading-relaxed">
                      Sistem memeriksa basis data untuk memastikan tidak ada siswa yang memiliki lebih
                      dari satu tagihan pada periode yang sama ({getMonthName(genMonth)} {genYear}).
                    </p>
                    {dupInfo.duplicateCount > 0 ? (
                      <div className="mt-2 text-[11px] text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                        <span className="font-semibold block">
                          Pemberitahuan Duplikasi: {dupInfo.duplicateCount} dari {dupInfo.targetTotal} siswa sudah memiliki tagihan untuk bulan ini.
                        </span>
                        <span className="block mt-0.5">
                          Siswa yang sudah memiliki tagihan akan <strong>otomatis dilewati</strong> agar tidak terjadi tagihan ganda.
                        </span>
                      </div>
                    ) : (
                      <div className="mt-1 text-[11px] text-emerald-700 font-medium">
                        ✓ Seluruh {dupInfo.targetTotal} siswa target belum memiliki tagihan pada bulan ini.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-neutral-200 bg-neutral-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsGenerateModalOpen(false)}
                className="px-3 py-1.5 border border-neutral-300 rounded text-neutral-700 hover:bg-neutral-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmGenerate}
                disabled={dupInfo.targetTotal === 0 || (dupInfo.duplicateCount === dupInfo.targetTotal)}
                className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-semibold rounded transition-colors"
              >
                Terbitkan Tagihan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Detail Tagihan Per Siswa */}
      {selectedBillForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-neutral-200 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div>
                <h4 className="text-sm font-bold text-neutral-900">Detail Tagihan Siswa</h4>
                <p className="text-neutral-500 text-[11px]">
                  Rincian tagihan SPP {getMonthName(selectedBillForDetail.month)} {selectedBillForDetail.year}
                </p>
              </div>
              <button
                onClick={() => setSelectedBillForDetail(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Nama Siswa</span>
                <span className="font-semibold text-neutral-900">{selectedBillForDetail.studentName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Kelas</span>
                <span className="font-medium text-neutral-900">{selectedBillForDetail.classGrade}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Jatuh Tempo</span>
                <span className="font-mono text-neutral-700">
                  {formatIndonesianDate(selectedBillForDetail.dueDate, 'long')}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Status Pembayaran</span>
                <span className={`font-semibold ${getBillStatusInfo(selectedBillForDetail.status).badgeClass}`}>
                  {getBillStatusInfo(selectedBillForDetail.status).label}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Total Tagihan</span>
                <span className="font-mono font-bold text-neutral-900">
                  {formatRupiah(selectedBillForDetail.amount)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Telah Dibayar</span>
                <span className="font-mono font-bold text-emerald-800">
                  {formatRupiah(selectedBillForDetail.paidAmount || 0)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Sisa Tagihan</span>
                <span className="font-mono font-bold text-rose-700">
                  {formatRupiah(
                    selectedBillForDetail.remainingAmount !== undefined
                      ? selectedBillForDetail.remainingAmount
                      : selectedBillForDetail.amount - (selectedBillForDetail.paidAmount || 0)
                  )}
                </span>
              </div>
            </div>

            {/* Riwayat Pembayaran jika pernah dicicil (partial) */}
            {selectedBillForDetail.historyPayments && selectedBillForDetail.historyPayments.length > 0 && (
              <div className="pt-2">
                <span className="font-bold text-neutral-900 block mb-1.5 text-[11px] uppercase tracking-wider">
                  Riwayat Cicilan Pembayaran
                </span>
                <div className="space-y-1.5">
                  {selectedBillForDetail.historyPayments.map((hist, i) => (
                    <div key={i} className="p-2 rounded bg-neutral-50 border border-neutral-200 text-[11px] flex justify-between">
                      <div>
                        <span className="font-mono font-semibold block">{hist.receiptNumber}</span>
                        <span className="text-neutral-400 text-[10px]">
                          {formatIndonesianDate(hist.date, 'with-time')}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-emerald-800">
                        {formatRupiah(hist.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-neutral-200 flex justify-end">
              <button
                onClick={() => setSelectedBillForDetail(null)}
                className="px-4 py-1.5 border border-neutral-300 rounded text-neutral-700 hover:bg-neutral-50"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Edit Nominal Tagihan */}
      {billToEditNominal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5 border border-neutral-200 text-xs">
            <h4 className="text-sm font-bold text-neutral-900">Ubah Besaran Tagihan SPP</h4>
            <p className="text-neutral-600 mt-1 leading-relaxed">
              Ubah tarif tagihan bulan {getMonthName(billToEditNominal.month)} {billToEditNominal.year} untuk{' '}
              <strong>{billToEditNominal.studentName}</strong>.
            </p>

            <div className="my-4">
              <label className="block font-semibold text-neutral-700 mb-1">Nominal Baru (Rp)</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-neutral-500 font-mono">Rp</span>
                <input
                  type="number"
                  step="25000"
                  value={newNominalInput}
                  onChange={(e) => setNewNominalInput(parseInt(e.target.value) || 0)}
                  className="w-full pl-10 pr-3 py-1.5 border border-neutral-300 rounded font-mono text-sm font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
              <button
                onClick={() => setBillToEditNominal(null)}
                className="px-3 py-1.5 border border-neutral-300 rounded hover:bg-neutral-50"
              >
                Batal
              </button>
              <button
                onClick={handleSaveNominal}
                className="px-4 py-1.5 bg-neutral-900 text-white font-semibold rounded hover:bg-neutral-800"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
