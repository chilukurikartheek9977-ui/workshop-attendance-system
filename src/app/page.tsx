'use client';

import { useAuth } from '@/lib/auth/context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && role) {
      if (role === 'admin') {
        router.replace('/admin/dashboard');
      } else if (role === 'student') {
        router.replace('/student/dashboard');
      }
    }
  }, [user, role, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl font-semibold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center space-y-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Attendance System
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Welcome! Please select your role to continue.
        </p>
        
        <div className="flex flex-col space-y-4">
          <Link
            href="/student/login"
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow transition-colors"
          >
            I am a Student
          </Link>
          <Link
            href="/admin/login"
            className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 text-white font-semibold rounded-md shadow transition-colors"
          >
            I am an Admin
          </Link>
        </div>
      </div>
    </div>
  );
}
