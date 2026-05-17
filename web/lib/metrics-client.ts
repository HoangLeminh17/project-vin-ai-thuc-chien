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
import { devError } from '@/lib/devlog'
