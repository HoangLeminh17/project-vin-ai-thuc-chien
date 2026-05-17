import { initializeApp, getApps, cert, type App } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { logger } from '@/infrastructure/di/logger.di'
import { firebaseAdminConfig, isBuildOrTest } from '@/lib/config/server'

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

  const { projectId, clientEmail, privateKey, storageBucket } = firebaseAdminConfig

  if (!projectId || !clientEmail || !privateKey || !storageBucket) {
    if (isBuildOrTest) {
      logger.warn('Firebase Admin env vars missing; using recursive dummy proxy')
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
  if (!firebaseAdminConfig.projectId && isBuildOrTest) {
    return createRecursiveProxy();
  }
  return getStorage(getApp()).bucket()
}

export function getFirebaseAdminAuth() {
  if (!firebaseAdminConfig.projectId && isBuildOrTest) {
    return createRecursiveProxy();
  }
  return getAuth(getApp())
}

export function getFirebaseAdminFirestore() {
  if (!firebaseAdminConfig.projectId && isBuildOrTest) {
    return createRecursiveProxy();
  }
  return getFirestore(getApp())
}

export const getDb = getFirebaseAdminFirestore;
