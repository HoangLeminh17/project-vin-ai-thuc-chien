import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withApiLogging } from '@/lib/middlewares/with-api-logging';
import { NextRequest, NextResponse } from 'next/server';

const { mockLogger, mockMonitoring } = vi.hoisted(() => ({
  mockLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  },
  mockMonitoring: {
    captureException: vi.fn(),
    trackEvent: vi.fn()
  }
}));

vi.mock('@/infrastructure/registry', () => ({
  logger: mockLogger,
  monitoring: mockMonitoring
}));

describe('withApiLogging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should log successfully and return response on successful handler execution', async () => {
    const mockResponse = new NextResponse('Success', { status: 200 });
    const mockHandler = vi.fn().mockResolvedValue(mockResponse);
    const apiHandler = withApiLogging('TestRoute', mockHandler);
    
    // Create a mock NextRequest
    const mockRequest = { method: 'GET', url: 'http://localhost/api/test' } as NextRequest;

    const response = await apiHandler(mockRequest);

    expect(response).toBe(mockResponse);
    expect(mockHandler).toHaveBeenCalledWith(mockRequest);
    
    expect(mockLogger.info).toHaveBeenCalledWith(
      '[API] GET TestRoute started',
      { url: 'http://localhost/api/test' }
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      '[API] GET TestRoute completed',
      expect.objectContaining({ status: 200, durationMs: expect.any(Number) })
    );
    expect(mockLogger.error).not.toHaveBeenCalled();
    expect(mockMonitoring.captureException).not.toHaveBeenCalled();
  });

  it('should catch error, log error, capture exception and return 500 on handler failure', async () => {
    const error = new Error('Database Error');
    const mockHandler = vi.fn().mockRejectedValue(error);
    const apiHandler = withApiLogging('TestRoute', mockHandler);
    
    const mockRequest = { method: 'POST', url: 'http://localhost/api/test' } as NextRequest;

    const response = await apiHandler(mockRequest);

    // Should return a Next Response with status 500 instead of throwing
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(500);

    // Verify error logging and monitoring
    expect(mockLogger.info).toHaveBeenCalledWith(
      '[API] POST TestRoute started',
      { url: 'http://localhost/api/test' }
    );
    expect(mockLogger.error).toHaveBeenCalledWith(
      '[API] Error in POST TestRoute',
      expect.objectContaining({ error: 'Database Error', stack: expect.any(String) })
    );
    expect(mockMonitoring.captureException).toHaveBeenCalledWith(
      error,
      { route: 'POST TestRoute' }
    );
  });
});
