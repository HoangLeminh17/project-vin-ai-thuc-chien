import { NextResponse } from 'next/server';
import { withApiLogging } from '@/lib/middlewares/with-api-logging';
import { withApiMetrics } from '@/lib/middlewares/with-api-metrics';

async function logoutHandler() {
  const response = NextResponse.json({ status: 'success' });
  response.cookies.delete('session');
  return response;
}

export const POST = withApiLogging('LogoutAPI', withApiMetrics('/api/auth/logout', logoutHandler));
