import { BillStatus, PaymentMethodType, TransactionStatus } from '../types';

export const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export const MONTH_SHORT_ID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

/**
 * Format currency to Indonesian Rupiah
 * e.g. 350000 -> "Rp 350.000"
 */
export function formatRupiah(amount: number): string {
  if (isNaN(amount)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format number only with Indonesian thousand separator
 * e.g. 350000 -> "350.000"
 */
export function formatNumberId(amount: number): string {
  if (isNaN(amount)) return '0';
  return new Intl.NumberFormat('id-ID').format(amount);
}

/**
 * Format date string to Indonesian format
 * e.g. "2026-10-21" -> "21 Oktober 2026"
 */
export function formatIndonesianDate(
  dateInput: string | Date | undefined,
  style: 'long' | 'medium' | 'short' | 'with-time' = 'long'
): string {
  if (!dateInput) return '-';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '-';

  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();

  if (style === 'short') {
    return `${day} ${MONTH_SHORT_ID[month]} ${year}`;
  }

  if (style === 'with-time') {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day} ${MONTH_NAMES_ID[month]} ${year}, ${hours}:${minutes} WIB`;
  }

  return `${day} ${MONTH_NAMES_ID[month]} ${year}`;
}

export function getMonthName(monthNumber: number): string {
  if (monthNumber < 1 || monthNumber > 12) return '';
  return MONTH_NAMES_ID[monthNumber - 1];
}

/**
 * Extract numerical grade level or educational tier from class name
 */
export function extractGradeLevel(className: string): string {
  const upper = className.toUpperCase();
  if (upper.startsWith('VII') || upper.startsWith('7')) return 'Tingkat 7 (SMP/MTs)';
  if (upper.startsWith('VIII') || upper.startsWith('8')) return 'Tingkat 8 (SMP/MTs)';
  if (upper.startsWith('IX') || upper.startsWith('9')) return 'Tingkat 9 (SMP/MTs)';
  if (upper.startsWith('XII') || upper.startsWith('12')) return 'Tingkat 12 (SMA/MA)';
  if (upper.startsWith('XI') || upper.startsWith('11')) return 'Tingkat 11 (SMA/MA)';
  if (upper.startsWith('X') || upper.startsWith('10')) return 'Tingkat 10 (SMA/MA)';
  return 'Lainnya';
}

/**
 * Get status badge label and colors in Indonesian for bills
 */
export function getBillStatusInfo(status: BillStatus): {
  label: string;
  badgeClass: string;
} {
  switch (status) {
    case 'paid':
      return {
        label: 'Lunas',
        badgeClass: 'text-emerald-700 font-medium',
      };
    case 'partial':
      return {
        label: 'Dibayar Sebagian',
        badgeClass: 'text-amber-700 font-semibold',
      };
    case 'overdue':
      return {
        label: 'Terlambat',
        badgeClass: 'text-rose-700 font-semibold',
      };
    case 'unpaid':
    default:
      return {
        label: 'Belum Bayar',
        badgeClass: 'text-neutral-600 font-medium',
      };
  }
}

/**
 * Get status badge for payment transactions
 */
export function getTransactionStatusInfo(status: TransactionStatus): {
  label: string;
  badgeClass: string;
} {
  switch (status) {
    case 'cancelled':
      return {
        label: 'Dibatalkan',
        badgeClass: 'text-rose-700 bg-rose-50 border border-rose-200 font-semibold',
      };
    case 'completed':
    default:
      return {
        label: 'Berhasil / Sah',
        badgeClass: 'text-emerald-700 bg-emerald-50 border border-emerald-200 font-medium',
      };
  }
}

/**
 * Payment method label helper
 */
export function getPaymentMethodLabel(method: PaymentMethodType | string): string {
  switch (method) {
    case 'tunai':
      return 'Tunai (Cash TU)';
    case 'transfer_bank':
      return 'Transfer Bank';
    case 'transfer_bsi':
      return 'Transfer Bank BSI';
    case 'transfer_bca':
      return 'Transfer Bank BCA';
    case 'transfer_bri':
      return 'Transfer Bank BRI';
    case 'transfer_mandiri':
      return 'Transfer Bank Mandiri';
    case 'qris':
      return 'QRIS (Scan Barcode)';
    default:
      return String(method).toUpperCase().replace('_', ' ');
  }
}

/**
 * Generate unique Indonesian receipt / transaction number
 * format: KWT/YYYYMM/XXXX
 */
export function generateReceiptNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `KWT/${year}${month}/${randomSuffix}`;
}

/**
 * Convert numbers into formal Indonesian written words (Terbilang)
 * e.g. 350000 -> "Tiga Ratus Lima Puluh Ribu Rupiah"
 */
export function numberToWordsIndonesian(n: number): string {
  if (n === 0) return 'Nol Rupiah';

  const satuan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];

  function terbilangHelper(num: number): string {
    if (num < 12) {
      return satuan[num];
    } else if (num < 20) {
      return terbilangHelper(num - 10) + ' Belas';
    } else if (num < 100) {
      const rest = num % 10;
      return terbilangHelper(Math.floor(num / 10)) + ' Puluh' + (rest ? ' ' + terbilangHelper(rest) : '');
    } else if (num < 200) {
      return 'Seratus' + (num - 100 ? ' ' + terbilangHelper(num - 100) : '');
    } else if (num < 1000) {
      const rest = num % 100;
      return terbilangHelper(Math.floor(num / 100)) + ' Ratus' + (rest ? ' ' + terbilangHelper(rest) : '');
    } else if (num < 2000) {
      return 'Seribu' + (num - 1000 ? ' ' + terbilangHelper(num - 1000) : '');
    } else if (num < 1000000) {
      const rest = num % 1000;
      return terbilangHelper(Math.floor(num / 1000)) + ' Ribu' + (rest ? ' ' + terbilangHelper(rest) : '');
    } else if (num < 1000000000) {
      const rest = num % 1000000;
      return terbilangHelper(Math.floor(num / 1000000)) + ' Juta' + (rest ? ' ' + terbilangHelper(rest) : '');
    } else if (num < 1000000000000) {
      const rest = num % 1000000000;
      return terbilangHelper(Math.floor(num / 1000000000)) + ' Miliar' + (rest ? ' ' + terbilangHelper(rest) : '');
    }
    return '';
  }

  const result = terbilangHelper(Math.floor(Math.abs(n))).trim();
  return result ? `${result} Rupiah` : 'Nol Rupiah';
}

/**
 * Generate formatted WhatsApp reminder link
 */
export function generateWhatsAppReminderUrl(
  phone: string,
  parentName: string,
  studentName: string,
  classGrade: string,
  unpaidMonths: string[],
  totalDue: number,
  schoolName: string,
  bankAccounts: { bankName: string; accountNumber: string; accountHolder: string }[]
): string {
  let cleanPhone = phone.replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '62' + cleanPhone.slice(1);
  } else if (!cleanPhone.startsWith('62')) {
    cleanPhone = '62' + cleanPhone;
  }

  const bankList = bankAccounts
    .map((b) => `• ${b.bankName}: ${b.accountNumber} a.n ${b.accountHolder}`)
    .join('\n');

  const message = `*PEMBERITAHUAN TAGIHAN SPP ${schoolName.toUpperCase()}*

Assalamu'alaikum Wr. Wb.
Yth. Bpk/Ibu *${parentName}*
Wali dari: *${studentName}* (${classGrade})

Berikut kami sampaikan rincian tagihan SPP yang perlu diselesaikan:
• Periode: *${unpaidMonths.join(', ')}*
• Total Kewajiban / Sisa Tagihan: *${formatRupiah(totalDue)}*

Pembayaran dapat dilakukan melalui loket Tata Usaha / Bendahara atau transfer ke rekening resmi:
${bankList}

Konfirmasi pembayaran dapat dikirimkan ke nomor ini dengan melampirkan bukti transfer.

Jazakumullah Khairan Katsiran.
Wassalamu'alaikum Wr. Wb.
_Bagian Keuangan & Administrasi SPP_`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
