'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DashboardCard } from '@/components/admin/DashboardCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { getDashboardStats, DashboardStats, getRecentActivity } from '@/services/admin/dashboard';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const [statsData, activityData] = await Promise.all([
          getDashboardStats(),
          getRecentActivity()
        ]);
        setStats(statsData);
        setActivity(activityData);
      } catch (err: unknown) {
        console.error(err);
        setError('Unable to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Overview</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Monitor your attendance sessions, students, and system activity.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400 dark:text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">{error}</h3>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <DashboardCard 
            title="Total Students" 
            value={stats?.totalStudents || 0} 
            loading={loading}
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            }
          />
          <DashboardCard 
            title="Active Sessions" 
            value={stats?.activeSessions || 0} 
            loading={loading}
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <DashboardCard 
            title="Today's Sessions" 
            value={stats?.todaySessions || 0} 
            loading={loading}
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          />
          <DashboardCard 
            title="Classes" 
            value={stats?.totalClasses || 0} 
            loading={loading}
          />
        </div>

        {/* Main Dashboard Content Area */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          
          {/* Active Session Placeholder */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Active Attendance</h2>
            
            {loading ? (
              <div className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-4 py-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                  </div>
                </div>
              </div>
            ) : stats?.activeSessions && stats.activeSessions > 0 ? (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="flex h-3 w-3 mt-1 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800 dark:text-green-300">Session in progress</h3>
                    <div className="mt-2 text-sm text-green-700 dark:text-green-400">
                      There is currently an active attendance session running.
                    </div>
                    <div className="mt-4">
                      <Link href="#" className="text-sm font-medium text-green-800 dark:text-green-300 hover:text-green-600 dark:hover:text-green-200 cursor-not-allowed opacity-60">
                        View Live Attendance &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState 
                title="No active sessions" 
                description="There are no attendance sessions currently running."
                actionText="Create Session (Coming Soon)"
              />
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Recent Activity</h2>
            
            {loading ? (
               <div className="space-y-3">
                 {[1, 2, 3].map(i => (
                   <div key={i} className="h-10 bg-gray-100 dark:bg-gray-700 rounded animate-pulse"></div>
                 ))}
               </div>
            ) : activity.length > 0 ? (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {activity.map((item, index) => (
                  <li key={index} className="py-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{(item as any).action || 'System Action'}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{(item as any).timestamp ? new Date((item as any).timestamp).toLocaleString() : 'Just now'}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-gray-500 dark:text-gray-400">No recent activity recorded.</p>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </AdminLayout>
  );
}
