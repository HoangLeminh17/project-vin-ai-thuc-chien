import { IMonitoringPort } from '@/core/ports/monitoring.port';
import { ILoggerPort } from '@/core/ports/logger.port';
import { IAlertPort } from '@/core/ports/alert.port';

export class ConsoleMonitoringAdapter implements IMonitoringPort {
  constructor(
    private readonly logger: ILoggerPort,
    private readonly alertPort?: IAlertPort
  ) {}

  captureException(error: Error, context?: Record<string, any>): void {
    // In the future, this would send to Sentry, Datadog, etc.
    this.logger.error(error.message, { ...context, stack: error.stack, type: 'Exception' });
    
    // Auto alert on capture
    if (this.alertPort) {
      this.alertPort.sendErrorAlert(error, context).catch(e => {
        this.logger.error('Failed to send error alert', { error: e });
      });
    }
  }

  trackEvent(eventName: string, properties?: Record<string, any>): void {
    // In the future, this would send to an analytics service like Mixpanel, PostHog, etc.
    this.logger.info(`[Event] ${eventName}`, properties);
  }

  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    this.logger.info(`[Metric] ${name}=${value}`, tags);

    // AI Pipeline alerting threshold
    if (name === 'latency' && value > 5000) {
      if (this.alertPort) {
        this.alertPort.sendAlert(`High Latency Detected: ${name} is ${value}ms`, { value, ...tags }).catch(e => {
          this.logger.error('Failed to send high latency alert', { error: e });
        });
      }
    }
  }
}
