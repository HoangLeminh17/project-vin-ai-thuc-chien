import { prometheusRegistry } from '@/infrastructure/adapters/prometheus.adapter'

// Generic wrapper so it composes with NextRequest-based handlers/middlewares.
type ApiHandler<TReq extends Request = Request> = (req: TReq, ...args: any[]) => Promise<any>

export function withApiMetrics<TReq extends Request = Request>(routeName: string, handler: ApiHandler<TReq>): ApiHandler<TReq> {
  return async (req: TReq, ...args: any[]) => {
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
