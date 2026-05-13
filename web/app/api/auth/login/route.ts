import { NextResponse } from 'next/server';
import { withApiLogging } from '@/lib/middlewares/with-api-logging';
import { withApiMetrics } from '@/lib/middlewares/with-api-metrics';

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
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

export const POST = withApiLogging('LoginAPI', withApiMetrics('/api/auth/login', loginHandler));
