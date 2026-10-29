'use client';

import { useEffect, useState } from 'react';
import { StudentLayout } from '@/components/student/StudentLayout';
import { EmptyState } from '@/components/ui/EmptyState';
import { getStudentAttendanceHistory, getStudentStats, StudentDashboardStats } from '@/services/student/dashboard';
import { useAuth } from '@/lib/auth/context';
import { db } from '@/lib/firebase/client';
import { doc, getDoc } from 'firebase/firestore';
interface HistoryRecord {
  id: string;
  markedAt?: { toMillis: () => number };
}

export default function StudentHistoryPage() {
  const { user } = useAuth();
  
  // Data
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [stats, setStats] = useState<StudentDashboardStats | null>(null);
  
  // Filters
  const [dateRange, setDateRange] = useState<'7days' | '30days' | 'all'>('30days');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        setLoading(true);
        
        // Fetch student's classId
        const studentDoc = await getDoc(doc(db, 'students', user.uid));
        if (!studentDoc.exists()) throw new Error('Student profile not found');
        const studentData = studentDoc.data();
        
        // Load Analytics
        const analytics = await getStudentStats(user.uid, studentData.classId);
        setStats(analytics);

        // Load History
        const data = await getStudentAttendanceHistory(user.uid, 100);
        setHistory(data as unknown as HistoryRecord[]);
        
      } catch (err) {
        console.error(err);
        setError('Unable to load attendance history.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  const filteredHistory = history.filter(record => {
    // Date Filter
    const ms = record.markedAt?.toMillis?.() || 0;
    if (dateRange === '7days') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      if (ms < weekAgo.getTime()) return false;
    } else if (dateRange === '30days') {
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      if (ms < monthAgo.getTime()) return false;
    }
    
    return true;
  });

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance History & Reports</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View your detailed attendance analytics and past records.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md p-4">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">{error}</h3>
          </div>
        )}

        {/* Analytics Section */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl"></div>)}
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-bold text-gray-400 uppercase mb-1">Overall</h3>
                <div className="text-3xl font-extrabold text-gray-900 dark:text-white">{stats.attendancePercentage}%</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-bold text-gray-400 uppercase mb-1">Present</h3>
                <div className="text-3xl font-extrabold text-green-600">{stats.presentCount}</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-bold text-gray-400 uppercase mb-1">Not Marked</h3>
                <div className="text-3xl font-extrabold text-orange-500">{stats.absentCount}</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-bold text-gray-400 uppercase mb-1">Eligible Sessions</h3>
                <div className="text-3xl font-extrabold text-blue-600">{stats.totalSessions}</div>
              </div>
            </div>


          </>
        ) : null}

        {/* Detailed History Table */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-4 justify-between">
            <h3 className="font-bold text-gray-900 dark:text-white py-2">Detailed History</h3>
            <div className="flex gap-2">
              <select 
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as '7days' | '30days' | 'all')}
                className="border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg text-sm"
              >
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading history...</div>
          ) : filteredHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredHistory.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {record.markedAt ? new Date(record.markedAt.toMillis()).toLocaleDateString() : '-'}
                        <div className="text-xs text-gray-500">{record.markedAt ? new Date(record.markedAt.toMillis()).toLocaleTimeString() : '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-bold rounded-full bg-green-100 text-green-800">
                          PRESENT
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12">
              <EmptyState 
                title="No records found" 
                description="No attendance records match your current filters." 
              />
            </div>
          )}
        </div>
      </div>
    </StudentLayout>
  );
}
