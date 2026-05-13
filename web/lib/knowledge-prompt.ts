import { KNOWLEDGE_MAP_VERSION, MEDICAL_KCS, MEDICAL_MODULES } from '@/core/models/knowledge'

const moduleLines = MEDICAL_MODULES
  .map(module => `- ${module.id} | ${module.name} | ${module.description}`)
  .join('\n')

const kcLines = MEDICAL_KCS
  .map(kc => `- ${kc.kc_id} | ${kc.kc_name} | module=${kc.module_id}`)
  .join('\n')

export const KNOWLEDGE_MAP_PROMPT_CONTEXT = `Knowledge map version: ${KNOWLEDGE_MAP_VERSION}

Medical modules. Use only these module_id values:
${moduleLines}

Knowledge Components. Use only these kc_id values. Never invent a new kc_id:
${kcLines}

If no specific KC fits, choose the .general KC for the best matching module.`
