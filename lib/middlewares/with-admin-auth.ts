import { NextRequest, NextResponse } from 'next/server';
import { verifySessionUseCase } from '@/infrastructure/di';

type ApiHandler = (req: NextRequest, ...args: any[]) => Promise<Response | NextResponse>;

export function withAdminAuth(handler: ApiHandler): ApiHandler {
  return async (req: NextRequest, ...args: any[]) => {
    const sessionCookie = req.cookies.get('session')?.value;
    
    try {
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
      console.error('[AdminAuth] Error verifying session:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Internal Server Error during authentication' 
      }, { status: 500 });
    }
  };
}
