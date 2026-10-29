import { collection, doc, getDocs, query, where, orderBy, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase/client';
import { Student } from '@/types';

export async function createStudent(studentData: Omit<Student, 'id' | 'userId' | 'status' | 'department' | 'year' | 'section'> & { password?: string; department?: string; year?: number; section?: string }) {
  const functions = getFunctions();
  const createStudentFn = httpsCallable(functions, 'adminStudents-createStudent');
  
  const array = new Uint8Array(12);
  crypto.getRandomValues(array);
  const generatedPassword = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('') + 'A1!';

  const result = await createStudentFn({
    ...studentData,
    password: studentData.password || generatedPassword,
  });
  return result.data;
}

export async function getStudents(classId?: string): Promise<Student[]> {
  let q = query(collection(db, 'students'), orderBy('name', 'asc'));
  if (classId) {
    q = query(collection(db, 'students'), where('classId', '==', classId), orderBy('name', 'asc'));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
}

export async function updateStudentStatus(studentId: string, status: 'ACTIVE' | 'INACTIVE') {
  const studentRef = doc(db, 'students', studentId);
  await updateDoc(studentRef, {
    status,
    updatedAt: serverTimestamp()
  });
}

export async function updateStudentClass(studentId: string, classId: string) {
  const studentRef = doc(db, 'students', studentId);
  await updateDoc(studentRef, {
    classId,
    updatedAt: serverTimestamp()
  });
}

// In a real app with 10k users, pagination via limit() and startAfter() is mandatory here.
export async function searchStudents(searchTerm: string): Promise<Student[]> {
  // Firestore doesn't support native full-text search easily. 
  // For this boilerplate, we fetch all students (or a limit) and filter in JS.
  // In production, we'd use Algolia, Typesense, or Firebase Extensions.
  const snapshot = await getDocs(collection(db, 'students'));
  const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
  
  const term = searchTerm.toLowerCase();
  return all.filter(s => 
    (s.name?.toLowerCase() || '').includes(term) || 
    (s.studentNumber?.toLowerCase() || '').includes(term) ||
    (s.email?.toLowerCase() || '').includes(term)
  ).slice(0, 50); // Limit results
}
