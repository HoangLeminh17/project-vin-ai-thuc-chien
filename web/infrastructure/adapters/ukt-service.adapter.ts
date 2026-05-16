import { IUKTService, PredictRequest, PredictResponse, StateResponse, UpdateRequest, UpdateResponse } from '@/core/ports/ukt.port';
import { InfrastructureError } from '@/core/errors/domain-error';

const TIMEOUT_MS = 8_000;
const RETRY_DELAY_MS = 1_000;

// Replace path segments ≥8 chars (UIDs, UUIDs, encoded IDs) to avoid leaking user data in logs
function maskPath(path: string): string {
  return path.replace(/\/[A-Za-z0-9_%.-]{8,}/g, '/[id]');
}

export class UKTServiceAdapter implements IUKTService {
  constructor(private readonly baseUrl: string) {}

  private async request<T>(path: string, options: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const safeUrl = `${this.baseUrl}${maskPath(path)}`;

    try {
      const res = await fetch(`${this.baseUrl}${path}`, { ...options, signal: controller.signal });
      clearTimeout(timer);

      if (!res.ok) {
        const text = await res.text();
        throw new InfrastructureError(`UKT ${res.status} [${safeUrl}]: ${text}`);
      }

      return res.json();
    } catch (e) {
      clearTimeout(timer);
      if (e instanceof InfrastructureError) throw e;
      throw new InfrastructureError(`UKT unreachable [${safeUrl}]: ${(e as Error).message}`, e);
    }
  }

  private uktFetch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  private uktGet<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }

  async predict(req: PredictRequest): Promise<PredictResponse> {
    const now = Math.floor(Date.now() / 1000);
    return this.uktFetch<PredictResponse>('/predict', {
      ...req,
      total_minutes: Math.max(5, req.total_minutes || 45),
      interactions: req.interactions.map((interaction, index) => {
        const parsedQuestionId = typeof interaction.question_id === 'number'
          ? interaction.question_id
          : Number.parseInt(interaction.question_id, 10);

        return {
          ...interaction,
          question_id: Number.isFinite(parsedQuestionId) ? parsedQuestionId : index + 1,
          timestamp: interaction.timestamp ?? now + index,
        };
      }),
    });
  }

  async getState(studentId: string): Promise<StateResponse> {
    return this.uktGet<StateResponse>(`/state/${encodeURIComponent(studentId)}`);
  }

  async update(req: UpdateRequest): Promise<UpdateResponse> {
    return this.uktFetch<UpdateResponse>('/update', req);
  }
}
