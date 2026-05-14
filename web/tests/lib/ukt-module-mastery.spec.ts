import { describe, expect, it } from 'vitest'
import { aggregateModuleMastery } from '@/lib/ukt-module-mastery'

describe('aggregateModuleMastery', () => {
  it('returns all eight medical modules in registry order', () => {
    const points = aggregateModuleMastery({})

    expect(points.map(point => point.module_id)).toEqual([
      'anatomy',
      'physiology',
      'pharmacology',
      'microbiology',
      'pathology',
      'clinical',
      'biochemistry',
      'immunology',
    ])
    expect(points.every(point => (
      point.score === null
      && point.uncertainty === null
      && point.certaintyPercent === null
      && point.evidenceCount === 0
    ))).toBe(true)
  })

  it('aggregates p_correct and sigma by module_id from registered KC ids', () => {
    const points = aggregateModuleMastery({
      'physiology.general': { mu: 0.2, sigma: 0.1, p_correct: 0.25, aleatory_flag: false },
      'physiology.renal': { mu: 0.4, sigma: 0.3, p_correct: 0.75, aleatory_flag: false },
      'pathology.general': { mu: 0.1, sigma: 0.1, p_correct: 0.1, aleatory_flag: false },
    })

    const physiology = points.find(point => point.module_id === 'physiology')
    const pathology = points.find(point => point.module_id === 'pathology')

    expect(physiology?.score).toBeCloseTo(0.5)
    expect(physiology?.percent).toBe(50)
    expect(physiology?.uncertainty).toBeCloseTo(0.2)
    expect(physiology?.certaintyPercent).toBe(80)
    expect(physiology?.evidenceCount).toBe(2)
    expect(pathology?.percent).toBe(10)
  })

  it('falls back to mu and ignores unknown KC namespaces', () => {
    const points = aggregateModuleMastery({
      'clinical.custom': { mu: 0.7, sigma: 0.1, p_correct: Number.NaN, aleatory_flag: false },
      'unknown.topic': { mu: 0.9, sigma: 0.1, p_correct: 0.9, aleatory_flag: false },
    })

    const clinical = points.find(point => point.module_id === 'clinical')
    const anatomy = points.find(point => point.module_id === 'anatomy')

    expect(clinical?.percent).toBe(70)
    expect(clinical?.kcIds).toEqual(['clinical.custom'])
    expect(anatomy?.score).toBeNull()
  })
})
