import { prometheusRegistry } from '@/infrastructure/adapters/prometheus.adapter'
import type { ApiRouteHandler } from './api-handler'

export function withApiMetrics<TArgs extends unknown[], TReq extends Request>(
  routeName: string,
  handler: ApiRouteHandler<TArgs, TReq>,
): ApiRouteHandler<TArgs, TReq> {
  return async (req: TReq, ...args: TArgs) => {
    const start = Date.now()
    try {
      const res = await handler(req, ...args)
      prometheusRegistry.trackApiRequest(routeName, req.method, res.status, Date.now() - start)
      return res
    } catch (err) {
      // Let higher-level middleware handle formatting; we only record.
      prometheusRegistry.trackApiRequest(routeName, req.method, 500, Date.now() - start)
      throw err
    }
  }
}
