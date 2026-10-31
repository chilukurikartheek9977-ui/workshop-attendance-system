import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { AttendanceSession } from '@/types';

export async function getHistoricalSessions(filters: { classId?: string; startDate?: Date; endDate?: Date }) {
  const getMockHistoricalSessions = () => {
    if (typeof window === 'undefined') return [];
    let sessions: AttendanceSession[] = JSON.parse(localStorage.getItem('mockSessions') || '[]');
    if (filters.classId) {
      sessions = sessions.filter(s => s.classId === filters.classId);
    }
    return sessions;
  };

  if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
    return getMockHistoricalSessions();
  }

  try {
    const q = collection(db, 'attendanceSessions');
    const qConstraints: import('firebase/firestore').QueryConstraint[] = [];
    
    if (filters.classId) {
      qConstraints.push(where('classId', '==', filters.classId));
    }
    
    const finalQuery = query(q, ...qConstraints);
    const snapshot = await getDocs(finalQuery);
    let sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AttendanceSession[];

    // Client-side date filter
    if (filters.startDate || filters.endDate) {
      sessions = sessions.filter(session => {
        const d = (session.createdAt as unknown as Timestamp)?.toMillis?.() || Date.now();
        if (filters.startDate && d < filters.startDate.getTime()) return false;
        if (filters.endDate && d > filters.endDate.getTime()) return false;
        return true;
      });
    }

    // Client-side sort by newest first
    sessions.sort((a, b) => {
      const timeA = (a.createdAt as unknown as Timestamp)?.toMillis?.() || 0;
      const timeB = (b.createdAt as unknown as Timestamp)?.toMillis?.() || 0;
      return timeB - timeA;
    });

    return sessions;
  } catch (error) {
    console.warn('Error fetching historical sessions, using mock fallback:', error);
    return getMockHistoricalSessions();
  }
}

export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const escapeCSV = (val: string | number) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
