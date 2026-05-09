import { PinoLoggerAdapter } from '../adapters/pino-logger.adapter';
import { ConsoleMonitoringAdapter } from '../adapters/console-monitoring.adapter';
import { WebhookAlertAdapter } from '../adapters/webhook-alert.adapter';

export const logger = new PinoLoggerAdapter();
export const alertAdapter = new WebhookAlertAdapter(process.env.DISCORD_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL || '');
export const monitoring = new ConsoleMonitoringAdapter(logger, alertAdapter);
