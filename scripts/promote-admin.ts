/**
 * CLI script to promote a user to admin.
 * Usage: npx tsx scripts/promote-admin.ts user@example.com
 */
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

function initAdmin() {
  if (getApps().length > 0) return getApps()[0];

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin environment variables. Ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set.');
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

async function promoteToAdmin(email: string) {
  initAdmin();
  const auth = getAuth();

  try {
    const user = await auth.getUserByEmail(email);
    console.log(`Found user: ${user.displayName} (${user.uid})`);

    await auth.setCustomUserClaims(user.uid, { role: 'admin' });
    console.log(`Successfully promoted ${email} to admin.`);
    
    // Note: The user needs to re-login or refresh their token to see the changes.
    console.log('Note: The user must sign out and sign back in for the changes to take effect.');
  } catch (error: any) {
    console.error('Error promoting user:', error.message);
    process.exit(1);
  }
}

const email = process.argv[2];
if (!email) {
  console.error('Please provide a user email.');
  console.log('Usage: npx tsx scripts/promote-admin.ts <email>');
  process.exit(1);
}

promoteToAdmin(email);
