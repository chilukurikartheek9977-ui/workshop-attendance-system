'use client';

import { useEffect, useState, use, useRef } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { db } from '@/lib/firebase/client';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { AttendanceSession, Class, Student, AttendanceRecord } from '@/types';

export default function SessionMonitoringPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);

  // Core Data
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [cls, setCls] = useState<Class | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  
  // Live Attendance Data
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTING' | 'LIVE' | 'OFFLINE' | 'RECONNECTING'>('CONNECTING');
  const [searchQuery, setSearchQuery] = useState('');
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let unsubscribeSession: () => void;
    let unsubscribeAttendance: () => void;

    function loadMockData(): boolean {
      if (typeof window === 'undefined') return false;
      try {
        const mockSessions: AttendanceSession[] = JSON.parse(localStorage.getItem('mockSessions') || '[]');
        const found = mockSessions.find(s => s.id === sessionId);
        if (found) {
          queueMicrotask(() => {
            setSession(found);
            setCls(prev => prev || ({ id: found.classId, name: found.classId, section: 'A' } as Class));

            const allStudents: Student[] = JSON.parse(localStorage.getItem('mockStudents') || '[]');
            const defaultStudents: Student[] = [
              { id: 'stu-1', userId: 'student_123', name: 'Alex Johnson', email: 'alex@example.com', studentNumber: 'STU1001', classId: found.classId, department: 'CSE', year: 3, section: 'A', status: 'ACTIVE' },
              { id: 'stu-2', userId: 'stu-2', name: 'Samantha Lee', email: 'sam@example.com', studentNumber: 'STU1002', classId: found.classId, department: 'CSE', year: 3, section: 'A', status: 'ACTIVE' },
              { id: 'stu-3', userId: 'stu-3', name: 'Rahul Sharma', email: 'rahul@example.com', studentNumber: 'STU1003', classId: found.classId, department: 'CSE', year: 3, section: 'A', status: 'ACTIVE' },
            ];
            setStudents(allStudents.length > 0 ? allStudents : defaultStudents);

            const allRecords: AttendanceRecord[] = JSON.parse(localStorage.getItem('mockAttendanceRecords') || '[]');
            const sessionRecords = allRecords.filter(r => r.sessionId === sessionId);
            setAttendanceRecords(sessionRecords);

            setConnectionStatus('LIVE');
            setError(null);
            setLoading(false);
          });
          return true;
        }
      } catch (e) {
        console.error('Error loading mock data:', e);
      }
      return false;
    }

    if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
      const found = loadMockData();
      if (!found) {
        queueMicrotask(() => {
          setError('Session not found.');
          setLoading(false);
        });
      }

      pollTimerRef.current = setInterval(loadMockData, 2000);
      const onStorage = () => loadMockData();
      window.addEventListener('storage', onStorage);

      return () => {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        window.removeEventListener('storage', onStorage);
      };
    }

    async function loadInitialData() {
      try {
        setConnectionStatus('CONNECTING');
        
        // 1. Listen to Session securely
        const sessionRef = doc(db, 'attendanceSessions', sessionId);
        unsubscribeSession = onSnapshot(sessionRef, async (docSnap) => {
          if (!docSnap.exists()) {
            if (loadMockData()) return;
            setError('Session not found.');
            setLoading(false);
            return;
          }
          const sessionData = { id: docSnap.id, ...docSnap.data() } as AttendanceSession;
          setSession(sessionData);

          // Only fetch static relationships if we haven't already
          if (!cls) {
            try {
              const clsDoc = await getDoc(doc(db, 'classes', sessionData.classId));
              if (clsDoc.exists()) setCls({ id: clsDoc.id, ...clsDoc.data() } as Class);
              else setCls({ id: sessionData.classId, name: sessionData.classId, section: 'A' } as Class);
            } catch {
              setCls({ id: sessionData.classId, name: sessionData.classId, section: 'A' } as Class);
            }

            // Load Class Roster
            try {
              const rosterQuery = query(collection(db, 'students'), where('classId', '==', sessionData.classId), where('status', '==', 'ACTIVE'));
              const rosterSnap = await getDocs(rosterQuery);
              const rosterData = rosterSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
              rosterData.sort((a, b) => a.name.localeCompare(b.name));
              setStudents(rosterData);
            } catch {
              // Ignore roster fetch errors
            }
          }
        }, (err) => {
          console.warn('Session listener error, checking local mock storage:', err);
          if (loadMockData()) return;
          setConnectionStatus('OFFLINE');
        });

        // 2. Listen to Live Attendance 
        const attendanceQuery = query(collection(db, 'attendanceRecords'), where('sessionId', '==', sessionId));
        
        unsubscribeAttendance = onSnapshot(attendanceQuery, (snapshot) => {
          const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
          
          records.sort((a, b) => {
            const timeA = (a.markedAt as any)?.toMillis?.() || 0;
            const timeB = (b.markedAt as any)?.toMillis?.() || 0;
            return timeB - timeA;
          });
          
          setAttendanceRecords(records);
          setConnectionStatus('LIVE');
          setLoading(false);
        }, (err) => {
          console.warn('Attendance listener error:', err);
          if (loadMockData()) return;
          setConnectionStatus('RECONNECTING');
        });

      } catch (err: unknown) {
        console.error('Failed to load session details', err);
        if (loadMockData()) return;
        setError('Failed to load attendance session. Please check your permissions.');
        setLoading(false);
      }
    }

    const handleOnline = () => setConnectionStatus('RECONNECTING');
    const handleOffline = () => setConnectionStatus('OFFLINE');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    loadInitialData();

    return () => {
      if (unsubscribeSession) unsubscribeSession();
      if (unsubscribeAttendance) unsubscribeAttendance();
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [sessionId, cls]);

  if (loading) {
    return <AdminLayout><div className="flex h-64 items-center justify-center font-medium text-gray-500">Loading live attendance...</div></AdminLayout>;
  }

  if (error && !session) {
    return (
      <AdminLayout>
        <div className="bg-red-50 text-red-800 p-6 rounded-xl border border-red-200">
          <h2 className="text-xl font-bold mb-2">Access Denied or Error</h2>
          <p>{error}</p>
        </div>
      </AdminLayout>
    );
  }

  // Derived Statistics
  const totalEligible = students.length;
  const uniquePresentIds = new Set(attendanceRecords.map(r => r.studentId));
  const presentCount = uniquePresentIds.size;
  const percentage = totalEligible > 0 ? Math.round((presentCount / totalEligible) * 100) : 0;

  // Filtered Roster View
  const lowerSearch = searchQuery.toLowerCase();
  
  const mappedRoster = students.map(student => {
    const record = attendanceRecords.find(r => r.studentId === student.id || r.studentId === student.userId);
    return {
      student,
      record,
      isPresent: !!record
    };
  }).filter(item => 
    item.student.name.toLowerCase().includes(lowerSearch) || 
    item.student.studentNumber.toLowerCase().includes(lowerSearch)
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        
        {/* Header and Live Status */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{cls?.name || session?.classId || 'Class Session'}</h1>
              {session?.status === 'ACTIVE' ? (
                 <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full border border-green-200 flex items-center">
                   <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                   ACTIVE
                 </span>
              ) : (
                <span className="px-3 py-1 bg-gray-100 text-gray-800 text-xs font-bold rounded-full border border-gray-200">
                  {session?.status}
                </span>
              )}
            </div>
            <p className="text-gray-500 font-medium">{cls?.section ? `Section ${cls.section}` : 'Attendance Session'}</p>
          </div>
          
          <div className="mt-4 md:mt-0 flex items-center space-x-4">
             <div className="text-right mr-4">
               <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Network</p>
               {connectionStatus === 'LIVE' && <span className="text-green-600 font-bold flex items-center justify-end"><span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>Live</span>}
               {connectionStatus === 'CONNECTING' && <span className="text-blue-500 font-medium">Connecting...</span>}
               {connectionStatus === 'RECONNECTING' && <span className="text-yellow-600 font-medium animate-pulse">Reconnecting...</span>}
               {connectionStatus === 'OFFLINE' && <span className="text-red-500 font-bold">Offline</span>}
             </div>
             
             {session?.status === 'ACTIVE' && (
                <button 
                  onClick={() => window.open(`/admin/sessions/${sessionId}/display`, '_blank')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold shadow-sm transition"
                >
                  Open QR Display
                </button>
             )}
          </div>
        </div>

        {/* Dashboard Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Attendance</h3>
            <div className="text-4xl font-extrabold text-gray-900">
              {percentage}%
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Present</h3>
            <div className="text-4xl font-extrabold text-green-600">
              {presentCount} <span className="text-xl text-gray-400 font-medium">/ {totalEligible}</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Last Marked</h3>
            <div className="text-2xl font-bold text-gray-700 mt-2">
              {attendanceRecords.length > 0 && attendanceRecords[0].markedAt 
                ? new Date((attendanceRecords[0].markedAt as any)?.toMillis?.() || 0).toLocaleTimeString() 
                : '--:--'}
            </div>
          </div>
        </div>

        {/* Live Roster List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between md:items-center gap-4">
            <h2 className="text-xl font-bold text-gray-900">Class Roster</h2>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search student..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full md:w-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs uppercase font-bold text-gray-500">
                <tr>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">ID Number</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Marked At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mappedRoster.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      No students match your search.
                    </td>
                  </tr>
                ) : (
                  mappedRoster.map(({ student, record, isPresent }) => (
                    <tr key={student.id} className={`transition-colors ${isPresent ? 'bg-green-50/30' : 'hover:bg-gray-50'}`}>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {student.name}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">
                        {student.studentNumber}
                      </td>
                      <td className="px-6 py-4">
                        {isPresent ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">
                            PRESENT
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
                            NOT YET MARKED
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs">
                        {record && record.markedAt 
                          ? new Date((record.markedAt as any)?.toMillis?.() || 0).toLocaleTimeString() 
                          : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
