import { NextRequest, NextResponse } from 'next/server';
import { logger, monitoring } from '@/infrastructure/di';

type ApiHandler = (req: NextRequest, ...args: any[]) => Promise<NextResponse>;

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
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[API] ${req.method} ${routeName} failed`, { error: message, durationMs: duration });
      monitoring.captureException(error, { route: routeName, method: req.method, url: req.url });
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  };
}
