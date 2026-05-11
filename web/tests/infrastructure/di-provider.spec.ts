import { describe, it, expect, vi, beforeEach } from 'vitest';

// We mock the adapters to avoid real network calls and to check their types
vi.mock('@/infrastructure/adapters/gemini.adapter', () => ({
  GeminiAdapter: class { constructor() {} }
}));
vi.mock('@/infrastructure/adapters/openai.adapter', () => ({
  OpenAiAdapter: class { constructor() {} }
}));
vi.mock('@/infrastructure/adapters/huggingface.adapter', () => ({
  HuggingFaceAdapter: class { constructor() {} }
}));
vi.mock('@/infrastructure/adapters/fallback-ai.adapter', () => ({
  ChainAiAdapter: class { 
    constructor(public adapters: any[]) {} 
  }
}));

// Mock Firebase Admin to prevent initialization errors
vi.mock('@/lib/firebase-admin', () => ({
  getDb: vi.fn(),
  getBucket: vi.fn(),
  getFirebaseAdminAuth: vi.fn(),
}));

describe('DI AI Provider Selection', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.GEMINI_API_KEY = 'g-key';
    process.env.OPENAI_API_KEY = 'o-key';
    process.env.HUGGINGFACE_API_KEY = 'h-key';
  });

  it('should prioritize HuggingFace when AI_PROVIDER is set to huggingface', async () => {
    process.env.AI_PROVIDER = 'huggingface';
    const { aiAdapter } = await import('@/infrastructure/di');
    
    // The first adapter in the chain should be HuggingFace
    const firstAdapter = (aiAdapter as any).adapters[0];
    expect(firstAdapter.constructor.name).toBe('HuggingFaceAdapter');
  });

  it('should prioritize OpenAI when AI_PROVIDER is set to openai', async () => {
    process.env.AI_PROVIDER = 'openai';
    const { aiAdapter } = await import('@/infrastructure/di');
    
    const firstAdapter = (aiAdapter as any).adapters[0];
    expect(firstAdapter.constructor.name).toBe('OpenAiAdapter');
  });

  it('should default to Gemini (or first available) when AI_PROVIDER is not set', async () => {
    delete process.env.AI_PROVIDER;
    const { aiAdapter } = await import('@/infrastructure/di');
    
    const firstAdapter = (aiAdapter as any).adapters[0];
    expect(firstAdapter.constructor.name).toBe('GeminiAdapter');
  });
});
