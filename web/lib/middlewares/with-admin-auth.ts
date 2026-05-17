import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/infrastructure/di/logger.di'
import { scraperToken } from '@/lib/config/server'
import type { ApiRouteHandler } from './api-handler';

export function withAdminAuth<TArgs extends unknown[]>(handler: ApiRouteHandler<TArgs>): ApiRouteHandler<TArgs> {
  return async (req: NextRequest, ...args: TArgs) => {
    const sessionCookie = req.cookies.get('session')?.value;
    const authHeader = req.headers.get('authorization');

    // Allow Prometheus scraping via Bearer token
    if (scraperToken && authHeader === `Bearer ${scraperToken}`) {
      return handler(req, ...args);
    }
    
    try {
      // Lazy-load DI so metrics scraping with SCRAPER_TOKEN doesn't
      // require Firebase/admin initialization.
      const { verifySessionUseCase } = await import('@/infrastructure/di');
      const user = await verifySessionUseCase.execute(sessionCookie);
      
      if (!user) {
        return NextResponse.json({ 
          success: false, 
          error: 'Unauthorized: Session missing or expired' 
        }, { status: 401 });
      }

      if (user.role !== 'admin') {
        return NextResponse.json({ 
          success: false, 
          error: 'Forbidden: Admin privileges required' 
        }, { status: 403 });
      }

      return handler(req, ...args);
    } catch (error) {
      logger.error('[AdminAuth] Error verifying session', { err: error })
      return NextResponse.json({ 
        success: false, 
        error: 'Internal Server Error during authentication' 
      }, { status: 500 });
    }
  };
}
