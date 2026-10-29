import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { AttendanceSession, AttendanceRecord, Student, Class } from '@/types';

export async function getHistoricalSessions(filters: { classId?: string; startDate?: Date; endDate?: Date }) {
  try {
    const q = collection(db, 'attendanceSessions');
    const qConstraints: import('firebase/firestore').QueryConstraint[] = [];
    
    // Status should be ENDED for history mostly, but let's allow all past ones except DRAFT maybe? 
    // Actually, Prompt 10 asks for Session History. We will pull ENDED and CANCELLED, or even ACTIVE.
    
    if (filters.classId) {
      qConstraints.push(where('classId', '==', filters.classId));
    }
    
    // Note: Due to Firestore index limits, we'll fetch constraints and filter by date client-side
    // if there are too many composite conditions. Since classroom scale is small, fetching all sessions 
    // for a class/subject and filtering by date on the client is highly cost-effective and saves composite index creation.
    
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
    console.error('Error fetching historical sessions:', error);
    return [];
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
