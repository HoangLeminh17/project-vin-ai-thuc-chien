'use client'

import { T } from '@/app/components/synapsy'
import { type DiagnosticStatus } from '@/lib/contexts/generation-context'

interface PipelineTrackerProps {
  parsed: boolean
  outlined: boolean
  chaptersDone: number
  chaptersTotal: number
  allDone: boolean
  diagnosticStatus: DiagnosticStatus
}

export function PipelineTracker({
  parsed,
  outlined,
  chaptersDone,
  chaptersTotal,
  allDone,
  diagnosticStatus,
}: PipelineTrackerProps) {
  const diagState =
    diagnosticStatus === 'done'
      ? 'done'
      : diagnosticStatus === 'loading'
        ? 'active'
        : diagnosticStatus === 'error'
          ? 'error'
          : 'pending'

  const stages: { label: string; state: 'done' | 'active' | 'pending' | 'error' }[] = [
    { label: 'Đọc PDF', state: parsed ? 'done' : 'active' },
    { label: 'Phân tích cấu trúc', state: parsed ? (outlined ? 'done' : 'active') : 'pending' },
    {
      label: `Tạo concept cards · ${chaptersDone}/${chaptersTotal}`,
      state: !outlined ? 'pending' : allDone ? 'done' : 'active',
    },
    { label: 'Tạo bài test trình độ', state: diagState },
  ]

  return (
    <div
      style={{
        padding: '14px 16px',
        background: T.bgSunken,
        borderRadius: 8,
        fontSize: 11,
        color: T.ink60,
        lineHeight: 1.55,
      }}
    >
      <p
        className="sy-mono"
        style={{
          margin: 0,
          fontWeight: 600,
          color: T.ink80,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontSize: 10,
          marginBottom: 8,
        }}
      >
        Pipeline
      </p>
      <div className="sy-mono" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {stages.map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {s.state === 'done' && <span style={{ color: T.srsGood }}>✓</span>}
            {s.state === 'active' && (
              <span className="sy-animate-pulse" style={{ color: T.accent }}>
                ◉
              </span>
            )}
            {s.state === 'pending' && <span style={{ color: T.ink20 }}>○</span>}
            {s.state === 'error' && <span style={{ color: T.srsAgain }}>✕</span>}
            <span
              style={{
                color:
                  s.state === 'pending' ? T.ink40 : s.state === 'error' ? T.srsAgain : T.ink60,
              }}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
