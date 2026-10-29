import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

export interface QRTokenResponse {
  token: string;
  expiresAt: number; // Unix timestamp in ms
}

export async function generateDisplayToken(sessionId: string, adminUid?: string): Promise<QRTokenResponse> {
  // Generate random 32-byte token using Web Crypto API
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  const rawToken = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');

  // Hash the token using SHA-256
  const msgBuffer = new TextEncoder().encode(rawToken);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  const now = Date.now();
  const issuedAt = new Date(now);
  const expiresAt = new Date(now + 10 * 1000); // 10 seconds lifespan

  // Store Token Hash in Firestore
  const tokenRef = doc(db, 'qrTokens', tokenHash);
  await setDoc(tokenRef, {
    sessionId,
    issuedAt,
    expiresAt,
    status: 'ACTIVE',
    createdBy: adminUid || 'admin'
  });

  return {
    token: rawToken,
    expiresAt: expiresAt.getTime()
  };
}
