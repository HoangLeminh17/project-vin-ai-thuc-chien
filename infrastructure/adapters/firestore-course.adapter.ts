import type { Firestore } from 'firebase-admin/firestore';
import { ICourseRepository, CreateCourseInput } from '@/core/ports/course-repository.port';
import { SavedCourse } from '@/core/models/saved-course';
import { NotFoundError, InfrastructureError, BusinessRuleError } from '@/core/errors/domain-error';

const COLLECTION = 'courses';

export class FirestoreCourseAdapter implements ICourseRepository {
  constructor(private readonly db: Firestore) {}

  async save(input: CreateCourseInput): Promise<SavedCourse> {
    try {
      const docRef = this.db.collection(COLLECTION).doc();
      const saved: SavedCourse = {
        id: docRef.id,
        userId: input.userId,
        title: input.title,
        createdAt: new Date().toISOString(),
        course: input.course,
        courseContent: input.courseContent,
      };
      await docRef.set(saved);
      return saved;
    } catch (e) {
      throw new InfrastructureError('Failed to save course to Firestore', e);
    }
  }

  async listByUser(userId: string): Promise<SavedCourse[]> {
    try {
      const snapshot = await this.db
        .collection(COLLECTION)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();
      return snapshot.docs.map(d => d.data() as SavedCourse);
    } catch (e: any) {
      throw new InfrastructureError(`Failed to list courses from Firestore: ${e?.message ?? e}`, e);
    }
  }

  async getById(id: string, userId: string): Promise<SavedCourse> {
    try {
      const doc = await this.db.collection(COLLECTION).doc(id).get();
      if (!doc.exists) throw new NotFoundError(`Course ${id} not found`);
      const data = doc.data() as SavedCourse;
      if (data.userId !== userId) throw new BusinessRuleError('Access denied');
      return data;
    } catch (e) {
      if (e instanceof NotFoundError || e instanceof BusinessRuleError) throw e;
      throw new InfrastructureError('Failed to get course from Firestore', e);
    }
  }

  async delete(id: string, userId: string): Promise<void> {
    try {
      const doc = await this.db.collection(COLLECTION).doc(id).get();
      if (!doc.exists) throw new NotFoundError(`Course ${id} not found`);
      const data = doc.data() as SavedCourse;
      if (data.userId !== userId) throw new BusinessRuleError('Access denied');
      await this.db.collection(COLLECTION).doc(id).delete();
    } catch (e) {
      if (e instanceof NotFoundError || e instanceof BusinessRuleError) throw e;
      throw new InfrastructureError('Failed to delete course from Firestore', e);
    }
  }
}
