'use client';

import { useEffect, useState, use } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { db } from '@/lib/firebase/client';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { AttendanceSession, Class, Student, AttendanceRecord } from '@/types';
import { downloadCSV } from '@/services/admin/reports';

export default function SessionDetailsPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);

  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [cls, setCls] = useState<Class | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    function checkMock(): boolean {
      if (typeof window === 'undefined') return false;
      try {
        const mockSessions = JSON.parse(localStorage.getItem('mockSessions') || '[]');
        const found = mockSessions.find((s: any) => s.id === sessionId);
        if (found) {
          queueMicrotask(() => {
            setSession(found);
            setCls({ id: found.classId, name: found.classId, section: 'A' } as Class);
            const mockStudents = JSON.parse(localStorage.getItem('mockStudents') || '[]');
            setStudents(mockStudents.length ? mockStudents : [
              { id: 'stu-1', userId: 'stu-1', name: 'Alex Johnson', email: 'alex@example.com', studentNumber: 'STU1001', classId: found.classId, department: 'CSE', year: 3, section: 'A', status: 'ACTIVE' },
              { id: 'stu-2', userId: 'stu-2', name: 'Samantha Lee', email: 'sam@example.com', studentNumber: 'STU1002', classId: found.classId, department: 'CSE', year: 3, section: 'A', status: 'ACTIVE' }
            ]);
            const mockRecords = JSON.parse(localStorage.getItem('mockAttendanceRecords') || '[]');
            setAttendanceRecords(mockRecords.filter((r: any) => r.sessionId === sessionId));
            setLoading(false);
          });
          return true;
        }
      } catch (e) {
        console.error('Error loading mock session details:', e);
      }
      return false;
    }

    if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
      if (!checkMock()) {
        queueMicrotask(() => {
          setError('Session not found.');
          setLoading(false);
        });
      }
      return;
    }

    async function loadData() {
      try {
        setLoading(true);
        
        // 1. Fetch Session
        const sessionRef = doc(db, 'attendanceSessions', sessionId);
        const sessionSnap = await getDoc(sessionRef);
        
        if (!sessionSnap.exists()) {
          if (checkMock()) return;
          setError('Session not found.');
          setLoading(false);
          return;
        }
        
        const sessionData = { id: sessionSnap.id, ...sessionSnap.data() } as AttendanceSession;
        setSession(sessionData);

        // 2. Fetch Metadata
        try {
          const clsDoc = await getDoc(doc(db, 'classes', sessionData.classId));
          if (clsDoc.exists()) setCls({ id: clsDoc.id, ...clsDoc.data() } as Class);
          else setCls({ id: sessionData.classId, name: sessionData.classId, section: 'A' } as Class);
        } catch {
          setCls({ id: sessionData.classId, name: sessionData.classId, section: 'A' } as Class);
        }

        // 3. Fetch Roster
        try {
          const rosterQuery = query(collection(db, 'students'), where('classId', '==', sessionData.classId), where('status', '==', 'ACTIVE'));
          const rosterSnap = await getDocs(rosterQuery);
          const rosterData = rosterSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
          rosterData.sort((a, b) => a.name.localeCompare(b.name));
          setStudents(rosterData);
        } catch {
          // ignore roster errors
        }

        // 4. Fetch Attendance History (One-time pull, no listeners)
        try {
          const attendanceQuery = query(collection(db, 'attendanceRecords'), where('sessionId', '==', sessionId));
          const attSnap = await getDocs(attendanceQuery);
          const records = attSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
          setAttendanceRecords(records);
        } catch {
          // ignore
        }
      } catch (err) {
        console.warn('loadData failed, checking mock:', err);
        if (checkMock()) return;
        setError('Failed to load session details.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [sessionId]);

  const handleExportCSV = () => {
    if (!session || !cls) return;
    
    const headers = ['Student Name', 'ID Number', 'Status', 'Marked At'];
    
    // We export the filtered view if search is active, or the full roster otherwise
    const dataToExport = mappedRoster.map(({ student, record, isPresent }) => {
      return [
        student.name,
        student.studentNumber,
        isPresent ? 'PRESENT' : 'NOT MARKED',
        record && record.markedAt ? new Date((record.markedAt as any)?.toMillis?.() || 0).toLocaleTimeString() : 'N/A'
      ];
    });

    const safeDate = session.createdAt ? new Date((session.createdAt as any)?.toMillis?.() || 0).toISOString().split('T')[0] : 'UnknownDate';
    downloadCSV(`${cls.name}_${safeDate}.csv`, headers, dataToExport);
  };

  if (loading) return <AdminLayout><div className="flex h-64 items-center justify-center text-gray-500 font-medium">Loading historical session details...</div></AdminLayout>;

  if (error) return (
    <AdminLayout>
      <div className="bg-red-50 text-red-800 p-6 rounded-xl border border-red-200">
        <h2 className="text-xl font-bold mb-2">Error</h2>
        <p>{error}</p>
      </div>
    </AdminLayout>
  );

  const totalEligible = students.length;
  const uniquePresentIds = new Set(attendanceRecords.map(r => r.studentId));
  const presentCount = uniquePresentIds.size;
  const percentage = totalEligible > 0 ? Math.round((presentCount / totalEligible) * 100) : 0;

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
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{cls?.name || session?.classId || 'Class Session'}</h1>
              <span className="px-3 py-1 bg-gray-100 text-gray-800 text-xs font-bold rounded-full border border-gray-200">
                {session?.status}
              </span>
            </div>
            <p className="text-gray-500 font-medium">{cls?.section ? `Section ${cls.section}` : 'Attendance Session'}</p>
            <p className="text-sm text-gray-400 mt-1">Date: {session?.createdAt ? new Date((session.createdAt as any)?.toMillis?.() || 0).toLocaleDateString() : 'N/A'}</p>
          </div>
          <div className="mt-4 md:mt-0">
             <button 
               onClick={handleExportCSV}
               className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold shadow-sm transition"
             >
               Export Session CSV
             </button>
          </div>
        </div>

        {/* Dashboard Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Attendance</h3>
            <div className="text-4xl font-extrabold text-gray-900">{percentage}%</div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Present</h3>
            <div className="text-4xl font-extrabold text-green-600">
              {presentCount} <span className="text-xl text-gray-400 font-medium">/ {totalEligible}</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Not Marked</h3>
            <div className="text-4xl font-extrabold text-orange-500">
              {totalEligible - presentCount}
            </div>
          </div>
        </div>

        {/* History List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between md:items-center gap-4">
            <h2 className="text-xl font-bold text-gray-900">Session Roster</h2>
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
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{student.name}</td>
                      <td className="px-6 py-4 font-mono text-xs">{student.studentNumber}</td>
                      <td className="px-6 py-4">
                        {isPresent ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">
                            PRESENT
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
                            NOT MARKED
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
