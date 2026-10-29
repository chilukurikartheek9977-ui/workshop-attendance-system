import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// This script assigns the "admin" role to existing Firebase Auth users.
// Usage: node set-admin.mjs <email1> <email2>

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Please provide at least one email address.");
  console.error("Usage: node set-admin.mjs admin1@example.com admin2@example.com");
  process.exit(1);
}

// Ensure you have downloaded your Firebase Service Account JSON key
// and saved it as "service-account.json" in this directory.
let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
} catch (error) {
  console.error("❌ Could not read service-account.json.");
  console.error("Please generate a Service Account Key in Firebase Console -> Project Settings -> Service Accounts -> Generate new private key");
  console.error("Save it as 'service-account.json' in this folder and try again.");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function setAdminRole(email) {
  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    // Set custom claim { role: 'admin' }
    await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'admin' });
    console.log(`✅ Successfully made ${email} an admin!`);
  } catch (error) {
    console.error(`❌ Failed to make ${email} an admin:`, error.message);
  }
}

async function main() {
  for (const email of args) {
    await setAdminRole(email);
  }
  process.exit(0);
}

main();
