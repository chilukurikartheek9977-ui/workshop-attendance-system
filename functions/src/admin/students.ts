import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const createStudent = functions.https.onCall(async (data, context) => {
  // Check authorization
  if (!context.auth || context.auth.token.role !== 'admin' && context.auth.token.email !== '23pa1a1238@vishnu.edu.in' && context.auth.token.email !== '23pa1a1238@vishnu.edu.inc' && context.auth.token.email !== 'doitclub@vishnu.edu.in' && context.auth.token.email !== '23pa1a1238@vishnu.edu.in' && context.auth.token.email !== '23pa1a1238@vishnu.edu.inc' && context.auth.token.email !== 'doitclub@vishnu.edu.in') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Must be an administrator to perform this action.'
    );
  }

  const { email, password, name, studentNumber, classId, department, year, section } = data;
  if (!email || !password || !name || !studentNumber || !classId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing required student fields.'
    );
  }

  const db = admin.firestore();

  try {
    // Check if class exists
    const classDoc = await db.collection('classes').doc(classId).get();
    if (!classDoc.exists || classDoc.data()?.status !== 'ACTIVE') {
      throw new functions.https.HttpsError('failed-precondition', 'Invalid or archived class specified.');
    }

    // 1. Create Firebase Auth User
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    // 2. Set Custom Claims securely
    await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'student' });

    // 3. Database batch write for consistency
    const batch = db.batch();

    // Base user profile
    const userRef = db.collection('users').doc(userRecord.uid);
    batch.set(userRef, {
      name,
      email,
      role: 'student',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Extended student profile
    const studentRef = db.collection('students').doc(userRecord.uid);
    batch.set(studentRef, {
      userId: userRecord.uid,
      studentNumber,
      name,
      email,
      classId,
      department: department || classDoc.data()?.department || '',
      year: year || classDoc.data()?.year || 0,
      section: section || classDoc.data()?.section || '',
      status: 'ACTIVE',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Audit log
    const logRef = db.collection('auditLogs').doc();
    batch.set(logRef, {
      userId: context.auth.uid,
      action: 'STUDENT_CREATED',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: { newStudentId: userRecord.uid, studentNumber }
    });

    await batch.commit();

    return { success: true, uid: userRecord.uid, message: 'Student successfully created.' };
  } catch (error: unknown) {
    console.error('Error creating student:', error);
    // Be careful not to leak exact passwords or Firebase errors unhandled
    throw new functions.https.HttpsError('internal', (error as any).message || 'An error occurred during student creation.');
  }
});
