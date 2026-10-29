import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

// This script expects to run against the local emulator if NEXT_PUBLIC_USE_FIREBASE_EMULATOR is set
if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
}

if (!projectId || !clientEmail || !privateKey) {
  console.warn("Missing Firebase Admin Credentials in .env, falling back to application default credentials (Emulator ONLY expected)");
  initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project' });
} else {
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

const auth = getAuth();
const db = getFirestore();

async function createAccount(email: string, password: string, role: 'admin' | 'student', name: string) {
  try {
    let user;
    try {
      user = await auth.getUserByEmail(email);
      console.log(`User ${email} already exists. Updating role and password...`);
      await auth.updateUser(user.uid, { password });
    } catch (err: unknown) {
      if ((err as any).code === 'auth/user-not-found') {
        user = await auth.createUser({
          email,
          password,
          displayName: name,
        });
        console.log(`Created user ${email} with uid: ${user.uid}`);
      } else {
        throw err;
      }
    }

    // Set custom claims
    await auth.setCustomUserClaims(user.uid, { role });
    console.log(`Set custom claim 'role: ${role}' for ${email}`);

    // Create Firestore Profile
    await db.collection('users').doc(user.uid).set({
      email,
      name,
      role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    console.log(`Created/Updated Firestore user profile for ${email}`);

    if (role === 'admin') {
      await db.collection('admins').doc(user.uid).set({
        userId: user.uid,
        name,
        createdAt: new Date().toISOString(),
      }, { merge: true });
    } else if (role === 'student') {
      // Mock student profile
      await db.collection('students').doc(user.uid).set({
        userId: user.uid,
        studentNumber: `STU${Math.floor(Math.random() * 10000)}`,
        name,
        email,
        classId: 'class_1',
        department: 'CS',
        year: 2024,
        section: 'A',
      }, { merge: true });
    }

  } catch (err: unknown) {
    console.error('Error seeding admin account:', (err as any).message);
    process.exit(1);
  }
}

async function runSeed() {
  console.log("Seeding Development Accounts...");
  await createAccount('admin@example.com', 'password123', 'admin', 'System Admin');
  await createAccount('student@university.edu', 'password123', 'student', 'John Doe');
  console.log("Seeding Complete.");
}

runSeed().catch(console.error);
