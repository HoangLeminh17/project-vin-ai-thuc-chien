'use client'

import { SynapsyRing, T } from '@/app/components/synapsy'
import type { NavTab } from './NavRail'

export interface CourseRow {
  id: string
  title: string
  masteryPct: number
  due: number
}

interface Props {
  activeTab: NavTab
  courses: CourseRow[]
  coursesLoading: boolean
  selectedCourseId: string | null
  selectedCourseIds: string[]
  onCourseAction: (id: string) => void
  onUploadClick: () => void
}

function FileIco() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M9 1H3a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V5L9 1z" stroke={T.ink40} strokeWidth="1.1" fill={T.bgSoft} />
      <path d="M9 1v4h4" stroke={T.ink40} strokeWidth="1.1" />
    </svg>
  )
}

export function DocDrawer({ activeTab, courses, coursesLoading, selectedCourseId, selectedCourseIds, onCourseAction, onUploadClick }: Props) {
  const isSRS = activeTab === 'srs'

  return (
    <div style={{
      width: 258, flexShrink: 0, height: '100vh',
      background: T.bgSolid, borderRight: `1px solid ${T.ink10}`,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '15px 16px 11px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${T.ink10}`, flexShrink: 0,
      }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: T.ink40, letterSpacing: '0.09em', fontFamily: T.fontSans }}>
          {isSRS ? 'CHỌN ĐỂ ÔN TẬP' : 'TÀI LIỆU'}
        </span>
        <button
          onClick={onUploadClick}
          title="Thêm tài liệu mới"
          style={{
            width: 24, height: 24, background: T.bgSunken, border: 'none', borderRadius: 6,
            cursor: 'pointer', fontSize: 16, color: T.ink60, fontWeight: 300,
            display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
          }}
        >+</button>
      </div>

      {/* Course list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0 12px' }}>
        {coursesLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="sy-animate-pulse" style={{ height: 42, margin: '4px 12px', borderRadius: 8, background: T.ink10 }} />
          ))
        ) : courses.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: T.ink40, margin: 0, lineHeight: 1.6 }}>
              Chưa có tài liệu.<br />
              <button onClick={onUploadClick} style={{ color: T.accent, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                + Tải PDF lên
              </button>
            </p>
          </div>
        ) : (
          courses.map(course => {
            const isSel = isSRS
              ? selectedCourseIds.includes(course.id)
              : selectedCourseId === course.id
            return (
              <div
                key={course.id}
                onClick={() => onCourseAction(course.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 14px', cursor: 'pointer',
                  background: isSel && !isSRS ? T.accent + '10' : 'transparent',
                  borderLeft: !isSRS && isSel ? `2px solid ${T.accent}` : '2px solid transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!isSel || isSRS) e.currentTarget.style.background = T.bgSunken }}
                onMouseLeave={e => { if (!isSel || isSRS) e.currentTarget.style.background = 'transparent' }}
              >
                {isSRS && (
                  <input
                    type="checkbox"
                    checked={isSel}
                    onChange={() => onCourseAction(course.id)}
                    onClick={e => e.stopPropagation()}
                    style={{ width: 13, height: 13, accentColor: T.accent, cursor: 'pointer', flexShrink: 0 }}
                  />
                )}
                {!isSRS && <FileIco />}
                <span style={{
                  flex: 1, fontSize: 12.5,
                  color: !isSRS && isSel ? T.accent : T.ink,
                  fontWeight: isSel ? 600 : 400,
                  fontFamily: T.fontSans,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{course.title}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {course.due > 0 && (
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: '#dc2626', background: '#fff1f1', padding: '1px 5px', borderRadius: 4 }}>
                      {course.due}
                    </span>
                  )}
                  <SynapsyRing pct={course.masteryPct} size={20} strokeWidth={2.5} />
                </div>
              </div>
            )
          })
        )}

        {courses.length > 0 && (
          <button
            onClick={onUploadClick}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', cursor: 'pointer',
              background: 'none', border: 'none', width: '100%', textAlign: 'left',
              marginTop: 4,
            }}
          >
            <span style={{ fontSize: 12.5, color: T.ink40, fontFamily: T.fontSans }}>+ Thêm tài liệu</span>
          </button>
        )}
      </div>
    </div>
  )
}
