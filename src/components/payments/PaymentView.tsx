import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Bill, PaymentMethodType } from '../../types';
import {
  formatIndonesianDate,
  formatRupiah,
  getMonthName,
  getBillStatusInfo,
  getPaymentMethodLabel,
  numberToWordsIndonesian,
} from '../../utils/formatters';
import {
  Search,
  CreditCard,
  Banknote,
  QrCode,
  Building,
  CheckCircle,
  AlertCircle,
  Calendar,
  FileText,
  Calculator,
  ArrowRight,
  X,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';

export const PaymentView: React.FC = () => {
  const {
    students,
    bills,
    settings,
    processPayment,
    setSelectedReceiptForModal,
    preselectedStudentForPayment,
    setPreselectedStudentForPayment,
  } = useApp();

  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    preselectedStudentForPayment || ''
  );
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [selectedBillIds, setSelectedBillIds] = useState<string[]>([]);
  const [customPayAmounts, setCustomPayAmounts] = useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('tunai');
  const [selectedBankName, setSelectedBankName] = useState<string>(
    settings.bankAccounts[0]
      ? `${settings.bankAccounts[0].bankName} (${settings.bankAccounts[0].accountNumber})`
      : 'Bank Syariah Indonesia (BSI)'
  );
  const [transactionDate, setTransactionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Dedicated Confirmation Modal state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (preselectedStudentForPayment) {
      setSelectedStudentId(preselectedStudentForPayment);
      setPreselectedStudentForPayment(null);
    }
  }, [preselectedStudentForPayment, setPreselectedStudentForPayment]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  // Helper to reliably compute remaining unpaid balance
  const getRemainingBalance = (b: Bill): number => {
    if (b.remainingAmount !== undefined) {
      return b.remainingAmount;
    }
    return Math.max(0, b.amount - (b.paidAmount || 0));
  };

  // Unpaid, overdue, or partially paid bills for chosen student
  const payableBills = bills.filter(
    (b) => b.studentId === selectedStudentId && b.status !== 'paid' && getRemainingBalance(b) > 0
  );

  // Initialize selected bills & payment amounts whenever student selection changes
  useEffect(() => {
    if (selectedStudentId) {
      const studentPayables = bills.filter(
        (b) => b.studentId === selectedStudentId && b.status !== 'paid' && getRemainingBalance(b) > 0
      );
      setSelectedBillIds(studentPayables.map((b) => b.id));

      const initialAmounts: Record<string, number> = {};
      studentPayables.forEach((b) => {
        initialAmounts[b.id] = getRemainingBalance(b);
      });
      setCustomPayAmounts(initialAmounts);
      setValidationError(null);
    } else {
      setSelectedBillIds([]);
      setCustomPayAmounts({});
      setValidationError(null);
    }
  }, [selectedStudentId, bills]);

  // Total amount calculated from the customPayAmounts of selected bills
  const totalAmountToPay = selectedBillIds.reduce((sum, billId) => {
    return sum + (customPayAmounts[billId] || 0);
  }, 0);

  // Total obligations of selected bills before this payment
  const totalOriginalRemaining = selectedBillIds.reduce((sum, billId) => {
    const b = payableBills.find((x) => x.id === billId);
    if (!b) return sum;
    return sum + getRemainingBalance(b);
  }, 0);

  // Remaining obligation balance after this transaction
  const totalRemainingAfterPayment = Math.max(0, totalOriginalRemaining - totalAmountToPay);

  // Auto-sync cash received when payment method is cash
  useEffect(() => {
    if (paymentMethod === 'tunai') {
      setCashReceived((prev) => (prev < totalAmountToPay ? totalAmountToPay : prev));
    }
  }, [totalAmountToPay, paymentMethod]);

  const changeReturned = Math.max(0, cashReceived - totalAmountToPay);

  const handleToggleBill = (billId: string) => {
    setValidationError(null);
    setSelectedBillIds((prev) => {
      const isAlreadySelected = prev.includes(billId);
      if (isAlreadySelected) {
        return prev.filter((id) => id !== billId);
      } else {
        const b = payableBills.find((x) => x.id === billId);
        if (b && !customPayAmounts[billId]) {
          setCustomPayAmounts((curr) => ({
            ...curr,
            [billId]: getRemainingBalance(b),
          }));
        }
        return [...prev, billId];
      }
    });
  };

  const handlePayAmountChange = (billId: string, rawValue: number, maxAmount: number) => {
    setValidationError(null);
    const amount = isNaN(rawValue) ? 0 : Math.max(0, rawValue);

    if (amount > maxAmount) {
      setValidationError(`Nominal pembayaran melebihi sisa tagihan (${formatRupiah(maxAmount)})`);
    }

    setCustomPayAmounts((prev) => ({
      ...prev,
      [billId]: amount,
    }));
  };

  const handleSetFullPayment = (billId: string, maxAmount: number) => {
    setValidationError(null);
    setCustomPayAmounts((prev) => ({
      ...prev,
      [billId]: maxAmount,
    }));
  };

  // Step 1: Validate and open Confirmation Modal
  const handleOpenConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setConfirmError(null);

    if (!selectedStudent) {
      setValidationError('Pilih siswa/santri terlebih dahulu.');
      return;
    }

    if (selectedBillIds.length === 0) {
      setValidationError('Pilih minimal satu tagihan bulan yang akan dibayar.');
      return;
    }

    if (totalAmountToPay <= 0) {
      setValidationError('Nominal pembayaran harus lebih dari Rp 0.');
      return;
    }

    // Validate that no item exceeds remaining
    for (const billId of selectedBillIds) {
      const b = payableBills.find((x) => x.id === billId);
      if (!b) continue;
      const rem = getRemainingBalance(b);
      const amount = customPayAmounts[billId] || 0;
      if (amount <= 0) {
        setValidationError(
          `Nominal pembayaran untuk bulan ${getMonthName(b.month)} ${b.year} harus lebih dari Rp 0.`
        );
        return;
      }
      if (amount > rem) {
        setValidationError(
          `Nominal pembayaran untuk bulan ${getMonthName(b.month)} ${b.year} (${formatRupiah(
            amount
          )}) melebihi sisa tagihan (${formatRupiah(rem)}).`
        );
        return;
      }
    }

    if (paymentMethod === 'tunai' && cashReceived < totalAmountToPay) {
      setValidationError('Uang tunai yang diterima kurang dari total yang harus dibayar.');
      return;
    }

    // All preliminary checks passed: open confirmation modal
    setIsConfirmModalOpen(true);
  };

  // Step 2: Final execution and saving of payment
  const handleExecutePayment = () => {
    if (!selectedStudent) return;
    setIsSubmitting(true);
    setConfirmError(null);

    try {
      const items = selectedBillIds
        .map((id) => ({
          billId: id,
          payAmount: customPayAmounts[id] || 0,
        }))
        .filter((item) => item.payAmount > 0);

      const receipt = processPayment({
        studentId: selectedStudent.id,
        items,
        paymentMethod,
        bankName: paymentMethod.startsWith('transfer') ? selectedBankName : undefined,
        paymentDate: transactionDate,
        cashReceived: paymentMethod === 'tunai' ? cashReceived : undefined,
        notes: notes.trim() || undefined,
      });

      if (receipt) {
        setIsConfirmModalOpen(false);
        setSelectedReceiptForModal(receipt);
        setSelectedStudentId('');
        setSelectedBillIds([]);
        setCustomPayAmounts({});
        setCashReceived(0);
        setNotes('');
        setValidationError(null);
      } else {
        setConfirmError('Gagal menyimpan transaksi. Pastikan nominal tidak melebihi sisa tagihan.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan sistem saat menyimpan pembayaran.';
      setConfirmError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.status === 'active' &&
      (s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.nis.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.classGrade.toLowerCase().includes(studentSearch.toLowerCase()))
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 1. Header & Student Search */}
      <div className="bg-white p-5 rounded-lg border border-neutral-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-100">
          <div>
            <h2 className="text-base font-bold text-neutral-900">
              Loket Pencatatan Pembayaran SPP
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Input pembayaran SPP siswa/santri, pelunasan sebagian (cicilan), dan cetak bukti kuitansi resmi
            </p>
          </div>
          <div className="text-xs text-neutral-500 font-mono">
            Petugas TU: <span className="font-semibold text-neutral-900">{settings.treasurerName}</span>
          </div>
        </div>

        {/* Step 1: Search & Select Student */}
        <div className="pt-4">
          <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
            1. Cari & Pilih Siswa / Santri yang Membayar:
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
            <input
              type="text"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="Cari berdasarkan nama santri atau nomor induk (NIS)..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-hidden focus:border-neutral-900"
            />
          </div>

          {studentSearch && (
            <div className="mt-1 border border-neutral-200 rounded-md bg-white shadow-lg max-h-48 overflow-y-auto divide-y divide-neutral-100 z-10 relative">
              {filteredStudents.length === 0 ? (
                <div className="p-3 text-xs text-neutral-400 text-center">
                  Tidak ditemukan siswa dengan kata kunci "{studentSearch}".
                </div>
              ) : (
                filteredStudents.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelectedStudentId(s.id);
                      setStudentSearch('');
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-neutral-50 flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <span className="font-semibold text-neutral-900">{s.name}</span>
                      <span className="text-neutral-400 ml-2 font-mono">NIS: {s.nis}</span>
                    </div>
                    <span className="text-neutral-600 font-medium">Kelas {s.classGrade}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Selected Student Profile Overview */}
        {selectedStudent && (
          <div className="mt-4 p-4 rounded-lg bg-neutral-50 border border-neutral-200 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-neutral-200">
              <div>
                <span className="font-bold text-neutral-900 text-sm">{selectedStudent.name}</span>
                <span className="text-neutral-400 mx-2">·</span>
                <span className="font-mono text-neutral-600">NIS: {selectedStudent.nis}</span>
                <span className="text-neutral-400 mx-2">·</span>
                <span className="font-semibold text-neutral-800">Kelas {selectedStudent.classGrade}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedStudentId('');
                  setSelectedBillIds([]);
                  setCustomPayAmounts({});
                }}
                className="text-[11px] text-rose-600 hover:text-rose-800 font-medium text-left"
              >
                Ganti Siswa
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 text-[11px] text-neutral-600">
              <div>
                Wali: <strong className="text-neutral-800">{selectedStudent.parentName}</strong>
              </div>
              <div>
                Kategori:{' '}
                <strong className="text-neutral-800">
                  {selectedStudent.category === 'asrama_santri' ? 'Santri Mukim Asrama' : 'Reguler'}
                </strong>
              </div>
              <div>
                Tarif Bulanan:{' '}
                <strong className="font-mono text-neutral-800">
                  {formatRupiah(selectedStudent.monthlyFee)}
                </strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Unpaid Bills Selection & Amount Inputs */}
      {selectedStudent && (
        <form noValidate onSubmit={handleOpenConfirmation} className="space-y-6">
          <div className="bg-white p-5 rounded-lg border border-neutral-200 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div>
                <h3 className="text-xs font-semibold text-neutral-700">
                  2. Pilih Tagihan Bulan yang Akan Dibayar:
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Daftar tagihan yang belum lunas. Masukkan nominal untuk pelunasan penuh atau sebagian (cicilan).
                </p>
              </div>
              {payableBills.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedBillIds.length === payableBills.length) {
                      setSelectedBillIds([]);
                    } else {
                      setSelectedBillIds(payableBills.map((b) => b.id));
                    }
                  }}
                  className="text-xs text-emerald-800 hover:underline font-medium"
                >
                  {selectedBillIds.length === payableBills.length ? 'Batal Pilih Semua' : 'Pilih Semua Bulan'}
                </button>
              )}
            </div>

            {payableBills.length === 0 ? (
              <div className="py-8 text-center text-xs">
                <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <span className="font-semibold text-neutral-800 block">
                  Semua Tagihan Siswa Ini Sudah Lunas!
                </span>
                <span className="text-neutral-500">
                  Tidak ada tunggakan pembayaran untuk {selectedStudent.name}.
                </span>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 mt-2">
                {payableBills.map((bill) => {
                  const isChecked = selectedBillIds.includes(bill.id);
                  const statusInfo = getBillStatusInfo(bill.status);
                  const remaining = getRemainingBalance(bill);
                  const currentInput = customPayAmounts[bill.id] ?? remaining;
                  const willBeFullyPaid = currentInput >= remaining;
                  const remainingAfterThis = Math.max(0, remaining - currentInput);
                  const hasOverdue = bill.status === 'overdue';

                  return (
                    <div
                      key={bill.id}
                      className={`p-3 rounded-md transition-colors ${
                        isChecked ? 'bg-neutral-50/90' : 'hover:bg-neutral-50/50'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <label className="flex items-start sm:items-center gap-3 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleBill(bill.id)}
                            className="w-4 h-4 text-neutral-900 border-neutral-300 rounded focus:ring-0 mt-0.5 sm:mt-0"
                          />
                          <div>
                            <span className="font-semibold text-neutral-900 text-xs block">
                              SPP Bulan {getMonthName(bill.month)} {bill.year}
                            </span>
                            <div className="text-[11px] text-neutral-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                              <span>Jatuh tempo: {formatIndonesianDate(bill.dueDate, 'short')}</span>
                              <span>·</span>
                              <span className={`font-semibold ${statusInfo.badgeClass}`}>
                                {statusInfo.label}
                              </span>
                              {hasOverdue && (
                                <span className="text-rose-600 font-medium">· Lewat Tempo</span>
                              )}
                              {bill.paidAmount && bill.paidAmount > 0 && (
                                <span className="text-neutral-400 font-mono">
                                  · Telah dicicil: {formatRupiah(bill.paidAmount)}
                                </span>
                              )}
                            </div>
                          </div>
                        </label>

                        {/* Input Box per tagihan */}
                        <div className="flex items-center gap-3 self-end sm:self-center">
                          <div className="text-right">
                            <span className="text-[10px] text-neutral-400 block">Sisa Tagihan</span>
                            <span className="font-mono text-xs font-semibold text-neutral-900 tabular-nums">
                              {formatRupiah(remaining)}
                            </span>
                          </div>

                          {isChecked && (
                            <div className="w-44">
                              <div className="flex items-center justify-between text-[10px] text-neutral-500 mb-0.5">
                                <span>Bayar Sekarang (Rp)</span>
                                <button
                                  type="button"
                                  onClick={() => handleSetFullPayment(bill.id, remaining)}
                                  className="text-emerald-800 font-medium hover:underline"
                                >
                                  Lunas
                                </button>
                              </div>
                              <input
                                type="number"
                                min="0"
                                value={currentInput === 0 ? '' : currentInput}
                                placeholder="0"
                                onChange={(e) =>
                                  handlePayAmountChange(
                                    bill.id,
                                    e.target.value === '' ? 0 : parseInt(e.target.value) || 0,
                                    remaining
                                  )
                                }
                                className={`w-full px-2 py-1 text-xs font-mono font-bold border rounded bg-white tabular-nums focus:outline-hidden ${
                                  currentInput > remaining
                                    ? 'border-rose-500 text-rose-700'
                                    : 'border-neutral-300 text-neutral-900 focus:border-neutral-900'
                                }`}
                              />
                              <div className="text-[10px] text-right mt-0.5">
                                {willBeFullyPaid ? (
                                  <span className="text-emerald-700 font-medium">Status: Lunas</span>
                                ) : (
                                  <span className="text-amber-700 font-medium">
                                    Sisa: {formatRupiah(remainingAfterThis)} (Sebagian)
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Transaction Details, Payment Method & Date */}
          {payableBills.length > 0 && selectedBillIds.length > 0 && (
            <div className="bg-white p-5 rounded-lg border border-neutral-200 shadow-2xs space-y-5">
              <h3 className="text-xs font-semibold text-neutral-700 pb-2 border-b border-neutral-100">
                3. Rincian & Metode Pembayaran Kasir:
              </h3>

              {/* Tanggal Pembayaran & Kanal Pembayaran */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Tanggal Pembayaran Transaksi:
                  </label>
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
                    <input
                      type="date"
                      value={transactionDate}
                      onChange={(e) => setTransactionDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs border border-neutral-300 rounded-md font-mono bg-white focus:outline-hidden focus:border-neutral-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Nama Kasir / Bendahara Penerima:
                  </label>
                  <input
                    type="text"
                    disabled
                    value={settings.treasurerName}
                    className="w-full px-3 py-1.5 text-xs border border-neutral-200 rounded-md bg-neutral-100 text-neutral-600 font-medium"
                  />
                </div>
              </div>

              {/* Payment Methods Tabs */}
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-2">
                  Metode Pembayaran (Pencatatan Manual):
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('tunai')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                      paymentMethod === 'tunai'
                        ? 'border-neutral-900 bg-neutral-900 text-white font-semibold'
                        : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Tunai (Cash TU)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('transfer_bank')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                      paymentMethod.startsWith('transfer')
                        ? 'border-neutral-900 bg-neutral-900 text-white font-semibold'
                        : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <Building className="w-4 h-4" />
                    <span>Transfer Bank</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('qris')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                      paymentMethod === 'qris'
                        ? 'border-neutral-900 bg-neutral-900 text-white font-semibold'
                        : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Scan QRIS</span>
                  </button>
                </div>
              </div>

              {/* Sub-selector if Transfer Bank */}
              {paymentMethod.startsWith('transfer') && (
                <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Pilih Rekening Bank Tujuan Transfer:
                  </label>
                  <select
                    value={selectedBankName}
                    onChange={(e) => setSelectedBankName(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md bg-white text-xs font-medium focus:outline-hidden"
                  >
                    {settings.bankAccounts.map((b) => (
                      <option key={b.id} value={`${b.bankName} (${b.accountNumber})`}>
                        {b.bankName} - {b.accountNumber} a.n {b.accountHolder}
                      </option>
                    ))}
                    <option value="Transfer Bank Lain">Transfer Bank Lain / Antar Bank</option>
                  </select>
                </div>
              )}

              {/* Cash Calculation UI if Tunai */}
              {paymentMethod === 'tunai' && (
                <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Jumlah Uang Tunai Diterima dari Siswa:
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-xs font-mono text-neutral-500">
                          Rp
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={cashReceived === 0 ? '' : cashReceived}
                          placeholder="0"
                          onChange={(e) =>
                            setCashReceived(e.target.value === '' ? 0 : parseInt(e.target.value) || 0)
                          }
                          className="w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-md font-mono text-sm font-bold tabular-nums bg-white focus:outline-hidden focus:border-neutral-900"
                        />
                      </div>
                      {/* Fast Cash Buttons */}
                      <div className="flex gap-1.5 mt-2">
                        <button
                          type="button"
                          onClick={() => setCashReceived(totalAmountToPay)}
                          className="px-2 py-1 bg-white border border-neutral-200 text-[11px] rounded hover:bg-neutral-100 font-mono"
                        >
                          Uang Pas
                        </button>
                        <button
                          type="button"
                          onClick={() => setCashReceived(Math.ceil(totalAmountToPay / 50000) * 50000 || totalAmountToPay)}
                          className="px-2 py-1 bg-white border border-neutral-200 text-[11px] rounded hover:bg-neutral-100 font-mono"
                        >
                          Genapkan 50k
                        </button>
                        <button
                          type="button"
                          onClick={() => setCashReceived(Math.ceil(totalAmountToPay / 100000) * 100000 || totalAmountToPay)}
                          className="px-2 py-1 bg-white border border-neutral-200 text-[11px] rounded hover:bg-neutral-100 font-mono"
                        >
                          Genapkan 100k
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Uang Kembalian:
                      </label>
                      <div className="py-2 px-3 bg-white border border-neutral-300 rounded-md font-mono text-base font-bold text-emerald-700 tabular-nums">
                        {formatRupiah(changeReturned)}
                      </div>
                      {cashReceived < totalAmountToPay && (
                        <p className="text-[11px] text-rose-600 flex items-center gap-1 mt-1 font-medium">
                          <AlertCircle className="w-3 h-3" />
                          <span>Uang diterima kurang dari total yang harus dibayar!</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">
                  Catatan Pembayaran (Opsional):
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Titipan orang tua melalui wali kelas, cicilan tahap 1..."
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-hidden focus:border-neutral-900"
                />
              </div>

              {/* Validation Error Banner */}
              {validationError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Automatic Calculation Summary Strip */}
              <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200 text-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-neutral-500 block">Sisa Tagihan Sebelumnya:</span>
                  <span className="font-mono font-bold text-neutral-900 text-sm tabular-nums">
                    {formatRupiah(totalOriginalRemaining)}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Dibayarkan Transaksi Ini:</span>
                  <span className="font-mono font-bold text-emerald-800 text-sm tabular-nums">
                    {formatRupiah(totalAmountToPay)}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Sisa Saldo Setelah Transaksi:</span>
                  <span
                    className={`font-mono font-bold text-sm tabular-nums ${
                      totalRemainingAfterPayment > 0 ? 'text-rose-700' : 'text-emerald-700'
                    }`}
                  >
                    {formatRupiah(totalRemainingAfterPayment)}
                  </span>
                  <span className="text-[10px] text-neutral-500 block">
                    {totalRemainingAfterPayment === 0 ? '✓ Lunas Seluruhnya' : 'Status: Dibayar Sebagian'}
                  </span>
                </div>
              </div>

              {/* Submit / Proceed to Confirmation Button */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-neutral-500 block">Total Pembayaran:</span>
                  <span className="text-2xl font-bold font-mono text-neutral-900 tabular-nums">
                    {formatRupiah(totalAmountToPay)}
                  </span>
                  <span className="text-xs text-neutral-400 block">
                    {selectedBillIds.length} tagihan bulan diproses
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={totalAmountToPay <= 0 || (paymentMethod === 'tunai' && cashReceived < totalAmountToPay)}
                  className="px-6 py-3 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:bg-neutral-300 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors whitespace-nowrap flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Konfirmasi Pembayaran</span>
                </button>
              </div>
            </div>
          )}
        </form>
      )}

      {/* DEDICATED MODAL: KONFIRMASI PEMBAYARAN SPP */}
      {isConfirmModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden border border-neutral-200">
            {/* Header Modal */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 bg-neutral-50">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Konfirmasi Pembayaran SPP</h3>
                  <p className="text-[11px] text-neutral-500">
                    Periksa kembali data transaksi sebelum disimpan ke sistem
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded hover:bg-neutral-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* Error in modal if any */}
              {confirmError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{confirmError}</span>
                </div>
              )}

              {/* Student Overview Card */}
              <div className="bg-neutral-50 p-3.5 rounded-lg border border-neutral-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neutral-900 text-sm">{selectedStudent.name}</span>
                  <span className="font-semibold text-neutral-700 bg-white px-2 py-0.5 rounded border border-neutral-200">
                    Kelas {selectedStudent.classGrade}
                  </span>
                </div>
                <div className="text-[11px] text-neutral-500 flex items-center gap-2 font-mono">
                  <span>NIS: {selectedStudent.nis}</span>
                  <span>·</span>
                  <span>Wali: {selectedStudent.parentName}</span>
                </div>
              </div>

              {/* Transaction Metadata */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-50/60 rounded-lg border border-neutral-200 text-[11px]">
                <div>
                  <span className="text-neutral-500 block">Tanggal Pembayaran:</span>
                  <strong className="text-neutral-800 font-mono">
                    {formatIndonesianDate(transactionDate, 'long')}
                  </strong>
                </div>
                <div>
                  <span className="text-neutral-500 block">Metode Pembayaran:</span>
                  <strong className="text-neutral-800">
                    {getPaymentMethodLabel(paymentMethod)}
                  </strong>
                </div>
                {paymentMethod.startsWith('transfer') && (
                  <div className="col-span-2">
                    <span className="text-neutral-500 block">Rekening Tujuan:</span>
                    <strong className="text-neutral-800">{selectedBankName}</strong>
                  </div>
                )}
                <div className="col-span-2">
                  <span className="text-neutral-500 block">Kasir / Penerima:</span>
                  <strong className="text-neutral-800">{settings.treasurerName}</strong>
                </div>
              </div>

              {/* Bills breakdown */}
              <div>
                <span className="text-[11px] font-semibold text-neutral-700 block mb-1.5">
                  Rincian Tagihan yang Dibayarkan:
                </span>
                <div className="border border-neutral-200 rounded-lg overflow-hidden divide-y divide-neutral-100">
                  {selectedBillIds.map((billId) => {
                    const b = payableBills.find((x) => x.id === billId);
                    if (!b) return null;
                    const rem = getRemainingBalance(b);
                    const payVal = customPayAmounts[billId] || 0;
                    const remAfter = Math.max(0, rem - payVal);
                    const isLunas = remAfter === 0;

                    return (
                      <div key={b.id} className="p-2.5 flex items-center justify-between bg-white text-xs">
                        <div>
                          <span className="font-semibold text-neutral-900 block">
                            SPP Bulan {getMonthName(b.month)} {b.year}
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            {isLunas ? (
                              <span className="text-emerald-700 font-medium">Lunas</span>
                            ) : (
                              <span className="text-amber-700 font-medium">
                                Sebagian (Sisa: {formatRupiah(remAfter)})
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-neutral-900 tabular-nums">
                            {formatRupiah(payVal)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total & Terbilang */}
              <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-emerald-900">Total Nominal Pembayaran:</span>
                  <span className="text-lg font-bold font-mono text-emerald-900 tabular-nums">
                    {formatRupiah(totalAmountToPay)}
                  </span>
                </div>
                <div className="text-[10px] text-emerald-800 italic mt-0.5">
                  Terbilang: {numberToWordsIndonesian(totalAmountToPay)}
                </div>

                {paymentMethod === 'tunai' && (
                  <div className="mt-2.5 pt-2 border-t border-emerald-200/80 grid grid-cols-2 text-[11px]">
                    <div>
                      <span className="text-emerald-700 block">Uang Diterima:</span>
                      <span className="font-mono font-semibold text-emerald-900">
                        {formatRupiah(cashReceived)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-emerald-700 block">Kembalian:</span>
                      <span className="font-mono font-bold text-emerald-900">
                        {formatRupiah(changeReturned)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {notes && (
                <div className="p-2 bg-neutral-50 rounded border border-neutral-200 text-[11px] text-neutral-600">
                  <span className="font-semibold text-neutral-700">Catatan:</span> {notes}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-neutral-200 bg-neutral-50">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-200 bg-neutral-100 rounded-md transition-colors"
              >
                Kembali & Ubah
              </button>
              <button
                type="button"
                onClick={handleExecutePayment}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:bg-neutral-300 rounded-md shadow-sm transition-colors cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{isSubmitting ? 'Menyimpan...' : 'Ya, Konfirmasi & Simpan Transaksi'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
