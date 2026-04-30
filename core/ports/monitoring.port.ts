export interface IMonitoringPort {
  captureException(error: Error, context?: Record<string, any>): void;
  trackEvent(eventName: string, properties?: Record<string, any>): void;
  recordMetric(name: string, value: number, tags?: Record<string, string>): void;
}
