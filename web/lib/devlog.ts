// Centralize console usage so production code doesn't scatter console.* calls.
// In production builds these become no-ops.

const enabled = process.env.NODE_ENV !== 'production'

export function devLog(...args: any[]) {
  if (enabled) console.log(...args)
}

export function devWarn(...args: any[]) {
  if (enabled) console.warn(...args)
}

export function devError(...args: any[]) {
  if (enabled) console.error(...args)
}
