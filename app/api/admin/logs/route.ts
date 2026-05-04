import { NextResponse } from 'next/server';
import { logStore } from '@/infrastructure/log-store';
import { withApiLogging } from '@/lib/middlewares/with-api-logging';

export const GET = withApiLogging('/api/admin/logs', async () => {
  // In a real app, verify admin role here
  const logs = logStore.getLogs(100);
  const metrics = logStore.getMetricsSummary();

  return NextResponse.json({
    metrics,
    logs
  });
});
