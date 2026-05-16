import { IProgressRepository } from '@/core/ports/progress-repository.port';
import { CardProgress } from '@/core/entities/card-progress.entity';
import { getDb } from '@/lib/firebase-admin';
import { Transaction, DocumentSnapshot, DocumentReference } from 'firebase-admin/firestore';

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
    const db = getDb();
    
    // 1. Save card progress
    await db.collection(this.collectionName).doc(id).set({
      ...data,
      nextReviewDate: data.nextReviewDate, // Firestore handles JS Dates
      lastReviewedAt: data.lastReviewedAt || null,
      updatedAt: new Date(),
    }, { merge: true });

    // 2. Update O(1) summary for streak
    if (data.lastReviewedAt) {
      const statsRef = db.collection('user_stats').doc(data.userId) as DocumentReference;
      const lastReviewAt = data.lastReviewedAt instanceof Date ? data.lastReviewedAt : (data.lastReviewedAt as any).toDate();
      const todayStr = dayKey(lastReviewAt);

      try {
        await db.runTransaction(async (transaction: Transaction) => {
          const statsDoc = await transaction.get(statsRef) as any as DocumentSnapshot;
          if (!statsDoc.exists) {
            transaction.set(statsRef, { lastReviewDate: todayStr, streak: 1 });
          } else {
            const statsData = statsDoc.data()!;
            if (statsData.lastReviewDate !== todayStr) {
              const yesterday = new Date(lastReviewAt);
              yesterday.setDate(yesterday.getDate() - 1);
              const yesterdayStr = dayKey(yesterday);
              
              if (statsData.lastReviewDate === yesterdayStr) {
                transaction.update(statsRef, { lastReviewDate: todayStr, streak: statsData.streak + 1 });
              } else {
                transaction.update(statsRef, { lastReviewDate: todayStr, streak: 1 });
              }
            }
          }
        });
      } catch (e) {
        console.error('Failed to update streak summary:', e);
      }
    }
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
    const db = getDb();
    const baseQuery = db.collection(this.collectionName).where('userId', '==', userId);

    // 1. Use aggregation queries for O(1) count performance
    // 2. Also fetch the pre-calculated summary for O(1) streak
    const [newSnap, learningSnap, dueSnap, statsDocResult] = await Promise.all([
      baseQuery.where('status', '==', 'NEW').count().get(),
      baseQuery.where('status', '==', 'LEARNING').count().get(),
      baseQuery.where('nextReviewDate', '<=', now).count().get(),
      db.collection('user_stats').doc(userId).get() as Promise<DocumentSnapshot>
    ]);

    const stats = {
      new: newSnap.data().count,
      learning: learningSnap.data().count,
      due: dueSnap.data().count,
      streak: 0
    };

    if (statsDocResult.exists) {
      const statsData = statsDocResult.data()!;
      stats.streak = statsData.streak || 0;
      
      // Verification: If the last review was more than 1 day ago, streak is broken
      const lastReview = statsData.lastReviewDate;
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const todayStr = dayKey(now);
      const yesterdayStr = dayKey(yesterday);

      if (lastReview !== todayStr && lastReview !== yesterdayStr) {
        stats.streak = 0;
      }
    } else {
      // Fallback to O(N) calculation if summary doesn't exist yet
      const reviewSnap = await baseQuery.select('lastReviewedAt').get();
      const reviewDays = new Set<string>();
      reviewSnap.docs.forEach((doc: any) => {
        const data = doc.data();
        if (data.lastReviewedAt) {
          const d = data.lastReviewedAt.toDate ? data.lastReviewedAt.toDate() : new Date(data.lastReviewedAt);
          reviewDays.add(dayKey(d));
        }
      });
      stats.streak = computeStreak(reviewDays, now);
      
      // Initialize the summary for next time
      const lastDay = Array.from(reviewDays).sort().pop();
      if (lastDay) {
        await db.collection('user_stats').doc(userId).set({
          lastReviewDate: lastDay,
          streak: stats.streak
        }, { merge: true });
      }
    }

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
      topic: data.topic,
      kcId: data.kcId,
      moduleId: data.moduleId,
    };
  }
}
