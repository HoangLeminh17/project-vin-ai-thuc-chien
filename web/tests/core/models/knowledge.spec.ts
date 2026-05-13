import { describe, expect, it } from 'vitest'
import {
  DEFAULT_KC_ID,
  MEDICAL_MODULES,
  getKnowledgeComponent,
  normalizeKnowledgeRef,
} from '@/core/models/knowledge'

describe('medical knowledge map', () => {
  it('keeps the spider chart module list within the configured axis limit', () => {
    expect(MEDICAL_MODULES.length).toBeLessThanOrEqual(8)
  })

  it('normalizes a valid KC id to canonical display metadata', () => {
    expect(normalizeKnowledgeRef({
      kc_id: 'PHYSIOLOGY.HOMEOSTASIS',
      confidence: 1.4,
    })).toMatchObject({
      kc_id: 'physiology.homeostasis',
      kc_name: 'Homeostasis and feedback',
      module_id: 'physiology',
      module_name: 'Physiology',
      map_version: 'medical-v1',
      confidence: 1,
    })
  })

  it('falls back deterministically to a module general KC when LLM output is invalid', () => {
    expect(normalizeKnowledgeRef({
      kc_id: 'free text from model',
      module_id: 'pharmacology',
    })).toMatchObject({
      kc_id: 'pharmacology.general',
      kc_name: 'General pharmacology',
      module_id: 'pharmacology',
    })
  })

  it('uses the global fallback when both KC and module are unknown', () => {
    const fallback = normalizeKnowledgeRef({ kc_id: 'unknown', module_id: 'unknown' })
    expect(fallback.kc_id).toBe(DEFAULT_KC_ID)
    expect(getKnowledgeComponent(fallback.kc_id)).toBeDefined()
  })
})
