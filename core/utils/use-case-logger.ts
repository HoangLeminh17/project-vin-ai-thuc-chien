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
            return result;
          } catch (error: any) {
            const duration = Date.now() - startTime;
            logger.error(`[${useCaseName}] Execution failed`, { durationMs: duration, error: error.message });
            monitoring.captureException(error, { useCase: useCaseName });
            throw error;
          }
        };
      }
      return original;
    }
  });
}
