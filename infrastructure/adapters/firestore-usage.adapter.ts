import type { Firestore } from 'firebase-admin/firestore';
import { IUsageRepository, TokenUsageRecord } from '@/core/ports/usage-repository.port';
import { InfrastructureError } from '@/core/errors/domain-error';

const COLLECTION = 'token_usage';

export class FirestoreUsageAdapter implements IUsageRepository {
  constructor(private readonly db: Firestore) {}

  async saveTokenUsage(record: TokenUsageRecord): Promise<void> {
    try {
      await this.db.collection(COLLECTION).add({
        ...record,
        timestamp: record.timestamp || new Date().toISOString(),
      });
    } catch (e) {
      throw new InfrastructureError('Failed to save token usage to Firestore', e);
    }
  }

  async getDailyUsage(days: number = 7): Promise<any[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const snapshot = await this.db
        .collection(COLLECTION)
        .where('timestamp', '>=', startDate.toISOString())
        .orderBy('timestamp', 'asc')
        .get();

      const records = snapshot.docs.map(d => d.data() as TokenUsageRecord);
      
      // Group by day
      const daily: Record<string, { total: number; prompt: number; completion: number }> = {};
      
      records.forEach(r => {
        const date = r.timestamp.split('T')[0];
        if (!daily[date]) {
          daily[date] = { total: 0, prompt: 0, completion: 0 };
        }
        daily[date].total += r.totalTokens;
        daily[date].prompt += r.promptTokens;
        daily[date].completion += r.completionTokens;
      });

      return Object.entries(daily).map(([date, stats]) => ({
        date,
        ...stats
      }));
    } catch (e) {
      throw new InfrastructureError('Failed to get daily usage from Firestore', e);
    }
  }

  async getRecentUsage(limit: number = 20): Promise<TokenUsageRecord[]> {
    try {
      const snapshot = await this.db
        .collection(COLLECTION)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();
      
      return snapshot.docs.map(d => d.data() as TokenUsageRecord);
    } catch (e) {
      throw new InfrastructureError('Failed to get recent usage from Firestore', e);
    }
  }
}
