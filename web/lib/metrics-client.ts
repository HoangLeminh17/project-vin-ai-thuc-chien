import { devError } from '@/lib/devlog'

/**
 * Client-side utility to track custom events and metrics
 */
export async function trackEvent(eventName: string, properties?: Record<string, any>) {
  try {
    await fetch('/api/metrics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventName, properties }),
    });
  } catch (e) {
    devError('[metrics] Failed to track event:', eventName, e)
  }
}

export async function trackMetric(metricName: string, value: number, tags?: Record<string, string>) {
  try {
    await fetch('/api/metrics/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metricName, value, tags }),
    })
  } catch (e) {
    devError('[metrics] Failed to track metric:', metricName, e)
  }
}
