import { getFunctions, httpsCallable } from 'firebase/functions';

export async function markAttendance(token: string, sessionId: string): Promise<{ success: boolean; status: string; message: string }> {
  const functions = getFunctions();
  const markAttendanceFn = httpsCallable(functions, 'studentQR-markAttendance');
  
  const result = await markAttendanceFn({ token, sessionId });
  const data = result.data as any;
  
  if (!data.success) {
    throw new Error('Attendance marking failed.');
  }

  return {
    success: data.success,
    status: data.status,
    message: data.message
  };
}
