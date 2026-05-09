import { initializeApp, getApps, cert, type App } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

// A recursive proxy that returns itself for any property access or function call.
// This allows any chain like bucket.file(path).save(data).then(...) to not crash.
const createRecursiveProxy = (): any => {
  const proxy: any = new Proxy(() => proxy, {
    get: (target, prop) => {
      if (prop === 'then') return undefined; // Handle promises if needed
      if (prop === 'constructor') return Object;
      return proxy;
    },
    apply: () => proxy
  });
  return proxy;
};

function getApp(): App {
  if (getApps().length > 0) return getApps()[0]

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET

  if (!projectId || !clientEmail || !privateKey || !storageBucket) {
    if (process.env.NEXT_PHASE === 'phase-production-build' || process.env.NODE_ENV === 'test') {
      console.warn('Firebase Admin env vars missing - using recursive dummy proxy');
      return createRecursiveProxy();
    }
    throw new Error('Missing Firebase Admin env vars')
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    storageBucket,
  })
}

export function getBucket() {
  if (!process.env.FIREBASE_PROJECT_ID && (process.env.NEXT_PHASE === 'phase-production-build' || process.env.NODE_ENV === 'test')) {
    return createRecursiveProxy();
  }
  return getStorage(getApp()).bucket()
}

export function getFirebaseAdminAuth() {
  if (!process.env.FIREBASE_PROJECT_ID && (process.env.NEXT_PHASE === 'phase-production-build' || process.env.NODE_ENV === 'test')) {
    return createRecursiveProxy();
  }
  return getAuth(getApp())
}

export function getFirebaseAdminFirestore() {
  if (!process.env.FIREBASE_PROJECT_ID && (process.env.NEXT_PHASE === 'phase-production-build' || process.env.NODE_ENV === 'test')) {
    return createRecursiveProxy();
  }
  return getFirestore(getApp())
}

export const getDb = getFirebaseAdminFirestore;
