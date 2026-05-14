import { MEDICAL_MODULES, getKnowledgeComponent, getKnowledgeModule } from '@/core/models/knowledge'
import type { KCState } from '@/core/ports/ukt.port'

export type ModuleMasteryPoint = {
  module_id: string
  module_name: string
  score: number | null
  percent: number | null
  evidenceCount: number
  kcIds: string[]
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function scoreFromState(state: KCState): number | null {
  if (Number.isFinite(state.p_correct)) return clamp01(state.p_correct)
  if (Number.isFinite(state.mu)) return clamp01(state.mu)
  return null
}

function moduleIdForKc(kcId: string): string | null {
  const registered = getKnowledgeComponent(kcId)
  if (registered) return registered.module_id

  const prefix = kcId.split('.')[0]
  return getKnowledgeModule(prefix) ? prefix : null
}

export function aggregateModuleMastery(knowledgeState: Record<string, KCState>): ModuleMasteryPoint[] {
  const buckets = new Map(MEDICAL_MODULES.map(module => [module.id, {
    total: 0,
    count: 0,
    kcIds: [] as string[],
  }]))

  Object.entries(knowledgeState).forEach(([kcId, state]) => {
    const moduleId = moduleIdForKc(kcId)
    if (!moduleId) return

    const score = scoreFromState(state)
    if (score === null) return

    const bucket = buckets.get(moduleId)
    if (!bucket) return

    bucket.total += score
    bucket.count += 1
    bucket.kcIds.push(kcId)
  })

  return MEDICAL_MODULES.map(module => {
    const bucket = buckets.get(module.id)!
    const score = bucket.count > 0 ? bucket.total / bucket.count : null

    return {
      module_id: module.id,
      module_name: module.name,
      score,
      percent: score === null ? null : Math.round(score * 100),
      evidenceCount: bucket.count,
      kcIds: bucket.kcIds,
    }
  })
}
