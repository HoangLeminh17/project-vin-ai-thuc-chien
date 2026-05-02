'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Course, ChapterContent, CourseContent } from '@/core/models/learning-model';
import { SavedCourse } from '@/core/models/saved-course';
import { useAuth } from './auth-context';
import { useCourses } from '../hooks/use-courses';

interface GenerationState {
  status: 'idle' | 'parsing' | 'generating' | 'done';
  course: Course | null;
  courseContentMap: Record<number, ChapterContent>;
  stage2Loading: Record<number, boolean>;
  stage2Errors: Record<number, string>;
  rawMarkdown: string;
  error: string;
  currentHash: string;
  savedCourseId: string | null;
  isFromCache: boolean;
}

interface GenerationContextType extends GenerationState {
  startGeneration: (file: File) => Promise<void>;
  resetGeneration: () => void;
  fetchChapter: (i: number, overrideCourse?: Course, overrideHash?: string) => Promise<ChapterContent | null>;
}

const GenerationContext = createContext<GenerationContextType | undefined>(undefined);

export function GenerationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { saveCourse, updateCourse, courses } = useCourses(user?.uid ?? null);

  const [status, setStatus] = useState<GenerationState['status']>('idle');
  const [course, setCourse] = useState<Course | null>(null);
  const [courseContentMap, setCourseContentMap] = useState<Record<number, ChapterContent>>({});
  const [stage2Loading, setStage2Loading] = useState<Record<number, boolean>>({});
  const [stage2Errors, setStage2Errors] = useState<Record<number, string>>({});
  const [rawMarkdown, setRawMarkdown] = useState('');
  const [error, setError] = useState('');
  const [currentHash, setCurrentHash] = useState('');
  const [savedCourseId, setSavedCourseId] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  const resetGeneration = useCallback(() => {
    setStatus('idle');
    setCourse(null);
    setCourseContentMap({});
    setStage2Loading({});
    setStage2Errors({});
    setRawMarkdown('');
    setError('');
    setCurrentHash('');
    setSavedCourseId(null);
    setIsFromCache(false);
  }, []);

  const fetchChapter = useCallback(async (i: number, overrideCourse?: Course, overrideHash?: string): Promise<ChapterContent | null> => {
    const activeCourse = overrideCourse || course;
    const activeHash = overrideHash || currentHash;
    if (!activeCourse) return null;

    setStage2Loading(prev => ({ ...prev, [i]: true }));
    setStage2Errors(prev => { const n = { ...prev }; delete n[i]; return n; });

    try {
      const res = await fetch('/api/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course: activeCourse,
          chapterIndex: i,
          hash: activeHash
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      
      setCourseContentMap(prev => ({ ...prev, [i]: data.chapter }));
      return data.chapter;
    } catch (e) {
      console.error(`Failed to fetch chapter ${i}:`, e);
      setStage2Errors(prev => ({ ...prev, [i]: e instanceof Error ? e.message : 'Unknown error' }));
      return null;
    } finally {
      setStage2Loading(prev => ({ ...prev, [i]: false }));
    }
  }, [course, currentHash]);

  const startGeneration = useCallback(async (file: File) => {
    resetGeneration();
    setStatus('parsing');

    const form = new FormData();
    form.append('file', file);

    let markdown = '';
    try {
      const res = await fetch('/api/parse-pdf', { method: 'POST', body: form });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Parse failed');
        setStatus('idle');
        return;
      }
      markdown = data.markdown ?? '';
      setRawMarkdown(markdown);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
      setStatus('idle');
      return;
    }

    setStatus('generating');
    let resolvedCourse: Course | null = null;
    let hash = '';
    try {
      const res = await fetch('/api/generate-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Generation failed');
        setStatus('idle');
        return;
      }
      resolvedCourse = data.course;
      hash = data.hash ?? '';
      setCurrentHash(hash);
      setCourse(data.course);

      if (!resolvedCourse) return;

      // Check if this course is already in the user's library
      const existing = (courses || []).find(c => 
        c && (c.contentHash === hash || (!c.contentHash && c.title === resolvedCourse!.title))
      );
      if (existing) {
        setSavedCourseId(existing.id);
        setStatus('done');
        return;
      }

      const fromCache = data.fromCache;
      setIsFromCache(!!fromCache);
      const chapters = resolvedCourse.chapters.map((_, i) => i);
      const accumulatedChapters: ChapterContent[] = [];
      let currentSavedId: string | null = null;

      if (fromCache && data.courseContent) {
        const cachedChapters = data.courseContent.chapters as ChapterContent[] || [];
        const map: Record<number, ChapterContent> = {};
        cachedChapters.forEach((ch: ChapterContent, i: number) => { map[i] = ch; });
        setCourseContentMap(map);
        if (user && resolvedCourse) {
          const content: CourseContent = { chapters: cachedChapters };
          const saved = await saveCourse(resolvedCourse.title, resolvedCourse, content, hash);
          if (saved) setSavedCourseId(saved.id);
        }
        setStatus('done');
      } else if (fromCache) {
        // Fallback if courseContent is missing but fromCache is true
        const results = await Promise.all(chapters.map(i => fetchChapter(i, resolvedCourse || undefined, hash)));
        if (user && resolvedCourse) {
          const content: CourseContent = { chapters: results.filter(Boolean) as ChapterContent[] };
          const saved = await saveCourse(resolvedCourse.title, resolvedCourse, content, hash);
          if (saved) setSavedCourseId(saved.id);
        }
        setStatus('done');
      } else {
        // Sequential generation to update UI
        for (const i of chapters) {
          const ch = await fetchChapter(i, resolvedCourse || undefined, hash);
          if (ch) {
            accumulatedChapters.push(ch);
            if (user && resolvedCourse) {
              const content: CourseContent = { chapters: [...accumulatedChapters] };
              if (!currentSavedId) {
                const saved = await saveCourse(resolvedCourse.title, resolvedCourse, content, hash);
                if (saved) {
                  currentSavedId = saved.id;
                  setSavedCourseId(saved.id);
                }
              } else {
                await updateCourse(currentSavedId, content);
              }
            }
          }
        }
        setStatus('done');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
      setStatus('idle');
    }
  }, [courses, user, saveCourse, updateCourse, fetchChapter, resetGeneration]);

  const value = useMemo(() => ({
    status,
    course,
    courseContentMap,
    stage2Loading,
    stage2Errors,
    rawMarkdown,
    error,
    currentHash,
    savedCourseId,
    isFromCache,
    startGeneration,
    resetGeneration,
    fetchChapter
  }), [status, course, courseContentMap, stage2Loading, stage2Errors, rawMarkdown, error, currentHash, savedCourseId, isFromCache, startGeneration, resetGeneration, fetchChapter]);

  return (
    <GenerationContext.Provider value={value}>
      {children}
    </GenerationContext.Provider>
  );
}

export function useGeneration() {
  const context = useContext(GenerationContext);
  if (context === undefined) {
    throw new Error('useGeneration must be used within a GenerationProvider');
  }
  return context;
}
