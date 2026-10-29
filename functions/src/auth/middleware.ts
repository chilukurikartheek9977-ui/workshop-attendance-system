import * as functions from 'firebase-functions';
import { CallableRequest } from 'firebase-functions/v2/https';

export interface AuthenticatedContext extends CallableRequest {
  auth: NonNullable<CallableRequest['auth']>;
}

/**
 * Ensures the request is authenticated.
 */
export function requireAuthentication(request: CallableRequest): AuthenticatedContext {
  if (!request.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }
  return request as AuthenticatedContext;
}

/**
 * Ensures the request is from an admin.
 */
export function requireAdmin(request: CallableRequest): AuthenticatedContext {
  const ctx = requireAuthentication(request);
  if (ctx.auth.token.role !== 'admin' && ctx.auth.token.email !== '23pa1a1238@vishnu.edu.in' && ctx.auth.token.email !== '23pa1a1238@vishnu.edu.inc' && ctx.auth.token.email !== 'doitclub@vishnu.edu.in') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'The function must be called by an administrator.'
    );
  }
  return ctx;
}

/**
 * Ensures the request is from a student.
 */
export function requireStudent(request: CallableRequest): AuthenticatedContext {
  const ctx = requireAuthentication(request);
  if (ctx.auth.token.role !== 'student') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'The function must be called by a student.'
    );
  }
  return ctx;
}
