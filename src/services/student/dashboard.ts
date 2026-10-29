import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { AttendanceRecord, AttendanceSession } from '@/types';

export interface StudentDashboardStats {
  presentCount: number;
  absentCount: number; // Conceptually means Not Marked against Ended Sessions
  totalSessions: number;
  attendancePercentage: number;
}

export async function getStudentStats(studentUid: string, classId: string): Promise<StudentDashboardStats> {
  try {
    // 1. Fetch all attendance records for the student
    const attendanceQuery = query(
      collection(db, 'attendanceRecords'),
      where('studentId', '==', studentUid)
    );
    const recordsSnap = await getDocs(attendanceQuery);
    const records = recordsSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));

    // 2. Fetch all ENDED sessions for the student's class (Total Eligible)
    const sessionsQuery = query(
      collection(db, 'attendanceSessions'),
      where('classId', '==', classId),
      where('status', '==', 'ENDED')
    );
    const sessionsSnap = await getDocs(sessionsQuery);
    const sessions = sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceSession));

    // Calculate Overall Stats
    const totalSessions = sessions.length;
    // Count records that map to ENDED sessions to ensure we don't overcount ACTIVE session scans yet to close
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
    console.error('Error fetching student stats:', error);
    throw error;
  }
}

export async function getStudentAttendanceHistory(studentUid: string, limitCount = 50) {
  try {
    const historyQuery = query(
      collection(db, 'attendanceRecords'),
      where('studentId', '==', studentUid),
      orderBy('markedAt', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(historyQuery);
    const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as (AttendanceRecord & { id: string })[];

    return records;
  } catch (error) {
    console.error('Error fetching attendance history:', error);
    return [];
  }
}

export async function getActiveSessions(classId?: string) {
  try {
    // In a real app, we filter by classId if applicable. 
    // For now we get any ACTIVE sessions mapped to this student's context.
    const activeQuery = query(
      collection(db, 'attendanceSessions'),
      where('status', '==', 'ACTIVE')
    );
    const snapshot = await getDocs(activeQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as (AttendanceSession & { id: string })[];
  } catch (error) {
    console.error('Error fetching active sessions:', error);
    return [];
  }
}
