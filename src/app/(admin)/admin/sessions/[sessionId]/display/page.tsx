'use client';

import { useEffect, useState, useRef, use } from 'react';
import QRCode from 'react-qr-code';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase/client';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { AttendanceSession, Class } from '@/types';
import { generateDisplayToken, QRTokenResponse } from '@/services/admin/qr';

export default function QRDisplayPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const router = useRouter();
  const { sessionId } = use(params);

  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [cls, setCls] = useState<Class | null>(null);
  
  const [qrToken, setQrToken] = useState<QRTokenResponse | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use a ref to ensure our timeouts always read the latest token state without causing extra re-renders
  const tokenRef = useRef<QRTokenResponse | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef<boolean>(true);

  // 1. Listen to Session Status from Firestore or LocalStorage Mock
  useEffect(() => {
    mountedRef.current = true;

    function checkMockSession(): boolean {
      if (typeof window === 'undefined') return false;
      try {
        const mockSessions: AttendanceSession[] = JSON.parse(localStorage.getItem('mockSessions') || '[]');
        const found = mockSessions.find(s => s.id === sessionId);
        if (found) {
          queueMicrotask(() => {
            setSession(found);
            setCls(prev => prev || ({ id: found.classId, name: found.classId, section: 'A' } as Class));
            setError(null);
            setLoading(false);
          });
          return true;
        }
      } catch (e) {
        console.error('Error reading mock sessions:', e);
      }
      return false;
    }

    if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
      const found = checkMockSession();
      if (!found) {
        queueMicrotask(() => {
          setError('Session not found.');
          setLoading(false);
        });
      }

      const interval = setInterval(checkMockSession, 1500);
      const onStorage = (e: StorageEvent) => {
        if (e.key === 'mockSessions') checkMockSession();
      };
      window.addEventListener('storage', onStorage);

      return () => {
        mountedRef.current = false;
        clearInterval(interval);
        window.removeEventListener('storage', onStorage);
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }

    const sessionRef = doc(db, 'attendanceSessions', sessionId);
    const unsubscribe = onSnapshot(sessionRef, async (docSnap) => {
      if (!docSnap.exists()) {
        if (checkMockSession()) return;
        setError('Session not found.');
        setLoading(false);
        return;
      }
      
      const sessionData = { id: docSnap.id, ...docSnap.data() } as AttendanceSession;
      setSession(sessionData);

      // Fetch class name if not already fetched
      if (!cls) {
        try {
          const clsDoc = await getDoc(doc(db, 'classes', sessionData.classId));
          if (clsDoc.exists()) {
            setCls({ id: clsDoc.id, ...clsDoc.data() } as Class);
          } else {
            setCls({ id: sessionData.classId, name: sessionData.classId } as Class);
          }
        } catch (e) {
          console.error('Failed to load class details:', e);
          setCls({ id: sessionData.classId, name: sessionData.classId } as Class);
        }
      }

      setLoading(false);
    }, (err) => {
      console.warn('Firestore onSnapshot error, checking local mock storage:', err);
      if (checkMockSession()) return;
      setError('Failed to listen to session updates. Check network.');
      setLoading(false);
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [sessionId, cls]);

  useEffect(() => {
    async function fetchNextToken() {
      if (!mountedRef.current) return;
      
      try {
        setIsRefreshing(true);
        setError(null);
        
        const data = await generateDisplayToken(sessionId);
        
        if (!mountedRef.current) return;

        setQrToken(data);
        tokenRef.current = data;
        
        startCountdown(data.expiresAt);

      } catch (err: unknown) {
        console.error('Failed to generate token:', err);
        setError('Unable to generate attendance QR. Retrying...');
        timerRef.current = setTimeout(fetchNextToken, 2000);
      } finally {
        setIsRefreshing(false);
      }
    }

    function startCountdown(expiresAt: number) {
      if (timerRef.current) clearTimeout(timerRef.current);

      function tick() {
        if (!mountedRef.current) return;

        const now = Date.now();
        const remainingMs = expiresAt - now;

        if (remainingMs <= 500) {
          setCountdown(0);
          fetchNextToken();
        } else {
          setCountdown(Math.ceil(remainingMs / 1000));
          timerRef.current = setTimeout(tick, 500);
        }
      }

      tick();
    }

    if (!session || session.status !== 'ACTIVE') {
      if (timerRef.current) clearTimeout(timerRef.current);
      queueMicrotask(() => {
        setQrToken(null);
      });
      tokenRef.current = null;
      return;
    }

    fetchNextToken();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.status, sessionId]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-gray-900 text-white text-2xl font-semibold">Loading Session...</div>;
  }

  if (error && !session) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-900 p-6 text-center">
        <h1 className="text-3xl font-bold text-red-500 mb-4">{error}</h1>
        <button onClick={() => router.push('/admin/sessions')} className="mt-6 bg-blue-600 px-6 py-3 rounded-lg text-white font-semibold hover:bg-blue-700 transition">Return to Sessions</button>
      </div>
    );
  }

  if (session?.status === 'DRAFT') {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-900 p-6 text-center">
        <div className="bg-yellow-100 text-yellow-800 p-8 rounded-2xl max-w-2xl">
          <h1 className="text-4xl font-bold mb-4">Session Not Started</h1>
          <p className="text-xl">This attendance session is currently in DRAFT state.</p>
          <p className="mt-4">Please return to the admin dashboard and click &quot;Start Session&quot; to begin generating QR codes.</p>
          <button onClick={() => router.push('/admin/sessions')} className="mt-8 bg-gray-900 px-6 py-3 rounded-lg text-white font-semibold">Return to Sessions</button>
        </div>
      </div>
    );
  }

  if (session?.status === 'ENDED' || session?.status === 'CANCELLED') {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-900 p-6 text-center">
        <div className="bg-gray-800 text-gray-300 p-8 rounded-2xl max-w-2xl border border-gray-700 shadow-2xl">
          <h1 className="text-5xl font-bold mb-4 text-white">Session Ended</h1>
          <p className="text-2xl mt-4">Attendance marking is now closed.</p>
          <div className="mt-8">
            <button onClick={() => router.push('/admin/sessions')} className="bg-blue-600 hover:bg-blue-700 transition px-8 py-4 rounded-xl text-white font-bold text-lg">
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const baseOrigin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'http://localhost:3000';
  const qrPayload = qrToken ? `${baseOrigin}/student/scan?t=${qrToken.token}&s=${sessionId}` : '';

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white overflow-hidden font-sans">
      {/* Header section */}
      <header className="p-6 md:p-10 flex justify-between items-start">
        <div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 text-transparent bg-clip-text">
            {cls?.name || session?.classId || 'Event Attendance'}
          </h1>
          <h2 className="text-2xl md:text-3xl font-medium text-gray-400 mt-2">
            Event Attendance
          </h2>
        </div>
        <div className="text-right">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 mr-2 animate-pulse"></span>
            Session Active
          </div>
        </div>
      </header>

      {/* Main QR Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="relative">
          {error && !qrToken && (
             <div className="absolute inset-0 bg-gray-900/90 flex items-center justify-center rounded-3xl z-10">
               <p className="text-red-400 font-bold text-xl px-6 text-center">{error}</p>
             </div>
          )}

          <div className={`bg-white p-6 md:p-10 rounded-[2rem] shadow-[0_0_50px_rgba(59,130,246,0.15)] flex items-center justify-center transition-opacity duration-300 ${isRefreshing ? 'opacity-80' : 'opacity-100'}`}>
            {qrPayload ? (
              <div className="bg-white p-2 rounded-xl">
                <QRCode 
                  value={qrPayload}
                  size={360}
                  level="H"
                  className="w-[280px] h-[280px] md:w-[380px] md:h-[380px]"
                />
              </div>
            ) : (
              <div className="w-[280px] h-[280px] md:w-[380px] md:h-[380px] flex items-center justify-center bg-gray-100 rounded-xl">
                <span className="text-gray-400 text-xl animate-pulse">Generating Secure QR...</span>
              </div>
            )}
          </div>
        </div>

        {/* Countdown */}
        <div className="mt-10 text-center h-24">
          {countdown > 0 ? (
            <div className="flex flex-col items-center">
              <span className="text-gray-400 text-lg md:text-xl font-medium mb-1">Changes in</span>
              <span className={`text-5xl md:text-7xl font-bold font-mono tracking-tighter ${countdown <= 3 ? 'text-red-500' : 'text-white'}`}>
                00:{countdown.toString().padStart(2, '0')}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
               <span className="text-blue-400 text-2xl font-bold animate-pulse">Rotating...</span>
            </div>
          )}
        </div>
      </main>

      {/* Footer controls */}
      <footer className="p-6 md:p-10 flex justify-between items-center border-t border-gray-800/50">
        <p className="text-gray-500 text-sm">Do not close this window while attendance is active.</p>
        <button 
          onClick={() => router.push('/admin/sessions')}
          className="text-gray-400 hover:text-white px-6 py-2 rounded-lg border border-gray-700 hover:bg-gray-800 transition font-medium"
        >
          Exit Display
        </button>
      </footer>
    </div>
  );
}
