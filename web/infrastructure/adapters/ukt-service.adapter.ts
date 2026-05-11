import { IUKTService, PredictRequest, PredictResponse, UpdateRequest, UpdateResponse } from '@/core/ports/ukt.port';
import { InfrastructureError } from '@/core/errors/domain-error';

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

  async predict(req: PredictRequest): Promise<PredictResponse> {
    return this.uktFetch<PredictResponse>('/predict', req);
  }

  async update(req: UpdateRequest): Promise<UpdateResponse> {
    return this.uktFetch<UpdateResponse>('/update', req);
  }
}
