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
  { id: 'anatomy', name: 'Giải phẫu', description: 'Gross anatomy, histology, embryology, and organ structure.' },
  { id: 'physiology', name: 'Sinh lý', description: 'Normal function, regulation, feedback loops, and organ system physiology.' },
  { id: 'pharmacology', name: 'Dược lý', description: 'Drug mechanisms, pharmacokinetics, pharmacodynamics, indications, and adverse effects.' },
  { id: 'microbiology', name: 'Vi sinh', description: 'Bacteria, viruses, fungi, parasites, antimicrobial resistance, and infectious agents.' },
  { id: 'pathology', name: 'Bệnh lý', description: 'Cell injury, inflammation, neoplasia, hemodynamics, and disease mechanisms.' },
  { id: 'clinical', name: 'Lâm sàng', description: 'Diagnosis, management, prevention, emergency care, and patient-facing reasoning.' },
  { id: 'biochemistry', name: 'Hóa sinh', description: 'Metabolism, molecular biology, genetics, nutrition, and biochemical pathways.' },
  { id: 'immunology', name: 'Miễn dịch', description: 'Innate and adaptive immunity, hypersensitivity, autoimmunity, and vaccines.' },
]

export const MEDICAL_KCS: KnowledgeComponent[] = [
  { kc_id: 'anatomy.general', kc_name: 'Giải phẫu đại cương', module_id: 'anatomy' },
  { kc_id: 'anatomy.organ_systems', kc_name: 'Giải phẫu hệ cơ quan', module_id: 'anatomy' },
  { kc_id: 'anatomy.neuroanatomy', kc_name: 'Giải phẫu thần kinh', module_id: 'anatomy' },
  { kc_id: 'anatomy.histology', kc_name: 'Mô học', module_id: 'anatomy' },

  { kc_id: 'physiology.general', kc_name: 'Sinh lý đại cương', module_id: 'physiology' },
  { kc_id: 'physiology.homeostasis', kc_name: 'Cân bằng nội môi và phản hồi', module_id: 'physiology' },
  { kc_id: 'physiology.cardiovascular', kc_name: 'Sinh lý tim mạch', module_id: 'physiology' },
  { kc_id: 'physiology.respiratory', kc_name: 'Sinh lý hô hấp', module_id: 'physiology' },
  { kc_id: 'physiology.renal', kc_name: 'Sinh lý thận', module_id: 'physiology' },
  { kc_id: 'physiology.endocrine', kc_name: 'Sinh lý nội tiết', module_id: 'physiology' },
  { kc_id: 'physiology.neurophysiology', kc_name: 'Sinh lý thần kinh', module_id: 'physiology' },

  { kc_id: 'pharmacology.general', kc_name: 'Dược lý đại cương', module_id: 'pharmacology' },
  { kc_id: 'pharmacology.pharmacokinetics', kc_name: 'Dược động học', module_id: 'pharmacology' },
  { kc_id: 'pharmacology.pharmacodynamics', kc_name: 'Dược lực học', module_id: 'pharmacology' },
  { kc_id: 'pharmacology.antimicrobials', kc_name: 'Dược lý kháng khuẩn', module_id: 'pharmacology' },
  { kc_id: 'pharmacology.autonomic_drugs', kc_name: 'Thuốc hệ thần kinh tự chủ', module_id: 'pharmacology' },
  { kc_id: 'pharmacology.cardiovascular_drugs', kc_name: 'Thuốc tim mạch', module_id: 'pharmacology' },
  { kc_id: 'pharmacology.adverse_effects', kc_name: 'Tác dụng phụ và chống chỉ định', module_id: 'pharmacology' },

  { kc_id: 'microbiology.general', kc_name: 'Vi sinh đại cương', module_id: 'microbiology' },
  { kc_id: 'microbiology.bacteriology', kc_name: 'Vi khuẩn học', module_id: 'microbiology' },
  { kc_id: 'microbiology.virology', kc_name: 'Virus học', module_id: 'microbiology' },
  { kc_id: 'microbiology.mycology', kc_name: 'Nấm học', module_id: 'microbiology' },
  { kc_id: 'microbiology.parasitology', kc_name: 'Ký sinh trùng học', module_id: 'microbiology' },
  { kc_id: 'microbiology.antimicrobial_resistance', kc_name: 'Đề kháng kháng sinh', module_id: 'microbiology' },

  { kc_id: 'pathology.general', kc_name: 'Bệnh lý đại cương', module_id: 'pathology' },
  { kc_id: 'pathology.cell_injury', kc_name: 'Tổn thương và thích nghi tế bào', module_id: 'pathology' },
  { kc_id: 'pathology.inflammation', kc_name: 'Viêm và sửa chữa tổ chức', module_id: 'pathology' },
  { kc_id: 'pathology.neoplasia', kc_name: 'Bướu tân sinh', module_id: 'pathology' },
  { kc_id: 'pathology.hemodynamic_disorders', kc_name: 'Rối loạn huyết động', module_id: 'pathology' },
  { kc_id: 'pathology.systemic_pathology', kc_name: 'Bệnh lý hệ thống', module_id: 'pathology' },

  { kc_id: 'clinical.general', kc_name: 'Lý luận lâm sàng đại cương', module_id: 'clinical' },
  { kc_id: 'clinical.diagnosis', kc_name: 'Chẩn đoán và thăm dò', module_id: 'clinical' },
  { kc_id: 'clinical.differential_diagnosis', kc_name: 'Chẩn đoán phân biệt', module_id: 'clinical' },
  { kc_id: 'clinical.management', kc_name: 'Điều trị và xử trí', module_id: 'clinical' },
  { kc_id: 'clinical.emergency', kc_name: 'Cấp cứu và chăm sóc cấp tính', module_id: 'clinical' },
  { kc_id: 'clinical.prevention', kc_name: 'Phòng ngừa và tầm soát', module_id: 'clinical' },

  { kc_id: 'biochemistry.general', kc_name: 'Hóa sinh đại cương', module_id: 'biochemistry' },
  { kc_id: 'biochemistry.metabolism', kc_name: 'Chuyển hóa', module_id: 'biochemistry' },
  { kc_id: 'biochemistry.molecular_biology', kc_name: 'Sinh học phân tử', module_id: 'biochemistry' },
  { kc_id: 'biochemistry.genetics', kc_name: 'Di truyền y học', module_id: 'biochemistry' },
  { kc_id: 'biochemistry.nutrition', kc_name: 'Dinh dưỡng và vitamin', module_id: 'biochemistry' },

  { kc_id: 'immunology.general', kc_name: 'Miễn dịch đại cương', module_id: 'immunology' },
  { kc_id: 'immunology.innate_immunity', kc_name: 'Miễn dịch tự nhiên', module_id: 'immunology' },
  { kc_id: 'immunology.adaptive_immunity', kc_name: 'Miễn dịch thu được', module_id: 'immunology' },
  { kc_id: 'immunology.hypersensitivity', kc_name: 'Phản ứng quá mẫn', module_id: 'immunology' },
  { kc_id: 'immunology.autoimmunity', kc_name: 'Tự miễn', module_id: 'immunology' },
  { kc_id: 'immunology.vaccines', kc_name: 'Vắc-xin và tiêm chủng', module_id: 'immunology' },
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
