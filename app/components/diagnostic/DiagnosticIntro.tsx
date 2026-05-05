'use client'

import { SynapsyLogo, GeoDecoration, T } from '@/app/components/synapsy'
import { SavedCourse } from '@/core/models/saved-course'

interface Props {
  course: SavedCourse
  onStart: () => void
  onSkip: () => void
}

export function DiagnosticIntro({ course, onStart, onSkip }: Props) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: T.bg, overflow: 'hidden', fontFamily: T.fontSans }}>
      {/* Header */}
      <div style={{ padding: '14px 28px', borderBottom: `1px solid ${T.ink10}`, background: T.bgSolid, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <SynapsyLogo size={18} />
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.03em', color: T.ink }}>Synapsy</span>
        <span style={{ fontSize: 11, color: T.ink40 }}>·</span>
        <span style={{ fontSize: 12, color: T.ink60 }}>{course.title}</span>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', overflowY: 'auto' }}>
        <div style={{ maxWidth: 560, width: '100%' }}>

          {/* Geo + icon + heading */}
          <div style={{ position: 'relative', textAlign: 'center', marginBottom: 40 }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 0 }}>
              <GeoDecoration size={320} color={T.accent} opacity={0.06} />
            </div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: T.ink, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <SynapsyLogo size={28} color={T.bgSolid} />
              </div>
              <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.04em', margin: '0 0 12px', color: T.ink, lineHeight: 1.1 }}>
                Trước khi học,<br />hãy thử một bài test nhanh
              </h1>
              <p style={{ fontSize: 15, color: T.ink60, margin: '0 0 6px', lineHeight: 1.6 }}>
                12 câu trắc nghiệm · khoảng 3–5 phút
              </p>
              <p style={{ fontSize: 13, color: T.ink40, margin: 0, lineHeight: 1.6 }}>
                Synapsy sẽ tô màu sơ đồ kiến thức theo điểm của bạn —<br />
                xanh là đã nắm, vàng cần ôn, đỏ là điểm yếu cần ưu tiên.
              </p>
            </div>
          </div>

          {/* What you get */}
          <div style={{ background: T.bgSolid, border: `1px solid ${T.ink10}`, borderRadius: 14, padding: '20px 24px', marginBottom: 24 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: T.ink40, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 14px' }}>Bạn nhận được gì</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { dot: T.srsGood, text: 'Bản đồ kiến thức tô màu theo mức độ nắm vững' },
                { dot: T.srsHard, text: 'Danh sách bài yếu được ưu tiên lên đầu' },
                { dot: T.accent, text: 'Lịch ôn cá nhân hóa từ ngày đầu tiên' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.dot, flexShrink: 0, marginTop: 5 }} />
                  <p style={{ fontSize: 13, color: T.ink80, margin: 0, lineHeight: 1.5 }}>{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={onStart} style={{ width: '100%', background: T.ink, color: T.bgSolid, padding: '14px', borderRadius: 11, fontSize: 15, fontWeight: 800, cursor: 'pointer', letterSpacing: '-0.02em', border: 'none' }}>
              Làm bài test →
            </button>
            <button onClick={onSkip} style={{ width: '100%', background: 'transparent', color: T.ink60, padding: '11px', borderRadius: 11, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: `1px solid ${T.ink10}` }}>
              Bỏ qua, vào học luôn
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
