import { IUKTService, PredictRequest, PredictResponse, StateResponse, UpdateRequest, UpdateResponse } from '@/core/ports/ukt.port';
import { InfrastructureError } from '@/core/errors/domain-error';

// Replace path segments ≥8 chars (UIDs, UUIDs, encoded IDs) to avoid leaking user data in logs
function maskPath(path: string): string {
  return path.replace(/\/[A-Za-z0-9_%.-]{8,}/g, '/[id]');
}

export class UKTServiceAdapter implements IUKTService {
  constructor(private readonly baseUrl: string) {}

  private async uktFetch<T>(path: string, body: any): Promise<T> {
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new InfrastructureError(`UKT Service Error (${res.status}): ${text}`);
      }

      return await res.json();
    } catch (e) {
      if (e instanceof InfrastructureError) throw e;
      throw new InfrastructureError(`Connection error to UKT Service: ${path}`, e);
    }
  }

  private async uktGet<T>(path: string): Promise<T> {
    try {
      const res = await fetch(`${this.baseUrl}${path}`, { method: 'GET' });

      if (!res.ok) {
        const text = await res.text();
        throw new InfrastructureError(`UKT Service Error (${res.status}): ${text}`);
      }

      return await res.json();
    } catch (e) {
      if (e instanceof InfrastructureError) throw e;
      throw new InfrastructureError(`Connection error to UKT Service: ${path}`, e);
    }
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
