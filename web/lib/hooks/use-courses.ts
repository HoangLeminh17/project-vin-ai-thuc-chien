'use client';

import { useState, useEffect, useCallback } from 'react';
import { SavedCourse } from '@/core/models/saved-course';
import { Course, CourseContent } from '@/core/models/learning-model';
import { LocalCourseAdapter } from '@/infrastructure/adapters/local-course.adapter';

const isLocal = process.env.NEXT_PUBLIC_COURSE_STORE === 'local';
const localAdapter = isLocal ? new LocalCourseAdapter() : null;

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function useCourses(userId: string | null) {
  const [courses, setCourses] = useState<SavedCourse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (!userId) {
      setCourses([]);
      setLoading(false);
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (localAdapter) {
        setCourses(await localAdapter.listByUser(userId));
      } else {
        const res = await fetch('/api/courses', {
          cache: 'no-store',
          credentials: 'same-origin',
          signal,
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        setCourses(data.courses || []);
      }
    } catch (e) {
      if (isAbortError(e)) return;
      setError(e instanceof Error ? e.message : 'Failed to load courses');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setCourses([]);
      setError('');
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh, userId]);

  const saveCourse = useCallback(async (
    title: string,
    course: Course,
    courseContent: CourseContent | null,
    contentHash?: string,
    pdfStorageUrl?: string,
    layoutStorageUrl?: string
  ): Promise<SavedCourse | null> => {
    if (!userId) return null;
    try {
      if (localAdapter) {
        const saved = await localAdapter.save({ userId, title, course, courseContent, contentHash });
        await refresh();
        return saved;
      } else {
        const res = await fetch('/api/courses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, course, courseContent, contentHash, pdfStorageUrl, layoutStorageUrl }),
          cache: 'no-store',
          credentials: 'same-origin',
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        await refresh();
        return data.course;
      }
    } catch {
      return null;
    }
  }, [userId, refresh]);

  const updateCourse = useCallback(async (id: string, content: CourseContent): Promise<boolean> => {
    if (!userId) return false;
    try {
      if (localAdapter) {
        await localAdapter.update(id, userId, content);
      } else {
        const res = await fetch(`/api/courses/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
          cache: 'no-store',
          credentials: 'same-origin',
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
      }
      await refresh();
      return true;
    } catch {
      return false;
    }
  }, [userId, refresh]);

  const deleteCourse = useCallback(async (id: string): Promise<boolean> => {
    if (!userId) return false;
    let snapshot: SavedCourse[] = [];
    setCourses(prev => { snapshot = prev; return prev.filter(c => c.id !== id); });
    try {
      if (localAdapter) {
        await localAdapter.delete(id, userId);
      } else {
        const res = await fetch(`/api/courses/${id}`, {
          method: 'DELETE',
          cache: 'no-store',
          credentials: 'same-origin',
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
      }
      return true;
    } catch {
      setCourses(snapshot);
      setError('Xóa thất bại, vui lòng thử lại.');
      return false;
    }
  }, [userId]);

  return { courses, loading, error, refresh, saveCourse, updateCourse, deleteCourse };
}
