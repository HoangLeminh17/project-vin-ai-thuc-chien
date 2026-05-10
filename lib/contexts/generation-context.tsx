'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { ref as storageRef, uploadBytes } from 'firebase/storage';
import { Course, ChapterContent, CourseContent, isLegacyOutline } from '@/core/models/learning-model';
import { useAuth } from './auth-context';
import { useCourses } from '../hooks/use-courses';
import { storage } from '@/lib/firebase-client';
import { buildValidChunkIds, validateCitationMarkers } from '@/lib/citation-utils';

export type DiagnosticStatus = 'idle' | 'loading' | 'done' | 'error';

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
  diagnosticStatus: DiagnosticStatus;
  pdfLocalPath: string | null;
  parseProgress: { currentChunk: number; totalChunks: number; percentComplete: number } | null;
}

interface GenerationContextType extends GenerationState {
  startGeneration: (file: File) => Promise<void>;
  resetGeneration: () => void;
  fetchChapter: (i: number, overrideCourse?: Course, overrideHash?: string, rawContexts?: string[]) => Promise<ChapterContent | null>;
}

const GenerationContext = createContext<GenerationContextType | undefined>(undefined);

function buildMarkdown(title: string, course: Course, contentMap: Record<number, ChapterContent>): string {
  const lines = [`# ${title}`]
  course.chapters.forEach((ch, ci) => {
    lines.push(`\n## ${ch.title}`)
    const chContent = contentMap[ci]
    if (!chContent) return
    chContent.lessons.forEach((lesson, li) => {
      lines.push(`\n### [${ci}-${li}] ${lesson.lesson_title}`)
      lines.push(`Q: ${lesson.concept.question}`)
      lines.push(`A: ${lesson.concept.answer}`)
      if (lesson.concept.detail) lines.push(lesson.concept.detail)
    })
  })
  return lines.join('\n')
}

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
  const [diagnosticStatus, setDiagnosticStatus] = useState<DiagnosticStatus>('idle');
  const [pdfLocalPath, setPdfLocalPath] = useState<string | null>(null);
  const [parseProgress, setParseProgress] = useState<{ currentChunk: number; totalChunks: number; percentComplete: number } | null>(null);

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
    setDiagnosticStatus('idle');
    setPdfLocalPath(null);
    setParseProgress(null);
  }, []);

  const runDiagnosticPrefetch = useCallback((courseId: string, markdown: string) => {
    setDiagnosticStatus('loading')
    fetch('/api/diagnostic-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markdown }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.quiz?.questions?.length) {
          localStorage.setItem(`diagnosticQuestions_${courseId}`, JSON.stringify(data.quiz.questions))
          setDiagnosticStatus('done')
        } else {
          setDiagnosticStatus('error')
        }
      })
      .catch(() => { setDiagnosticStatus('error') })
  }, [])

  const fetchChapter = useCallback(async (i: number, overrideCourse?: Course, overrideHash?: string, rawContexts?: string[]): Promise<ChapterContent | null> => {
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
          hash: activeHash,
          ...(rawContexts?.length ? { rawContexts } : {}),
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

  // Extract verbatim source text for a lesson's chunk range from the flat contentList.
  // Chunk ID format: chunk-{page_idx}-{globalIndex} — globalIndex is the flat array position.
  function extractRawContext(
    contentList: Array<{ type?: string; text?: string; table_body?: string; page_idx?: number }>,
    start: string | undefined,
    end: string | undefined,
  ): string {
    if (!start) return ''
    const idx = (id: string) => parseInt(id.match(/chunk-\d+-(\d+)/)?.[1] ?? '-1')
    const s = idx(start)
    const e = end ? idx(end) : s
    if (s < 0) return ''
    return contentList
      .slice(s, Math.max(s, e) + 1)
      .filter(item => item.type !== 'discarded' && item.type !== 'image')
      .map(item => item.text ?? item.table_body ?? '')
      .filter(Boolean)
      .join('\n\n')
  }

  const startGeneration = useCallback(async (file: File) => {
    resetGeneration();
    setStatus('parsing');

    // Create blob URL for same-session preview
    const localPath = URL.createObjectURL(file);
    setPdfLocalPath(localPath);

    // Upload PDF to Firebase Storage (client-side); get storage path for persistent reference
    let pdfStorageUrl: string | undefined;
    if (user?.uid) {
      try {
        const filename = `${crypto.randomUUID()}.pdf`;
        const uploadRef = storageRef(storage, `course-pdfs/${user.uid}/${filename}`);
        const result = await uploadBytes(uploadRef, file);
        pdfStorageUrl = result.ref.fullPath;
      } catch {
        // Upload failed — citation panel won't work for this course, generation continues
      }
    }

    const form = new FormData();
    form.append('file', file);

    let markdown = '';
    let layoutStorageUrl: string | undefined;
    // Kept in outer scope so fetchChapter calls can build rawContexts and validate markers
    let contentList: Array<{ type?: string; text?: string; table_body?: string; page_idx?: number }> = [];
    let validChunkIds = new Set<string>();
    let taskId: string | undefined;
    try {
      const res = await fetch('/api/parse-pdf', { method: 'POST', body: form });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Parse failed');
        setStatus('idle');
        return;
      }
      markdown = data.markdown ?? '';
      taskId = data.taskId;
      setRawMarkdown(markdown);

      // Poll progress if taskId is provided
      if (taskId) {
        const pollProgress = async () => {
          while (status === 'parsing') {
            try {
              const progressRes = await fetch(`/api/parse-pdf/progress?taskId=${taskId}`);
              const progressData = await progressRes.json();
              if (progressData.success && progressData.progress) {
                setParseProgress({
                  currentChunk: progressData.progress.currentChunk,
                  totalChunks: progressData.progress.totalChunks,
                  percentComplete: progressData.progress.percentComplete,
                });
              }
            } catch (e) {
              // Polling failed, continue silently
            }
            await new Promise(r => setTimeout(r, 500));
          }
        };
        pollProgress();
      }

      // Upload MinerU contentList JSON for layout serving
      contentList = data.contentList ?? [];
      validChunkIds = buildValidChunkIds(contentList);
      if (user?.uid && contentList.length > 0) {
        try {
          const layoutBlob = new Blob([JSON.stringify(contentList)], { type: 'application/json' });
          const layoutFilename = `${crypto.randomUUID()}.json`;
          const layoutRef = storageRef(storage, `course-layouts/${user.uid}/${layoutFilename}`);
          const layoutResult = await uploadBytes(layoutRef, layoutBlob);
          layoutStorageUrl = layoutResult.ref.fullPath;
        } catch {
          // Layout upload failed — bbox highlighting won't work, generation continues
        }
      }
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

      // If Stage 1 cache returned a legacy string[] outline, force a fresh Stage 1 run so
      // the new OutlinePoint[] outline carries actual chunk IDs for Stage 2 to cite from.
      if (resolvedCourse?.chapters.some(ch => ch.lessons.some(l => isLegacyOutline(l.outline)))) {
        const forceRes = await fetch('/api/generate-course', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ markdown, force: true }),
        })
        const forceData = await forceRes.json()
        if (forceData.success) resolvedCourse = forceData.course
      }

      setCurrentHash(hash);
      setCourse(resolvedCourse);

      if (!resolvedCourse) return;

      const existing = (courses || []).find(c =>
        c && (c.contentHash === hash || (!c.contentHash && c.title === resolvedCourse!.title))
      );
      if (existing) {
        const check = await fetch(`/api/courses/${existing.id}`)
        if (check.ok && existing.courseContent?.chapters?.length) {
          const map: Record<number, ChapterContent> = {}
          existing.courseContent.chapters.forEach((ch, i) => { map[i] = ch })
          setCourseContentMap(map)
          if (
            !localStorage.getItem(`diagnosticQuestions_${existing.id}`) &&
            !localStorage.getItem(`diagnosticDone_${existing.id}`)
          ) {
            runDiagnosticPrefetch(existing.id, buildMarkdown(existing.title, existing.course, map))
          }
          localStorage.setItem(`justGenerated_${existing.id}`, 'true')
          setSavedCourseId(existing.id);
          setStatus('done');
          return;
        }
        // Course was deleted or has no content — fall through to regenerate
      }

      const fromCache = data.fromCache;
      setIsFromCache(!!fromCache);
      const chapters = resolvedCourse.chapters.map((_, i) => i);
      const accumulatedChapters: ChapterContent[] = [];
      let currentSavedId: string | null = null;

      const hasLegacyOutline = resolvedCourse.chapters.some(ch =>
        ch.lessons.some(l => isLegacyOutline(l.outline))
      )
      if (fromCache && data.courseContent?.chapters?.length && !hasLegacyOutline) {
        const cachedChapters = data.courseContent.chapters as ChapterContent[] || [];
        const map: Record<number, ChapterContent> = {};
        cachedChapters.forEach((ch: ChapterContent, i: number) => { map[i] = ch; });
        setCourseContentMap(map);
        if (user && resolvedCourse) {
          const content: CourseContent = { chapters: cachedChapters };
          const saved = await saveCourse(resolvedCourse.title, resolvedCourse, content, hash, pdfStorageUrl, layoutStorageUrl);
          if (saved) {
            setSavedCourseId(saved.id);
            localStorage.setItem(`justGenerated_${saved.id}`, 'true')
            runDiagnosticPrefetch(saved.id, buildMarkdown(resolvedCourse.title, resolvedCourse, map))
          }
        }
        setStatus('done');
      } else if (fromCache) {
        const results = await Promise.all(chapters.map(i => {
          const chapterLessons = resolvedCourse!.chapters[i]?.lessons ?? []
          const rawContexts = chapterLessons.map(l => extractRawContext(contentList, l.source_chunk_start, l.source_chunk_end))
          return fetchChapter(i, resolvedCourse || undefined, hash, rawContexts)
        }));
        results.forEach(ch => { if (ch && validChunkIds.size > 0) validateCitationMarkers(ch, validChunkIds) });
        if (user && resolvedCourse) {
          const chapterList = results.filter(Boolean) as ChapterContent[]
          const content: CourseContent = { chapters: chapterList };
          const saved = await saveCourse(resolvedCourse.title, resolvedCourse, content, hash, pdfStorageUrl, layoutStorageUrl);
          if (saved) {
            setSavedCourseId(saved.id);
            localStorage.setItem(`justGenerated_${saved.id}`, 'true')
            const fallbackMap: Record<number, ChapterContent> = {}
            chapterList.forEach((ch, i) => { fallbackMap[i] = ch })
            runDiagnosticPrefetch(saved.id, buildMarkdown(resolvedCourse.title, resolvedCourse, fallbackMap))
          }
        }
        setStatus('done');
      } else {
        for (const i of chapters) {
          const chapterLessons = resolvedCourse!.chapters[i]?.lessons ?? []
          const rawContexts = chapterLessons.map(l => extractRawContext(contentList, l.source_chunk_start, l.source_chunk_end))
          const ch = await fetchChapter(i, resolvedCourse || undefined, hash, rawContexts);
          if (ch) {
            if (validChunkIds.size > 0) validateCitationMarkers(ch, validChunkIds)
            accumulatedChapters.push(ch);
            if (user && resolvedCourse) {
              const content: CourseContent = { chapters: [...accumulatedChapters] };
              if (!currentSavedId) {
                const saved = await saveCourse(resolvedCourse.title, resolvedCourse, content, hash, pdfStorageUrl, layoutStorageUrl);
                if (saved) {
                  currentSavedId = saved.id;
                  setSavedCourseId(saved.id);
                  localStorage.setItem(`justGenerated_${saved.id}`, 'true')
                  // Fire diagnostic quiz in parallel as soon as we have a courseId
                  runDiagnosticPrefetch(saved.id, markdown)
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
  }, [courses, user, saveCourse, updateCourse, fetchChapter, resetGeneration, runDiagnosticPrefetch]);

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
    diagnosticStatus,
    pdfLocalPath,
    parseProgress,
    startGeneration,
    resetGeneration,
    fetchChapter
  }), [status, course, courseContentMap, stage2Loading, stage2Errors, rawMarkdown, error, currentHash, savedCourseId, isFromCache, diagnosticStatus, pdfLocalPath, parseProgress, startGeneration, resetGeneration, fetchChapter]);

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
