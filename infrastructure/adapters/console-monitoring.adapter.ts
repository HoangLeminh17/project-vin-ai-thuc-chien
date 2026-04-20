import { IMonitoringPort } from '@/core/ports/monitoring.port';
import { ILoggerPort } from '@/core/ports/logger.port';

export class ConsoleMonitoringAdapter implements IMonitoringPort {
  constructor(private readonly logger: ILoggerPort) {}

  captureException(error: Error, context?: Record<string, any>): void {
    // In the future, this would send to Sentry, Datadog, etc.
    this.logger.error(error.message, { ...context, stack: error.stack, type: 'Exception' });
  }

  trackEvent(eventName: string, properties?: Record<string, any>): void {
    // In the future, this would send to an analytics service like Mixpanel, PostHog, etc.
    this.logger.info(`[Event] ${eventName}`, properties);
  }
}
