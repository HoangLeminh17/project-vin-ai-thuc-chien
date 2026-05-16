'use client'

import { RefObject } from 'react'
import { T } from '@/app/components/synapsy'
import { KnowledgeSpiderChart } from '@/app/components/knowledge/KnowledgeSpiderChart'
import { SavedCourse } from '@/core/models/saved-course'
import { SRSStats } from '@/lib/hooks/use-srs-stats'
import { ModuleMasteryPoint } from '@/lib/ukt-module-mastery'
import { DashboardHeader } from './DashboardHeader'
import { HeroSection } from './HeroSection'
import { DashboardStats } from './DashboardStats'
import { HeatmapSection } from './HeatmapSection'
import { CourseLibrary } from './CourseLibrary'

interface DashboardViewProps {
  user: any
  streak: number
  logout: () => void
  login: () => void
  srsStats: SRSStats | null
  srsLoading: boolean
  inputRef: RefObject<HTMLInputElement | null>
  heatmap: number[]
  totalCardsReviewed: number
  totalLibraryCards: number
  moduleMastery: ModuleMasteryPoint[]
  uktMasteryLoading: boolean
  courses: SavedCourse[]
  coursesLoading: boolean
  deleteError: string
  deleteCourse: (id: string) => Promise<boolean>
  courseStatsMap: Record<string, any>
  file: File | null
  setFile: (f: File | null) => void
  handleStart: () => void
  error: string | null
}

export function DashboardView({
  user,
  streak,
  logout,
  login,
  srsStats,
  srsLoading,
  inputRef,
  heatmap,
  totalCardsReviewed,
  totalLibraryCards,
  moduleMastery,
  uktMasteryLoading,
  courses,
  coursesLoading,
  deleteError,
  deleteCourse,
  courseStatsMap,
  file,
  setFile,
  handleStart,
  error,
}: DashboardViewProps) {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: T.bg,
        fontFamily: T.fontSans,
        color: T.ink,
      }}
    >
      <DashboardHeader user={user} streak={streak} logout={logout} login={login} />

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 32px 80px' }}>
        <HeroSection
          user={user}
          srsStats={srsStats}
          srsLoading={srsLoading}
          inputRef={inputRef}
        />

        {user && (
          <>
            <DashboardStats
              streak={streak}
              totalCardsReviewed={totalCardsReviewed}
              totalLibraryCards={totalLibraryCards}
            />

            <section
              style={{
                marginBottom: 44,
                opacity: uktMasteryLoading ? 0.82 : 1,
                transition: 'opacity 0.15s ease',
              }}
            >
              <KnowledgeSpiderChart points={moduleMastery} />
            </section>

            <HeatmapSection heatmap={heatmap} totalCardsReviewed={totalCardsReviewed} />
          </>
        )}

        <CourseLibrary
          user={user}
          login={login}
          courses={courses}
          coursesLoading={coursesLoading}
          deleteError={deleteError}
          deleteCourse={deleteCourse}
          courseStatsMap={courseStatsMap}
          file={file}
          setFile={setFile}
          handleStart={handleStart}
          inputRef={inputRef}
          error={error}
        />

        {/* ── Upload CTA footer ── */}
        <section style={{ marginTop: 48 }}>
          <div
            style={{
              background: T.ink,
              borderRadius: 12,
              padding: '20px 28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  margin: 0,
                  color: T.bgSolid,
                  letterSpacing: '-0.01em',
                }}
              >
                Thêm tài liệu mới
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '3px 0 0' }}>
                PDF · slide · ghi chú — Synapsy trích xuất concept và tạo flashcard tự động
              </p>
            </div>
            <button
              onClick={() => inputRef.current?.click()}
              style={{
                background: T.bgSolid,
                color: T.ink,
                padding: '10px 18px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              Chọn file PDF
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}
