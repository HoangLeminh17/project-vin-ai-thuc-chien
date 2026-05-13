import { NextRequest, NextResponse } from 'next/server';
import { logStore } from '@/infrastructure/log-store';
import { withApiLogging } from '@/lib/middlewares/with-api-logging';
import { withAdminAuth } from '@/lib/middlewares/with-admin-auth';
import { withApiMetrics } from '@/lib/middlewares/with-api-metrics';

export const GET = withApiLogging('/api/admin/logs', withApiMetrics('/api/admin/logs', withAdminAuth(async (_req: NextRequest) => {
  const logs = logStore.getLogs(100);
  const metrics = logStore.getMetricsSummary();

  return NextResponse.json({
    metrics,
    logs
  });
})));

