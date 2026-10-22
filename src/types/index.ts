export type StudentStatus = 'active' | 'inactive';

export type UserRole = 'admin' | 'bendahara';

export interface AppUser {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  createdAt: string;
}

export type Gender = 'L' | 'P'; // Laki-laki / Perempuan (Santriwan / Santriwati)

export interface Student {
  id: string;
  nisn: string;
  nis: string; // Nomor Induk Siswa/Santri
  name: string; // Nama Lengkap
  gender: Gender; // Jenis Kelamin
  classGrade: string; // e.g. 'VII-A', 'VIII-B', 'X-MIPA 1'
  gradeLevel: string; // Tingkat: '7', '8', '9', '10', '11', '12' (atau SMP/SMA)
  category: 'reguler' | 'asrama_santri' | 'beasiswa';
  dormRoom?: string; // Kamar Asrama jika santri mukim
  parentName: string; // Nama Orang Tua / Wali
  parentPhone: string; // Nomor WhatsApp Orang Tua / Wali
  address: string;
  enrollmentDate: string; // Tanggal Masuk (e.g., '2026-07-15')
  status: StudentStatus; // Status Aktif / Nonaktif
  monthlyFee: number; // Nominal SPP Bulanan
  createdAt: string;
}

export type BillStatus = 'paid' | 'partial' | 'unpaid' | 'overdue';

export interface BillBreakdown {
  spp: number;
  asrama?: number;
  makan?: number;
  kegiatan?: number;
}

export interface BillPaymentHistoryItem {
  paymentId: string;
  receiptNumber: string;
  amount: number;
  date: string;
  method: string;
  notes?: string;
  isCancelled?: boolean;
}

export interface Bill {
  id: string;
  studentId: string;
  studentName: string;
  classGrade: string;
  gradeLevel?: string;
  month: number; // 1 - 12
  year: number; // 2026
  academicYear: string; // '2026/2027'
  amount: number; // Total nominal tagihan
  breakdown: BillBreakdown;
  dueDate: string; // '2026-10-10'
  status: BillStatus; // 'paid' | 'partial' | 'unpaid' | 'overdue'
  paidAmount?: number; // Jumlah yang telah dibayarkan
  remainingAmount?: number; // Sisa tagihan (amount - paidAmount)
  paidDate?: string;
  paymentMethod?: string;
  receiptNumber?: string;
  historyPayments?: BillPaymentHistoryItem[];
}

export type PaymentMethodType = 
  | 'tunai' 
  | 'transfer_bank' 
  | 'transfer_bca' 
  | 'transfer_bri' 
  | 'transfer_bsi' 
  | 'transfer_mandiri' 
  | 'qris';

export type TransactionStatus = 'completed' | 'cancelled';

export interface PaymentItemDetail {
  billId: string;
  month: number;
  year: number;
  amountPaid: number; // Nominal yang dibayar pada transaksi ini
  billTotal: number; // Total nilai tagihan
  remainingAfter: number; // Sisa tagihan setelah transaksi ini
  isFullyPaid: boolean; // Apakah tagihan ini jadi lunas
}

export interface PaymentRecord {
  id: string;
  receiptNumber: string; // Nomor transaksi unik (e.g. KWT/202610/1502)
  studentId: string;
  studentName: string;
  nis: string;
  classGrade: string;
  billIds: string[];
  monthsPaid: {
    month: number;
    year: number;
    amount: number;
    isPartial?: boolean;
    remaining?: number;
  }[];
  itemDetails?: PaymentItemDetail[];
  totalAmount: number;
  paymentMethod: PaymentMethodType;
  bankName?: string; // e.g. "Bank Syariah Indonesia (BSI)"
  paymentDate: string; // ISO date or 'YYYY-MM-DD'
  cashierName: string;
  cashReceived?: number;
  changeReturned?: number;
  notes?: string;
  status: TransactionStatus; // 'completed' | 'cancelled'
  cancelledAt?: string;
  cancelledReason?: string;
  cancelledBy?: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export interface ClassFeeRate {
  classGrade: string;
  gradeLevel: string;
  defaultNominal: number;
}

export interface SchoolSettings {
  schoolName: string;
  institutionType: 'sekolah' | 'pesantren' | 'terpadu';
  tagline: string;
  address: string;
  phone: string;
  email: string;
  academicYear: string;
  activeMonth: number;
  activeYear: number;
  defaultDueDateDay: number; // e.g. 10
  headmasterName: string;
  treasurerName: string;
  classFeeRates: ClassFeeRate[];
  bankAccounts: BankAccount[];
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
}

export type ActiveTab = 
  | 'dashboard'
  | 'students'
  | 'bills'
  | 'payment'
  | 'history'
  | 'reports'
  | 'settings';
