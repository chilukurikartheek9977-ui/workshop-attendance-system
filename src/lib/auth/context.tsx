'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/client';
import { Role, User as UserProfile } from '../../types';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  role: Role | null;
  loading: boolean;
  error: Error | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  role: null,
  loading: true,
  error: null,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Mock Auth for Smoke Testing Without Backend
    if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true' && typeof window !== 'undefined') {
      const mockRole = window.localStorage.getItem('mockRole') as Role | null;
      if (mockRole) {
        queueMicrotask(() => {
          setUser({ uid: 'mock-user-id', email: 'mock@example.com', getIdTokenResult: async () => ({ claims: { role: mockRole } }) } as any);
          setRole(mockRole);
          setProfile({ id: 'mock-user-id', name: 'Mock User', email: 'mock@example.com', role: mockRole, usn: '123456', semester: 3, branch: 'CSE', section: 'A' } as any);
          setLoading(false);
        });
        return;
      }
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        try {
          if (firebaseUser) {
            // Get custom claims to verify role securely
            const idTokenResult = await firebaseUser.getIdTokenResult();
            
            const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];
            const isConfiguredAdmin = !!firebaseUser.email && adminEmails.includes(firebaseUser.email.toLowerCase());
            
            let currentRole = isConfiguredAdmin ? 'admin' : ((idTokenResult.claims.role as Role) || null);
            if (!currentRole) {
              currentRole = 'student'; // Fallback for local testing if cloud function failed
            }
            setUser(firebaseUser);
            setRole(currentRole);

            // Fetch user profile from Firestore
            const docRef = doc(db, 'users', firebaseUser.uid);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
              setProfile({ id: docSnap.id, ...docSnap.data() } as UserProfile);
            } else {
              setProfile(null);
            }
          } else {
            setUser(null);
            setRole(null);
            setProfile(null);
          }
        } catch (err: unknown) {
          console.error("Auth State Error:", err);
          setError(err as Error);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error("Firebase Auth Error:", error);
        setError(error as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, role, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}
