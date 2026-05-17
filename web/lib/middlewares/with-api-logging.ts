import { logger } from '@/infrastructure/registry';
import { handleApiError } from '../api-utils';
import type { ApiRouteHandler } from './api-handler';

export function withApiLogging<TArgs extends unknown[], TReq extends Request>(
  routeName: string,
  handler: ApiRouteHandler<TArgs, TReq>,
): ApiRouteHandler<TArgs, TReq> {
  return async (req: TReq, ...args: TArgs) => {
    logger.info(`[API] ${req.method} ${routeName} started`, { url: req.url });
    const startTime = Date.now();

    try {
      const response = await handler(req, ...args);
      const duration = Date.now() - startTime;
      logger.info(`[API] ${req.method} ${routeName} completed`, { status: response.status, durationMs: duration });
      return response;
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      logger.error(`[API] ${req.method} ${routeName} failed`, {
        durationMs: duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return handleApiError(error, `${req.method} ${routeName}`);
    }
  };
}
