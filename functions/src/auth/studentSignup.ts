import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const finalizeRegistration = functions.https.onCall(async (data, context) => {
  // Check that the request originates from an authenticated user
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  const { name, studentNumber } = data;
  if (!name || !studentNumber) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing required student fields.'
    );
  }

  const uid = context.auth.uid;
  const email = context.auth.token.email || '';
  const db = admin.firestore();

  try {
    // 1. Re-verify that studentNumber is unique across the database to prevent duplicates
    const existingStudentsSnapshot = await db.collection('students')
      .where('studentNumber', '==', studentNumber)
      .limit(1)
      .get();
      
    if (!existingStudentsSnapshot.empty) {
      throw new functions.https.HttpsError(
        'already-exists',
        'An account with this Student ID already exists.'
      );
    }

    // 2. Set Custom Claims securely
    await admin.auth().setCustomUserClaims(uid, { role: 'student' });

    // 3. Database batch write for consistency
    const batch = db.batch();

    // Base user profile
    const userRef = db.collection('users').doc(uid);
    batch.set(userRef, {
      name,
      email,
      role: 'student',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Extended student profile - Defaults to INACTIVE and UNASSIGNED class
    const studentRef = db.collection('students').doc(uid);
    batch.set(studentRef, {
      userId: uid,
      studentNumber,
      name,
      email,
      classId: 'UNASSIGNED',
      department: '', // Admins will complete this during class assignment
      year: 0,
      section: '',
      status: 'INACTIVE',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Audit log
    const logRef = db.collection('auditLogs').doc();
    batch.set(logRef, {
      userId: uid,
      action: 'STUDENT_SELF_REGISTERED',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: { newStudentId: uid, studentNumber }
    });

    await batch.commit();

    return { success: true, message: 'Registration finalized successfully.' };
  } catch (error: unknown) {
    console.error('Error in finalizeRegistration:', error);
    
    // If we throw a standard HttpsError from above, re-throw it so the client gets the correct message
    if (error instanceof functions.https.HttpsError) {
       throw error;
    }
    
    throw new functions.https.HttpsError('internal', 'An error occurred during registration finalization.');
  }
});
