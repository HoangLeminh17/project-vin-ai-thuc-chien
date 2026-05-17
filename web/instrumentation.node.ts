import { NodeSDK } from '@opentelemetry/sdk-node'
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http'
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch'

// Ensure server-side console logs become structured logs.
import { logger } from '@/infrastructure/di/logger.di'
console.log = (...args: any[]) => logger.info('[console]', { args })
console.warn = (...args: any[]) => logger.warn('[console]', { args })
console.error = (...args: any[]) => logger.error('[console]', { args })
console.debug = (...args: any[]) => logger.debug('[console]', { args })

if (process.env.ENABLE_OTEL === 'true') {
  try {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||= 'http://otel-collector.railway.internal:4317'
    process.env.OTEL_EXPORTER_OTLP_PROTOCOL ||= 'grpc'

    const sdk = new NodeSDK({
      serviceName: 'web-app',
      instrumentations: [
        new HttpInstrumentation(),
        new FetchInstrumentation(),
      ],
    })

    sdk.start()
    logger.info('OpenTelemetry instrumentation enabled.')
  } catch (error) {
    logger.warn('Failed to initialize OpenTelemetry; tracing disabled', { error })
  }
} else {
  logger.info('OpenTelemetry instrumentation is disabled (ENABLE_OTEL !== true).')
}
