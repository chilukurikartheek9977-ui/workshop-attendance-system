import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

// Provide a small grace period for network latency when students scan.
const GRACE_PERIOD_MS = 2000;

export const markAttendance = functions.https.onCall(async (data, context) => {
  // 1. Verify Authentication & Role
  if (!context.auth || context.auth.token.role !== 'student') {
    throw new functions.https.HttpsError('permission-denied', 'Unauthorized. Only students can mark attendance.');
  }

  const { token, sessionId } = data;
  if (!token || !sessionId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing token or session ID.');
  }

  const db = admin.firestore();

  try {
    // 2. Compute the expected token hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // 3. Fetch token from database using O(1) lookup
    const tokenRef = db.collection('qrTokens').doc(tokenHash);
    const tokenDoc = await tokenRef.get();

    if (!tokenDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Invalid QR token.');
    }

    const tokenData = tokenDoc.data();

    // 4. Validate Session Binding
    if (tokenData?.sessionId !== sessionId) {
      throw new functions.https.HttpsError('invalid-argument', 'QR token does not belong to this session.');
    }

    // 5. Validate Token Expiration against authoritative Server Time
    const now = Date.now();
    const expiresAtMs = tokenData?.expiresAt.toMillis();

    if (now > (expiresAtMs + GRACE_PERIOD_MS)) {
      throw new functions.https.HttpsError('failed-precondition', 'QR token has expired.');
    }

    // 6. Validate Token Revocation status
    if (tokenData?.status !== 'ACTIVE') {
      throw new functions.https.HttpsError('failed-precondition', 'QR token has been revoked.');
    }

    // 7. Validate Student Identity, Status, and Enrollment
    const studentUid = context.auth.uid;
    const studentRef = db.collection('students').doc(studentUid);
    const studentDoc = await studentRef.get();

    if (!studentDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Student profile not found.');
    }

    const studentData = studentDoc.data();

    if (studentData?.status !== 'ACTIVE') {
      throw new functions.https.HttpsError('permission-denied', 'Your student account is not active.');
    }

    // 8. Atomic Duplicate Prevention and Attendance Creation
    return await db.runTransaction(async (transaction) => {
      const attendanceRecordId = `${sessionId}_${studentUid}`;
      const attendanceRef = db.collection('attendanceRecords').doc(attendanceRecordId);

      // Check for duplicate atomically
      const attendanceDoc = await transaction.get(attendanceRef);
      if (attendanceDoc.exists) {
        return {
          success: true,
          status: 'ALREADY_RECORDED',
          message: 'Attendance has already been recorded for this session.'
        };
      }

      // Re-verify session status atomically to prevent race conditions where Admin ends the session 
      // exactly while this request is processing.
      const sessionRef = db.collection('attendanceSessions').doc(sessionId);
      const sessionDoc = await transaction.get(sessionRef);

      if (!sessionDoc.exists || sessionDoc.data()?.status !== 'ACTIVE') {
        throw new functions.https.HttpsError('failed-precondition', 'Attendance session is no longer active.');
      }

      const sessionData = sessionDoc.data()!;

      // Validate class enrollment matches the session
      if (studentData?.classId !== sessionData.classId) {
        throw new functions.https.HttpsError('permission-denied', 'You are not enrolled in the class for this attendance session.');
      }

      // 9. Commit the Attendance Record
      const markedAt = admin.firestore.FieldValue.serverTimestamp();

      transaction.set(attendanceRef, {
        id: attendanceRecordId,
        sessionId,
        studentId: studentData.id,
        studentUid: studentUid,
        classId: sessionData.classId,
        status: 'PRESENT',
        markedAt,
        createdAt: markedAt,
        updatedAt: markedAt,
        source: 'QR_SCAN'
      });

      return {
        success: true,
        status: 'PRESENT',
        message: 'Attendance marked successfully.'
      };
    });

  } catch (error: unknown) {
    console.error('Error marking attendance:', error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError('internal', 'An error occurred while marking attendance.');
  }
});
