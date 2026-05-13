import { NextRequest, NextResponse } from 'next/server';

type ApiHandler = (req: NextRequest, ...args: any[]) => Promise<Response | NextResponse>;

/**
 * Middleware to ensure the user is authenticated.
 * Injects user info into the request context if possible, 
 * but for standard NextRequest we just verify and proceed.
 */
export function withAuth(handler: ApiHandler): ApiHandler {
  return async (req: NextRequest, ...args: any[]) => {
    const sessionCookie = req.cookies.get('session')?.value;
    
    try {
      // Lazy-load DI to avoid pulling in Firebase/admin initialization
      // when the request will be rejected early.
      const { verifySessionUseCase } = await import('@/infrastructure/di');
      const user = await verifySessionUseCase.execute(sessionCookie);
      
      if (!user) {
        return NextResponse.json({ 
          success: false, 
          error: 'Unauthorized: Session missing or expired' 
        }, { status: 401 });
      }

      // Add user ID to request headers so it can be used by the handler if needed
      // Note: This is an internal header, not for client use.
      const modifiedReq = req; // We can't easily mutate headers in NextRequest here, but handlers can verify session again or we can use args
      
      return handler(modifiedReq, ...args);
    } catch (error) {
      console.error('[AuthMiddleware] Error verifying session:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Internal Server Error during authentication' 
      }, { status: 500 });
    }
  };
}
