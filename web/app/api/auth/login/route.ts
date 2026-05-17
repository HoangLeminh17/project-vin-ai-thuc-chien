import { NextResponse } from 'next/server';
import { withApiLogging } from '@/lib/middlewares/with-api-logging';
import { withApiMetrics } from '@/lib/middlewares/with-api-metrics';
import { handleApiError } from '@/lib/api-utils';
import { isProduction } from '@/lib/config/server';

async function loginHandler(req: Request) {
  try {
    const { createSessionUseCase } = await import('@/infrastructure/registry');
    const { idToken } = await req.json();
    if (!idToken) {
      return NextResponse.json({ error: 'ID Token is required' }, { status: 400 });
    }

    const sessionCookie = await createSessionUseCase.execute(idToken);
    
    // Send notification to Discord
    const { alertAdapter } = await import('@/infrastructure/di');
    alertAdapter.sendSuccessAlert('A user has logged into the application').catch(() => {});

    // Set cookie
    const response = NextResponse.json({ status: 'success' });
    response.cookies.set('session', sessionCookie, {
      maxAge: 60 * 60 * 24 * 5, // 5 days
      httpOnly: true,
      secure: isProduction,
      path: '/',
    });

    return response;
  } catch (error: any) {
    // Avoid leaking auth/provider error details to clients.
    // Still log/monitor via the shared handler.
    const res = handleApiError(error, 'POST /api/auth/login');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: res.headers });
  }
}

export const POST = withApiLogging('LoginAPI', withApiMetrics('/api/auth/login', loginHandler));
