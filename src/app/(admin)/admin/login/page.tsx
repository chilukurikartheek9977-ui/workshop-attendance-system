'use client';

import { LoginForm } from '@/components/auth/LoginForm';

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <LoginForm role="admin" onSuccessRedirect="/admin/dashboard" />
    </div>
  );
}
