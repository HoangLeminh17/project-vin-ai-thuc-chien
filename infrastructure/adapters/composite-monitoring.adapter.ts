import { IMonitoringPort } from '@/core/ports/monitoring.port'

export class CompositeMonitoringAdapter implements IMonitoringPort {
  private readonly adapters: IMonitoringPort[]

  constructor(adapters: IMonitoringPort[]) {
    this.adapters = adapters
  }

  captureException(error: Error, context?: Record<string, any>): void {
    this.adapters.forEach(a => a.captureException(error, context))
  }

  trackEvent(eventName: string, properties?: Record<string, any>): void {
    this.adapters.forEach(a => a.trackEvent(eventName, properties))
  }

  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    this.adapters.forEach(a => a.recordMetric(name, value, tags))
  }
}
