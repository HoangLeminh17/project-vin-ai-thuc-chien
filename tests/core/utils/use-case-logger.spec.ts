import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withUseCaseLogging } from '@/core/utils/use-case-logger';
import { ILoggerPort } from '@/core/ports/logger.port';
import { IMonitoringPort } from '@/core/ports/monitoring.port';

describe('withUseCaseLogging', () => {
  let mockLogger: ILoggerPort;
  let mockMonitoring: IMonitoringPort;
  let useCase: { execute: (...args: any[]) => Promise<any> };

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    };

    mockMonitoring = {
      captureException: vi.fn(),
      trackEvent: vi.fn(),
      recordMetric: vi.fn()
    };
  });

  it('should log on successful execution', async () => {
    const executeMock = vi.fn().mockResolvedValue('success');
    useCase = { execute: executeMock };

    const loggedUseCase = withUseCaseLogging(useCase, 'TestUseCase', mockLogger, mockMonitoring);

    const result = await loggedUseCase.execute('arg1', 'arg2');

    expect(result).toBe('success');
    expect(executeMock).toHaveBeenCalledWith('arg1', 'arg2');
    
    expect(mockLogger.info).toHaveBeenCalledWith('[TestUseCase] Execution started');
    expect(mockLogger.info).toHaveBeenCalledWith(
      '[TestUseCase] Execution completed',
      expect.objectContaining({ durationMs: expect.any(Number) })
    );
    expect(mockLogger.error).not.toHaveBeenCalled();
    expect(mockMonitoring.captureException).not.toHaveBeenCalled();
  });

  it('should log and capture exception on failed execution', async () => {
    const error = new Error('Test Error');
    const executeMock = vi.fn().mockRejectedValue(error);
    useCase = { execute: executeMock };

    const loggedUseCase = withUseCaseLogging(useCase, 'TestUseCase', mockLogger, mockMonitoring);

    await expect(loggedUseCase.execute()).rejects.toThrow('Test Error');
    
    expect(mockLogger.info).toHaveBeenCalledWith('[TestUseCase] Execution started');
    expect(mockLogger.error).toHaveBeenCalledWith(
      '[TestUseCase] Execution failed',
      expect.objectContaining({ durationMs: expect.any(Number), error: 'Test Error' })
    );
    expect(mockMonitoring.captureException).toHaveBeenCalledWith(error, { useCase: 'TestUseCase' });
  });

  it('should not interfere with other properties of the usecase', () => {
    const customObj = {
      execute: vi.fn().mockResolvedValue('ok'),
      otherProp: 'test',
      otherMethod: vi.fn()
    };

    const loggedUseCase = withUseCaseLogging(customObj, 'TestUseCase', mockLogger, mockMonitoring);

    expect(loggedUseCase.otherProp).toBe('test');
    loggedUseCase.otherMethod();
    expect(customObj.otherMethod).toHaveBeenCalled();
  });
});
