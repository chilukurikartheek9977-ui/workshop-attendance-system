'use client';

import { useAuth } from '@/lib/auth/context';
import { LogoutButton } from '../auth/LogoutButton';

export function AdminHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const { profile, user } = useAuth();

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
      <div className="flex items-center">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none p-2 mr-2"
          aria-label="Open sidebar"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white hidden sm:block">Admin Console</h2>
      </div>

      <div className="flex items-center space-x-4">
        <div className="hidden md:flex flex-col items-end mr-4">
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {profile?.name || user?.email}
          </span>
          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Administrator</span>
        </div>
        <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold hidden sm:flex">
          {(profile?.name?.[0] || user?.email?.[0] || 'A').toUpperCase()}
        </div>
        <LogoutButton redirectTo="/admin/login" />
      </div>
    </header>
  );
}
