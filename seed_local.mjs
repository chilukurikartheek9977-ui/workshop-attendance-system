import admin from 'firebase-admin';
import * as dotenv from 'dotenv';
dotenv.config();

// Connect to the local emulator
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

admin.initializeApp({
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'do-it-attendance-portal',
});

const db = admin.firestore();

async function seed() {
  try {
    const email = '23pa1a1238@vishnu.edu.in';
    const password = 'password123';
    const name = 'Admin User';
    
    console.log('Seeding admin user...');

    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
      console.log('User already exists in Auth.');
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        userRecord = await admin.auth().createUser({
          email,
          password,
          displayName: name,
        });
        console.log('Created user in Auth.');
      } else {
        throw e;
      }
    }

    // Set custom claim
    await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'admin' });
    console.log('Set admin custom claim.');

    // Add to users collection
    await db.collection('users').doc(userRecord.uid).set({
      email,
      name,
      role: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Add to admins collection
    await db.collection('admins').doc(userRecord.uid).set({
      userId: userRecord.uid,
      email,
      name,
      role: 'admin',
      status: 'ACTIVE',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    console.log('Seeded Firestore collections.');
    
    // Add a test class and subject so the dashboard isn't completely empty
    console.log('Seeding a test class and subject...');
    const classRef = db.collection('classes').doc('test-class-1');
    await classRef.set({
      name: 'Test Class A',
      department: 'CSE',
      year: 1,
      section: 'A',
      status: 'ACTIVE',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    const subjectRef = db.collection('subjects').doc('test-subject-1');
    await subjectRef.set({
      name: 'Introduction to Programming',
      code: 'CS101',
      credits: 3,
      department: 'CSE',
      status: 'ACTIVE',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('Successfully seeded local emulator environment!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seed();
