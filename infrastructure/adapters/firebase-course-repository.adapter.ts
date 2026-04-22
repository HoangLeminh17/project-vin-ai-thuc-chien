import { ICourseRepository } from '@/core/ports/course-repository.port';
import { ChapterContent, Course } from '@/lib/types';
import { getDb } from '@/lib/firebase-admin';

/**
 * Adapter cho Firebase Firestore để lưu trữ và truy xuất khóa học đã cache.
 */
export class FirebaseCourseRepository implements ICourseRepository {
  private get db() {
    return getDb();
  }
  
  private collection = 'courses';

  async saveCourse(hash: string, course: Course): Promise<void> {
    await this.db.collection(this.collection).doc(hash).set({
      ...course,
      cachedAt: new Date().toISOString(),
    }, { merge: true });
  }

  async getCourse(hash: string): Promise<Course | null> {
    const doc = await this.db.collection(this.collection).doc(hash).get();
    if (!doc.exists) return null;
    return doc.data() as Course;
  }

  async saveChapter(hash: string, chapterIndex: number, content: ChapterContent): Promise<void> {
    await this.db.collection(this.collection).doc(hash)
      .collection('chapters').doc(chapterIndex.toString())
      .set({
        ...content,
        cachedAt: new Date().toISOString(),
      });
  }

  async getChapter(hash: string, chapterIndex: number): Promise<ChapterContent | null> {
    const doc = await this.db.collection(this.collection).doc(hash)
      .collection('chapters').doc(chapterIndex.toString()).get();
    if (!doc.exists) return null;
    return doc.data() as ChapterContent;
  }
}
