import pino from 'pino';
import { ILoggerPort } from '@/core/ports/logger.port';
import { logStore } from '../log-store';

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
    logStore.addLog('debug', message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    if (context) {
      this.logger.info(context, message);
    } else {
      this.logger.info(message);
    }
    logStore.addLog('info', message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    if (context) {
      this.logger.warn(context, message);
    } else {
      this.logger.warn(message);
    }
    logStore.addLog('warn', message, context);
  }

  error(message: string, context?: Record<string, any>): void {
    if (context) {
      this.logger.error(context, message);
    } else {
      this.logger.error(message);
    }
    logStore.addLog('error', message, context);
  }
}
