'use client';

import { useState } from 'react';
import { AuthGuard } from '../auth/AuthGuard';
import { StudentSidebar } from './StudentSidebar';
import { StudentHeader } from './StudentHeader';

export function StudentLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AuthGuard allowedRole="student">
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
        <StudentSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <StudentHeader onMenuClick={() => setSidebarOpen(true)} />
          
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-950 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
