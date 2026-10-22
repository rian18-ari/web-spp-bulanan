import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  ActiveTab,
  AppUser,
  Bill,
  PaymentItemDetail,
  PaymentMethodType,
  PaymentRecord,
  SchoolSettings,
  Student,
  ToastNotification,
  UserRole,
} from '../types';
import {
  initialBills,
  initialPaymentRecords,
  initialSchoolSettings,
  initialStudents,
} from '../data/mockData';
import { generateReceiptNumber, getMonthName } from '../utils/formatters';
import { auth } from '../lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import {
  seedInitialFirestoreData,
  subscribeStudents,
  subscribeBills,
  subscribePayments,
  subscribeSettings,
  subscribeUsers,
  saveStudentToDb,
  deleteStudentFromDb,
  saveBillToDb,
  deleteBillFromDb,
  savePaymentToDb,
  cancelPaymentInDb,
  saveSettingsToDb,
  saveUserToDb,
} from '../services/firebaseDb';

export interface PaymentItemPayload {
  billId: string;
  payAmount: number;
}

export interface ProcessPaymentPayload {
  studentId: string;
  items: PaymentItemPayload[];
  paymentMethod: PaymentMethodType;
  bankName?: string;
  paymentDate?: string;
  cashReceived?: number;
  notes?: string;
  cashierName?: string;
}

export interface GenerateBillsOption {
  month: number;
  year: number;
  targetType: 'all' | 'class' | 'student';
  classGrade?: string;
  studentId?: string;
  customNominal?: number;
}

export interface GenerateBillsResult {
  successCount: number;
  skippedCount: number;
  skippedStudents: string[];
}

interface AppContextType {
  // Auth & RBAC
  currentUser: AppUser | null;
  userRole: UserRole;
  isAdmin: boolean;
  isBendahara: boolean;
  users: AppUser[];
  isFirestoreConnected: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; message?: string }>;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<{ success: boolean; message?: string }>;
  quickLoginAs: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  updateUserRole: (uid: string, newRole: UserRole) => Promise<void>;
  addUserAccount: (user: Omit<AppUser, 'createdAt'>) => Promise<void>;

  // Data Collections
  students: Student[];
  bills: Bill[];
  payments: PaymentRecord[];
  settings: SchoolSettings;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  notifications: ToastNotification[];
  addNotification: (
    type: ToastNotification['type'],
    title: string,
    message: string
  ) => void;
  removeNotification: (id: string) => void;

  // Student actions
  addStudent: (student: Omit<Student, 'id' | 'createdAt'>) => void;
  updateStudent: (student: Student) => void;
  deleteStudent: (id: string) => void;

  // Bill actions
  generateBills: (options: GenerateBillsOption) => GenerateBillsResult;
  deleteBill: (billId: string) => void;
  updateBillNominal: (billId: string, newAmount: number) => void;

  // Payment actions
  processPayment: (payload: ProcessPaymentPayload) => PaymentRecord | null;
  cancelPayment: (paymentId: string, reason: string) => boolean;

  // Settings
  updateSettings: (newSettings: SchoolSettings) => void;
  resetToDefaultData: () => void;

  // Modals & Selection state
  selectedReceiptForModal: PaymentRecord | null;
  setSelectedReceiptForModal: (receipt: PaymentRecord | null) => void;
  selectedStudentForDetail: Student | null;
  setSelectedStudentForDetail: (student: Student | null) => void;
  preselectedStudentForPayment: string | null;
  setPreselectedStudentForPayment: (studentId: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  STUDENTS: 'spp_students_v4',
  BILLS: 'spp_bills_v4',
  PAYMENTS: 'spp_payments_v4',
  SETTINGS: 'spp_settings_v4',
  USER_SESSION: 'spp_user_session_v4',
  USERS_LIST: 'spp_users_list_v4',
};

const DEFAULT_USERS: AppUser[] = [
  {
    uid: 'user-admin-default',
    email: 'admin@pesantren.sch.id',
    name: 'Ust. Ahmad Fauzi, M.Pd.',
    role: 'admin',
    phone: '081234567890',
    createdAt: '2026-07-01T08:00:00Z',
  },
  {
    uid: 'user-bendahara-default',
    email: 'bendahara@pesantren.sch.id',
    name: 'Ust. Rahmat Hidayat, S.E.',
    role: 'bendahara',
    phone: '081398765432',
    createdAt: '2026-07-01T08:00:00Z',
  },
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USER_SESSION);
    return saved ? JSON.parse(saved) : DEFAULT_USERS[0]; // Default logged in as Administrator
  });
  const [users, setUsers] = useState<AppUser[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS_LIST);
    return saved ? JSON.parse(saved) : DEFAULT_USERS;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(false);

  // Entities State
  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    return saved ? JSON.parse(saved) : initialStudents;
  });

  const [bills, setBills] = useState<Bill[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BILLS);
    return saved ? JSON.parse(saved) : initialBills;
  });

  const [payments, setPayments] = useState<PaymentRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    return saved ? JSON.parse(saved) : initialPaymentRecords;
  });

  const [settings, setSettings] = useState<SchoolSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return saved ? JSON.parse(saved) : initialSchoolSettings;
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  // Modals state
  const [selectedReceiptForModal, setSelectedReceiptForModal] = useState<PaymentRecord | null>(null);
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<Student | null>(null);
  const [preselectedStudentForPayment, setPreselectedStudentForPayment] = useState<string | null>(null);

  // Sync state to LocalStorage as instant local cache
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(bills));
  }, [bills]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
  }, [payments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER_SESSION);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS_LIST, JSON.stringify(users));
  }, [users]);

  // Firebase Realtime Subscriptions & Initial Seeding
  useEffect(() => {
    let unsubStudents: () => void;
    let unsubBills: () => void;
    let unsubPayments: () => void;
    let unsubSettings: () => void;
    let unsubUsers: () => void;

    async function initFirestore() {
      try {
        await seedInitialFirestoreData();
        setIsFirestoreConnected(true);

        unsubStudents = subscribeStudents((remoteStudents) => {
          if (remoteStudents.length > 0) {
            setStudents(remoteStudents);
          }
        });

        unsubBills = subscribeBills((remoteBills) => {
          if (remoteBills.length > 0) {
            setBills(remoteBills);
          }
        });

        unsubPayments = subscribePayments((remotePayments) => {
          if (remotePayments.length > 0) {
            setPayments(remotePayments);
          }
        });

        unsubSettings = subscribeSettings((remoteSettings) => {
          if (remoteSettings) {
            setSettings(remoteSettings);
          }
        });

        unsubUsers = subscribeUsers((remoteUsers) => {
          if (remoteUsers.length > 0) {
            setUsers(remoteUsers);
          }
        });
      } catch (err) {
        console.warn('Firestore initialization notice:', err);
      }
    }

    initFirestore();

    // Listen to Firebase Auth state
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Sync with existing profile or default role
        const found = users.find((u) => u.uid === firebaseUser.uid || u.email === firebaseUser.email);
        if (found) {
          setCurrentUser(found);
        } else {
          const isRoleAdmin = firebaseUser.email?.includes('admin') || false;
          const newProfile: AppUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || 'staf@pesantren.sch.id',
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Staf Keuangan',
            role: isRoleAdmin ? 'admin' : 'bendahara',
            createdAt: new Date().toISOString(),
          };
          setCurrentUser(newProfile);
          saveUserToDb(newProfile).catch(() => {});
        }
      }
    });

    return () => {
      if (unsubStudents) unsubStudents();
      if (unsubBills) unsubBills();
      if (unsubPayments) unsubPayments();
      if (unsubSettings) unsubSettings();
      if (unsubUsers) unsubUsers();
      if (unsubAuth) unsubAuth();
    };
  }, []);

  const addNotification = (
    type: ToastNotification['type'],
    title: string,
    message: string
  ) => {
    const id = 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    const newNotif: ToastNotification = {
      id,
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
    };
    setNotifications((prev) => [newNotif, ...prev]);

    setTimeout(() => {
      removeNotification(id);
    }, 5000);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Auth Operations
  const login = async (email: string, password: string) => {
    try {
      try {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        const fbUid = userCred.user.uid;
        const profile = users.find((u) => u.uid === fbUid || u.email === email);
        if (profile) {
          setCurrentUser(profile);
        } else {
          const newProfile: AppUser = {
            uid: fbUid,
            email,
            name: email.split('@')[0],
            role: email.includes('admin') ? 'admin' : 'bendahara',
            createdAt: new Date().toISOString(),
          };
          setCurrentUser(newProfile);
          await saveUserToDb(newProfile);
        }
      } catch (authError: any) {
        // Fallback for simulation / demo accounts
        const matched = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (matched) {
          setCurrentUser(matched);
        } else {
          throw new Error('Email atau kata sandi tidak cocok.');
        }
      }

      addNotification('success', 'Login Berhasil', `Selamat datang, ${currentUser?.name || email}.`);
      return { success: true };
    } catch (err: any) {
      addNotification('error', 'Login Gagal', err.message || 'Gagal masuk akun.');
      return { success: false, message: err.message };
    }
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;
      const existingUser = users.find((u) => u.uid === fbUser.uid || u.email === fbUser.email);
      if (existingUser) {
        setCurrentUser(existingUser);
      } else {
        const isAdminUser = fbUser.email?.includes('admin') || false;
        const newProfile: AppUser = {
          uid: fbUser.uid,
          email: fbUser.email || 'staf@pesantren.sch.id',
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Staf Akun Google',
          role: isAdminUser ? 'admin' : 'bendahara',
          createdAt: new Date().toISOString(),
        };
        setCurrentUser(newProfile);
        await saveUserToDb(newProfile);
      }
      addNotification('success', 'Login Google Berhasil', `Masuk sebagai ${fbUser.displayName || fbUser.email}`);
      return { success: true };
    } catch (err: any) {
      console.warn('Google Sign-In notice:', err);
      return { success: false, message: err.message || 'Login dengan Google dibatalkan atau belum diaktifkan.' };
    }
  };

  const register = async (name: string, email: string, password: string, role: UserRole) => {
    try {
      let uid = 'usr-' + Date.now();
      try {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        uid = userCred.user.uid;
      } catch (e) {
        // Ignore auth error if offline/custom
      }

      const newAccount: AppUser = {
        uid,
        email,
        name,
        role,
        createdAt: new Date().toISOString(),
      };

      setUsers((prev) => [newAccount, ...prev]);
      setCurrentUser(newAccount);
      await saveUserToDb(newAccount);

      addNotification('success', 'Pendaftaran Berhasil', `Akun ${name} (${role === 'admin' ? 'Administrator' : 'Bendahara'}) berhasil dibuat.`);
      return { success: true };
    } catch (err: any) {
      addNotification('error', 'Gagal Daftar', err.message);
      return { success: false, message: err.message };
    }
  };

  const quickLoginAs = async (role: UserRole) => {
    const target = users.find((u) => u.role === role) || (role === 'admin' ? DEFAULT_USERS[0] : DEFAULT_USERS[1]);
    setCurrentUser(target);
    addNotification('info', 'Beralih Akun', `Anda sekarang masuk sebagai ${target.name} (${role === 'admin' ? 'Administrator' : 'Bendahara'}).`);
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      // Ignore
    }
    setCurrentUser(null);
    addNotification('info', 'Logout', 'Anda telah keluar dari sistem.');
  };

  const updateUserRole = async (uid: string, newRole: UserRole) => {
    const updatedUsers = users.map((u) => (u.uid === uid ? { ...u, role: newRole } : u));
    setUsers(updatedUsers);
    const target = updatedUsers.find((u) => u.uid === uid);
    if (target) {
      await saveUserToDb(target);
    }
    if (currentUser?.uid === uid) {
      setCurrentUser((prev) => (prev ? { ...prev, role: newRole } : null));
    }
    addNotification('success', 'Hak Akses Diperbarui', `Peran pengguna berhasil diubah menjadi ${newRole.toUpperCase()}.`);
  };

  const addUserAccount = async (userData: Omit<AppUser, 'createdAt'>) => {
    const newAcc: AppUser = {
      ...userData,
      createdAt: new Date().toISOString(),
    };
    setUsers((prev) => [newAcc, ...prev]);
    await saveUserToDb(newAcc);
    addNotification('success', 'Staf Ditambahkan', `Akun staf ${newAcc.name} (${newAcc.role}) siap digunakan.`);
  };

  // 1. Add new student
  const addStudent = async (studentData: Omit<Student, 'id' | 'createdAt'>) => {
    if (students.some((s) => s.nis.trim().toLowerCase() === studentData.nis.trim().toLowerCase())) {
      addNotification('error', 'Gagal', `Siswa dengan NIS ${studentData.nis} sudah terdaftar.`);
      return;
    }

    const newId = 'std-' + Date.now();
    const newStudent: Student = {
      ...studentData,
      id: newId,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setStudents((prev) => [newStudent, ...prev]);
    saveStudentToDb(newStudent).catch(() => {});

    const currentMonth = settings.activeMonth;
    const currentYear = settings.activeYear;
    const dueDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(
      settings.defaultDueDateDay
    ).padStart(2, '0')}`;

    const initialBill: Bill = {
      id: `bill-${newId}-${currentYear}${String(currentMonth).padStart(2, '0')}`,
      studentId: newId,
      studentName: newStudent.name,
      classGrade: newStudent.classGrade,
      gradeLevel: newStudent.gradeLevel,
      month: currentMonth,
      year: currentYear,
      academicYear: settings.academicYear,
      amount: newStudent.monthlyFee,
      paidAmount: 0,
      remainingAmount: newStudent.monthlyFee,
      breakdown: {
        spp: newStudent.category === 'reguler' ? newStudent.monthlyFee : Math.round(newStudent.monthlyFee * 0.6),
        asrama: newStudent.category === 'asrama_santri' ? Math.round(newStudent.monthlyFee * 0.25) : 0,
        makan: newStudent.category === 'asrama_santri' ? Math.round(newStudent.monthlyFee * 0.15) : 0,
      },
      dueDate: dueDateStr,
      status: 'unpaid',
    };

    setBills((prev) => [initialBill, ...prev]);
    saveBillToDb(initialBill).catch(() => {});

    addNotification('success', 'Siswa Ditambahkan', `Data ${newStudent.name} (${newStudent.classGrade}) berhasil disimpan.`);
  };

  // 2. Update existing student
  const updateStudent = async (updatedStudent: Student) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s))
    );
    saveStudentToDb(updatedStudent).catch(() => {});

    setBills((prev) =>
      prev.map((b) => {
        if (b.studentId === updatedStudent.id) {
          const mod = {
            ...b,
            studentName: updatedStudent.name,
            classGrade: updatedStudent.classGrade,
            gradeLevel: updatedStudent.gradeLevel,
          };
          saveBillToDb(mod).catch(() => {});
          return mod;
        }
        return b;
      })
    );

    addNotification('info', 'Data Diperbarui', `Informasi siswa ${updatedStudent.name} berhasil diperbarui.`);
  };

  // 3. Delete student
  const deleteStudent = async (id: string) => {
    const student = students.find((s) => s.id === id);
    if (!student) return;

    setStudents((prev) => prev.filter((s) => s.id !== id));
    deleteStudentFromDb(id).catch(() => {});

    // Remove unpaid bills
    const billsToDelete = bills.filter((b) => b.studentId === id && b.status === 'unpaid');
    billsToDelete.forEach((b) => deleteBillFromDb(b.id).catch(() => {}));
    setBills((prev) => prev.filter((b) => !(b.studentId === id && b.status === 'unpaid')));

    addNotification('warning', 'Siswa Dihapus', `Data siswa ${student.name} telah dihapus dari sistem.`);
  };

  // 4. Generate Monthly Bills with anti-duplicate validation
  const generateBills = (options: GenerateBillsOption): GenerateBillsResult => {
    const { month, year, targetType, classGrade, studentId, customNominal } = options;

    let targetStudents: Student[] = [];

    if (targetType === 'student' && studentId) {
      const single = students.find((s) => s.id === studentId);
      if (single) targetStudents = [single];
    } else if (targetType === 'class' && classGrade) {
      targetStudents = students.filter(
        (s) => s.classGrade === classGrade && s.status === 'active'
      );
    } else {
      targetStudents = students.filter((s) => s.status === 'active');
    }

    if (targetStudents.length === 0) {
      addNotification('warning', 'Tidak Ada Siswa', 'Tidak ada siswa aktif yang cocok dengan kriteria penerbitan tagihan.');
      return { successCount: 0, skippedCount: 0, skippedStudents: [] };
    }

    const skippedStudents: string[] = [];
    const billsToCreate: Bill[] = [];

    const dueDateStr = `${year}-${String(month).padStart(2, '0')}-${String(
      settings.defaultDueDateDay
    ).padStart(2, '0')}`;

    targetStudents.forEach((student) => {
      const alreadyHasBill = bills.some(
        (b) => b.studentId === student.id && b.month === month && b.year === year
      );

      if (alreadyHasBill) {
        skippedStudents.push(`${student.name} (${student.nis})`);
      } else {
        const nominal = customNominal && customNominal > 0 ? customNominal : student.monthlyFee;
        const newBill: Bill = {
          id: `bill-${student.id}-${year}${String(month).padStart(2, '0')}`,
          studentId: student.id,
          studentName: student.name,
          classGrade: student.classGrade,
          gradeLevel: student.gradeLevel,
          month,
          year,
          academicYear: settings.academicYear,
          amount: nominal,
          paidAmount: 0,
          remainingAmount: nominal,
          breakdown: {
            spp: student.category === 'reguler' ? nominal : Math.round(nominal * 0.6),
            asrama: student.category === 'asrama_santri' ? Math.round(nominal * 0.25) : 0,
            makan: student.category === 'asrama_santri' ? Math.round(nominal * 0.15) : 0,
          },
          dueDate: dueDateStr,
          status: 'unpaid',
        };
        billsToCreate.push(newBill);
        saveBillToDb(newBill).catch(() => {});
      }
    });

    if (billsToCreate.length > 0) {
      setBills((prev) => [...billsToCreate, ...prev]);
    }

    if (billsToCreate.length > 0 && skippedStudents.length === 0) {
      addNotification(
        'success',
        'Tagihan Berhasil Dibuat',
        `Berhasil menerbitkan ${billsToCreate.length} lembar tagihan untuk bulan ${getMonthName(month)} ${year}.`
      );
    } else if (billsToCreate.length > 0 && skippedStudents.length > 0) {
      addNotification(
        'info',
        'Tagihan Diterbitkan Sebagian',
        `${billsToCreate.length} tagihan baru dibuat. ${skippedStudents.length} siswa dilewati karena sudah memiliki tagihan pada periode ini.`
      );
    } else {
      addNotification(
        'warning',
        'Tagihan Ganda Dicegah',
        `Seluruh ${skippedStudents.length} siswa yang dipilih sudah memiliki tagihan untuk periode ${getMonthName(month)} ${year}.`
      );
    }

    return {
      successCount: billsToCreate.length,
      skippedCount: skippedStudents.length,
      skippedStudents,
    };
  };

  const deleteBill = async (billId: string) => {
    const bill = bills.find((b) => b.id === billId);
    if (!bill) return;

    if (bill.status === 'paid' || (bill.paidAmount && bill.paidAmount > 0)) {
      addNotification('error', 'Gagal Menghapus', 'Tagihan yang sudah memiliki transaksi pembayaran tidak dapat dihapus.');
      return;
    }

    setBills((prev) => prev.filter((b) => b.id !== billId));
    deleteBillFromDb(billId).catch(() => {});
    addNotification('info', 'Tagihan Dihapus', `Tagihan bulan ${getMonthName(bill.month)} ${bill.year} untuk ${bill.studentName} telah dihapus.`);
  };

  const updateBillNominal = async (billId: string, newAmount: number) => {
    if (newAmount <= 0) return;
    setBills((prev) =>
      prev.map((b) => {
        if (b.id === billId) {
          const paid = b.paidAmount || 0;
          const remaining = Math.max(0, newAmount - paid);
          let newStatus = b.status;
          if (paid >= newAmount) newStatus = 'paid';
          else if (paid > 0) newStatus = 'partial';
          else newStatus = 'unpaid';

          const updated = {
            ...b,
            amount: newAmount,
            remainingAmount: remaining,
            status: newStatus,
          };
          saveBillToDb(updated).catch(() => {});
          return updated;
        }
        return b;
      })
    );
    addNotification('success', 'Nominal Diperbarui', 'Besaran tagihan berhasil disesuaikan.');
  };

  // 5. Process Payment with partial & full payment, custom date, and Firestore persistence
  const processPayment = (payload: ProcessPaymentPayload): PaymentRecord | null => {
    const student = students.find((s) => s.id === payload.studentId);
    if (!student) {
      addNotification('error', 'Gagal', 'Data siswa tidak ditemukan.');
      return null;
    }

    if (payload.items.length === 0) {
      addNotification('error', 'Gagal', 'Pilih minimal satu tagihan untuk dibayarkan.');
      return null;
    }

    // Validate that payAmount > 0 and does not exceed remaining amount
    for (const item of payload.items) {
      const b = bills.find((x) => x.id === item.billId);
      if (!b) continue;
      const currentRemaining = b.remainingAmount !== undefined ? b.remainingAmount : Math.max(0, b.amount - (b.paidAmount || 0));
      const payVal = Math.round(Number(item.payAmount) || 0);

      if (payVal <= 0) {
        addNotification('error', 'Nominal Tidak Valid', `Nominal bayar untuk ${getMonthName(b.month)} ${b.year} harus lebih dari Rp 0.`);
        return null;
      }
      if (payVal > currentRemaining) {
        addNotification(
          'error',
          'Melebihi Sisa Tagihan',
          `Nominal bayar (Rp ${payVal.toLocaleString('id-ID')}) melebihi sisa tagihan (Rp ${currentRemaining.toLocaleString('id-ID')}) untuk ${getMonthName(b.month)} ${b.year}.`
        );
        return null;
      }
    }

    const receiptNumber = generateReceiptNumber();
    const paymentDate = payload.paymentDate ? new Date(payload.paymentDate).toISOString() : new Date().toISOString();
    const cashierName = payload.cashierName || currentUser?.name || settings.treasurerName;
    const paymentId = 'pay-' + Date.now();

    let totalPaymentAmount = 0;
    const monthsPaidSummary: PaymentRecord['monthsPaid'] = [];
    const itemDetails: PaymentItemDetail[] = [];
    const modifiedBills: Bill[] = [];

    // Map through bills and update statuses
    const updatedBills = bills.map((b) => {
      const itemToPay = payload.items.find((item) => item.billId === b.id);
      if (!itemToPay) return b;

      const currentPaid = b.paidAmount || 0;
      const paymentAmount = Math.round(Number(itemToPay.payAmount) || 0);
      const newPaidTotal = currentPaid + paymentAmount;
      const remaining = Math.max(0, b.amount - newPaidTotal);
      const isLunas = newPaidTotal >= b.amount;

      totalPaymentAmount += paymentAmount;

      monthsPaidSummary.push({
        month: b.month,
        year: b.year,
        amount: paymentAmount,
        isPartial: !isLunas,
        remaining,
      });

      itemDetails.push({
        billId: b.id,
        month: b.month,
        year: b.year,
        amountPaid: paymentAmount,
        billTotal: b.amount,
        remainingAfter: remaining,
        isFullyPaid: isLunas,
      });

      const updatedHistory = [
        ...(b.historyPayments || []),
        {
          paymentId,
          receiptNumber,
          amount: paymentAmount,
          date: paymentDate,
          method: payload.paymentMethod,
          notes: payload.notes,
          isCancelled: false,
        },
      ];

      const modBill: Bill = {
        ...b,
        paidAmount: newPaidTotal,
        remainingAmount: remaining,
        status: isLunas ? ('paid' as const) : ('partial' as const),
        paidDate: isLunas ? paymentDate.split('T')[0] : b.paidDate,
        paymentMethod: payload.paymentMethod,
        receiptNumber,
        historyPayments: updatedHistory,
      };

      modifiedBills.push(modBill);
      return modBill;
    });

    setBills(updatedBills);

    const changeReturned =
      payload.paymentMethod === 'tunai' && payload.cashReceived
        ? Math.max(0, payload.cashReceived - totalPaymentAmount)
        : 0;

    const newPaymentRecord: PaymentRecord = {
      id: paymentId,
      receiptNumber,
      studentId: student.id,
      studentName: student.name,
      nis: student.nis,
      classGrade: student.classGrade,
      billIds: payload.items.map((i) => i.billId),
      monthsPaid: monthsPaidSummary,
      itemDetails,
      totalAmount: totalPaymentAmount,
      paymentMethod: payload.paymentMethod,
      bankName: payload.bankName,
      paymentDate,
      cashierName,
      cashReceived: payload.cashReceived,
      changeReturned,
      notes: payload.notes,
      status: 'completed',
    };

    setPayments((prev) => [newPaymentRecord, ...prev]);

    // Save transaction and updated bills to Firestore
    savePaymentToDb(newPaymentRecord, modifiedBills).catch((e) => {
      console.warn('Sync to Firestore payment:', e);
    });

    addNotification(
      'success',
      'Pembayaran Berhasil Dicatat',
      `Transaksi ${receiptNumber} (${student.name}) senilai Rp ${totalPaymentAmount.toLocaleString('id-ID')} telah disimpan.`
    );

    return newPaymentRecord;
  };

  // 6. Pembatalan Transaksi dengan Revert Saldo Tagihan & Catatan Pembatalan
  const cancelPayment = (paymentId: string, reason: string): boolean => {
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) {
      addNotification('error', 'Gagal', 'Transaksi tidak ditemukan.');
      return false;
    }

    if (payment.status === 'cancelled') {
      addNotification('warning', 'Sudah Dibatalkan', 'Transaksi ini sebelumnya sudah dibatalkan.');
      return false;
    }

    const cancelledAt = new Date().toISOString();
    const cancelledBy = currentUser?.name || settings.treasurerName;

    const restoredBillsList: Bill[] = [];

    // 1. Revert each bill's paidAmount and status
    const newBills = bills.map((bill) => {
      const item = payment.itemDetails
        ? payment.itemDetails.find((d) => d.billId === bill.id)
        : null;

      const amountToDeduct = item
        ? item.amountPaid
        : payment.billIds.includes(bill.id)
        ? payment.totalAmount / payment.billIds.length
        : 0;

      if (amountToDeduct > 0) {
        const currentPaid = bill.paidAmount || 0;
        const restoredPaid = Math.max(0, currentPaid - amountToDeduct);
        const restoredRemaining = Math.max(0, bill.amount - restoredPaid);

        let restoredStatus: Bill['status'] = 'unpaid';
        if (restoredPaid >= bill.amount) {
          restoredStatus = 'paid';
        } else if (restoredPaid > 0) {
          restoredStatus = 'partial';
        } else {
          const now = new Date();
          const due = new Date(bill.dueDate);
          restoredStatus = due < now ? 'overdue' : 'unpaid';
        }

        const updatedHistory = (bill.historyPayments || []).map((h) => {
          if (h.paymentId === paymentId || h.receiptNumber === payment.receiptNumber) {
            return { ...h, isCancelled: true };
          }
          return h;
        });

        const mod: Bill = {
          ...bill,
          paidAmount: restoredPaid,
          remainingAmount: restoredRemaining,
          status: restoredStatus,
          paidDate: restoredStatus === 'paid' ? bill.paidDate : undefined,
          historyPayments: updatedHistory,
        };

        restoredBillsList.push(mod);
        return mod;
      }

      return bill;
    });

    setBills(newBills);

    // 2. Mark payment record as cancelled
    let updatedPaymentRecord: PaymentRecord | null = null;
    setPayments((prevPayments) =>
      prevPayments.map((p) => {
        if (p.id === paymentId) {
          updatedPaymentRecord = {
            ...p,
            status: 'cancelled',
            cancelledAt,
            cancelledReason: reason || 'Dibatalkan oleh kasir/bendahara',
            cancelledBy,
          };
          return updatedPaymentRecord;
        }
        return p;
      })
    );

    if (updatedPaymentRecord) {
      cancelPaymentInDb(paymentId, updatedPaymentRecord, restoredBillsList).catch((e) => {
        console.warn('Sync cancel payment to Firestore:', e);
      });
    }

    addNotification(
      'warning',
      'Transaksi Dibatalkan',
      `Bukti ${payment.receiptNumber} telah dibatalkan. Saldo dan status tagihan siswa telah dipulihkan.`
    );

    return true;
  };

  const updateSettings = async (newSettings: SchoolSettings) => {
    setSettings(newSettings);
    await saveSettingsToDb(newSettings).catch((e) => console.warn('Save settings error:', e));
    addNotification('success', 'Pengaturan Disimpan', 'Konfigurasi sekolah dan tarif berhasil diperbarui ke database.');
  };

  const resetToDefaultData = () => {
    setStudents(initialStudents);
    setBills(initialBills);
    setPayments(initialPaymentRecords);
    setSettings(initialSchoolSettings);
    localStorage.clear();
    addNotification('info', 'Reset Data', 'Data sistem telah dikembalikan ke data simulasi.');
  };

  const userRole: UserRole = currentUser?.role || 'bendahara';
  const isAdmin = userRole === 'admin';
  const isBendahara = userRole === 'bendahara';

  return (
    <AppContext.Provider
      value={{
        currentUser,
        userRole,
        isAdmin,
        isBendahara,
        users,
        isFirestoreConnected,
        isAuthModalOpen,
        setIsAuthModalOpen,
        login,
        loginWithGoogle,
        register,
        quickLoginAs,
        logout,
        updateUserRole,
        addUserAccount,
        students,
        bills,
        payments,
        settings,
        activeTab,
        setActiveTab,
        searchQuery,
        setSearchQuery,
        notifications,
        addNotification,
        removeNotification,
        addStudent,
        updateStudent,
        deleteStudent,
        generateBills,
        deleteBill,
        updateBillNominal,
        processPayment,
        cancelPayment,
        updateSettings,
        resetToDefaultData,
        selectedReceiptForModal,
        setSelectedReceiptForModal,
        selectedStudentForDetail,
        setSelectedStudentForDetail,
        preselectedStudentForPayment,
        setPreselectedStudentForPayment,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
