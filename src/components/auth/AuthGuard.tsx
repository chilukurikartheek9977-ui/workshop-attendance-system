'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { Role } from '@/types';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRole?: Role;
}

export function AuthGuard({ children, allowedRole }: AuthGuardProps) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      if (allowedRole === 'admin') {
        router.replace('/admin/login');
      } else if (allowedRole === 'student') {
        router.replace('/student/login');
      } else {
        router.replace('/');
      }
      return;
    }

    if (allowedRole && role !== allowedRole) {
      // Role Mismatch handling
      if (role === 'admin') {
        router.replace('/admin/dashboard');
      } else if (role === 'student') {
        router.replace('/student/dashboard');
      } else {
        // Unknown role, sign out?
        router.replace('/');
      }
    }
  }, [user, role, loading, router, allowedRole]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl font-semibold">Checking authentication...</div>
      </div>
    );
  }

  // If user is not authenticated or role mismatched, do not render children
  if (!user || (allowedRole && role !== allowedRole)) {
    return null;
  }

  return <>{children}</>;
}
