'use client';

import { auth } from '@/lib/firebase/client';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export function LogoutButton({ redirectTo = '/' }: { redirectTo?: string }) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace(redirectTo);
    } catch (error) {
      console.error('Logout error', error);
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md shadow transition-colors"
    >
      Logout
    </button>
  );
}
