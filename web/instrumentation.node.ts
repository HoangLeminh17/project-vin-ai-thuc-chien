import { NodeSDK } from '@opentelemetry/sdk-node'
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http'
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch'

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
    console.log('OpenTelemetry instrumentation enabled.')
  } catch (error) {
    console.warn('Failed to initialize OpenTelemetry:', error, '. Tracing is disabled.')
  }
} else {
  console.log('OpenTelemetry instrumentation is disabled (ENABLE_OTEL !== true).')
}
