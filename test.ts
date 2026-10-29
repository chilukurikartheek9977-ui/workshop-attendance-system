import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'demo-api-key',
  authDomain: 'demo-project.firebaseapp.com',
  projectId: 'demo-project',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });

async function test() {
  try {
    console.log("Attempting sign in...");
    await signInWithEmailAndPassword(auth, 'admin@example.com', 'password123');
    console.log("Sign in success!");
  } catch (e: any) {
    console.error("Sign in failed:", e.code, e.message);
  }

  try {
    console.log("Attempting create user...");
    await createUserWithEmailAndPassword(auth, 'test@example.com', 'password123');
    console.log("Create user success!");
  } catch (e: any) {
    console.error("Create user failed:", e.code, e.message);
  }
}

test();
