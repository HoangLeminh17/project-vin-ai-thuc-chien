import { NextResponse } from 'next/server';
import { logStore } from '@/infrastructure/log-store';
import { withApiLogging } from '@/lib/middlewares/with-api-logging';
import { withAdminAuth } from '@/lib/middlewares/with-admin-auth';

export const GET = withApiLogging('/api/admin/logs', withAdminAuth(async () => {
  const logs = logStore.getLogs(100);
  const metrics = logStore.getMetricsSummary();

  return NextResponse.json({
    metrics,
    logs
  });
}));

