'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { Role } from '@/types';
import { useAuth } from '@/lib/auth/context';

interface LoginFormProps {
  role: Role;
  onSuccessRedirect: string;
}

export function LoginForm({ role, onSuccessRedirect }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
        window.localStorage.setItem('mockRole', role);
        window.location.href = onSuccessRedirect;
        return;
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Enforce Role Validation Securely before redirecting
      const idTokenResult = await userCredential.user.getIdTokenResult(true);
      
      const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];
      const isConfiguredAdmin = !!userCredential.user.email && adminEmails.includes(userCredential.user.email.toLowerCase());
      
      let actualRole = isConfiguredAdmin ? 'admin' : (idTokenResult.claims.role as Role | undefined);
      
      // Fallback: If cloud functions didn't run to set the role, assume non-admins are students
      if (!actualRole && role === 'student') {
        actualRole = 'student';
      }

      if (actualRole !== role) {
        await auth.signOut();
        if (actualRole === 'admin') {
          setError('This account is an administrator. Please use Admin Login.');
        } else if (actualRole === 'student') {
          setError('This account is a student. Please use Student Login.');
        } else {
          setError('This account is not authorized for this portal.');
        }
        return;
      }

      // If roles match, proceed to dashboard
      router.push(onSuccessRedirect);
    } catch (err: unknown) {
      console.error(err);
      const errorCode = (err as any).code;

      switch (errorCode) {
        case 'auth/invalid-email':
          setError('Invalid email format. Please check your credentials.');
          break;
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          setError('Invalid email or password.');
          break;
        case 'auth/user-disabled':
          setError('Your account is currently disabled. Please contact the administrator.');
          break;
        case 'auth/network-request-failed':
          setError('Unable to connect to the authentication service. Please check your internet connection.');
          break;
        case 'auth/too-many-requests':
          setError('Too many unsuccessful login attempts. Please try again later.');
          break;
        default:
          setError('An unexpected error occurred. Please try again.');
          break;
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white uppercase tracking-wider">
        {role === 'admin' ? 'Admin Login' : 'Student Login'}
      </h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-400 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder={role === 'admin' ? 'admin@example.com' : 'student@university.edu'}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      {role === 'student' && (
        <div className="mt-4 text-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Don&apos;t have an account?{' '}
          </span>
          <Link href="/student/signup" className="text-sm font-medium text-blue-600 hover:text-blue-500">
            Sign Up
          </Link>
        </div>
      )}
    </div>
  );
}
