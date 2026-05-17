import { describe, it, expect } from 'vitest'
import { calculateNextProgress, initializeProgress } from '../sm2'

describe('sm2 status transitions', () => {
  it('Again on a fresh card sets LEARNING and 1-day interval', () => {
    const initial = initializeProgress('u1', 'c1')
    const next = calculateNextProgress(initial, 0)
    expect(next.status).toBe('LEARNING')
    expect(next.interval).toBe(1)
    expect(next.repetitions).toBe(0)
  })

  it('Good on a fresh card graduates immediately to REVIEW', () => {
    const initial = initializeProgress('u1', 'c1')
    const next = calculateNextProgress(initial, 2)
    expect(next.status).toBe('REVIEW')
    expect(next.interval).toBe(1)
  })

  it('Good after first review uses 6-day interval and stays REVIEW', () => {
    const after1 = calculateNextProgress(initializeProgress('u1', 'c1'), 2)
    const after2 = calculateNextProgress(after1, 2)
    expect(after2.status).toBe('REVIEW')
    expect(after2.interval).toBe(6)
  })

  it('Again on a mature card resets to LEARNING with 1-day interval', () => {
    let p = initializeProgress('u1', 'c1')
    p = calculateNextProgress(p, 2) // 1d, REVIEW
    p = calculateNextProgress(p, 2) // 6d, REVIEW
    p = calculateNextProgress(p, 0) // lapse
    expect(p.status).toBe('LEARNING')
    expect(p.interval).toBe(1)
    expect(p.repetitions).toBe(0)
  })
})
