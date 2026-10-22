import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  formatIndonesianDate,
  formatRupiah,
  getMonthName,
  getPaymentMethodLabel,
  MONTH_NAMES_ID,
  generateWhatsAppReminderUrl,
} from '../../utils/formatters';
import {
  Printer,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  User,
  Search,
  Building,
  Phone,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';

type ReportTab = 'rekap' | 'tunggakan' | 'sebagian' | 'kelas' | 'siswa';

export const ReportsView: React.FC = () => {
  const { students, bills, payments, settings, setSelectedReceiptForModal, addNotification } = useApp();

  // Active Report Tab
  const [activeTab, setActiveTab] = useState<ReportTab>('rekap');

  // Filters
  const [periodType, setPeriodType] = useState<'all' | 'monthly' | 'daily'>('all');
  const [filterMonth, setFilterMonth] = useState<number>(settings.activeMonth);
  const [filterYear, setFilterYear] = useState<number>(settings.activeYear);
  const [filterStartDate, setFilterStartDate] = useState<string>('2026-07-01');
  const [filterEndDate, setFilterEndDate] = useState<string>('2026-12-31');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [searchStudentTerm, setSearchStudentTerm] = useState<string>('');

  const classes = Array.from(new Set(students.map((s) => s.classGrade))).sort();

  // Valid, non-cancelled payments
  const validPayments = useMemo(() => {
    return payments.filter((p) => p.status !== 'cancelled');
  }, [payments]);

  // Filtered Payments based on date / month / year / class
  const filteredPayments = useMemo(() => {
    return validPayments.filter((p) => {
      const pDate = new Date(p.paymentDate);
      const pDateStr = p.paymentDate.split('T')[0];

      if (filterClass !== 'all' && p.classGrade !== filterClass) return false;

      if (periodType === 'monthly') {
        const m = pDate.getMonth() + 1;
        const y = pDate.getFullYear();
        if (filterMonth !== 0 && m !== filterMonth) return false;
        if (y !== filterYear) return false;
      } else if (periodType === 'daily') {
        if (pDateStr < filterStartDate || pDateStr > filterEndDate) return false;
      }

      return true;
    });
  }, [validPayments, filterClass, periodType, filterMonth, filterYear, filterStartDate, filterEndDate]);

  // Overall Financial Totals
  const totalBilled = useMemo(() => {
    return bills.reduce((sum, b) => sum + b.amount, 0);
  }, [bills]);

  const totalCollected = useMemo(() => {
    return validPayments.reduce((sum, p) => sum + p.totalAmount, 0);
  }, [validPayments]);

  const totalArrears = useMemo(() => {
    return bills.reduce((sum, b) => {
      if (b.status === 'paid') return sum;
      const rem = b.remainingAmount !== undefined ? b.remainingAmount : Math.max(0, b.amount - (b.paidAmount || 0));
      return sum + rem;
    }, 0);
  }, [bills]);

  const realizationRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

  // 1. Rekap Harian (Grouped by Date)
  const dailyRecap = useMemo(() => {
    const map = new Map<string, { date: string; count: number; total: number; payments: typeof validPayments }>();
    filteredPayments.forEach((p) => {
      const dateKey = p.paymentDate.split('T')[0];
      const curr = map.get(dateKey) || { date: dateKey, count: 0, total: 0, payments: [] };
      curr.count += 1;
      curr.total += p.totalAmount;
      curr.payments.push(p);
      map.set(dateKey, curr);
    });
    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredPayments]);

  // 2. Rekap Bulanan (July - December 2026/2027)
  const monthlyRecap = useMemo(() => {
    const semesterMonths = [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6];
    return semesterMonths.map((m) => {
      const mBills = bills.filter((b) => b.month === m);
      const target = mBills.reduce((sum, b) => sum + b.amount, 0);
      const received = mBills.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
      const arrears = Math.max(0, target - received);
      const lunasCount = mBills.filter((b) => b.status === 'paid').length;
      const belumLunasCount = mBills.filter((b) => b.status !== 'paid').length;
      const rate = target > 0 ? Math.round((received / target) * 100) : 0;

      return {
        month: m,
        monthName: getMonthName(m),
        target,
        received,
        arrears,
        lunasCount,
        belumLunasCount,
        rate,
      };
    }).filter((r) => r.target > 0);
  }, [bills]);

  // 3. Rekap Tunggakan Siswa (Students who have unpaid/overdue bills)
  const studentsWithArrears = useMemo(() => {
    return students
      .filter((s) => s.status === 'active' && (filterClass === 'all' || s.classGrade === filterClass))
      .map((student) => {
        const unpaidBills = bills.filter(
          (b) => b.studentId === student.id && (b.status === 'unpaid' || b.status === 'overdue' || b.status === 'partial')
        );
        const totalStudentArrears = unpaidBills.reduce((sum, b) => {
          const rem = b.remainingAmount !== undefined ? b.remainingAmount : Math.max(0, b.amount - (b.paidAmount || 0));
          return sum + rem;
        }, 0);

        return {
          student,
          unpaidBills,
          totalStudentArrears,
        };
      })
      .filter((item) => item.totalStudentArrears > 0)
      .sort((a, b) => b.totalStudentArrears - a.totalStudentArrears);
  }, [students, bills, filterClass]);

  // 4. Rekap Siswa Pembayaran Sebagian (Partial Payments)
  const partialPaymentsList = useMemo(() => {
    const partialBills = bills.filter(
      (b) => b.status === 'partial' && (filterClass === 'all' || b.classGrade === filterClass)
    );
    return partialBills.map((b) => {
      const student = students.find((s) => s.id === b.studentId);
      const paid = b.paidAmount || 0;
      const rem = b.remainingAmount !== undefined ? b.remainingAmount : Math.max(0, b.amount - paid);
      return {
        bill: b,
        student,
        paid,
        remaining: rem,
      };
    });
  }, [bills, students, filterClass]);

  // 5. Rekap Berdasarkan Kelas
  const classRecap = useMemo(() => {
    return classes.map((cls) => {
      const classStudents = students.filter((s) => s.classGrade === cls && s.status === 'active');
      const classBills = bills.filter((b) => b.classGrade === cls);
      const target = classBills.reduce((sum, b) => sum + b.amount, 0);
      const received = classBills.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
      const arrears = Math.max(0, target - received);
      const rate = target > 0 ? Math.round((received / target) * 100) : 0;

      return {
        className: cls,
        studentCount: classStudents.length,
        target,
        received,
        arrears,
        rate,
      };
    });
  }, [classes, students, bills]);

  // 6. Riwayat Transaksi per Siswa
  const studentHistoryData = useMemo(() => {
    if (!selectedStudentId) return null;
    const student = students.find((s) => s.id === selectedStudentId);
    if (!student) return null;

    const studentPayments = payments.filter((p) => p.studentId === selectedStudentId);
    const studentBills = bills.filter((b) => b.studentId === selectedStudentId);
    const totalStudentPaid = studentPayments
      .filter((p) => p.status !== 'cancelled')
      .reduce((sum, p) => sum + p.totalAmount, 0);
    const totalStudentArrears = studentBills.reduce((sum, b) => {
      if (b.status === 'paid') return sum;
      return sum + (b.remainingAmount !== undefined ? b.remainingAmount : Math.max(0, b.amount - (b.paidAmount || 0)));
    }, 0);

    return {
      student,
      payments: studentPayments,
      bills: studentBills,
      totalStudentPaid,
      totalStudentArrears,
    };
  }, [selectedStudentId, students, payments, bills]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let filename = `Laporan_SPP_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
    let rows: string[][] = [];

    if (activeTab === 'rekap') {
      rows.push(['No.', 'Bulan Periode', 'Target Tagihan (Rp)', 'Penerimaan (Rp)', 'Sisa Tunggakan (Rp)', 'Lunas (Org)', 'Menunggak (Org)', 'Ketercapaian (%)']);
      monthlyRecap.forEach((r, idx) => {
        rows.push([
          String(idx + 1),
          r.monthName,
          String(r.target),
          String(r.received),
          String(r.arrears),
          String(r.lunasCount),
          String(r.belumLunasCount),
          `${r.rate}%`,
        ]);
      });
    } else if (activeTab === 'tunggakan') {
      rows.push(['No.', 'Nama Siswa/Santri', 'NIS', 'Kelas', 'Wali Santri', 'No. WhatsApp', 'Jumlah Bulan Menunggak', 'Total Tunggakan (Rp)']);
      studentsWithArrears.forEach((item, idx) => {
        rows.push([
          String(idx + 1),
          item.student.name,
          item.student.nis,
          item.student.classGrade,
          item.student.parentName,
          item.student.parentPhone,
          String(item.unpaidBills.length),
          String(item.totalStudentArrears),
        ]);
      });
    } else if (activeTab === 'sebagian') {
      rows.push(['No.', 'Nama Siswa', 'Kelas', 'Bulan Tagihan', 'Total Tagihan (Rp)', 'Sudah Dibayar (Rp)', 'Sisa Kekurangan (Rp)']);
      partialPaymentsList.forEach((item, idx) => {
        rows.push([
          String(idx + 1),
          item.student?.name || item.bill.studentName,
          item.bill.classGrade,
          `${getMonthName(item.bill.month)} ${item.bill.year}`,
          String(item.bill.amount),
          String(item.paid),
          String(item.remaining),
        ]);
      });
    } else if (activeTab === 'kelas') {
      rows.push(['No.', 'Kelas', 'Jumlah Siswa', 'Target Tagihan (Rp)', 'Sudah Diterima (Rp)', 'Sisa Tunggakan (Rp)', 'Ketercapaian (%)']);
      classRecap.forEach((c, idx) => {
        rows.push([
          String(idx + 1),
          c.className,
          String(c.studentCount),
          String(c.target),
          String(c.received),
          String(c.arrears),
          `${c.rate}%`,
        ]);
      });
    }

    if (rows.length === 0) {
      addNotification('warning', 'Ekspor Kosong', 'Tidak ada baris data yang diekspor.');
      return;
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addNotification('success', 'Ekspor Berhasil', `File ${filename} berhasil diunduh.`);
  };

  return (
    <div className="space-y-6">
      {/* Printable Letterhead (KOP SURAT RESMI LEMBAGA) - Visible only on Print */}
      <div className="hidden print:block mb-6 border-b-2 border-neutral-900 pb-4 text-center">
        <h1 className="text-xl font-bold uppercase tracking-wider text-neutral-900">
          {settings.schoolName}
        </h1>
        <p className="text-xs text-neutral-600 italic mt-0.5">{settings.tagline}</p>
        <p className="text-xs text-neutral-600 mt-1">{settings.address}</p>
        <p className="text-xs text-neutral-500 font-mono mt-0.5">
          Telp: {settings.phone} | Email: {settings.email}
        </p>
        <div className="border-t border-neutral-300 mt-3 pt-2 text-sm font-bold uppercase">
          LAPORAN REKAPITULASI KEUANGAN PEMBAYARAN SPP BULANAN
        </div>
        <div className="text-xs text-neutral-500">
          Tahun Ajaran: {settings.academicYear} | Dicetak: {formatIndonesianDate(new Date().toISOString(), 'long')}
        </div>
      </div>

      {/* Top Header & Action Controls */}
      <div className="bg-white p-5 rounded-lg border border-neutral-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-neutral-900">
            Laporan & Rekapitulasi SPP
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Laporan penerimaan, tunggakan siswa, pelunasan sebagian, rekap per kelas, dan riwayat per santri
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-md transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-md transition-colors shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Laporan Resmi</span>
          </button>
        </div>
      </div>

      {/* 4 Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500 font-medium">Total Tagihan SPP:</span>
            <Layers className="w-4 h-4 text-neutral-400" />
          </div>
          <span className="text-lg font-bold font-mono text-neutral-900 block mt-1 tabular-nums">
            {formatRupiah(totalBilled)}
          </span>
          <span className="text-[11px] text-neutral-400 mt-0.5 block">
            Kewajiban seluruh santri aktif
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500 font-medium">Pembayaran Diterima:</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-lg font-bold font-mono text-emerald-800 block mt-1 tabular-nums">
            {formatRupiah(totalCollected)}
          </span>
          <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold mt-0.5">
            <span>{realizationRate}% Realisasi Pembayaran</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500 font-medium">Total Tunggakan SPP:</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <span className="text-lg font-bold font-mono text-rose-700 block mt-1 tabular-nums">
            {formatRupiah(totalArrears)}
          </span>
          <span className="text-[11px] text-rose-600 font-medium mt-0.5 block">
            {studentsWithArrears.length} siswa/santri menunggak
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500 font-medium">Transaksi Berhasil:</span>
            <Clock className="w-4 h-4 text-neutral-400" />
          </div>
          <span className="text-lg font-bold font-mono text-neutral-900 block mt-1 tabular-nums">
            {validPayments.length} Bukti Kuitansi
          </span>
          <span className="text-[11px] text-neutral-400 mt-0.5 block">
            {payments.filter((p) => p.status === 'cancelled').length} transaksi dibatalkan
          </span>
        </div>
      </div>

      {/* Report View Tabs */}
      <div className="flex items-center gap-1 border-b border-neutral-200 no-print overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('rekap')}
          className={`py-3 px-4 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'rekap'
              ? 'border-neutral-900 text-neutral-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          Rekapitulasi Periode (Bulanan/Harian)
        </button>
        <button
          onClick={() => setActiveTab('tunggakan')}
          className={`py-3 px-4 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'tunggakan'
              ? 'border-neutral-900 text-neutral-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <span>Daftar Siswa Menunggak</span>
          <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-1.5 py-0.2 rounded-full">
            {studentsWithArrears.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('sebagian')}
          className={`py-3 px-4 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'sebagian'
              ? 'border-neutral-900 text-neutral-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <span>Pembayaran Sebagian (Cicilan)</span>
          <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded-full">
            {partialPaymentsList.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('kelas')}
          className={`py-3 px-4 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'kelas'
              ? 'border-neutral-900 text-neutral-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          Rekapitulasi per Kelas
        </button>
        <button
          onClick={() => setActiveTab('siswa')}
          className={`py-3 px-4 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'siswa'
              ? 'border-neutral-900 text-neutral-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          Riwayat per Siswa / Santri
        </button>
      </div>

      {/* FILTER CONTROLS BAR (no-print) */}
      <div className="bg-white p-4 rounded-lg border border-neutral-200 flex flex-wrap items-center gap-3 text-xs no-print">
        <div className="flex items-center gap-1 text-neutral-500 font-medium">
          <Filter className="w-3.5 h-3.5" />
          <span>Filter Laporan:</span>
        </div>

        {/* Filter Kelas */}
        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          className="px-2.5 py-1.5 border border-neutral-300 rounded-md bg-white text-neutral-800"
        >
          <option value="all">Semua Kelas</option>
          {classes.map((cls) => (
            <option key={cls} value={cls}>
              Kelas {cls}
            </option>
          ))}
        </select>

        {activeTab === 'rekap' && (
          <>
            <select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as any)}
              className="px-2.5 py-1.5 border border-neutral-300 rounded-md bg-white text-neutral-800"
            >
              <option value="all">Semua Periode Transaksi</option>
              <option value="monthly">Filter Berdasarkan Bulan</option>
              <option value="daily">Filter Rentang Tanggal</option>
            </select>

            {periodType === 'monthly' && (
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(parseInt(e.target.value))}
                className="px-2.5 py-1.5 border border-neutral-300 rounded-md bg-white text-neutral-800"
              >
                <option value={0}>Semua Bulan</option>
                {MONTH_NAMES_ID.map((name, i) => (
                  <option key={i + 1} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
            )}

            {periodType === 'daily' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="px-2 py-1 border border-neutral-300 rounded text-xs"
                />
                <span className="text-neutral-400">s/d</span>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="px-2 py-1 border border-neutral-300 rounded text-xs"
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* TAB 1: REKAPITULASI BULANAN & HARIAN */}
      {activeTab === 'rekap' && (
        <div className="space-y-6">
          {/* Table Rekapitulasi Bulanan */}
          <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-2xs">
            <div className="px-5 py-3.5 border-b border-neutral-200 bg-neutral-50/60 flex items-center justify-between">
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                Rekapitulasi Penerimaan SPP per Bulan
              </h3>
              <span className="text-xs text-neutral-500 font-mono">Tahun Ajaran {settings.academicYear}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-200 font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Bulan Periode</th>
                    <th className="py-2.5 px-4 text-right">Target Tagihan</th>
                    <th className="py-2.5 px-4 text-right">Sudah Diterima</th>
                    <th className="py-2.5 px-4 text-right">Sisa Tunggakan</th>
                    <th className="py-2.5 px-4 text-center">Status Lunas</th>
                    <th className="py-2.5 px-4 text-center">Menunggak</th>
                    <th className="py-2.5 px-4">Ketercapaian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/60 font-mono text-[11px]">
                  {monthlyRecap.map((r) => (
                    <tr key={r.month} className="hover:bg-neutral-50/60">
                      <td className="py-2.5 px-4 font-sans font-semibold text-neutral-900">
                        {r.monthName} {settings.activeYear}
                      </td>
                      <td className="py-2.5 px-4 text-right text-neutral-900 font-medium tabular-nums">
                        {formatRupiah(r.target)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-emerald-800 font-bold tabular-nums">
                        {formatRupiah(r.received)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-rose-700 font-bold tabular-nums">
                        {formatRupiah(r.arrears)}
                      </td>
                      <td className="py-2.5 px-4 text-center font-sans">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold text-[10px]">
                          {r.lunasCount} Santri
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center font-sans">
                        {r.belumLunasCount > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-semibold text-[10px]">
                            {r.belumLunasCount} Santri
                          </span>
                        ) : (
                          <span className="text-neutral-400 text-[10px]">Nihil</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-sans">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-neutral-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-emerald-700 h-full rounded-full transition-all"
                              style={{ width: `${r.rate}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs font-semibold text-neutral-800">
                            {r.rate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rekap Harian List */}
          <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-2xs">
            <div className="px-5 py-3.5 border-b border-neutral-200 bg-neutral-50/60 flex items-center justify-between">
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                Rekapitulasi Pembayaran Harian (Penerimaan Kas)
              </h3>
              <span className="text-xs text-neutral-500 font-mono">
                {dailyRecap.length} hari terdapat transaksi kasir
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-200 font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Tanggal Penerimaan</th>
                    <th className="py-2.5 px-4 text-center">Jumlah Transaksi</th>
                    <th className="py-2.5 px-4 text-right">Total Uang Diterima</th>
                    <th className="py-2.5 px-4">Metode Pembayaran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/60 font-mono text-[11px]">
                  {dailyRecap.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-neutral-400 font-sans">
                        Tidak ada transaksi pembayaran pada rentang tanggal ini.
                      </td>
                    </tr>
                  ) : (
                    dailyRecap.map((day) => {
                      const methodsSummary = Array.from(new Set(day.payments.map((p) => getPaymentMethodLabel(p.paymentMethod)))).join(', ');
                      return (
                        <tr key={day.date} className="hover:bg-neutral-50/60">
                          <td className="py-2.5 px-4 font-sans font-semibold text-neutral-900">
                            {formatIndonesianDate(day.date, 'long')}
                          </td>
                          <td className="py-2.5 px-4 text-center font-sans">
                            <span className="px-2 py-0.5 rounded bg-neutral-100 font-semibold text-[10px]">
                              {day.count} Kuitansi
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right text-emerald-800 font-bold tabular-nums">
                            {formatRupiah(day.total)}
                          </td>
                          <td className="py-2.5 px-4 font-sans text-neutral-600 text-[11px]">
                            {methodsSummary}
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
      )}

      {/* TAB 2: DAFTAR SISWA MENUNGGAK */}
      {activeTab === 'tunggakan' && (
        <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-2xs">
          <div className="px-5 py-3.5 border-b border-neutral-200 bg-neutral-50/60 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                Daftar Santri / Siswa yang Belum Membayar SPP
              </h3>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Total {studentsWithArrears.length} siswa menunggak tagihan SPP
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-200 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Nama Siswa / Santri</th>
                  <th className="py-2.5 px-4">Nomor Induk (NIS)</th>
                  <th className="py-2.5 px-4">Kelas</th>
                  <th className="py-2.5 px-4">Bulan Menunggak</th>
                  <th className="py-2.5 px-4 text-right">Total Tunggakan</th>
                  <th className="py-2.5 px-4">Wali Santri & WhatsApp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/60">
                {studentsWithArrears.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-neutral-400">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                      <span className="font-semibold text-neutral-800 block">Alhamdulillah! Tidak Ada Tunggakan</span>
                      <span>Seluruh siswa/santri telah melunasi kewajiban SPP.</span>
                    </td>
                  </tr>
                ) : (
                  studentsWithArrears.map(({ student, unpaidBills, totalStudentArrears }) => {
                    const monthList = unpaidBills
                      .map((b) => `${getMonthName(b.month)} ${b.year}`)
                      .join(', ');

                    const waUrl = generateWhatsAppReminderUrl(
                      student.parentPhone,
                      student.parentName,
                      student.name,
                      student.classGrade,
                      unpaidBills.map((b) => getMonthName(b.month)),
                      totalStudentArrears,
                      settings.schoolName,
                      settings.bankAccounts
                    );

                    return (
                      <tr key={student.id} className="hover:bg-neutral-50/60">
                        <td className="py-3 px-4">
                          <span className="font-bold text-neutral-900 block">{student.name}</span>
                          <span className="text-[11px] text-neutral-400">
                            {student.category === 'asrama_santri' ? 'Santri Asrama' : 'Reguler'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-neutral-700">
                          {student.nis}
                        </td>
                        <td className="py-3 px-4 font-medium text-neutral-800">
                          Kelas {student.classGrade}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-rose-700 block text-[11px]">
                            {unpaidBills.length} Bulan:
                          </span>
                          <span className="text-[11px] text-neutral-600 block">
                            {monthList}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-700 tabular-nums text-xs">
                          {formatRupiah(totalStudentArrears)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="block font-medium text-neutral-800">{student.parentName}</span>
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:underline font-mono"
                          >
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>{student.parentPhone} (Kirim Tagihan)</span>
                          </a>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PEMBAYARAN SEBAGIAN (CICILAN) */}
      {activeTab === 'sebagian' && (
        <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-2xs">
          <div className="px-5 py-3.5 border-b border-neutral-200 bg-neutral-50/60 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                Daftar Tagihan dengan Status Pembayaran Sebagian (Cicilan)
              </h3>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Menampilkan tagihan yang telah dicicil sebagian namun belum lunas penuh
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-200 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Nama Siswa / Santri</th>
                  <th className="py-2.5 px-4">Kelas</th>
                  <th className="py-2.5 px-4">Bulan Tagihan</th>
                  <th className="py-2.5 px-4 text-right">Nilai Tagihan</th>
                  <th className="py-2.5 px-4 text-right">Sudah Dicicil</th>
                  <th className="py-2.5 px-4 text-right">Sisa Kekurangan</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/60 font-mono text-[11px]">
                {partialPaymentsList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-neutral-400 font-sans">
                      Tidak ada tagihan yang berstatus pembayaran sebagian saat ini.
                    </td>
                  </tr>
                ) : (
                  partialPaymentsList.map(({ bill, student, paid, remaining }) => (
                    <tr key={bill.id} className="hover:bg-neutral-50/60">
                      <td className="py-3 px-4 font-sans">
                        <span className="font-bold text-neutral-900 block">{student?.name || bill.studentName}</span>
                        <span className="text-[11px] text-neutral-400">NIS: {student?.nis || '-'}</span>
                      </td>
                      <td className="py-3 px-4 font-sans font-medium text-neutral-800">
                        Kelas {bill.classGrade}
                      </td>
                      <td className="py-3 px-4 font-sans font-semibold text-neutral-800">
                        {getMonthName(bill.month)} {bill.year}
                      </td>
                      <td className="py-3 px-4 text-right text-neutral-800 tabular-nums">
                        {formatRupiah(bill.amount)}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-800 font-semibold tabular-nums">
                        {formatRupiah(paid)}
                      </td>
                      <td className="py-3 px-4 text-right text-rose-700 font-bold tabular-nums">
                        {formatRupiah(remaining)}
                      </td>
                      <td className="py-3 px-4 text-center font-sans">
                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-semibold text-[10px]">
                          Dibayar Sebagian
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: REKAPITULASI PER KELAS */}
      {activeTab === 'kelas' && (
        <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-2xs">
          <div className="px-5 py-3.5 border-b border-neutral-200 bg-neutral-50/60 flex items-center justify-between">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Rekapitulasi Penerimaan & Tunggakan Berdasarkan Kelas
            </h3>
            <span className="text-xs text-neutral-500 font-mono">Tahun Ajaran {settings.academicYear}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-200 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Kelas / Rombel</th>
                  <th className="py-2.5 px-4 text-center">Jumlah Santri</th>
                  <th className="py-2.5 px-4 text-right">Target Tagihan</th>
                  <th className="py-2.5 px-4 text-right">Sudah Diterima</th>
                  <th className="py-2.5 px-4 text-right">Sisa Tunggakan</th>
                  <th className="py-2.5 px-4">Persentase Realisasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/60 font-mono text-[11px]">
                {classRecap.map((c) => (
                  <tr key={c.className} className="hover:bg-neutral-50/60">
                    <td className="py-3 px-4 font-sans font-bold text-neutral-900">
                      Kelas {c.className}
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      <span className="px-2 py-0.5 bg-neutral-100 rounded text-neutral-700 font-semibold text-[11px]">
                        {c.studentCount} Siswa
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-neutral-900 font-medium tabular-nums">
                      {formatRupiah(c.target)}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-800 font-bold tabular-nums">
                      {formatRupiah(c.received)}
                    </td>
                    <td className="py-3 px-4 text-right text-rose-700 font-bold tabular-nums">
                      {formatRupiah(c.arrears)}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-neutral-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-emerald-700 h-full rounded-full transition-all"
                            style={{ width: `${c.rate}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs font-semibold text-neutral-800">
                          {c.rate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: RIWAYAT PER SISWA */}
      {activeTab === 'siswa' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg border border-neutral-200 space-y-3 no-print">
            <label className="block text-xs font-semibold text-neutral-800">
              Pilih Siswa / Santri untuk Melihat Riwayat Lengkap:
            </label>
            <div className="flex gap-3">
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="flex-1 px-3 py-2 border border-neutral-300 rounded-md bg-white text-xs font-medium"
              >
                <option value="">-- Pilih Siswa / Santri --</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (NIS: {s.nis}) - Kelas {s.classGrade}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {studentHistoryData ? (
            <div className="space-y-4">
              {/* Student Bio Card */}
              <div className="bg-white p-4 rounded-lg border border-neutral-200 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-neutral-500 block">Nama Santri:</span>
                  <span className="font-bold text-neutral-900 text-sm">
                    {studentHistoryData.student.name}
                  </span>
                  <span className="text-neutral-400 block font-mono text-[11px]">
                    NIS: {studentHistoryData.student.nis}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Kelas:</span>
                  <span className="font-semibold text-neutral-800">
                    Kelas {studentHistoryData.student.classGrade}
                  </span>
                  <span className="text-neutral-500 block text-[11px]">
                    Wali: {studentHistoryData.student.parentName}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Total Sudah Terbayar:</span>
                  <span className="font-mono font-bold text-emerald-800 text-sm tabular-nums">
                    {formatRupiah(studentHistoryData.totalStudentPaid)}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Total Sisa Tunggakan:</span>
                  <span className="font-mono font-bold text-rose-700 text-sm tabular-nums">
                    {formatRupiah(studentHistoryData.totalStudentArrears)}
                  </span>
                </div>
              </div>

              {/* Transactions Ledger */}
              <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-2xs">
                <div className="px-5 py-3 border-b border-neutral-200 bg-neutral-50/60 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                    Buku Riwayat Kuitansi Pembayaran
                  </h4>
                  <span className="text-xs text-neutral-500 font-mono">
                    {studentHistoryData.payments.length} transaksi tercatat
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-200 font-semibold">
                      <tr>
                        <th className="py-2.5 px-4">No. Transaksi</th>
                        <th className="py-2.5 px-4">Tanggal Pembayaran</th>
                        <th className="py-2.5 px-4">Bulan Tagihan</th>
                        <th className="py-2.5 px-4 text-right">Nominal Bayar</th>
                        <th className="py-2.5 px-4">Metode</th>
                        <th className="py-2.5 px-4">Petugas</th>
                        <th className="py-2.5 px-4 text-center">Status</th>
                        <th className="py-2.5 px-4 text-center no-print">Kuitansi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200/60 font-mono text-[11px]">
                      {studentHistoryData.payments.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-neutral-400 font-sans">
                            Belum ada riwayat pembayaran untuk siswa ini.
                          </td>
                        </tr>
                      ) : (
                        studentHistoryData.payments.map((p) => {
                          const isCancelled = p.status === 'cancelled';
                          return (
                            <tr key={p.id} className="hover:bg-neutral-50/60">
                              <td className="py-2.5 px-4 font-bold text-neutral-900">
                                <span className={isCancelled ? 'line-through text-neutral-400' : ''}>
                                  {p.receiptNumber}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-neutral-600 font-sans">
                                {formatIndonesianDate(p.paymentDate, 'with-time')}
                              </td>
                              <td className="py-2.5 px-4 font-sans text-neutral-800">
                                {p.monthsPaid.map((m) => getMonthName(m.month)).join(', ')}
                              </td>
                              <td className="py-2.5 px-4 text-right font-bold tabular-nums text-neutral-900">
                                <span className={isCancelled ? 'line-through text-neutral-400' : 'text-emerald-800'}>
                                  {formatRupiah(p.totalAmount)}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 font-sans text-neutral-600 text-[11px]">
                                {getPaymentMethodLabel(p.paymentMethod)}
                              </td>
                              <td className="py-2.5 px-4 font-sans text-neutral-600 text-[11px]">
                                {p.cashierName}
                              </td>
                              <td className="py-2.5 px-4 text-center font-sans">
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                                    isCancelled
                                      ? 'bg-rose-100 text-rose-700'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {isCancelled ? 'Dibatalkan' : 'Sah'}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-center no-print font-sans">
                                <button
                                  onClick={() => setSelectedReceiptForModal(p)}
                                  className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold hover:underline"
                                >
                                  Cetak
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
            </div>
          ) : (
            <div className="py-12 bg-white rounded-lg border border-neutral-200 text-center text-xs text-neutral-400">
              Silakan pilih siswa pada opsi di atas untuk memuat riwayat pembayaran lengkap.
            </div>
          )}
        </div>
      )}

      {/* Formal Signature Box for Printable Official Report */}
      <div className="hidden print:grid grid-cols-2 gap-12 mt-12 pt-6 border-t border-neutral-300 text-xs">
        <div className="text-center">
          <p className="text-neutral-600">Mengetahui,</p>
          <p className="font-bold text-neutral-900 mt-0.5">Kepala Sekolah / Mudir Ma'had</p>
          <div className="h-20" />
          <p className="font-bold text-neutral-900 underline">{settings.headmasterName}</p>
          <p className="text-neutral-500 font-mono text-[11px]">NIP/NIY: 19780512 200312 1 002</p>
        </div>

        <div className="text-center">
          <p className="text-neutral-600">Bekasi, {formatIndonesianDate(new Date().toISOString(), 'long')}</p>
          <p className="font-bold text-neutral-900 mt-0.5">Bendahara / Kasir Lembaga</p>
          <div className="h-20" />
          <p className="font-bold text-neutral-900 underline">{settings.treasurerName}</p>
          <p className="text-neutral-500 font-mono text-[11px]">Petugas Penerima Keuangan</p>
        </div>
      </div>
    </div>
  );
};
