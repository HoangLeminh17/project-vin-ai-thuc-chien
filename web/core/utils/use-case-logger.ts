import { ILoggerPort } from '../ports/logger.port';
import { IMonitoringPort } from '../ports/monitoring.port';

export function withUseCaseLogging<T extends { execute: (...args: any[]) => Promise<any> }>(
  useCase: T,
  useCaseName: string,
  logger: ILoggerPort,
  monitoring: IMonitoringPort
): T {
  return new Proxy(useCase, {
    get(target, property, receiver) {
      const original = Reflect.get(target, property, receiver);
      if (property === 'execute' && typeof original === 'function') {
        return async function (...args: any[]) {
          logger.info(`[${useCaseName}] Execution started`);
          const startTime = Date.now();
          try {
            const result = await original.apply(target, args);
            const duration = Date.now() - startTime;
            logger.info(`[${useCaseName}] Execution completed`, { durationMs: duration });
            monitoring.recordMetric('latency', duration, { useCase: useCaseName, status: 'success' });
            
            // Record token metrics if present in the result
            if (result && typeof result === 'object' && result.tokens) {
              const { promptTokens, completionTokens, totalTokens } = result.tokens;
              const provider = (target as any).aiService?.model || 'unknown';
              
              if (typeof promptTokens === 'number') {
                monitoring.recordMetric('prompt_tokens', promptTokens, { useCase: useCaseName, provider });
              }
              if (typeof completionTokens === 'number') {
                monitoring.recordMetric('completion_tokens', completionTokens, { useCase: useCaseName, provider });
              }
              if (typeof totalTokens === 'number') {
                monitoring.recordMetric('total_tokens', totalTokens, { useCase: useCaseName, provider });
              }
            }
            
            return result;
          } catch (error: any) {
            const duration = Date.now() - startTime;
            logger.error(`[${useCaseName}] Execution failed`, { durationMs: duration, error: error.message });
            monitoring.recordMetric('latency', duration, { useCase: useCaseName, status: 'error' });
            monitoring.captureException(error, { useCase: useCaseName });
            
            // Log error event
            monitoring.trackEvent('ai_error', { 
              useCase: useCaseName, 
              status: 'error',
              error_type: error.constructor.name 
            });
            
            throw error;
          }
        };
      }
      return original;
    }
  });
}
