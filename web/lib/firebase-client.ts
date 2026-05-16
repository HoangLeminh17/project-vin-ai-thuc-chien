import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { devWarn, devError } from '@/lib/devlog'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase only if API key is present
let app;
let auth: ReturnType<typeof getAuth> | any;
let storage: ReturnType<typeof getStorage> | any;

if (firebaseConfig.apiKey) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  storage = getStorage(app);
} else {
  devWarn('Firebase Client API Key is missing. Please add NEXT_PUBLIC_FIREBASE_API_KEY to your .env file.');
  // Create a dummy auth object to prevent immediate crashes during SSR/render
  auth = {} as any;
  storage = {} as any;
}

export { auth, storage };
const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  if (!auth?.app) {
    const message = 'Vui lòng cấu hình các biến môi trường NEXT_PUBLIC_FIREBASE_* trong file .env trước khi đăng nhập.';
    alert(message);
    throw new Error(message);
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    devError('Error signing in with Google', error)
    throw error;
  }
}

export async function signOut() {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    devError('Error signing out', error)
    throw error;
  }
}
