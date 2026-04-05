import { initializeApp, getApps, cert, type App } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'

function getApp(): App {
  if (getApps().length > 0) return getApps()[0]

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET

  if (!projectId || !clientEmail || !privateKey || !storageBucket) {
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
