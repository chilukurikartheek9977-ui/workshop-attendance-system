import { collection, doc, setDoc, getDocs, query, where, orderBy, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase/client';
import { Class } from '@/types';

// ================= CLASSES ================= //

export async function createClass(classData: Omit<Class, 'id' | 'createdAt' | 'updatedAt'>) {
  if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true' && typeof window !== 'undefined') {
    const classes = JSON.parse(localStorage.getItem('mockClasses') || '[]');
    const id = 'class_' + Math.random().toString(36).substr(2, 6);
    const newClass = {
      ...classData,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem('mockClasses', JSON.stringify([...classes, newClass]));
    return id;
  }

  try {
    const newClassRef = doc(collection(db, 'classes'));
    await setDoc(newClassRef, {
      ...classData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return newClassRef.id;
  } catch (err) {
    console.warn('createClass firestore failed, falling back to local mock:', err);
    if (typeof window !== 'undefined') {
      const classes = JSON.parse(localStorage.getItem('mockClasses') || '[]');
      const id = 'class_' + Math.random().toString(36).substr(2, 6);
      const newClass = {
        ...classData,
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem('mockClasses', JSON.stringify([...classes, newClass]));
      return id;
    }
    throw err;
  }
}

export async function getClasses(statusFilter?: 'ACTIVE' | 'ARCHIVED'): Promise<Class[]> {
  const getMockClasses = (): Class[] => {
    if (typeof window === 'undefined') return [];
    const classes: Class[] = JSON.parse(localStorage.getItem('mockClasses') || '[]');
    if (classes.length === 0) {
      const defaultClasses: Class[] = [
        { id: 'workshop-1', name: 'Web Dev Workshop', department: 'CSE', year: 3, section: 'A', status: 'ACTIVE', academicYear: '2026-27', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'workshop-2', name: 'AI & ML Bootcamp', department: 'AI', year: 2, section: 'B', status: 'ACTIVE', academicYear: '2026-27', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      ];
      localStorage.setItem('mockClasses', JSON.stringify(defaultClasses));
      return defaultClasses;
    }
    return statusFilter ? classes.filter((c: Class) => c.status === statusFilter) : classes;
  };

  if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
    return getMockClasses();
  }

  try {
    let q = query(collection(db, 'classes'), orderBy('name', 'asc'));
    if (statusFilter) {
      q = query(collection(db, 'classes'), where('status', '==', statusFilter), orderBy('name', 'asc'));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Class));
  } catch (err) {
    console.warn('getClasses firestore failed, falling back to local mock:', err);
    return getMockClasses();
  }
}

export async function updateClass(classId: string, updates: Partial<Omit<Class, 'id' | 'createdAt' | 'updatedAt'>>) {
  if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true' && typeof window !== 'undefined') {
    const classes = JSON.parse(localStorage.getItem('mockClasses') || '[]');
    const updated = classes.map((c: any) => c.id === classId ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c);
    localStorage.setItem('mockClasses', JSON.stringify(updated));
    return;
  }

  const classRef = doc(db, 'classes', classId);
  await updateDoc(classRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
}

export async function archiveClass(classId: string) {
  if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true' && typeof window !== 'undefined') {
    await updateClass(classId, { status: 'ARCHIVED' });
    return;
  }

  const functions = getFunctions();
  const archiveFn = httpsCallable(functions, 'adminClasses-archiveClass');
  await archiveFn({ classId });
}
