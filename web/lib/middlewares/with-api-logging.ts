import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/infrastructure/registry';
import { handleApiError } from '../api-utils';

type ApiHandler = (req: NextRequest, ...args: any[]) => Promise<Response | NextResponse>;

export function withApiLogging(routeName: string, handler: ApiHandler): ApiHandler {
  return async (req: NextRequest, ...args: any[]) => {
    logger.info(`[API] ${req.method} ${routeName} started`, { url: req.url });
    const startTime = Date.now();

    try {
      const response = await handler(req, ...args);
      const duration = Date.now() - startTime;
      logger.info(`[API] ${req.method} ${routeName} completed`, { status: response.status, durationMs: duration });
      return response;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`[API] ${req.method} ${routeName} failed`, { durationMs: duration, error: error?.message });
      return handleApiError(error, `${req.method} ${routeName}`);
    }
  };
}
