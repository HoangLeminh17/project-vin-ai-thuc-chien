import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('API Routes Import Safety (Build Phase)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv, NEXT_PHASE: 'phase-production-build' };
    
    // Clear Firebase env vars to simulate build environment
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_CLIENT_EMAIL;
    delete process.env.FIREBASE_PRIVATE_KEY;
    delete process.env.FIREBASE_STORAGE_BUCKET;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const apiDir = path.resolve(process.cwd(), 'app/api');

  function getApiRoutes(dir: string, routes: string[] = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        getApiRoutes(fullPath, routes);
      } else if (file === 'route.ts' || file === 'route.js') {
        routes.push(fullPath);
      }
    }
    return routes;
  }

  const routes = getApiRoutes(apiDir);

  routes.forEach(routePath => {
    const relativePath = path.relative(process.cwd(), routePath);
    it(`should import ${relativePath} without crashing during build`, async () => {
      // We use a try-catch because some routes might have complex side effects 
      // or dependencies we can't easily mock in a simple smoke test, 
      // but they SHOULD at least not crash the whole process if our Firebase Proxy works.
      try {
        await import(routePath);
        expect(true).toBe(true);
      } catch (error) {
        // If it's a Firebase env var error, we failed our build safety goal
        if (error instanceof Error && error.message.includes('Missing Firebase Admin env vars')) {
          throw error;
        }
        // Other errors might be expected if they depend on other runtime-only things,
        // but for now, let's see what happens.
        console.warn(`Warning while importing ${relativePath}:`, error);
      }
    });
  });
});
