import { collection, doc, setDoc, getDocs, query, orderBy, serverTimestamp, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase/client';
import { AttendanceSession } from '@/types';

export async function createSession(sessionData: Omit<AttendanceSession, 'id' | 'status' | 'startTime' | 'endTime' | 'createdAt' | 'updatedAt'>) {
  if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true' && typeof window !== 'undefined') {
    const sessions = JSON.parse(localStorage.getItem('mockSessions') || '[]');
    const id = Math.random().toString(36).substr(2, 9);
    const newSession = {
      ...sessionData,
      id,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem('mockSessions', JSON.stringify([newSession, ...sessions]));
    return id;
  }


  const newSessionRef = doc(collection(db, 'attendanceSessions'));
  await setDoc(newSessionRef, {
    ...sessionData,
    status: 'DRAFT',
    startTime: null,
    endTime: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return newSessionRef.id;
}

export async function getSessions(): Promise<AttendanceSession[]> {
  if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true' && typeof window !== 'undefined') {
    return JSON.parse(localStorage.getItem('mockSessions') || '[]');
  }
  const q = query(collection(db, 'attendanceSessions'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceSession));
}

import { updateDoc } from 'firebase/firestore';

export async function startSession(sessionId: string) {
  if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true' && typeof window !== 'undefined') {
    const sessions = JSON.parse(localStorage.getItem('mockSessions') || '[]');
    const updated = sessions.map((s: any) => s.id === sessionId ? { ...s, status: 'ACTIVE', startTime: new Date().toISOString() } : s);
    localStorage.setItem('mockSessions', JSON.stringify(updated));
    return;
  }
  const sessionRef = doc(db, 'attendanceSessions', sessionId);
  await updateDoc(sessionRef, {
    status: 'ACTIVE',
    startTime: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function endSession(sessionId: string) {
  if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true' && typeof window !== 'undefined') {
    const sessions = JSON.parse(localStorage.getItem('mockSessions') || '[]');
    const updated = sessions.map((s: any) => s.id === sessionId ? { ...s, status: 'ENDED', endTime: new Date().toISOString() } : s);
    localStorage.setItem('mockSessions', JSON.stringify(updated));
    return;
  }
  const sessionRef = doc(db, 'attendanceSessions', sessionId);
  await updateDoc(sessionRef, {
    status: 'ENDED',
    endTime: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}
