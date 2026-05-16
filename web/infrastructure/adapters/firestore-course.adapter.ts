import type { Firestore } from 'firebase-admin/firestore';
import { ICourseRepository, CreateCourseInput } from '@/core/ports/course-repository.port';
import { SavedCourse } from '@/core/models/saved-course';
import { Course, ChapterContent, CourseContent } from '@/core/models/learning-model';
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
        contentHash: input.contentHash,
      };
      await docRef.set(saved);
      return saved;
    } catch (e) {
      throw new InfrastructureError('Failed to save course to Firestore', e);
    }
  }

  async update(id: string, userId: string, content: CourseContent): Promise<void> {
    try {
      const docRef = this.db.collection(COLLECTION).doc(id);
      const doc = await docRef.get();
      if (!doc.exists) throw new NotFoundError(`Course ${id} not found`);
      if (doc.data()?.userId !== userId) throw new BusinessRuleError('Access denied');
      
      await docRef.update({ courseContent: content });
    } catch (e) {
      if (e instanceof NotFoundError || e instanceof BusinessRuleError) throw e;
      throw new InfrastructureError('Failed to update course in Firestore', e);
    }
  }

  async updatePdfUrl(id: string, pdfStorageUrl: string): Promise<void> {
    try {
      await this.db.collection(COLLECTION).doc(id).update({ pdfStorageUrl });
    } catch (e) {
      throw new InfrastructureError('Failed to update pdfStorageUrl in Firestore', e);
    }
  }

  async updateLayoutUrl(id: string, layoutStorageUrl: string): Promise<void> {
    try {
      await this.db.collection(COLLECTION).doc(id).update({ layoutStorageUrl });
    } catch (e) {
      throw new InfrastructureError('Failed to update layoutStorageUrl in Firestore', e);
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

  async findByHash(userId: string, hash: string): Promise<SavedCourse | null> {
    try {
      const snapshot = await this.db
        .collection(COLLECTION)
        .where('userId', '==', userId)
        .where('contentHash', '==', hash)
        .limit(1)
        .get();
      if (snapshot.empty) return null;
      return snapshot.docs[0].data() as SavedCourse;
    } catch (e) {
      throw new InfrastructureError('Failed to find course by hash', e);
    }
  }

  async findByTitle(userId: string, title: string): Promise<SavedCourse | null> {
    try {
      const snapshot = await this.db
        .collection(COLLECTION)
        .where('userId', '==', userId)
        .where('title', '==', title)
        .limit(1)
        .get();
      if (snapshot.empty) return null;
      return snapshot.docs[0].data() as SavedCourse;
    } catch (e) {
      throw new InfrastructureError('Failed to find course by title', e);
    }
  }

  // --- Caching Methods (Stage 1 & 2) ---
  private readonly CACHE_TTL_DAYS = 7;

  private getExpirationDate(): Date {
    const d = new Date();
    d.setDate(d.getDate() + this.CACHE_TTL_DAYS);
    return d;
  }

  async saveCourse(hash: string, course: Course): Promise<void> {
    await this.db.collection('course_cache').doc(hash).set({
      ...course,
      cachedAt: new Date().toISOString(),
      expiresAt: this.getExpirationDate().toISOString(),
    }, { merge: true });
  }

  async getCourse(hash: string): Promise<Course | null> {
    const doc = await this.db.collection('course_cache').doc(hash).get();
    if (!doc.exists) return null;
    const data = doc.data()!;
    if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
      return null;
    }
    return data as Course;
  }

  async saveChapter(hash: string, chapterIndex: number, content: ChapterContent): Promise<void> {
    await this.db.collection('course_cache').doc(hash)
      .collection('chapters').doc(chapterIndex.toString())
      .set({
        ...content,
        cachedAt: new Date().toISOString(),
        expiresAt: this.getExpirationDate().toISOString(),
      });
  }

  async getChapter(hash: string, chapterIndex: number): Promise<ChapterContent | null> {
    const doc = await this.db.collection('course_cache').doc(hash)
      .collection('chapters').doc(chapterIndex.toString()).get();
    if (!doc.exists) return null;
    const data = doc.data()!;
    if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
      return null;
    }
    return data as ChapterContent;
  }

  async getFullCachedCourse(hash: string): Promise<{ course: Course; content: CourseContent } | null> {
    const courseDoc = await this.db.collection('course_cache').doc(hash).get();
    if (!courseDoc.exists) return null;

    const course = courseDoc.data() as Course;
    const chaptersSnapshot = await this.db.collection('course_cache').doc(hash)
      .collection('chapters').get();

    if (chaptersSnapshot.empty) {
      return { course, content: { chapters: [] } };
    }

    // Sort by document ID (which is the index string)
    const chapterDocs = chaptersSnapshot.docs.sort((a, b) => parseInt(a.id) - parseInt(b.id));
    const chapters = chapterDocs.map(d => d.data() as ChapterContent);

    return {
      course,
      content: { chapters }
    };
  }
}
