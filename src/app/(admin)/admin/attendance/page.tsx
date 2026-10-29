'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { db } from '@/lib/firebase/client';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Class, AttendanceSession, AttendanceRecord } from '@/types';
import { getHistoricalSessions, downloadCSV } from '@/services/admin/reports';
import { useRouter } from 'next/navigation';

export default function AdminAttendanceHistoryPage() {
  const router = useRouter();
  
  const [classes, setClasses] = useState<Class[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  
  // Filters
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [dateRange, setDateRange] = useState<'7days' | '30days' | 'all'>('30days');
  
  // State
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<{ totalSessions: number; avgAttendance: number }>({ totalSessions: 0, avgAttendance: 0 });

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [clsSnap] = await Promise.all([
          getDocs(collection(db, 'classes'))
        ]);
        
        setClasses(clsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Class)));
      } catch (err) {
        console.error('Failed to load classes', err);
      }
    }
    loadInitialData();
  }, []);

  useEffect(() => {
    async function loadSessions() {
      setLoading(true);
      try {
        let startDate: Date | undefined = undefined;
        if (dateRange === '7days') {
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
        } else if (dateRange === '30days') {
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 30);
        }

        const data = await getHistoricalSessions({
          classId: selectedClass || undefined,
          startDate
        });

        // Filter out drafts or active, focus on history
        const historySessions = data.filter(s => s.status === 'ENDED' || s.status === 'CANCELLED');
        setSessions(historySessions);
        
        // Compute basic analytics
        // Note: For proper avg attendance, we should know the total present across all sessions and total eligible.
        // For performance on the master page without N+1 queries, we will just show total sessions conducted.
        // If we want exact average attendance across all history, we'd need a backend aggregation.
        setAnalytics({
          totalSessions: historySessions.length,
          avgAttendance: 0 // Deep analytics deferred to individual session details to prevent N+1
        });
      } catch (err) {
        console.error('Error fetching history:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSessions();
  }, [selectedClass, dateRange]);

  const handleExportSummary = () => {
    const headers = ['Session Date', 'Class', 'Status'];
    const rows = sessions.map(session => {
      const clsName = classes.find(c => c.id === session.classId)?.name || 'Unknown';
      const date = session.createdAt ? new Date((session.createdAt as any).toMillis()).toLocaleDateString() : '';
      return [date, clsName, session.status];
    });
    downloadCSV('attendance_session_history.csv', headers, rows);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attendance History & Reports</h1>
            <p className="mt-1 text-sm text-gray-500">View and export historical attendance records.</p>
          </div>
          <div className="mt-4 md:mt-0">
            <button onClick={handleExportSummary} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-gray-50 transition">
              Export Filtered Sessions
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Date Range</label>
            <select 
              value={dateRange} 
              onChange={(e) => setDateRange(e.target.value as '7days' | '30days' | 'all')}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Class</label>
            <select 
              value={selectedClass} 
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading history...</div>
          ) : sessions.length === 0 ? (
             <div className="p-12 text-center text-gray-500">No sessions match the selected filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Class</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sessions.map(session => {
                    const cls = classes.find(c => c.id === session.classId);
                    return (
                      <tr key={session.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                           {session.createdAt ? new Date((session.createdAt as any).toMillis()).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cls?.name || 'Unknown'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            session.status === 'ENDED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {session.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                           <button 
                             onClick={() => router.push(`/admin/sessions/${session.id}/details`)}
                             className="text-blue-600 hover:text-blue-900 font-bold"
                           >
                             View Details & Export
                           </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </AdminLayout>
  );
}
