import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const startAttendanceSession = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.role !== 'admin' && context.auth.token.email !== '23pa1a1238@vishnu.edu.in' && context.auth.token.email !== '23pa1a1238@vishnu.edu.inc' && context.auth.token.email !== 'doitclub@vishnu.edu.in' && context.auth.token.email !== '23pa1a1238@vishnu.edu.in' && context.auth.token.email !== '23pa1a1238@vishnu.edu.inc' && context.auth.token.email !== 'doitclub@vishnu.edu.in') {
    throw new functions.https.HttpsError('permission-denied', 'Unauthorized');
  }

  const { sessionId } = data;
  if (!sessionId) {
    throw new functions.https.HttpsError('invalid-argument', 'Session ID is required.');
  }

  const db = admin.firestore();

  try {
    await db.runTransaction(async (transaction) => {
      const sessionRef = db.collection('attendanceSessions').doc(sessionId);
      const sessionDoc = await transaction.get(sessionRef);

      if (!sessionDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Session not found.');
      }

      const sessionData = sessionDoc.data();
      if (sessionData?.status !== 'DRAFT') {
        throw new functions.https.HttpsError('failed-precondition', 'Only DRAFT sessions can be started.');
      }



      // Start the session
      transaction.update(sessionRef, {
        status: 'ACTIVE',
        startTime: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Audit log
      const logRef = db.collection('auditLogs').doc();
      transaction.set(logRef, {
        userId: context.auth!.uid,
        action: 'SESSION_STARTED',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        metadata: { sessionId }
      });
    });

    return { success: true, message: 'Session started.' };
  } catch (error: unknown) {
    console.error('Error starting session:', error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError('internal', 'An error occurred while starting the session.');
  }
});

export const endAttendanceSession = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.role !== 'admin' && context.auth.token.email !== '23pa1a1238@vishnu.edu.in' && context.auth.token.email !== '23pa1a1238@vishnu.edu.inc' && context.auth.token.email !== 'doitclub@vishnu.edu.in' && context.auth.token.email !== '23pa1a1238@vishnu.edu.in' && context.auth.token.email !== '23pa1a1238@vishnu.edu.inc' && context.auth.token.email !== 'doitclub@vishnu.edu.in') {
    throw new functions.https.HttpsError('permission-denied', 'Unauthorized');
  }

  const { sessionId } = data;
  if (!sessionId) {
    throw new functions.https.HttpsError('invalid-argument', 'Session ID is required.');
  }

  const db = admin.firestore();

  try {
    await db.runTransaction(async (transaction) => {
      const sessionRef = db.collection('attendanceSessions').doc(sessionId);
      const sessionDoc = await transaction.get(sessionRef);

      if (!sessionDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Session not found.');
      }

      if (sessionDoc.data()?.status !== 'ACTIVE') {
        throw new functions.https.HttpsError('failed-precondition', 'Only ACTIVE sessions can be ended.');
      }

      // End the session
      transaction.update(sessionRef, {
        status: 'ENDED',
        endTime: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Audit log
      const logRef = db.collection('auditLogs').doc();
      transaction.set(logRef, {
        userId: context.auth!.uid,
        action: 'SESSION_ENDED',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        metadata: { sessionId }
      });
    });

    return { success: true, message: 'Session ended.' };
  } catch (error: unknown) {
    console.error('Error ending session:', error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError('internal', 'An error occurred while ending the session.');
  }
});
