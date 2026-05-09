import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Firebase Admin Build Safety', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should not throw error when env vars are missing during build phase', async () => {
    // Simulate Next.js build phase
    process.env.NEXT_PHASE = 'phase-production-build';
    
    // Clear env vars that would normally be required
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_CLIENT_EMAIL;
    delete process.env.FIREBASE_PRIVATE_KEY;
    delete process.env.FIREBASE_STORAGE_BUCKET;

    // Import the module dynamically to trigger initialization
    const { getFirebaseAdminAuth } = await import('@/lib/firebase-admin');
    
    expect(() => getFirebaseAdminAuth()).not.toThrow();
    
    const auth = getFirebaseAdminAuth();
    expect(auth).toBeDefined();
  });

  it('should throw error when env vars are missing in non-build, non-test phase', async () => {
    // Simulate runtime
    process.env.NEXT_PHASE = 'runtime';
    process.env.NODE_ENV = 'production';
    
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_CLIENT_EMAIL;
    delete process.env.FIREBASE_PRIVATE_KEY;
    delete process.env.FIREBASE_STORAGE_BUCKET;

    const { getFirebaseAdminAuth } = await import('@/lib/firebase-admin');
    
    expect(() => getFirebaseAdminAuth()).toThrow(/Missing Firebase Admin env vars/);
  });
});
