import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  query,
  limit,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import {
  Student,
  Bill,
  PaymentRecord,
  SchoolSettings,
  AppUser,
} from '../types';
import {
  initialStudents,
  initialBills,
  initialPaymentRecords,
  initialSchoolSettings,
} from '../data/mockData';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const COLLECTIONS = {
  USERS: 'users',
  STUDENTS: 'students',
  BILLS: 'bills',
  PAYMENTS: 'payments',
  SETTINGS: 'school_settings',
};

export const SETTINGS_DOC_ID = 'main_config';

/**
 * Automatically seeds initial realistic school/pesantren data
 * if the Firestore database is currently empty.
 */
export async function seedInitialFirestoreData(): Promise<boolean> {
  try {
    const studentsCol = collection(db, COLLECTIONS.STUDENTS);
    let snap;
    try {
      snap = await getDocs(query(studentsCol, limit(1)));
    } catch (fetchErr) {
      handleFirestoreError(fetchErr, OperationType.LIST, COLLECTIONS.STUDENTS);
      return false;
    }

    if (!snap.empty) {
      return false; // Already has data, no seeding needed
    }

    console.log('Seeding initial school data to Cloud Firestore...');
    const batch = writeBatch(db);

    // 1. Seed School Settings
    const settingsRef = doc(db, COLLECTIONS.SETTINGS, SETTINGS_DOC_ID);
    batch.set(settingsRef, initialSchoolSettings);

    // 2. Seed Default Staff Users
    const defaultAdmin: AppUser = {
      uid: 'user-admin-default',
      email: 'admin@pesantren.sch.id',
      name: 'Ust. Ahmad Fauzi, M.Pd.',
      role: 'admin',
      phone: '081234567890',
      createdAt: new Date().toISOString(),
    };
    const defaultBendahara: AppUser = {
      uid: 'user-bendahara-default',
      email: 'bendahara@pesantren.sch.id',
      name: 'Ust. Rahmat Hidayat, S.E.',
      role: 'bendahara',
      phone: '081398765432',
      createdAt: new Date().toISOString(),
    };
    batch.set(doc(db, COLLECTIONS.USERS, defaultAdmin.uid), defaultAdmin);
    batch.set(doc(db, COLLECTIONS.USERS, defaultBendahara.uid), defaultBendahara);

    // 3. Seed Students
    initialStudents.forEach((student) => {
      const sRef = doc(db, COLLECTIONS.STUDENTS, student.id);
      batch.set(sRef, student);
    });

    // 4. Seed Bills
    initialBills.forEach((bill) => {
      const bRef = doc(db, COLLECTIONS.BILLS, bill.id);
      batch.set(bRef, bill);
    });

    // 5. Seed Payments
    initialPaymentRecords.forEach((pay) => {
      const pRef = doc(db, COLLECTIONS.PAYMENTS, pay.id);
      batch.set(pRef, pay);
    });

    await batch.commit();
    console.log('Successfully seeded initial data to Cloud Firestore!');
    return true;
  } catch (err) {
    if (err instanceof Error && err.message.includes('Firestore Error:')) {
      throw err;
    }
    handleFirestoreError(err, OperationType.WRITE, 'batch/seed');
    return false;
  }
}

/**
 * Subscribe to real-time changes in Students collection
 */
export function subscribeStudents(onUpdate: (students: Student[]) => void) {
  return onSnapshot(
    collection(db, COLLECTIONS.STUDENTS),
    (snapshot) => {
      const items: Student[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Student);
      });
      // Sort by name or class
      items.sort((a, b) => a.name.localeCompare(b.name));
      onUpdate(items);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, COLLECTIONS.STUDENTS);
    }
  );
}

/**
 * Subscribe to real-time changes in Bills collection
 */
export function subscribeBills(onUpdate: (bills: Bill[]) => void) {
  return onSnapshot(
    collection(db, COLLECTIONS.BILLS),
    (snapshot) => {
      const items: Bill[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Bill);
      });
      onUpdate(items);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, COLLECTIONS.BILLS);
    }
  );
}

/**
 * Subscribe to real-time changes in Payments collection
 */
export function subscribePayments(onUpdate: (payments: PaymentRecord[]) => void) {
  return onSnapshot(
    collection(db, COLLECTIONS.PAYMENTS),
    (snapshot) => {
      const items: PaymentRecord[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as PaymentRecord);
      });
      // Sort payments newest first
      items.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
      onUpdate(items);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, COLLECTIONS.PAYMENTS);
    }
  );
}

/**
 * Subscribe to School Settings document
 */
export function subscribeSettings(onUpdate: (settings: SchoolSettings) => void) {
  return onSnapshot(
    doc(db, COLLECTIONS.SETTINGS, SETTINGS_DOC_ID),
    (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data() as SchoolSettings);
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, `${COLLECTIONS.SETTINGS}/${SETTINGS_DOC_ID}`);
    }
  );
}

/**
 * Subscribe to Users collection
 */
export function subscribeUsers(onUpdate: (users: AppUser[]) => void) {
  return onSnapshot(
    collection(db, COLLECTIONS.USERS),
    (snapshot) => {
      const items: AppUser[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as AppUser);
      });
      onUpdate(items);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, COLLECTIONS.USERS);
    }
  );
}

// Student CRUD operations
export async function saveStudentToDb(student: Student) {
  try {
    await setDoc(doc(db, COLLECTIONS.STUDENTS, student.id), student);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.STUDENTS}/${student.id}`);
  }
}

export async function deleteStudentFromDb(studentId: string) {
  try {
    await deleteDoc(doc(db, COLLECTIONS.STUDENTS, studentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.STUDENTS}/${studentId}`);
  }
}

// Bill CRUD operations
export async function saveBillToDb(bill: Bill) {
  try {
    await setDoc(doc(db, COLLECTIONS.BILLS, bill.id), bill);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.BILLS}/${bill.id}`);
  }
}

export async function deleteBillFromDb(billId: string) {
  try {
    await deleteDoc(doc(db, COLLECTIONS.BILLS, billId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.BILLS}/${billId}`);
  }
}

export async function savePaymentToDb(payment: PaymentRecord, updatedBills: Bill[]) {
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, COLLECTIONS.PAYMENTS, payment.id), payment);
    updatedBills.forEach((b) => {
      batch.set(doc(db, COLLECTIONS.BILLS, b.id), b);
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.PAYMENTS}/${payment.id}`);
  }
}

export async function cancelPaymentInDb(paymentId: string, updatedPayment: PaymentRecord, restoredBills: Bill[]) {
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, COLLECTIONS.PAYMENTS, paymentId), updatedPayment);
    restoredBills.forEach((b) => {
      batch.set(doc(db, COLLECTIONS.BILLS, b.id), b);
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.PAYMENTS}/${paymentId}`);
  }
}

export async function saveSettingsToDb(settings: SchoolSettings) {
  try {
    await setDoc(doc(db, COLLECTIONS.SETTINGS, SETTINGS_DOC_ID), settings);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.SETTINGS}/${SETTINGS_DOC_ID}`);
  }
}

export async function saveUserToDb(user: AppUser) {
  try {
    await setDoc(doc(db, COLLECTIONS.USERS, user.uid), user);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.USERS}/${user.uid}`);
  }
}
