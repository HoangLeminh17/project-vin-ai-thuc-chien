'use client'

import { type DragEvent, useState, RefObject } from 'react'
import { useRouter } from 'next/navigation'
import { T, SynapsyRing } from '@/app/components/synapsy'
import { SavedCourse } from '@/core/models/saved-course'

interface CourseLibraryProps {
  user: any
  login: () => void
  courses: SavedCourse[]
  coursesLoading: boolean
  deleteError: string
  deleteCourse: (id: string) => Promise<boolean>
  courseStatsMap: Record<string, any>
  file: File | null
  setFile: (f: File | null) => void
  handleStart: () => void
  inputRef: RefObject<HTMLInputElement | null>
  error: string | null
}

export function CourseLibrary({
  user,
  login,
  courses,
  coursesLoading,
  deleteError,
  deleteCourse,
  courseStatsMap,
  file,
  setFile,
  handleStart,
  inputRef,
  error,
}: CourseLibraryProps) {
  const router = useRouter()
  const [dragOver, setDragOver] = useState(false)

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0] ?? null
    if (f && f.type === 'application/pdf') setFile(f)
  }

  const uniqueCourses = courses.filter((c, i, self) => {
    if (!c) return false
    if (c.contentHash) {
      return self.findIndex(x => x?.contentHash === c.contentHash) === i
    }
    return self.findIndex(x => x?.title === c.title) === i
  })

  return (
    <section>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 18,
        }}
      >
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>
          Thư viện
        </h2>
        {!user && (
          <button
            onClick={login}
            style={{
              background: T.ink,
              color: T.bgSolid,
              padding: '8px 18px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Đăng nhập để xem
          </button>
        )}
      </div>

      {deleteError && (
        <div
          style={{
            marginBottom: 14,
            padding: '10px 14px',
            background: '#fff5f5',
            border: '1px solid #fecdcd',
            borderRadius: 8,
            fontSize: 13,
            color: '#7a0000',
          }}
        >
          {deleteError}
        </div>
      )}

      {/* File selected: show start button */}
      {file && (
        <div
          style={{
            marginBottom: 16,
            padding: '14px 18px',
            background: T.accentSoft,
            border: `1.5px solid ${T.accent}`,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: T.ink, margin: 0 }}>{file.name}</p>
            <p className="sy-mono" style={{ fontSize: 11, color: T.ink60, margin: '2px 0 0' }}>
              {(file.size / 1024 / 1024).toFixed(1)} MB
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleStart}
              style={{
                background: T.ink,
                color: T.bgSolid,
                padding: '9px 20px',
                borderRadius: 9,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Tạo khóa học →
            </button>
            <button
              onClick={() => setFile(null)}
              style={{
                background: T.bgSolid,
                color: T.ink60,
                padding: '9px 14px',
                borderRadius: 9,
                fontSize: 13,
                border: `1px solid ${T.ink10}`,
                cursor: 'pointer',
              }}
            >
              Bỏ
            </button>
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            background: '#fff5f5',
            border: '1px solid #fecdcd',
            borderRadius: 10,
            fontSize: 13,
            color: '#7a0000',
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
          gap: 12,
        }}
      >
        {coursesLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="sy-animate-pulse"
              style={{ height: 148, borderRadius: 12, background: T.ink10 }}
            />
          ))
        ) : (
          uniqueCourses.map(c => {
            const s = courseStatsMap[c.id] || { masteryPct: 0, due: 0, total: 0 }
            const chapterCount = c.course.chapters.length
            return (
              <div
                key={c.id}
                onClick={() => router.push(`/course/${c.id}`)}
                style={{
                  background: T.bgSolid,
                  border: `1px solid ${T.ink10}`,
                  borderRadius: 12,
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  cursor: 'pointer',
                  transition: 'box-shadow 0.15s',
                }}
                onMouseEnter={e =>
                  (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.07)')
                }
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
              >
                <div
                  style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}
                >
                  <SynapsyRing pct={s.masteryPct} size={28} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {s.due > 0 && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          background: T.ink,
                          color: T.bgSolid,
                          padding: '2px 8px',
                          borderRadius: 20,
                        }}
                      >
                        {s.due}
                      </span>
                    )}
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        deleteCourse(c.id)
                      }}
                      style={{
                        fontSize: 12,
                        color: T.ink40,
                        padding: 4,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        lineHeight: 1,
                      }}
                      title="Xóa"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <h3
                  className="sy-serif"
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    margin: 0,
                    letterSpacing: '-0.005em',
                    lineHeight: 1.3,
                    color: T.ink,
                  }}
                >
                  {c.title}
                </h3>
                <div
                  className="sy-mono"
                  style={{ fontSize: 11, color: T.ink40, display: 'flex', gap: 6, alignItems: 'center' }}
                >
                  <span>{chapterCount} chương</span>
                  <span>·</span>
                  <span>{s.total} thẻ</span>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: T.ink60,
                    marginTop: 'auto',
                    paddingTop: 8,
                    borderTop: `1px solid ${T.ink10}`,
                  }}
                >
                  {new Date(c.createdAt).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                  })}
                </div>
              </div>
            )
          })
        )}

        {/* Upload tile */}
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          style={{
            border: `1.5px dashed ${dragOver ? T.accent : T.ink20}`,
            background: dragOver ? T.accentSoft : 'transparent',
            borderRadius: 12,
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 148,
            gap: 8,
            color: T.ink60,
            cursor: 'pointer',
            transition: 'border-color 0.15s, background 0.15s',
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: T.bgSolid,
              border: `1px solid ${T.ink10}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              color: T.ink40,
            }}
          >
            +
          </div>
          <p style={{ fontSize: 12, margin: 0, fontWeight: 500 }}>Thả PDF vào đây</p>
          <p className="sy-mono" style={{ fontSize: 10, margin: 0, color: T.ink40 }}>
            hoặc click để chọn
          </p>
        </div>
      </div>
    </section>
  )
}
