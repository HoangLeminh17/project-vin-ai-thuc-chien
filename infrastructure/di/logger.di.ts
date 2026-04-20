import { PinoLoggerAdapter } from '../adapters/pino-logger.adapter';
import { ConsoleMonitoringAdapter } from '../adapters/console-monitoring.adapter';

export const logger = new PinoLoggerAdapter();
export const monitoring = new ConsoleMonitoringAdapter(logger);
