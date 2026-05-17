'use client'

import { useRouter } from 'next/navigation'
import { Course, ChapterContent } from '@/core/models/learning-model'
import { type DiagnosticStatus } from '@/lib/contexts/generation-context'
import { SynapsyLogo, T } from '@/app/components/synapsy'
import { FlashFactGallery } from '@/app/components'
import { PipelineTracker } from './PipelineTracker'

interface GenerationScreenProps {
  course: Course
  stage2Loading: Record<number, boolean>
  courseContentMap: Record<number, ChapterContent>
  rawMarkdown: string
  savedCourseId: string | null
  stage2Errors: Record<number, string>
  diagnosticStatus: DiagnosticStatus
  onRetryChapter: (i: number) => void
  onReset: () => void
}

export function GenerationScreen({
  course,
  stage2Loading,
  courseContentMap,
  rawMarkdown,
  savedCourseId,
  stage2Errors,
  diagnosticStatus,
  onRetryChapter,
  onReset,
}: GenerationScreenProps) {
  const router = useRouter()
  const doneCount = Object.keys(courseContentMap).length
  const allDone = course?.chapters?.every((_, i) => courseContentMap[i] !== undefined) ?? false

  const handleGoBack = () => {
    if (savedCourseId) localStorage.removeItem(`justGenerated_${savedCourseId}`)
    onReset()
  }

  const handleStudyNow = () => {
    if (!savedCourseId) return
    router.push(`/course/${savedCourseId}`)
    onReset()
  }

  const handleSkipDiagnosticAndStudy = () => {
    if (!savedCourseId) return
    localStorage.removeItem(`justGenerated_${savedCourseId}`)
    localStorage.setItem(`diagnosticDone_${savedCourseId}`, 'true')
    router.push(`/course/${savedCourseId}`)
    onReset()
  }

  return (
    <main className="min-h-screen" style={{ background: T.bg, fontFamily: T.fontSans }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 28px',
          borderBottom: `1px solid ${T.ink10}`,
          background: T.bgSolid,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <SynapsyLogo size={18} />
          <span
            className="sy-serif"
            style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.03em' }}
          >
            Synapsy
          </span>
          <div style={{ height: 16, width: 1, background: T.ink10 }} />
          <button
            onClick={handleGoBack}
            style={{ fontSize: 13, color: T.ink60, fontWeight: 500 }}
          >
            ← Quay về Thư viện
          </button>
        </div>
        <span className="sy-mono" style={{ fontSize: 12, color: T.ink60 }}>
          {allDone ? '✓ Hoàn thành!' : `Đang biên soạn · ${doneCount}/${course.chapters.length} chương`}
        </span>
      </div>

      <div style={{ height: 3, background: T.ink10 }}>
        <div
          style={{
            width: `${(doneCount / Math.max(course.chapters.length, 1)) * 100}%`,
            height: '100%',
            background: T.accent,
            transition: 'width 0.4s ease',
          }}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          minHeight: 'calc(100vh - 55px)',
        }}
      >
        <div style={{ padding: '28px 32px', borderRight: `1px solid ${T.ink10}` }}>
          <p
            className="sy-mono"
            style={{
              fontSize: 11,
              color: T.ink40,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontWeight: 600,
              margin: '0 0 6px',
            }}
          >
            Đang biên soạn
          </p>
          <h1
            className="sy-serif"
            style={{
              fontSize: 24,
              fontWeight: 700,
              margin: '0 0 4px',
              letterSpacing: '-0.02em',
              color: T.ink,
            }}
          >
            {course.title}
          </h1>
          <p className="sy-mono" style={{ fontSize: 12, color: T.ink60, margin: '0 0 24px' }}>
            {course.chapters.length} chương
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {course.chapters.map((ch, ci) => {
              const isDone = courseContentMap[ci] !== undefined
              const isLoading = stage2Loading[ci]
              return (
                <div
                  key={ci}
                  style={{
                    background: T.bgSolid,
                    border: `1px solid ${isLoading ? T.accent + '66' : isDone ? T.srsGood + '44' : T.ink10}`,
                    borderRadius: 10,
                    padding: '14px 18px',
                    opacity: !isDone && !isLoading ? 0.6 : 1,
                    transition: 'opacity 0.3s, border-color 0.3s',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <span
                        className="sy-mono"
                        style={{ fontSize: 11, color: T.ink40, flexShrink: 0 }}
                      >
                        0{ci + 1}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          className="sy-serif"
                          style={{
                            fontSize: 15,
                            fontWeight: 600,
                            margin: 0,
                            color: T.ink,
                            letterSpacing: '-0.005em',
                          }}
                        >
                          {ch.title}
                        </p>
                        <p className="sy-mono" style={{ fontSize: 11, color: T.ink60, margin: '3px 0 0' }}>
                          {isDone
                            ? `${ch.lessons?.length ?? 0} bài · sẵn sàng đọc`
                            : stage2Errors[ci]
                              ? `Lỗi: ${stage2Errors[ci]}`
                              : isLoading
                                ? 'Đang tạo nội dung...'
                                : 'Đang chờ...'}
                        </p>
                      </div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      {stage2Errors[ci] && (
                        <button
                          onClick={() => onRetryChapter(ci)}
                          style={{
                            fontSize: 11,
                            color: T.accent,
                            background: T.bgSunken,
                            padding: '4px 8px',
                            borderRadius: 6,
                          }}
                        >
                          Thử lại
                        </button>
                      )}
                      {isLoading && (
                        <div
                          className="sy-animate-spin"
                          style={{
                            width: 16,
                            height: 16,
                            border: `2px solid ${T.ink10}`,
                            borderTopColor: T.accent,
                            borderRadius: '50%',
                          }}
                        />
                      )}
                      {isDone && <span style={{ fontSize: 13, color: T.srsGood }}>✓</span>}
                    </div>
                  </div>
                  {ch.lessons?.length > 0 && (
                    <div
                      style={{
                        marginTop: 10,
                        paddingTop: 10,
                        borderTop: `1px solid ${T.ink10}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 5,
                      }}
                    >
                      {ch.lessons.map((lesson, li) => (
                        <div key={li} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            className="sy-mono"
                            style={{
                              fontSize: 10,
                              color: isDone ? T.srsGood : isLoading ? T.accent : T.ink20,
                              flexShrink: 0,
                              width: 10,
                            }}
                          >
                            {isDone ? '✓' : isLoading ? '◉' : '○'}
                          </span>
                          <span
                            className="sy-mono"
                            style={{ fontSize: 11, color: isDone ? T.ink60 : T.ink40, lineHeight: 1.4 }}
                          >
                            {lesson.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        <div
          style={{
            padding: '28px',
            background: T.bgSoft,
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          <div>
            <p
              className="sy-mono"
              style={{
                fontSize: 10,
                color: T.accent,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                fontWeight: 600,
                margin: '0 0 14px',
              }}
            >
              💡 Flash Facts
            </p>
            <FlashFactGallery markdown={rawMarkdown} />
          </div>
          <PipelineTracker
            parsed={Boolean(rawMarkdown)}
            outlined={true}
            chaptersDone={doneCount}
            chaptersTotal={course.chapters.length}
            allDone={allDone}
            diagnosticStatus={diagnosticStatus}
          />
          {allDone && savedCourseId && (diagnosticStatus === 'done' || diagnosticStatus === 'error') && (
            <div
              style={{
                padding: '18px 18px 20px',
                background: T.bgSolid,
                border: `1px solid ${T.ink10}`,
                borderRadius: 12,
              }}
            >
              <p style={{ fontSize: 16, fontWeight: 700, color: T.ink, margin: '0 0 4px' }}>
                {'Khóa học đã sẵn sàng!'}
              </p>
              <p style={{ fontSize: 12, color: T.ink60, margin: '0 0 16px', lineHeight: 1.55 }}>
                {diagnosticStatus === 'done'
                  ? 'Bài test chẩn đoán đã được chuẩn bị sẵn. Bạn có thể vào test ngay hoặc vào học luôn.'
                  : 'Không tạo được bài test, nhưng bạn vẫn có thể vào học ngay bây giờ.'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {diagnosticStatus === 'done' && (
                  <button
                    onClick={handleStudyNow}
                    style={{
                      background: T.ink,
                      color: T.bgSolid,
                      padding: '11px 16px',
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: '1px solid transparent',
                      textAlign: 'left',
                    }}
                  >
                    {'Vào bài test trình độ'}
                  </button>
                )}
                <button
                  onClick={handleSkipDiagnosticAndStudy}
                  style={{
                    background: T.bgSolid,
                    color: T.ink,
                    padding: '11px 16px',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: `1px solid ${T.ink}`,
                    textAlign: 'left',
                  }}
                >
                  {'Vào học luôn'}
                </button>
                <button
                  onClick={handleGoBack}
                  style={{
                    background: T.bgSolid,
                    color: T.ink60,
                    padding: '11px 16px',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                    border: `1px solid ${T.ink10}`,
                    textAlign: 'left',
                  }}
                >
                  {'Về thư viện'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
