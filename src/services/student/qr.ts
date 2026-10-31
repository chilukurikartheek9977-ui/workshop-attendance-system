import { getFunctions, httpsCallable } from 'firebase/functions';

export async function markAttendance(token: string, sessionId: string): Promise<{ success: boolean; status: string; message: string }> {
  const processLocalAttendance = () => {
    if (typeof window === 'undefined') {
      throw new Error('Window is not defined');
    }
    const activeTokens = JSON.parse(localStorage.getItem('mockQrTokens') || '{}');
    const sessionToken = activeTokens[sessionId];

    if (!sessionToken || sessionToken.token !== token) {
      throw new Error('Invalid or outdated QR token. Please scan the latest code.');
    }

    if (Date.now() > sessionToken.expiresAt) {
      throw new Error('QR token has expired. Please scan the current code.');
    }

    const currentRole = localStorage.getItem('mockRole') || 'student';
    const studentUid = 'student_' + (currentRole === 'student' ? '123' : 'current');
    const studentName = 'Student (' + studentUid + ')';

    const records: any[] = JSON.parse(localStorage.getItem('mockAttendanceRecords') || '[]');
    const existing = records.find(r => r.sessionId === sessionId && r.studentId === studentUid);

    if (existing) {
      return {
        success: true,
        status: 'ALREADY_RECORDED',
        message: 'Attendance already recorded for this session.'
      };
    }

    const newRecord = {
      id: 'rec_' + Math.random().toString(36).substr(2, 9),
      sessionId,
      studentId: studentUid,
      studentName,
      status: 'PRESENT',
      markedAt: { toMillis: () => Date.now() },
      verificationMethod: 'QR_SCAN'
    };

    records.unshift(newRecord);
    localStorage.setItem('mockAttendanceRecords', JSON.stringify(records));

    return {
      success: true,
      status: 'RECORDED',
      message: 'Attendance recorded successfully!'
    };
  };

  if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
    return processLocalAttendance();
  }

  try {
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
  } catch (err) {
    console.warn('Backend markAttendance call failed, attempting local fallback:', err);
    try {
      return processLocalAttendance();
    } catch {
      throw err;
    }
  }
}
