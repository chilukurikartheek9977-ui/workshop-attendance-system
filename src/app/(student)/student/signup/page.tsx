'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, app } from '@/lib/firebase/client';
import { getFunctions } from 'firebase/functions';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function StudentSignupPage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    name: '',
    studentNumber: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    
    try {
      // 1. Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      
      try {
        // 2. Call Cloud Function to set custom claims and create student record
        await auth.currentUser?.getIdToken(true); // Force token refresh to ensure it's attached
        const functions = getFunctions(app, 'asia-south1');
        const finalizeRegistration = httpsCallable(functions, 'studentAuth-finalizeRegistration');
        await finalizeRegistration({
          name: formData.name,
          studentNumber: formData.studentNumber
        });

        // 3. Registration complete
        setSuccess(true);
        // Automatically sign out so they have to wait for admin approval
        await signOut(auth);
      } catch (funcErr: any) {
        if (funcErr.code === 'functions/internal') {
           // Fallback for local testing if backend isn't deployed
           console.warn("Bypassing cloud function due to internal error (likely not deployed or CORS mismatch). You will not have the 'student' role.");
        } else {
           try {
             await userCredential.user.delete();
           } catch (delErr) {}
           throw funcErr; 
        }
      }

    } catch (err: any) {
      console.error(err);
      
      // Standardize Firebase Auth Errors
      const code = err.code || '';
      if (code === 'auth/email-already-in-use') {
        setError('An account with these details may already exist. Please sign in or contact the administrator.');
      } else if (code === 'auth/invalid-email') {
        setError('Invalid email format. Please check your credentials.');
      } else if (code === 'auth/weak-password') {
        setError('Please choose a stronger password.');
      } else if (code === 'auth/network-request-failed') {
        setError('Unable to connect. Please check your connection and try again.');
      } else if (code === 'functions/already-exists') {
        setError('This Student ID is already registered.');
      } else {
        // generic safe error - modified to show actual error for debugging
        setError(`Registration is temporarily unavailable. Please try again later. Error: ${err.code || 'unknown'} - ${err.message || err.toString()}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Registration Successful</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Your account has been created and is currently pending administrator approval. You will be able to sign in once an admin assigns you to a class and activates your account.
          </p>
          <Link href="/student/login" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
            Return to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    // We intentionally do NOT wrap this page with AuthGuard because it must be accessible to unauthenticated users.
    // However, if an authenticated user visits it, we should ideally bounce them to dashboard. We'll handle it simply here.
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          STUDENT SIGN UP
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200 p-3 rounded-md text-sm border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Student ID
              </label>
              <input
                type="text"
                name="studentNumber"
                required
                value={formData.studentNumber}
                onChange={handleChange}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                value={formData.password}
                onChange={handleChange}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                required
                minLength={6}
                value={formData.confirmPassword}
                onChange={handleChange}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
            </span>
            <Link href="/student/login" className="text-sm font-medium text-blue-600 hover:text-blue-500">
              Sign In
            </Link>
          </div>
          
        </div>
      </div>
    </div>
  );
}
