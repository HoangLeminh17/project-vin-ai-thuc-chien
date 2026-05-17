'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Course, ChapterContent, CourseContent, isLegacyOutline } from '@/core/models/learning-model';
import { useAuth } from './auth-context';
import { useCourses } from '../hooks/use-courses';
import { storage } from '@/lib/firebase-client';
import { buildValidChunkIds, validateCitationMarkers } from '@/lib/citation-utils';
import { buildDiagnosticChunks, diagnosticQuestionsCoverChunks } from '@/lib/diagnostic-chunks';
import { courseContentNeedsCardRegeneration } from '@/lib/course-content-version';
import type { ContentChunk } from '@/core/ports/ai.port';
import { toCompleteChapterList } from '@/lib/stage2-results';
import { hasReusableCachedCourseContent } from '@/lib/generation-cache';
import { uploadCourseLayout, uploadCoursePdf } from '@/lib/generation-uploads';
import { pollParseProgress } from '@/lib/parse-progress-polling';
import { devError } from '@/lib/devlog'
import { trackMetric } from '@/lib/metrics-client'

export type DiagnosticStatus = 'idle' | 'loading' | 'done' | 'error';

export interface GenerationState {
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
}

export interface GenerationProgress {
  parseProgress: { currentChunk: number; totalChunks: number; percentComplete: number } | null;
}

export interface GenerationActions {
  startGeneration: (file: File) => Promise<void>;
  resetGeneration: () => void;
  fetchChapter: (i: number, overrideCourse?: Course, overrideHash?: string, rawContexts?: string[]) => Promise<ChapterContent | null>;
  registerCourseSavedHandler: (handler: (() => void) | null) => void;
}

const GenerationStateContext = createContext<GenerationState | undefined>(undefined);
const GenerationProgressContext = createContext<GenerationProgress | undefined>(undefined);
const GenerationActionsContext = createContext<GenerationActions | undefined>(undefined);

function cachedDiagnosticQuestionsCover(courseId: string, chunks: ContentChunk[]): boolean {
  const cached = localStorage.getItem(`diagnosticQuestions_${courseId}`)
  if (!cached) return false

  try {
    const questions = JSON.parse(cached)
    if (diagnosticQuestionsCoverChunks(questions, chunks)) return true
  } catch {
    // Invalid cache will be removed below.
  }

  localStorage.removeItem(`diagnosticQuestions_${courseId}`)
  return false
}

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

export function GenerationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { saveCourse, courses } = useCourses(user?.uid ?? null);

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
  const [parseProgress, setParseProgress] = useState<GenerationProgress['parseProgress']>(null);
  const pdfLocalPathRef = useRef<string | null>(null);
  const parseProgressControllerRef = useRef<AbortController | null>(null);
  const onCourseSavedRef = useRef<(() => void) | null>(null);

  const stopParseProgressPolling = useCallback(() => {
    parseProgressControllerRef.current?.abort();
    parseProgressControllerRef.current = null;
  }, []);

  const registerCourseSavedHandler = useCallback((handler: (() => void) | null) => {
    onCourseSavedRef.current = handler;
  }, []);

  const setPreviewPdfUrl = useCallback((url: string | null) => {
    if (pdfLocalPathRef.current) URL.revokeObjectURL(pdfLocalPathRef.current);
    pdfLocalPathRef.current = url;
    setPdfLocalPath(url);
  }, []);

  const resetGeneration = useCallback(() => {
    stopParseProgressPolling();
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
    setPreviewPdfUrl(null);
    setParseProgress(null);
  }, [setPreviewPdfUrl, stopParseProgressPolling]);

  useEffect(() => {
    return () => {
      stopParseProgressPolling();
      if (pdfLocalPathRef.current) URL.revokeObjectURL(pdfLocalPathRef.current);
    };
  }, [stopParseProgressPolling]);

  const runDiagnosticPrefetch = useCallback((courseId: string, chunks: ContentChunk[]) => {
    if (chunks.length === 0) {
      setDiagnosticStatus('error')
      return
    }

    setDiagnosticStatus('loading')
    fetch('/api/diagnostic-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chunks }),
    })
      .then(res => res.json())
      .then(data => {
        const questions = data.quiz?.questions ?? []
        if (diagnosticQuestionsCoverChunks(questions, chunks)) {
          localStorage.setItem(`diagnosticQuestions_${courseId}`, JSON.stringify(questions))
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
      devError(`Failed to fetch chapter ${i}:`, e)
      setStage2Errors(prev => ({ ...prev, [i]: e instanceof Error ? e.message : 'Unknown error' }));
      return null;
    } finally {
      setStage2Loading(prev => ({ ...prev, [i]: false }));
    }
  }, [course, currentHash]);

  const startGeneration = useCallback(async (file: File) => {
    resetGeneration();
    setStatus('parsing');
    const startedAt = performance.now()
    let generationStatus: 'success' | 'error' = 'error'
    let generationSource: 'cache' | 'fresh' = 'fresh'

    // Create blob URL for same-session preview
    const localPath = URL.createObjectURL(file);
    setPreviewPdfUrl(localPath);

    // Start the PDF upload immediately so it can overlap with parsing.
    const pdfStorageUrlPromise = user?.uid
      ? uploadCoursePdf(storage, user.uid, file).catch(() => undefined)
      : Promise.resolve(undefined)

    const form = new FormData();
    form.append('file', file);

    let markdown = '';
    let layoutStorageUrlPromise: Promise<string | undefined> = Promise.resolve(undefined)
    // Kept in outer scope so fetchChapter calls can build rawContexts and validate markers
    let contentList: Array<{ type?: string; text?: string; table_body?: string; page_idx?: number }> = [];
    let validChunkIds = new Set<string>();
    let taskId: string | undefined;
    try {
      const res = await fetch('/api/parse-pdf', { method: 'POST', body: form });
      const data = await res.json();
      if (!data.success) {
        stopParseProgressPolling();
        setError(data.error || 'Parse failed');
        setStatus('idle');
        return;
      }
      markdown = data.markdown ?? '';
      taskId = data.taskId;
      setRawMarkdown(markdown);

      // Poll progress if taskId is provided
      if (taskId) {
        const controller = new AbortController();
        parseProgressControllerRef.current = controller;
        void pollParseProgress(taskId, setParseProgress, controller.signal);
      }

      // Upload MinerU contentList JSON for layout serving
      contentList = data.contentList ?? [];
      validChunkIds = buildValidChunkIds(contentList);
      if (user?.uid && contentList.length > 0) {
        layoutStorageUrlPromise = uploadCourseLayout(storage, user.uid, contentList).catch(() => undefined)
      }
    } catch (e) {
      stopParseProgressPolling();
      setError(e instanceof Error ? e.message : 'Network error');
      setStatus('idle');
      return;
    }

    stopParseProgressPolling();
    setStatus('generating');
    let resolvedCourse: Course | null = null;
    let hash = '';

    const resolveStorageUrls = async () => ({
      pdfStorageUrl: await pdfStorageUrlPromise,
      layoutStorageUrl: await layoutStorageUrlPromise,
    })

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
        generationStatus = 'error'
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
        const check = await fetch(`/api/courses/${existing.id}`, {
          cache: 'no-store',
          credentials: 'same-origin',
        })
        if (
          check.ok &&
          existing.courseContent?.chapters?.length &&
          !courseContentNeedsCardRegeneration(existing.courseContent)
        ) {
          setIsFromCache(true)
          const map: Record<number, ChapterContent> = {}
          existing.courseContent.chapters.forEach((ch, i) => { map[i] = ch })
          setCourseContentMap(map)
          const diagnosticChunks = buildDiagnosticChunks(existing.title, existing.course, map)
          if (
            !cachedDiagnosticQuestionsCover(existing.id, diagnosticChunks) &&
            !localStorage.getItem(`diagnosticDone_${existing.id}`)
          ) {
            runDiagnosticPrefetch(existing.id, diagnosticChunks)
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
      let currentSavedId: string | null = null;

      const hasLegacyOutline = resolvedCourse.chapters.some(ch =>
        ch.lessons.some(l => isLegacyOutline(l.outline))
      )
      if (hasReusableCachedCourseContent(fromCache, data.courseContent, hasLegacyOutline)) {
        generationSource = 'cache'
        const cachedChapters = data.courseContent.chapters as ChapterContent[] || [];
        const map: Record<number, ChapterContent> = {};
        cachedChapters.forEach((ch: ChapterContent, i: number) => { map[i] = ch; });
        setCourseContentMap(map);
        if (user && resolvedCourse) {
          const content: CourseContent = { chapters: cachedChapters };
          const { pdfStorageUrl, layoutStorageUrl } = await resolveStorageUrls()
          const saved = await saveCourse(resolvedCourse.title, resolvedCourse, content, hash, pdfStorageUrl, layoutStorageUrl);
          if (saved) {
            setSavedCourseId(saved.id);
            localStorage.setItem(`justGenerated_${saved.id}`, 'true')
            runDiagnosticPrefetch(saved.id, buildDiagnosticChunks(resolvedCourse.title, resolvedCourse, map))
            onCourseSavedRef.current?.();
          }
        }
        setStatus('done');
        generationStatus = 'success'
      } else if (fromCache) {
        generationSource = 'cache'
        const results = await Promise.all(chapters.map(i => {
          const chapterLessons = resolvedCourse!.chapters[i]?.lessons ?? []
          const rawContexts = chapterLessons.map(l => extractRawContext(contentList, l.source_chunk_start, l.source_chunk_end))
          return fetchChapter(i, resolvedCourse || undefined, hash, rawContexts)
        }));
        results.forEach(ch => { if (ch && validChunkIds.size > 0) validateCitationMarkers(ch, validChunkIds) });
        if (user && resolvedCourse) {
          const chapterList = toCompleteChapterList(results)
          if (!chapterList) {
            setError('Một số chương chưa tạo xong. Vui lòng thử tạo lại trước khi lưu khóa học.')
            setStatus('done')
            return
          }
          const content: CourseContent = { chapters: chapterList };
          const { pdfStorageUrl, layoutStorageUrl } = await resolveStorageUrls()
          const saved = await saveCourse(resolvedCourse.title, resolvedCourse, content, hash, pdfStorageUrl, layoutStorageUrl);
          if (saved) {
            setSavedCourseId(saved.id);
            localStorage.setItem(`justGenerated_${saved.id}`, 'true')
            const fallbackMap: Record<number, ChapterContent> = {}
            results.forEach((ch, i) => { if (ch) fallbackMap[i] = ch })
            runDiagnosticPrefetch(saved.id, buildDiagnosticChunks(resolvedCourse.title, resolvedCourse, fallbackMap))
            onCourseSavedRef.current?.();
          }
        }
        setStatus('done');
        generationStatus = 'success'
      } else {
        const results = await Promise.all(
          chapters.map(i => {
            const chapterLessons = resolvedCourse!.chapters[i]?.lessons ?? []
            const rawContexts = chapterLessons.map(l => extractRawContext(contentList, l.source_chunk_start, l.source_chunk_end))
            return fetchChapter(i, resolvedCourse || undefined, hash, rawContexts)
          })
        )
        results.forEach(ch => { if (ch && validChunkIds.size > 0) validateCitationMarkers(ch, validChunkIds) })
        if (user && resolvedCourse) {
          const chapterList = toCompleteChapterList(results)
          if (!chapterList) {
            setError('Một số chương chưa tạo xong. Vui lòng thử tạo lại trước khi lưu khóa học.')
            setStatus('done')
            return
          }
          const content: CourseContent = { chapters: chapterList }
          const { pdfStorageUrl, layoutStorageUrl } = await resolveStorageUrls()
          const saved = await saveCourse(resolvedCourse.title, resolvedCourse, content, hash, pdfStorageUrl, layoutStorageUrl)
          if (saved) {
            currentSavedId = saved.id
            setSavedCourseId(saved.id)
            localStorage.setItem(`justGenerated_${saved.id}`, 'true')
          }
        }
        if (currentSavedId && user && resolvedCourse) {
          const chapterMap = results.reduce<Record<number, ChapterContent>>(
            (acc, ch, i) => { if (ch) acc[i] = ch; return acc }, {}
          )
          runDiagnosticPrefetch(currentSavedId, buildDiagnosticChunks(resolvedCourse.title, resolvedCourse, chapterMap))
        }
        setStatus('done')
        generationStatus = 'success'
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
      setStatus('idle');
      generationStatus = 'error'
    } finally {
      void trackMetric('course_generation_duration_ms', performance.now() - startedAt, {
        useCase: 'generate-course',
        status: generationStatus,
        provider: generationSource,
      })
    }
  }, [courses, user, saveCourse, fetchChapter, resetGeneration, runDiagnosticPrefetch, setPreviewPdfUrl, stopParseProgressPolling]);

  const stateValue = useMemo(() => ({
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
  }), [status, course, courseContentMap, stage2Loading, stage2Errors, rawMarkdown, error, currentHash, savedCourseId, isFromCache, diagnosticStatus, pdfLocalPath]);

  const progressValue = useMemo(() => ({
    parseProgress,
  }), [parseProgress]);

  const actionsValue = useMemo(() => ({
    startGeneration,
    resetGeneration,
    fetchChapter,
    registerCourseSavedHandler,
  }), [startGeneration, resetGeneration, fetchChapter, registerCourseSavedHandler]);

  return (
    <GenerationActionsContext.Provider value={actionsValue}>
      <GenerationStateContext.Provider value={stateValue}>
        <GenerationProgressContext.Provider value={progressValue}>
          {children}
        </GenerationProgressContext.Provider>
      </GenerationStateContext.Provider>
    </GenerationActionsContext.Provider>
  );
}

export function useGenerationState() {
  const context = useContext(GenerationStateContext);
  if (context === undefined) throw new Error('useGenerationState must be used within a GenerationProvider');
  return context;
}

export function useGenerationProgress() {
  const context = useContext(GenerationProgressContext);
  if (context === undefined) throw new Error('useGenerationProgress must be used within a GenerationProvider');
  return context;
}

export function useGenerationActions() {
  const context = useContext(GenerationActionsContext);
  if (context === undefined) throw new Error('useGenerationActions must be used within a GenerationProvider');
  return context;
}

/** @deprecated Use granular hooks for better performance */
export function useGeneration() {
  const state = useGenerationState();
  const progress = useGenerationProgress();
  const actions = useGenerationActions();
  return { ...state, ...progress, ...actions };
}
