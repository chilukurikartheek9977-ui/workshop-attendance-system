import { collection, doc, setDoc, getDocs, query, where, orderBy, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase/client';
import { Class, Student, AttendanceSession } from '@/types';

// ================= CLASSES ================= //

export async function createClass(classData: Omit<Class, 'id' | 'createdAt' | 'updatedAt'>) {
  const newClassRef = doc(collection(db, 'classes'));
  await setDoc(newClassRef, {
    ...classData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return newClassRef.id;
}

export async function getClasses(statusFilter?: 'ACTIVE' | 'ARCHIVED'): Promise<Class[]> {
  let q = query(collection(db, 'classes'), orderBy('name', 'asc'));
  if (statusFilter) {
    q = query(collection(db, 'classes'), where('status', '==', statusFilter), orderBy('name', 'asc'));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Class));
}

export async function updateClass(classId: string, updates: Partial<Omit<Class, 'id' | 'createdAt' | 'updatedAt'>>) {
  const classRef = doc(db, 'classes', classId);
  await updateDoc(classRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
}

export async function archiveClass(classId: string) {
  const functions = getFunctions();
  const archiveFn = httpsCallable(functions, 'adminClasses-archiveClass');
  await archiveFn({ classId });
}

