export interface KCState {
  mu: number;
  sigma: number;
  p_correct: number;
  aleatory_flag: boolean;
}

export interface PredictRequest {
  student_id: string;
  interactions: Array<{
    question_id: number | string;
    kc_id: string;
    response: number; // 0 or 1
    timestamp?: number;
  }>;
  total_minutes: number;
}

export interface PredictResponse {
  student_id: string;
  knowledge_state: Record<string, KCState>;
  priority_order: string[];
  next_card_kc: string;
  aleatory_flags: string[];
  session_recommendation: string;
}

export interface UpdateRequest {
  student_id: string;
  kc_id: string;
  rating: 'hard' | 'ok' | 'easy';
}

export interface UpdateResponse {
  kc_id: string;
  updated_mu: number;
  updated_sigma: number;
  p_correct: number;
}

export interface IUKTService {
  predict(req: PredictRequest): Promise<PredictResponse>;
  update(req: UpdateRequest): Promise<UpdateResponse>;
}
