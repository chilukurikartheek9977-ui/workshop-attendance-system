import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { AttendanceRecord, AttendanceSession } from '@/types';

export interface StudentDashboardStats {
  presentCount: number;
  absentCount: number;
  totalSessions: number;
  attendancePercentage: number;
}

export async function getStudentStats(studentUid: string, classId: string): Promise<StudentDashboardStats> {
  const getMockStats = (): StudentDashboardStats => {
    if (typeof window === 'undefined') {
      return { presentCount: 0, absentCount: 0, totalSessions: 0, attendancePercentage: 0 };
    }
    const sessions: AttendanceSession[] = JSON.parse(localStorage.getItem('mockSessions') || '[]');
    const records: AttendanceRecord[] = JSON.parse(localStorage.getItem('mockAttendanceRecords') || '[]');
    
    const endedSessions = sessions.filter(s => s.status === 'ENDED' && (!classId || s.classId === classId));
    const totalSessions = endedSessions.length;
    const presentCount = records.filter(r => r.studentId === studentUid || studentUid.includes('student')).length;
    const absentCount = Math.max(0, totalSessions - presentCount);
    const attendancePercentage = totalSessions === 0 ? (presentCount > 0 ? 100 : 0) : Math.min(100, Math.round((presentCount / totalSessions) * 100));

    return {
      presentCount,
      absentCount,
      totalSessions,
      attendancePercentage
    };
  };

  if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
    return getMockStats();
  }

  try {
    const attendanceQuery = query(
      collection(db, 'attendanceRecords'),
      where('studentId', '==', studentUid)
    );
    const recordsSnap = await getDocs(attendanceQuery);
    const records = recordsSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));

    const sessionsQuery = query(
      collection(db, 'attendanceSessions'),
      where('classId', '==', classId),
      where('status', '==', 'ENDED')
    );
    const sessionsSnap = await getDocs(sessionsQuery);
    const sessions = sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceSession));

    const totalSessions = sessions.length;
    const validSessionIds = new Set(sessions.map(s => s.id));
    const validRecords = records.filter(r => validSessionIds.has(r.sessionId));

    const presentCount = validRecords.length;
    const absentCount = totalSessions - presentCount;
    const attendancePercentage = totalSessions === 0 ? 0 : Math.round((presentCount / totalSessions) * 100);

    return {
      presentCount,
      absentCount,
      totalSessions,
      attendancePercentage
    };
  } catch (error) {
    console.warn('Error fetching student stats, using mock fallback:', error);
    return getMockStats();
  }
}

export async function getStudentAttendanceHistory(studentUid: string, limitCount = 50) {
  const getMockHistory = () => {
    if (typeof window === 'undefined') return [];
    const records: (AttendanceRecord & { id: string })[] = JSON.parse(localStorage.getItem('mockAttendanceRecords') || '[]');
    return records.slice(0, limitCount);
  };

  if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
    return getMockHistory();
  }

  try {
    const historyQuery = query(
      collection(db, 'attendanceRecords'),
      where('studentId', '==', studentUid),
      orderBy('markedAt', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(historyQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as (AttendanceRecord & { id: string })[];
  } catch (error) {
    console.warn('Error fetching attendance history, using mock fallback:', error);
    return getMockHistory();
  }
}

export async function getActiveSessions(classId?: string) {
  const getMockActiveSessions = () => {
    if (typeof window === 'undefined') return [];
    const sessions: (AttendanceSession & { id: string })[] = JSON.parse(localStorage.getItem('mockSessions') || '[]');
    return sessions.filter(s => s.status === 'ACTIVE' && (!classId || s.classId === classId));
  };

  if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
    return getMockActiveSessions();
  }

  try {
    const activeQuery = query(
      collection(db, 'attendanceSessions'),
      where('status', '==', 'ACTIVE')
    );
    const snapshot = await getDocs(activeQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as (AttendanceSession & { id: string })[];
  } catch (error) {
    console.warn('Error fetching active sessions, using mock fallback:', error);
    return getMockActiveSessions();
  }
}
