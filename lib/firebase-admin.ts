import { initializeApp, getApps, cert, type App } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

function getApp(): App {
  if (getApps().length > 0) return getApps()[0]

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET

  if (!projectId || !clientEmail || !privateKey || !storageBucket) {
    // During Next.js build phase, env vars might be missing. 
    // We should only throw if we are actually trying to use the app in production/dev.
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      console.warn('Firebase Admin env vars missing during build - skipping initialization');
      return {} as App; 
    }
    throw new Error('Missing Firebase Admin env vars (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_STORAGE_BUCKET)')
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    storageBucket,
  })
}

export function getBucket() {
  return getStorage(getApp()).bucket()
}

export function getFirebaseAdminAuth() {
  return getAuth(getApp())
}

export function getFirebaseAdminFirestore() {
  return getFirestore(getApp())
}

export const getDb = getFirebaseAdminFirestore;
