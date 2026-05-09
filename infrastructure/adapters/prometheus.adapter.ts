import { IMonitoringPort } from '@/core/ports/monitoring.port'
import { Registry, Counter, Histogram, collectDefaultMetrics } from 'prom-client'

export class PrometheusAdapter implements IMonitoringPort {
  private readonly registry: Registry
  private readonly exceptionCounter: Counter
  private readonly eventCounter: Counter
  private readonly metricHistogram: Histogram

  constructor() {
    this.registry = new Registry()
    
    // Collect default system metrics (CPU, Memory, etc.)
    collectDefaultMetrics({ register: this.registry, prefix: 'synapsy_' })

    // Custom metrics with labels
    this.exceptionCounter = new Counter({
      name: 'synapsy_exceptions_total',
      help: 'Total number of exceptions captured',
      labelNames: ['type'],
      registers: [this.registry],
    })

    this.eventCounter = new Counter({
      name: 'synapsy_events_total',
      help: 'Total number of events tracked',
      labelNames: ['event_name', 'provider', 'status'],
      registers: [this.registry],
    })

    this.metricHistogram = new Histogram({
      name: 'synapsy_metrics_value',
      help: 'Distribution of various metrics',
      labelNames: ['metric_name', 'provider'],
      buckets: [100, 500, 1000, 2000, 5000, 10000, 30000, 60000], 
      registers: [this.registry],
    })
  }

  captureException(error: Error, context?: Record<string, any>): void {
    this.exceptionCounter.inc({ type: context?.type || 'Unknown' })
  }

  trackEvent(eventName: string, properties?: Record<string, any>): void {
    this.eventCounter.inc({ 
      event_name: eventName,
      provider: properties?.provider || 'none',
      status: properties?.status || 'success'
    })
  }

  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    this.metricHistogram.observe({ 
      metric_name: name,
      provider: tags?.provider || 'none'
    }, value)
  }

  /**
   * Returns the metrics in Prometheus exposition format
   */
  async getMetrics(): Promise<string> {
    return await this.registry.metrics()
  }

  get contentType(): string {
    return this.registry.contentType
  }
}

// Export a singleton instance if needed, but DI is preferred
export const prometheusRegistry = new PrometheusAdapter()
