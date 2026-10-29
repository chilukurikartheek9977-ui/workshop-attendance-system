'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { EmptyState } from '@/components/ui/EmptyState';
import { getStudents, createStudent, updateStudentStatus, searchStudents, updateStudentClass } from '@/services/admin/students';
import { getClasses } from '@/services/admin/academic';
import { Student, Class } from '@/types';

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Assign Class State
  const [assignStudentId, setAssignStudentId] = useState<string | null>(null);
  const [assignClassId, setAssignClassId] = useState('');

  // Form State
  const [formData, setFormData] = useState({ name: '', email: '', studentNumber: '', classId: '' });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [studentsData, classesData] = await Promise.all([
        getStudents(),
        getClasses('ACTIVE')
      ]);
      setStudents(studentsData);
      setClasses(classesData);
    } catch (err) {
      console.error(err);
      setError('Unable to load students.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchTerm.trim()) {
      await loadData();
      return;
    }
    try {
      setLoading(true);
      const results = await searchStudents(searchTerm);
      setStudents(results);
    } catch (err) {
      setError('Search failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      await createStudent(formData);
      setShowCreateModal(false);
      setFormData({ name: '', email: '', studentNumber: '', classId: '' });
      await loadData();
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to create student');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(studentId: string, currentStatus: string) {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (!confirm(`Are you sure you want to mark this student as ${newStatus}?`)) return;
    try {
      setLoading(true);
      await updateStudentStatus(studentId, newStatus);
      await loadData();
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignClass(e: React.FormEvent) {
    e.preventDefault();
    if (!assignStudentId || !assignClassId) return;
    try {
      setSubmitting(true);
      await updateStudentClass(assignStudentId, assignClassId);
      setAssignStudentId(null);
      setAssignClassId('');
      await loadData();
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to assign class');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Students</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage student enrollment and status.</p>
          </div>
          
          <div className="flex w-full sm:w-auto space-x-3">
            <form onSubmit={handleSearch} className="flex-1 sm:w-64 flex">
              <input 
                type="text" 
                placeholder="Search ID, Name..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full rounded-l-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
              <button type="submit" className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 border border-l-0 border-gray-300 dark:border-gray-700 rounded-r-md px-3 text-sm text-gray-700 dark:text-gray-300">
                Search
              </button>
            </form>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex-shrink-0"
            >
              + Create Student
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-800 p-4 rounded-md text-sm">{error}</div>
        )}

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
             <div className="p-6 space-y-4">
               {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded animate-pulse w-full"></div>)}
             </div>
          ) : students.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name & Email</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {students.map((stu) => {
                    const cls = classes.find(c => c.id === stu.classId);
                    return (
                      <tr key={stu.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{stu.studentNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white font-medium">{stu.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{stu.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {stu.classId === 'UNASSIGNED' ? (
                            <span className="text-red-500 font-medium">Unassigned</span>
                          ) : (
                            cls ? cls.name : 'Unknown Class'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${stu.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {stu.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                          {stu.classId === 'UNASSIGNED' && (
                            <button onClick={() => setAssignStudentId(stu.id)} className="text-indigo-600 hover:text-indigo-900">
                              Assign Class
                            </button>
                          )}
                          <button onClick={() => handleToggleStatus(stu.id, stu.status)} className="text-blue-600 hover:text-blue-900">
                            {stu.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6">
              <EmptyState title="No students found" description="Create a student or try a different search." />
            </div>
          )}
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Create New Student</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email (For Login)</label>
                  <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Student ID</label>
                    <input required type="text" value={formData.studentNumber} onChange={e => setFormData({...formData, studentNumber: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Assign Class</label>
                    <select required value={formData.classId} onChange={e => setFormData({...formData, classId: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                      <option value="" disabled>Select...</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <p className="text-xs text-gray-500">A default secure password will be set via Cloud Functions.</p>
                <div className="flex justify-end space-x-3 mt-6">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Cancel</button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50">
                    {submitting ? 'Creating...' : 'Create Student'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Assign Class Modal */}
        {assignStudentId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Assign Class to Student</h3>
              <form onSubmit={handleAssignClass} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Class</label>
                  <select required value={assignClassId} onChange={e => setAssignClassId(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    <option value="" disabled>Select...</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button type="button" onClick={() => { setAssignStudentId(null); setAssignClassId(''); }} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Cancel</button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50">
                    {submitting ? 'Assigning...' : 'Assign Class'}
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
