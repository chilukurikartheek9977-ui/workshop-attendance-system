'use client';

import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { StudentLayout } from '@/components/student/StudentLayout';
import { useAuth } from '@/lib/auth/context';
import { markAttendance } from '@/services/student/qr';
import { useRouter } from 'next/navigation';

export default function StudentScanPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; status?: string; message: string } | null>(null);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-reader';

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  async function startScanner() {
    if (!user) {
      setError('You must be logged in to scan attendance.');
      return;
    }

    try {
      setError(null);
      setScanResult(null);
      setHasCameraPermission(null);

      // Initialize scanner
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(scannerContainerId);
      }

      setScanning(true);

      await scannerRef.current.start(
        { facingMode: 'environment' }, // Prefer rear camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        onScanSuccess,
        onScanFailure
      );
      
      setHasCameraPermission(true);

    } catch (err: unknown) {
      console.error('Camera initialization failed:', err);
      setScanning(false);
      
      if ((err as any)?.name === 'NotAllowedError') {
        setHasCameraPermission(false);
        setError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if ((err as any)?.name === 'NotFoundError') {
        setError('No camera device found on your device.');
      } else {
        setError('Failed to start camera. ' + ((err as any)?.message || ''));
      }
    }
  }

  async function stopScanner() {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {
        console.error('Failed to stop scanner cleanly.', e);
      }
    }
    setScanning(false);
  }

  async function onScanSuccess(decodedText: string) {
    // 1. Immediately pause/stop the scanner to prevent duplicate scans
    await stopScanner();
    
    // 2. Parse the payload
    setValidating(true);
    setScanResult(null);
    setError(null);

    try {
      let url: URL;
      try {
        url = new URL(decodedText, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
      } catch (e) {
        throw new Error('Invalid QR Code format.');
      }

      const token = url.searchParams.get('t');
      const sessionId = url.searchParams.get('s');

      if (!token || !sessionId) {
        throw new Error('QR Code missing required security tokens.');
      }

      // 3. Send to secure backend
      const result = await markAttendance(token, sessionId);

      // 4. Handle success and ALREADY_RECORDED gracefully
      setScanResult({
        success: true,
        status: result.status,
        message: result.message
      });

    } catch (err: unknown) {
      console.error('Validation Error:', err);
      // Clean up error messages coming from Firebase Callable Functions
      let errorMsg = (err as Error).message || 'Failed to mark attendance.';
      if (errorMsg.includes('internal')) {
         errorMsg = 'A server error occurred. Please try again.';
      }

      setScanResult({
        success: false,
        message: errorMsg
      });
    } finally {
      setValidating(false);
    }
  }

  function onScanFailure(errorMessage: string) {
    // html5-qrcode calls this frequently on every frame where no QR is detected.
    // Do NOT set state here, just ignore it.
  }

  if (authLoading) {
    return <StudentLayout><div className="p-6 text-center text-gray-500">Loading your profile...</div></StudentLayout>;
  }

  return (
    <StudentLayout>
      <div className="max-w-md mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Scan Attendance</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Point your camera at the attendance QR displayed by your instructor.
          </p>
        </div>

        {/* Status Banners */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300 p-4 rounded-lg text-sm border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        {/* Validation Loading State */}
        {validating && (
          <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 p-8 rounded-xl text-center flex flex-col items-center border border-blue-200 dark:border-blue-800">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="font-semibold text-lg">Verifying and Marking...</p>
            <p className="text-sm opacity-80 mt-2">Connecting to secure backend...</p>
          </div>
        )}

        {/* Validation Result State */}
        {scanResult && !validating && (
          <div className={`p-6 rounded-xl border text-center ${
            scanResult.success 
              ? scanResult.status === 'ALREADY_RECORDED'
                ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300'
                : 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
              : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
          }`}>
            <div className="text-4xl mb-4">
              {!scanResult.success ? '❌' : scanResult.status === 'ALREADY_RECORDED' ? 'ℹ️' : '✅'}
            </div>
            <h3 className="text-xl font-bold mb-2">
              {!scanResult.success ? 'Validation Failed' : scanResult.status === 'ALREADY_RECORDED' ? 'Already Recorded' : 'Attendance Marked'}
            </h3>
            <p className="text-sm opacity-90">{scanResult.message}</p>
            
            <button 
              onClick={startScanner}
              className={`mt-6 px-6 py-2 rounded-lg text-white font-medium shadow-sm transition-colors ${
                scanResult.success ? (scanResult.status === 'ALREADY_RECORDED' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700') : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              Scan Another Code
            </button>
          </div>
        )}

        {/* Scanner Viewport */}
        <div className={validating || scanResult ? 'hidden' : 'block'}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700">
            <div id={scannerContainerId} className="w-full bg-black min-h-[300px]"></div>
          </div>
          
          <div className="mt-6 flex justify-center">
            {!scanning ? (
              <button
                onClick={startScanner}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center space-x-2 text-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                <span>Tap to Scan</span>
              </button>
            ) : (
              <button
                onClick={stopScanner}
                className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-bold py-4 px-6 rounded-xl shadow-sm transition-all"
              >
                Cancel Scanning
              </button>
            )}
          </div>
        </div>

      </div>
    </StudentLayout>
  );
}
