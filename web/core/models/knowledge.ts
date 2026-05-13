export type KnowledgeModule = {
  id: string
  name: string
  description: string
}

export type KnowledgeComponent = {
  kc_id: string
  kc_name: string
  module_id: string
  aliases?: string[]
}

export type KnowledgeComponentRef = {
  kc_id: string
  kc_name: string
  module_id: string
  module_name: string
  map_version: string
  confidence?: number
}

export const KNOWLEDGE_MAP_VERSION = 'medical-v1'

export const MEDICAL_MODULES: KnowledgeModule[] = [
  { id: 'anatomy', name: 'Anatomy', description: 'Gross anatomy, histology, embryology, and organ structure.' },
  { id: 'physiology', name: 'Physiology', description: 'Normal function, regulation, feedback loops, and organ system physiology.' },
  { id: 'pharmacology', name: 'Pharmacology', description: 'Drug mechanisms, pharmacokinetics, pharmacodynamics, indications, and adverse effects.' },
  { id: 'microbiology', name: 'Microbiology', description: 'Bacteria, viruses, fungi, parasites, antimicrobial resistance, and infectious agents.' },
  { id: 'pathology', name: 'Pathology', description: 'Cell injury, inflammation, neoplasia, hemodynamics, and disease mechanisms.' },
  { id: 'clinical', name: 'Clinical Medicine', description: 'Diagnosis, management, prevention, emergency care, and patient-facing reasoning.' },
  { id: 'biochemistry', name: 'Biochemistry', description: 'Metabolism, molecular biology, genetics, nutrition, and biochemical pathways.' },
  { id: 'immunology', name: 'Immunology', description: 'Innate and adaptive immunity, hypersensitivity, autoimmunity, and vaccines.' },
]

export const MEDICAL_KCS: KnowledgeComponent[] = [
  { kc_id: 'anatomy.general', kc_name: 'General anatomy', module_id: 'anatomy' },
  { kc_id: 'anatomy.organ_systems', kc_name: 'Organ system anatomy', module_id: 'anatomy' },
  { kc_id: 'anatomy.neuroanatomy', kc_name: 'Neuroanatomy', module_id: 'anatomy' },
  { kc_id: 'anatomy.histology', kc_name: 'Histology', module_id: 'anatomy' },

  { kc_id: 'physiology.general', kc_name: 'General physiology', module_id: 'physiology' },
  { kc_id: 'physiology.homeostasis', kc_name: 'Homeostasis and feedback', module_id: 'physiology' },
  { kc_id: 'physiology.cardiovascular', kc_name: 'Cardiovascular physiology', module_id: 'physiology' },
  { kc_id: 'physiology.respiratory', kc_name: 'Respiratory physiology', module_id: 'physiology' },
  { kc_id: 'physiology.renal', kc_name: 'Renal physiology', module_id: 'physiology' },
  { kc_id: 'physiology.endocrine', kc_name: 'Endocrine physiology', module_id: 'physiology' },
  { kc_id: 'physiology.neurophysiology', kc_name: 'Neurophysiology', module_id: 'physiology' },

  { kc_id: 'pharmacology.general', kc_name: 'General pharmacology', module_id: 'pharmacology' },
  { kc_id: 'pharmacology.pharmacokinetics', kc_name: 'Pharmacokinetics', module_id: 'pharmacology' },
  { kc_id: 'pharmacology.pharmacodynamics', kc_name: 'Pharmacodynamics', module_id: 'pharmacology' },
  { kc_id: 'pharmacology.antimicrobials', kc_name: 'Antimicrobial pharmacology', module_id: 'pharmacology' },
  { kc_id: 'pharmacology.autonomic_drugs', kc_name: 'Autonomic drugs', module_id: 'pharmacology' },
  { kc_id: 'pharmacology.cardiovascular_drugs', kc_name: 'Cardiovascular drugs', module_id: 'pharmacology' },
  { kc_id: 'pharmacology.adverse_effects', kc_name: 'Drug adverse effects and contraindications', module_id: 'pharmacology' },

  { kc_id: 'microbiology.general', kc_name: 'General microbiology', module_id: 'microbiology' },
  { kc_id: 'microbiology.bacteriology', kc_name: 'Bacteriology', module_id: 'microbiology' },
  { kc_id: 'microbiology.virology', kc_name: 'Virology', module_id: 'microbiology' },
  { kc_id: 'microbiology.mycology', kc_name: 'Mycology', module_id: 'microbiology' },
  { kc_id: 'microbiology.parasitology', kc_name: 'Parasitology', module_id: 'microbiology' },
  { kc_id: 'microbiology.antimicrobial_resistance', kc_name: 'Antimicrobial resistance', module_id: 'microbiology' },

  { kc_id: 'pathology.general', kc_name: 'General pathology', module_id: 'pathology' },
  { kc_id: 'pathology.cell_injury', kc_name: 'Cell injury and adaptation', module_id: 'pathology' },
  { kc_id: 'pathology.inflammation', kc_name: 'Inflammation and repair', module_id: 'pathology' },
  { kc_id: 'pathology.neoplasia', kc_name: 'Neoplasia', module_id: 'pathology' },
  { kc_id: 'pathology.hemodynamic_disorders', kc_name: 'Hemodynamic disorders', module_id: 'pathology' },
  { kc_id: 'pathology.systemic_pathology', kc_name: 'Systemic pathology', module_id: 'pathology' },

  { kc_id: 'clinical.general', kc_name: 'General clinical reasoning', module_id: 'clinical' },
  { kc_id: 'clinical.diagnosis', kc_name: 'Diagnosis and investigations', module_id: 'clinical' },
  { kc_id: 'clinical.differential_diagnosis', kc_name: 'Differential diagnosis', module_id: 'clinical' },
  { kc_id: 'clinical.management', kc_name: 'Treatment and management', module_id: 'clinical' },
  { kc_id: 'clinical.emergency', kc_name: 'Emergency and acute care', module_id: 'clinical' },
  { kc_id: 'clinical.prevention', kc_name: 'Prevention and screening', module_id: 'clinical' },

  { kc_id: 'biochemistry.general', kc_name: 'General biochemistry', module_id: 'biochemistry' },
  { kc_id: 'biochemistry.metabolism', kc_name: 'Metabolism', module_id: 'biochemistry' },
  { kc_id: 'biochemistry.molecular_biology', kc_name: 'Molecular biology', module_id: 'biochemistry' },
  { kc_id: 'biochemistry.genetics', kc_name: 'Medical genetics', module_id: 'biochemistry' },
  { kc_id: 'biochemistry.nutrition', kc_name: 'Nutrition and vitamins', module_id: 'biochemistry' },

  { kc_id: 'immunology.general', kc_name: 'General immunology', module_id: 'immunology' },
  { kc_id: 'immunology.innate_immunity', kc_name: 'Innate immunity', module_id: 'immunology' },
  { kc_id: 'immunology.adaptive_immunity', kc_name: 'Adaptive immunity', module_id: 'immunology' },
  { kc_id: 'immunology.hypersensitivity', kc_name: 'Hypersensitivity reactions', module_id: 'immunology' },
  { kc_id: 'immunology.autoimmunity', kc_name: 'Autoimmunity', module_id: 'immunology' },
  { kc_id: 'immunology.vaccines', kc_name: 'Vaccines and immunization', module_id: 'immunology' },
]

const MODULE_BY_ID = new Map(MEDICAL_MODULES.map(module => [module.id, module]))
const KC_BY_ID = new Map(MEDICAL_KCS.map(kc => [kc.kc_id, kc]))

export const DEFAULT_KC_ID = 'clinical.general'

function normalizeId(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function toRef(kc: KnowledgeComponent, confidence?: unknown): KnowledgeComponentRef {
  const knowledgeModule = MODULE_BY_ID.get(kc.module_id) ?? MODULE_BY_ID.get('clinical')!
  const parsedConfidence = typeof confidence === 'number' && Number.isFinite(confidence)
    ? Math.max(0, Math.min(1, confidence))
    : undefined

  return {
    kc_id: kc.kc_id,
    kc_name: kc.kc_name,
    module_id: knowledgeModule.id,
    module_name: knowledgeModule.name,
    map_version: KNOWLEDGE_MAP_VERSION,
    ...(parsedConfidence !== undefined ? { confidence: parsedConfidence } : {}),
  }
}

export function getKnowledgeModule(moduleId: unknown): KnowledgeModule | undefined {
  return MODULE_BY_ID.get(normalizeId(moduleId))
}

export function getKnowledgeComponent(kcId: unknown): KnowledgeComponent | undefined {
  return KC_BY_ID.get(normalizeId(kcId))
}

export function fallbackKcForModule(moduleId: unknown): KnowledgeComponent {
  const knowledgeModule = getKnowledgeModule(moduleId)
  if (!knowledgeModule) return KC_BY_ID.get(DEFAULT_KC_ID)!
  return KC_BY_ID.get(`${knowledgeModule.id}.general`) ?? KC_BY_ID.get(DEFAULT_KC_ID)!
}

export function normalizeKnowledgeRef(input: unknown): KnowledgeComponentRef {
  const value = input && typeof input === 'object' ? input as Record<string, unknown> : {}
  const kc = getKnowledgeComponent(value.kc_id)

  if (kc) {
    return toRef(kc, value.confidence)
  }

  return toRef(fallbackKcForModule(value.module_id), 0)
}

export function normalizeCourseKnowledge<T extends { chapters?: Array<{ lessons?: Array<Record<string, unknown>> }> }>(course: T): T {
  if (!Array.isArray(course.chapters)) return course

  course.chapters = course.chapters.map(chapter => ({
    ...chapter,
    lessons: Array.isArray(chapter.lessons)
      ? chapter.lessons.map(lesson => ({
          ...lesson,
          knowledge: normalizeKnowledgeRef(lesson.knowledge),
        }))
      : [],
  }))

  return course
}
