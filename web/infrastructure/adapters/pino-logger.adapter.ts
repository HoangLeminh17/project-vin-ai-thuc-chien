import pino from 'pino';
import { ILoggerPort } from '@/core/ports/logger.port';
import { logStore } from '../log-store';
import { createRequire } from 'node:module';


export class PinoLoggerAdapter implements ILoggerPort {
  private logger;

  constructor() {
    const level = process.env.LOG_LEVEL || 'info'

    // Optional: ship logs directly to Loki using pino-loki transport.
    // Set LOKI_URL (recommended) or LOKI_HOST in Railway variables.
    const lokiUrl = process.env.LOKI_URL || process.env.LOKI_HOST

    if (lokiUrl) {
      // Ensure pino-loki exists at runtime; otherwise fall back to stdout.
      // Note: using `require.resolve()` here can be rewritten by Next/webpack
      // into a numeric module id, which breaks `pino.transport({ target })`.
      let hasPinoLoki = false
      try {
        const req = createRequire(__filename)
        req('pino-loki')
        hasPinoLoki = true
      } catch (e) {
        // If pino-loki isn't present in the runtime image, fall back to stdout.
        // This avoids crashing the whole app due to logging.
        console.warn('[Logger] pino-loki not available; falling back to stdout', e)
      }

      if (!hasPinoLoki) {
        this.logger = pino({ level })
        return
      }

      this.logger = pino(
        {
          level,
        },
        pino.transport({
          target: 'pino-loki',
          options: {
            host: lokiUrl,
            labels: {
              service: 'web',
              env: process.env.NODE_ENV || 'production',
            },
            batching: true,
            interval: 5,
          },
        })
      )
    } else {
      this.logger = pino({ level })
    }
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
