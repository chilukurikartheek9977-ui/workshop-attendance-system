import { collection, doc, getDocs, query, where, orderBy, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase/client';
import { Student } from '@/types';

const getMockStudents = (classId?: string): Student[] => {
  if (typeof window === 'undefined') return [];
  const students: Student[] = JSON.parse(localStorage.getItem('mockStudents') || '[]');
  if (students.length === 0) {
    const defaultStudents: Student[] = [
      { id: 'stu-1', userId: 'stu-1', name: 'Alex Johnson', email: 'alex@example.com', studentNumber: 'STU1001', classId: classId || 'workshop-1', department: 'CSE', year: 3, section: 'A', status: 'ACTIVE' },
      { id: 'stu-2', userId: 'stu-2', name: 'Samantha Lee', email: 'sam@example.com', studentNumber: 'STU1002', classId: classId || 'workshop-1', department: 'CSE', year: 3, section: 'A', status: 'ACTIVE' },
      { id: 'stu-3', userId: 'stu-3', name: 'Rahul Sharma', email: 'rahul@example.com', studentNumber: 'STU1003', classId: classId || 'workshop-1', department: 'CSE', year: 3, section: 'A', status: 'ACTIVE' },
    ];
    localStorage.setItem('mockStudents', JSON.stringify(defaultStudents));
    return defaultStudents;
  }
  return classId ? students.filter(s => s.classId === classId) : students;
};

export async function createStudent(studentData: Omit<Student, 'id' | 'userId' | 'status' | 'department' | 'year' | 'section'> & { password?: string; department?: string; year?: number; section?: string }) {
  if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true' && typeof window !== 'undefined') {
    const students = JSON.parse(localStorage.getItem('mockStudents') || '[]');
    const id = 'stu_' + Math.random().toString(36).substr(2, 6);
    const newStudent: Student = {
      id,
      userId: id,
      name: studentData.name,
      email: studentData.email,
      studentNumber: studentData.studentNumber,
      classId: studentData.classId,
      department: studentData.department || 'CSE',
      year: studentData.year || 3,
      section: studentData.section || 'A',
      status: 'ACTIVE'
    };
    localStorage.setItem('mockStudents', JSON.stringify([...students, newStudent]));
    return newStudent;
  }

  try {
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
  } catch (err) {
    console.warn('createStudent function failed, saving locally:', err);
    if (typeof window !== 'undefined') {
      const students = JSON.parse(localStorage.getItem('mockStudents') || '[]');
      const id = 'stu_' + Math.random().toString(36).substr(2, 6);
      const newStudent: Student = {
        id,
        userId: id,
        name: studentData.name,
        email: studentData.email,
        studentNumber: studentData.studentNumber,
        classId: studentData.classId,
        department: studentData.department || 'CSE',
        year: studentData.year || 3,
        section: studentData.section || 'A',
        status: 'ACTIVE'
      };
      localStorage.setItem('mockStudents', JSON.stringify([...students, newStudent]));
      return newStudent;
    }
    throw err;
  }
}

export async function getStudents(classId?: string): Promise<Student[]> {
  if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
    return getMockStudents(classId);
  }

  try {
    let q = query(collection(db, 'students'), orderBy('name', 'asc'));
    if (classId) {
      q = query(collection(db, 'students'), where('classId', '==', classId), orderBy('name', 'asc'));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
  } catch (err) {
    console.warn('getStudents firestore failed, falling back to local mock:', err);
    return getMockStudents(classId);
  }
}

export async function updateStudentStatus(studentId: string, status: 'ACTIVE' | 'INACTIVE') {
  if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true' && typeof window !== 'undefined') {
    const students = JSON.parse(localStorage.getItem('mockStudents') || '[]');
    const updated = students.map((s: any) => s.id === studentId ? { ...s, status } : s);
    localStorage.setItem('mockStudents', JSON.stringify(updated));
    return;
  }

  const studentRef = doc(db, 'students', studentId);
  await updateDoc(studentRef, {
    status,
    updatedAt: serverTimestamp()
  });
}

export async function updateStudentClass(studentId: string, classId: string) {
  if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true' && typeof window !== 'undefined') {
    const students = JSON.parse(localStorage.getItem('mockStudents') || '[]');
    const updated = students.map((s: any) => s.id === studentId ? { ...s, classId } : s);
    localStorage.setItem('mockStudents', JSON.stringify(updated));
    return;
  }

  const studentRef = doc(db, 'students', studentId);
  await updateDoc(studentRef, {
    classId,
    updatedAt: serverTimestamp()
  });
}

export async function searchStudents(searchTerm: string): Promise<Student[]> {
  const term = searchTerm.toLowerCase();
  const filterList = (list: Student[]) => list.filter(s => 
    (s.name?.toLowerCase() || '').includes(term) || 
    (s.studentNumber?.toLowerCase() || '').includes(term) ||
    (s.email?.toLowerCase() || '').includes(term)
  ).slice(0, 50);

  if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
    return filterList(getMockStudents());
  }

  try {
    const snapshot = await getDocs(collection(db, 'students'));
    const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
    return filterList(all);
  } catch (err) {
    console.warn('searchStudents failed, falling back to local mock:', err);
    return filterList(getMockStudents());
  }
}
