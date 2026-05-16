'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useAuth } from '@/lib/contexts/auth-context'
import { Spinner } from '@/app/components'
import { useCourses } from '@/lib/hooks/use-courses'
import {
  useGenerationState,
  useGenerationActions,
} from '@/lib/contexts/generation-context'
import { T } from '@/app/components/synapsy'

// Hooks
import { useSRSStats } from '@/lib/hooks/use-srs-stats'
import { useProgressMap, buildHeatmap } from '@/lib/hooks/use-progress-map'
import { useUktMastery } from '@/lib/hooks/use-ukt-mastery'

// Components
import { DashboardView } from './components/dashboard/DashboardView'
import { GenerationScreen } from './components/dashboard/GenerationScreen'
import { LoadingScreen } from './components/dashboard/LoadingScreen'
import { ErrorScreen } from './components/dashboard/ErrorScreen'

// Utils
import { courseStats } from '@/lib/course-stats'

export default function Home() {
  const {
    status,
    course,
    courseContentMap,
    stage2Loading,
    stage2Errors,
    error,
    rawMarkdown,
    savedCourseId,
    diagnosticStatus,
  } = useGenerationState()

  const { startGeneration, resetGeneration, fetchChapter } = useGenerationActions()

  const [file, setFile] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { user, loading: authLoading, login, logout } = useAuth()
  const stableUserId = authLoading ? null : user?.uid ?? null
  const {
    courses,
    loading: coursesLoading,
    deleteCourse,
    refresh: refreshCourses,
    error: deleteError,
  } = useCourses(stableUserId)

  const prevStatus = useRef(status)
  useEffect(() => {
    if (prevStatus.current !== 'idle' && status === 'idle') refreshCourses()
    prevStatus.current = status
  }, [status, refreshCourses])

  const uniqueCourses = useMemo(() => {
    if (!Array.isArray(courses)) return []
    const seenHashes = new Set<string>()
    const seenTitles = new Set<string>()
    return courses.filter(c => {
      if (!c) return false
      if (c.contentHash) {
        if (seenHashes.has(c.contentHash)) return false
        seenHashes.add(c.contentHash)
        seenTitles.add(c.title)
        return true
      }
      if (seenTitles.has(c.title)) return false
      seenTitles.add(c.title)
      return true
    })
  }, [courses])

  const { stats: srsStats, loading: srsLoading } = useSRSStats(stableUserId)
  const progressMap = useProgressMap(stableUserId)
  const { points: moduleMastery, loading: uktMasteryLoading } = useUktMastery(stableUserId)

  const reset = useCallback(() => {
    setFile(null)
    resetGeneration()
    if (inputRef.current) inputRef.current.value = ''
  }, [resetGeneration])

  const handleFile = (f: File | null) => {
    if (f && f.type === 'application/pdf') setFile(f)
  }
  const handleStart = () => {
    if (file) startGeneration(file)
  }

  const courseStatsMap = useMemo(() => {
    return Object.fromEntries(uniqueCourses.map(c => [c.id, courseStats(c, progressMap)]))
  }, [uniqueCourses, progressMap])

  const totalLibraryCards = useMemo(() => {
    return uniqueCourses.reduce((sum, c) => sum + (courseStatsMap[c.id]?.total ?? 0), 0)
  }, [uniqueCourses, courseStatsMap])

  // ── Render States ──

  // 1. Loading screen (Parsing or Course Planning)
  if (status === 'parsing' || (status === 'generating' && !course)) {
    return <LoadingScreen />
  }

  // 2. Generation screen (Chapter Content Creation)
  if (course && (status === 'generating' || status === 'done')) {
    return (
      <GenerationScreen
        course={course}
        stage2Loading={stage2Loading}
        courseContentMap={courseContentMap}
        rawMarkdown={rawMarkdown}
        savedCourseId={savedCourseId}
        stage2Errors={stage2Errors}
        diagnosticStatus={diagnosticStatus}
        onReset={reset}
        onRetryChapter={async i => {
          await fetchChapter(i)
        }}
      />
    )
  }

  // 3. Error screen
  if (error && !course) {
    return <ErrorScreen file={file} onReset={reset} />
  }

  // 4. Default: Dashboard screen
  if (authLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: T.bg }}
      >
        <Spinner />
      </div>
    )
  }

  const heatmap = buildHeatmap(progressMap)
  const totalCardsReviewed = heatmap.reduce((a, b) => a + b, 0)

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files?.[0] ?? null)}
      />
      <DashboardView
        user={user}
        streak={srsStats?.streak ?? 0}
        logout={logout}
        login={login}
        srsStats={srsStats}
        srsLoading={srsLoading}
        inputRef={inputRef}
        heatmap={heatmap}
        totalCardsReviewed={totalCardsReviewed}
        totalLibraryCards={totalLibraryCards}
        moduleMastery={moduleMastery}
        uktMasteryLoading={uktMasteryLoading}
        courses={courses}
        coursesLoading={coursesLoading}
        deleteError={deleteError}
        deleteCourse={deleteCourse}
        progressMap={progressMap}
        courseStatsMap={courseStatsMap}
        file={file}
        setFile={setFile}
        handleStart={handleStart}
        error={error}
      />
    </>
  )
}
