import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const archiveClass = functions.https.onCall(async (data, context) => {
  // Authentication & Authorization check
  if (!context.auth || context.auth.token.role !== 'admin' && context.auth.token.email !== '23pa1a1238@vishnu.edu.in' && context.auth.token.email !== '23pa1a1238@vishnu.edu.inc' && context.auth.token.email !== 'doitclub@vishnu.edu.in' && context.auth.token.email !== '23pa1a1238@vishnu.edu.in' && context.auth.token.email !== '23pa1a1238@vishnu.edu.inc' && context.auth.token.email !== 'doitclub@vishnu.edu.in') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Must be an administrator to perform this action.'
    );
  }

  const { classId } = data;
  if (!classId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Class ID is required.'
    );
  }

  const db = admin.firestore();
  
  try {
    await db.runTransaction(async (transaction) => {
      const classRef = db.collection('classes').doc(classId);
      const classDoc = await transaction.get(classRef);
      
      if (!classDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Class not found.');
      }
      
      if (classDoc.data()?.status === 'ARCHIVED') {
        throw new functions.https.HttpsError('failed-precondition', 'Class is already archived.');
      }

      transaction.update(classRef, {
        status: 'ARCHIVED',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Log the action
      const logRef = db.collection('auditLogs').doc();
      transaction.set(logRef, {
        userId: context.auth!.uid,
        action: 'CLASS_ARCHIVED',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        metadata: { classId }
      });
    });

    return { success: true, message: 'Class successfully archived.' };
  } catch (error: unknown) {
    console.error('Error archiving class:', error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError('internal', 'An error occurred while archiving the class.');
  }
});
