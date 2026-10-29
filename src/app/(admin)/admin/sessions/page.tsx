'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { EmptyState } from '@/components/ui/EmptyState';
import { getSessions, createSession, startSession, endSession } from '@/services/admin/sessions';
import { getClasses } from '@/services/admin/academic';
import { AttendanceSession, Class } from '@/types';
import { useAuth } from '@/lib/auth/context';

export default function AdminSessionsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({ classId: '', scheduledDate: '' });
  
  // Removed combobox states as user wants a simple text input

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [sessionsData, classesData] = await Promise.all([
        getSessions(),
        getClasses('ACTIVE')
      ]);
      setSessions(sessionsData);
      setClasses(classesData);
    } catch (err) {
      console.error(err);
      setError('Unable to load attendance sessions.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.uid) return;
    
    try {
      setSubmitting(true);
      setError(null);
      await createSession({ ...formData, adminId: user.uid });
      setShowCreateModal(false);
      setFormData({ classId: '', scheduledDate: '' });
      await loadData();
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to create session');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStart(sessionId: string) {
    if (!confirm('Start this attendance session? Students will soon be able to scan QR.')) return;
    try {
      setLoading(true);
      await startSession(sessionId);
      await loadData();
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to start session');
    } finally {
      setLoading(false);
    }
  }

  async function handleEnd(sessionId: string) {
    if (!confirm('End this attendance session? QR codes will immediately expire.')) return;
    try {
      setLoading(true);
      await endSession(sessionId);
      await loadData();
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to end session');
    } finally {
      setLoading(false);
    }
  }



  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance Sessions</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage and conduct attendance sessions.</p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            + Create Session
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-800 p-4 rounded-md text-sm">{error}</div>
        )}

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
             <div className="p-6 space-y-4">
               {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded animate-pulse w-full"></div>)}
             </div>
          ) : sessions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {sessions.map((session) => {
                    const cls = classes.find(c => c.id === session.classId);
                    return (
                      <tr key={session.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">{session.scheduledDate}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{cls ? cls.name : session.classId}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${session.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' : ''}
                            ${session.status === 'ACTIVE' ? 'bg-green-100 text-green-800 animate-pulse' : ''}
                            ${session.status === 'ENDED' ? 'bg-gray-100 text-gray-800' : ''}
                          `}>
                            {session.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                          {session.status === 'DRAFT' && (
                            <button onClick={() => handleStart(session.id)} className="text-blue-600 hover:text-blue-900">Start Session</button>
                          )}
                          {session.status === 'ACTIVE' && (
                            <>
                              <button onClick={() => router.push(`/admin/sessions/${session.id}`)} className="text-blue-600 hover:text-blue-900 font-bold">Monitor</button>
                              <button onClick={() => window.open(`/admin/sessions/${session.id}/display`, '_blank')} className="text-green-600 hover:text-green-900 font-bold">Display QR</button>
                              <button onClick={() => handleEnd(session.id)} className="text-red-600 hover:text-red-900 font-bold">End Session</button>
                            </>
                          )}
                          {session.status === 'ENDED' && (
                            <button onClick={() => router.push(`/admin/sessions/${session.id}`)} className="text-gray-600 hover:text-gray-900 font-bold">View Report</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6">
              <EmptyState title="No sessions found" description="Create a session to begin tracking attendance." />
            </div>
          )}
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Create Attendance Session</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Scheduled Date</label>
                  <input required type="date" value={formData.scheduledDate} onChange={e => setFormData({...formData, scheduledDate: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Class / Event Name</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.classId} 
                    onChange={e => setFormData({...formData, classId: e.target.value})}
                    placeholder="Enter event name (e.g. Workshop)"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                  />
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Cancel</button>
                  <button type="submit" disabled={submitting || !formData.classId} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50">
                    {submitting ? 'Creating...' : 'Create Session'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
