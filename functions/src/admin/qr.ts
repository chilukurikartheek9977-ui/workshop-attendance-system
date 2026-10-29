import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

// The strictly mandated QR lifespan for the display.
const QR_LIFESPAN_MS = 10 * 1000;

export const generateDisplayToken = functions.https.onCall(async (data, context) => {
  // 1. Verify Authentication & Role
  if (!context.auth || context.auth.token.role !== 'admin' && context.auth.token.email !== '23pa1a1238@vishnu.edu.in' && context.auth.token.email !== '23pa1a1238@vishnu.edu.inc' && context.auth.token.email !== 'doitclub@vishnu.edu.in' && context.auth.token.email !== '23pa1a1238@vishnu.edu.in' && context.auth.token.email !== '23pa1a1238@vishnu.edu.inc' && context.auth.token.email !== 'doitclub@vishnu.edu.in') {
    throw new functions.https.HttpsError('permission-denied', 'Unauthorized. Only admins can generate QR codes.');
  }

  const { sessionId } = data;
  if (!sessionId) {
    throw new functions.https.HttpsError('invalid-argument', 'Session ID is required.');
  }

  const db = admin.firestore();

  try {
    // 2. Validate Session Ownership and Status
    const sessionRef = db.collection('attendanceSessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Session not found.');
    }

    const sessionData = sessionDoc.data();
    if (sessionData?.status !== 'ACTIVE') {
      throw new functions.https.HttpsError('failed-precondition', 'QR codes can only be generated for ACTIVE sessions.');
    }

    // 3. Generate Cryptographically Secure Random Token
    // We use a 32-byte hex string (64 characters) which has massive entropy.
    const rawToken = crypto.randomBytes(32).toString('hex');
    
    // We store a hash of the token, not the raw token, to prevent internal database leaks
    // from fully compromising the current active QR if someone reads the database.
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const now = Date.now();
    const issuedAt = admin.firestore.Timestamp.fromMillis(now);
    const expiresAt = admin.firestore.Timestamp.fromMillis(now + QR_LIFESPAN_MS);

    // 4. Store Token Hash in Firestore
    // Using tokenHash as the document ID gives O(1) lookup during future validations.
    const tokenRef = db.collection('qrTokens').doc(tokenHash);
    await tokenRef.set({
      sessionId,
      issuedAt,
      expiresAt,
      status: 'ACTIVE', // Will be treated as EXPIRED based on timestamp comparisons later
      createdBy: context.auth.uid
    });

    // 5. Return the raw token securely to the requesting admin client
    // Note: The client must never receive the hash logic. It treats it opaquely.
    return {
      success: true,
      token: rawToken,
      expiresAt: expiresAt.toMillis()
    };
  } catch (error: unknown) {
    console.error('Error generating display token:', error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError('internal', 'An error occurred while generating the QR token.');
  }
});
