// Centralize console usage so production code doesn't scatter console.* calls.
// In production builds these become no-ops.

import { isClientProduction } from '@/lib/config/client'

const enabled = !isClientProduction

export function devLog(...args: any[]) {
  if (enabled) console.log(...args)
}

export function devWarn(...args: any[]) {
  if (enabled) console.warn(...args)
}

export function devError(...args: any[]) {
  if (enabled) console.error(...args)
}
