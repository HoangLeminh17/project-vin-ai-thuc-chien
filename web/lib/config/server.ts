export const isProduction = process.env.NODE_ENV === 'production'
export const isBuildOrTest = process.env.NEXT_PHASE === 'phase-production-build' || process.env.NODE_ENV === 'test'
export const scraperToken = process.env.SCRAPER_TOKEN

export const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
}

export const mineruLegacyConfig = {
  baseUrl: process.env.PDF_MINERU_BASE_URL,
  apiKey: process.env.PDF_MINERU_API_KEY,
}

export function numberEnv(name: string, fallback: number): number {
  const value = process.env[name]
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
