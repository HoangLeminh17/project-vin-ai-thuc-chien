import { PinoLoggerAdapter } from '../adapters/pino-logger.adapter';
import { ConsoleMonitoringAdapter } from '../adapters/console-monitoring.adapter';
import { WebhookAlertAdapter } from '../adapters/webhook-alert.adapter';
import { CompositeMonitoringAdapter } from '../adapters/composite-monitoring.adapter';
import { prometheusRegistry } from '../adapters/prometheus.adapter';
import { IMonitoringPort } from '@/core/ports/monitoring.port';

export const logger = new PinoLoggerAdapter();
export const alertAdapter = new WebhookAlertAdapter(process.env.DISCORD_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL || '');

let monitoringInstance: IMonitoringPort;
try {
  const consoleMonitoring = new ConsoleMonitoringAdapter(logger, alertAdapter);
  monitoringInstance = new CompositeMonitoringAdapter([consoleMonitoring, prometheusRegistry]);
} catch (e) {
  logger.error('[DI Modular] Failed to initialize Monitoring', { err: e })
  monitoringInstance = new ConsoleMonitoringAdapter(logger, alertAdapter);
}

export const monitoring = monitoringInstance;
