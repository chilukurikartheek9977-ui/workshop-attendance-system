'use client';

import { useEffect, useState } from 'react';
import { StudentLayout } from '@/components/student/StudentLayout';
import { DashboardCard } from '@/components/admin/DashboardCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { getStudentStats, getActiveSessions, StudentDashboardStats } from '@/services/student/dashboard';
import { useAuth } from '@/lib/auth/context';
import Link from 'next/link';

export default function StudentDashboardPage() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<StudentDashboardStats | null>(null);
  const [activeSessions, setActiveSessions] = useState<(import('@/types').AttendanceSession & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      if (!user) return;
      try {
        setLoading(true);
        
        // Fetch student's classId
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase/client');
        const studentDoc = await getDoc(doc(db, 'students', user.uid));
        if (!studentDoc.exists()) throw new Error('Student profile not found');
        const studentData = studentDoc.data();

        const [statsData, sessionsData] = await Promise.all([
          getStudentStats(user.uid, studentData.classId),
          getActiveSessions()
        ]);
        setStats(statsData);
        setActiveSessions(sessionsData);
      } catch (err: unknown) {
        console.error(err);
        setError('Unable to load your attendance information.');
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [user]);

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome, {profile?.name || user?.email}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View your attendance summary and scan for active sessions.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md p-4 flex justify-between items-center">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400 dark:text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">{error}</h3>
              </div>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="text-sm text-red-700 hover:text-red-800 font-medium underline"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <DashboardCard 
            title="Present" 
            value={stats?.presentCount ?? 0} 
            loading={loading}
          />
          <DashboardCard 
            title="Total Sessions" 
            value={stats?.totalSessions ?? 0} 
            loading={loading}
          />
          <DashboardCard 
            title="Attendance Rate" 
            value={stats?.totalSessions === 0 ? '—' : `${stats?.attendancePercentage.toFixed(1)}%`} 
            loading={loading}
          />
        </div>

        {/* Active Sessions Area */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Active Attendance</h2>
          
          {loading ? (
             <div className="animate-pulse space-y-4">
               <div className="h-20 bg-gray-100 dark:bg-gray-700 rounded-md w-full"></div>
             </div>
          ) : activeSessions.length > 0 ? (
            <div className="space-y-4">
              {activeSessions.map((session) => (
                <div key={session.id} className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <div className="mb-4 sm:mb-0">
                    <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100">Event Attendance</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300">Class {session.classId}</p>
                    <div className="mt-2 inline-flex items-center text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2 py-0.5 rounded-full">
                      <span className="w-2 h-2 mr-1 bg-green-500 rounded-full animate-pulse"></span>
                      Attendance is currently open
                    </div>
                  </div>
                  <Link 
                    href="/student/scan" 
                    className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Scan Attendance
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState 
              title="No active sessions" 
              description="There is no attendance session currently active for your classes."
              icon={
                <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          )}
        </div>
      </div>
    </StudentLayout>
  );
}
