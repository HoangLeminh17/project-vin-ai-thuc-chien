import { IProgressRepository } from '@/core/ports/progress-repository.port';
import { CardProgress } from '@/core/entities/card-progress.entity';
import { getDb } from '@/lib/firebase-admin';

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function computeStreak(days: Set<string>, now: Date): number {
  // Walk backwards from today until a day with no reviews. Allow today-gap
  // so the streak doesn't reset the moment midnight passes before review.
  let streak = 0;
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export class FirebaseProgressRepository implements IProgressRepository {
  private readonly collectionName = 'user_progress';

  async getByCardId(userId: string, cardId: string): Promise<CardProgress | null> {
    const snapshot = await getDb()
      .collection(this.collectionName)
      .where('userId', '==', userId)
      .where('cardId', '==', cardId)
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const data = snapshot.docs[0].data();
    return this.mapToEntity(snapshot.docs[0].id, data);
  }

  async save(progress: CardProgress): Promise<void> {
    const { id, ...data } = progress;
    await getDb()
      .collection(this.collectionName)
      .doc(id)
      .set({
        ...data,
        nextReviewDate: data.nextReviewDate, // Firestore handles JS Dates
        lastReviewedAt: data.lastReviewedAt || null,
        updatedAt: new Date(),
      }, { merge: true });
  }

  async getDueCards(userId: string, date: Date): Promise<CardProgress[]> {
    const snapshot = await getDb()
      .collection(this.collectionName)
      .where('userId', '==', userId)
      .where('nextReviewDate', '<=', date)
      .orderBy('nextReviewDate', 'asc')
      .get();

    return snapshot.docs.map((doc: any) => this.mapToEntity(doc.id, doc.data()));
  }

  async getAllForUser(userId: string): Promise<CardProgress[]> {
    const snapshot = await getDb()
      .collection(this.collectionName)
      .where('userId', '==', userId)
      .get();
    return snapshot.docs.map((doc: any) => this.mapToEntity(doc.id, doc.data()));
  }

  async getStats(userId: string): Promise<{ new: number; learning: number; due: number; streak: number }> {
    const now = new Date();
    const snapshot = await getDb()
      .collection(this.collectionName)
      .where('userId', '==', userId)
      .get();

    const stats = { new: 0, learning: 0, due: 0, streak: 0 };
    const reviewDays = new Set<string>(); // YYYY-MM-DD, local time

    snapshot.docs.forEach((doc: any) => {
      const data = doc.data();
      if (data.status === 'NEW') stats.new++;
      else if (data.status === 'LEARNING') stats.learning++;

      const nextReview = data.nextReviewDate.toDate ? data.nextReviewDate.toDate() : new Date(data.nextReviewDate);
      if (nextReview <= now) stats.due++;

      if (data.lastReviewedAt) {
        const d = data.lastReviewedAt.toDate ? data.lastReviewedAt.toDate() : new Date(data.lastReviewedAt);
        reviewDays.add(dayKey(d));
      }
    });

    stats.streak = computeStreak(reviewDays, now);
    return stats;
  }

  private mapToEntity(id: string, data: any): CardProgress {
    return {
      id,
      cardId: data.cardId,
      userId: data.userId,
      interval: data.interval,
      easeFactor: data.easeFactor,
      repetitions: data.repetitions,
      status: data.status,
      nextReviewDate: data.nextReviewDate.toDate ? data.nextReviewDate.toDate() : new Date(data.nextReviewDate),
      lastReviewedAt: data.lastReviewedAt?.toDate ? data.lastReviewedAt.toDate() : (data.lastReviewedAt ? new Date(data.lastReviewedAt) : undefined),
      question: data.question,
      answer: data.answer,
    };
  }
}
