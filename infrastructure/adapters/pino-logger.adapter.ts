import pino from 'pino';
import { ILoggerPort } from '@/core/ports/logger.port';

const isDev = process.env.NODE_ENV === 'development';

export class PinoLoggerAdapter implements ILoggerPort {
  private logger;

  constructor() {
    this.logger = pino({
      level: process.env.LOG_LEVEL || 'info',
    });
  }

  debug(message: string, context?: Record<string, any>): void {
    if (context) {
      this.logger.debug(context, message);
    } else {
      this.logger.debug(message);
    }
  }

  info(message: string, context?: Record<string, any>): void {
    if (context) {
      this.logger.info(context, message);
    } else {
      this.logger.info(message);
    }
  }

  warn(message: string, context?: Record<string, any>): void {
    if (context) {
      this.logger.warn(context, message);
    } else {
      this.logger.warn(message);
    }
  }

  error(message: string, context?: Record<string, any>): void {
    if (context) {
      this.logger.error(context, message);
    } else {
      this.logger.error(message);
    }
  }
}
