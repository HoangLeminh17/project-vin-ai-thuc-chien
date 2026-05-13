import { prometheusRegistry } from '@/infrastructure/adapters/prometheus.adapter'

type ApiHandler = (req: Request, ...args: any[]) => Promise<Response>

export function withApiMetrics(routeName: string, handler: ApiHandler): ApiHandler {
  return async (req: Request, ...args: any[]) => {
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
