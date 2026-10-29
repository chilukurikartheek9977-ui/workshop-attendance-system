import { collection, getCountFromServer, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

export interface DashboardStats {
  totalStudents: number;
  totalClasses: number;
  todaySessions: number;
  activeSessions: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
    let activeSessionsCount = 0;
    if (typeof window !== 'undefined') {
      const sessions = JSON.parse(localStorage.getItem('mockSessions') || '[]');
      activeSessionsCount = sessions.filter((s: any) => s.status === 'ACTIVE').length;
    }
    return {
      totalStudents: 0,
      totalClasses: 0,
      activeSessions: activeSessionsCount,
      todaySessions: 0,
    };
  }

  try {
    // We use getCountFromServer for efficient aggregation without downloading collections
    const studentsSnap = await getCountFromServer(collection(db, 'students'));
    const classesSnap = await getCountFromServer(collection(db, 'classes'));

    // For sessions today, we would typically query where startTime >= startOfToday
    // For this boilerplate, we'll just check active sessions
    const activeSessionsQuery = query(
      collection(db, 'attendanceSessions'),
      where('status', '==', 'ACTIVE')
    );
    const activeSessionsSnap = await getCountFromServer(activeSessionsQuery);

    // Get today's total sessions (mocking "today" boundaries for demonstration)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySessionsQuery = query(
      collection(db, 'attendanceSessions'),
      where('startTime', '>=', today.toISOString())
    );
    const todaySessionsSnap = await getCountFromServer(todaySessionsQuery);

    return {
      totalStudents: studentsSnap.data().count,
      totalClasses: classesSnap.data().count,
      activeSessions: activeSessionsSnap.data().count,
      todaySessions: todaySessionsSnap.data().count,
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error; // Let the UI handle the error state
  }
}

export async function getRecentActivity() {
  if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
    return [];
  }

  try {
    // Using audit logs or recent sessions as an example of recent activity
    const activityQuery = query(
      collection(db, 'auditLogs'),
      orderBy('timestamp', 'desc'),
      limit(5)
    );
    const snapshot = await getDocs(activityQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return []; // Return empty on error for this non-critical widget
  }
}
