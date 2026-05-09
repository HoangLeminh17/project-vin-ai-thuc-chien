'use client'

import { SynapsyLogo, T } from '@/app/components/synapsy'
import { DiagnosticQuestion } from '@/core/models/learning-model'
import { SavedCourse } from '@/core/models/saved-course'

interface Props {
  questions: DiagnosticQuestion[]
  answers: Record<number, number>
  onComplete: (results: Record<string, number>) => void
}

// lesson/topic score percent → map lessonId/topic → pct for CourseTree coloring
function buildResults(questions: DiagnosticQuestion[], answers: Record<number, number>): Record<string, number> {
  const topicScores: Record<string, { total: number; correct: number }> = {}
  questions.forEach((q, i) => {
    const key = q.source_chunk_id ?? q.topic
    if (!topicScores[key]) topicScores[key] = { total: 0, correct: 0 }
    topicScores[key].total++
    if (answers[i] === q.answer) topicScores[key].correct++
  })
  const out: Record<string, number> = {}
  Object.entries(topicScores).forEach(([key, s]) => {
    out[key] = Math.round((s.correct / s.total) * 100)
  })
  return out
}

export function DiagnosticResults({ questions, answers, onComplete }: Props) {
  const scored = questions.map((q, i) => ({ ...q, userAnswer: answers[i], isCorrect: answers[i] === q.answer }))
  const totalCorrect = scored.filter(q => q.isCorrect).length
  const pct = Math.round((totalCorrect / questions.length) * 100)

  // Chapter score breakdown (group by topic prefix or all questions)
  const topicGroups: Record<string, { total: number; correct: number }> = {}
  scored.forEach(q => {
    const key = q.topic
    if (!topicGroups[key]) topicGroups[key] = { total: 0, correct: 0 }
    topicGroups[key].total++
    if (q.isCorrect) topicGroups[key].correct++
  })

  const weakTopics = Object.entries(topicGroups).filter(([, s]) => s.correct / s.total < 0.6).map(([topic, s]) => ({ topic, pct: Math.round((s.correct / s.total) * 100) }))
  const strongTopics = Object.entries(topicGroups).filter(([, s]) => s.correct / s.total >= 0.8).map(([topic, s]) => ({ topic, pct: Math.round((s.correct / s.total) * 100) }))

  const scoreColor = pct >= 80 ? T.srsGood : pct >= 50 ? T.srsHard : T.srsAgain
  const scoreLabel = pct >= 80 ? 'Khá tốt' : pct >= 50 ? 'Trung bình' : 'Cần cải thiện'
  const r = 42
  const circumference = 2 * Math.PI * r

  const handleStart = () => onComplete(buildResults(questions, answers))

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: T.bg, overflow: 'hidden', fontFamily: T.fontSans }}>

      {/* Header */}
      <div style={{ padding: '14px 28px', borderBottom: `1px solid ${T.ink10}`, background: T.bgSolid, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <SynapsyLogo size={18} />
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.03em', color: T.ink }}>Synapsy</span>
        <span style={{ fontSize: 11, color: T.ink40 }}>·</span>
        <span style={{ fontSize: 12, color: T.ink60 }}>Kết quả kiểm tra đầu vào</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '40px 52px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>

          {/* Score hero */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 28, alignItems: 'center', marginBottom: 36 }}>
            {/* Big score ring */}
            <div style={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
              <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="50" cy="50" r={r} fill="none" stroke={T.ink10} strokeWidth="7" />
                <circle cx="50" cy="50" r={r} fill="none" stroke={scoreColor} strokeWidth="7"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - pct / 100)}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 26, fontWeight: 800, color: T.ink, letterSpacing: '-0.04em', lineHeight: 1 }}>
                  {pct}<span style={{ fontSize: 14, fontWeight: 600 }}>%</span>
                </span>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <h2 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: '-0.035em', color: T.ink }}>
                  {totalCorrect}/{questions.length} câu đúng
                </h2>
                <span style={{ fontSize: 11, fontWeight: 700, color: scoreColor, background: `${scoreColor}18`, padding: '3px 10px', borderRadius: 20 }}>{scoreLabel}</span>
              </div>
              <p style={{ fontSize: 14, color: T.ink60, margin: 0, lineHeight: 1.5 }}>
                {weakTopics.length > 0
                  ? `Có ${weakTopics.length} chủ đề cần tập trung học. Synapsy đã tô màu sơ đồ kiến thức theo điểm của bạn.`
                  : 'Bạn có nền tảng tốt! Tiếp tục để củng cố kiến thức sâu hơn.'}
              </p>
            </div>
          </div>

          {/* Topic breakdown */}
          <div style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: T.ink40, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px' }}>Theo chủ đề</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(topicGroups).map(([topic, s]) => {
                const tPct = Math.round((s.correct / s.total) * 100)
                const barColor = tPct >= 80 ? T.srsGood : tPct >= 50 ? T.srsHard : T.srsAgain
                return (
                  <div key={topic} style={{ background: T.bgSolid, border: `1px solid ${T.ink10}`, borderRadius: 10, padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{topic}</span>
                      <span className="sy-mono" style={{ fontSize: 12, color: T.ink60, fontWeight: 600 }}>{s.correct}/{s.total}</span>
                    </div>
                    <div style={{ height: 5, background: T.ink10, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${tPct}%`, height: '100%', background: barColor, borderRadius: 3, transition: 'width 0.8s ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Weak areas */}
          {weakTopics.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: T.ink40, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px' }}>Vùng yếu — cần ưu tiên học</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {weakTopics.map(l => (
                  <div key={l.topic} style={{ padding: '8px 14px', background: '#fff5f5', border: '1.5px solid #fecdcd', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.srsAgain, flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, margin: 0, color: T.ink }}>{l.topic}</p>
                      <p className="sy-mono" style={{ fontSize: 10, color: T.ink60, margin: 0 }}>{l.pct}% đúng</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strong areas */}
          {strongTopics.length > 0 && (
            <div style={{ marginBottom: 36 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: T.ink40, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px' }}>Điểm mạnh — đã nắm vững</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {strongTopics.map(l => (
                  <div key={l.topic} style={{ padding: '8px 14px', background: '#f0faf5', border: '1.5px solid #b7e6cc', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.srsGood, flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, margin: 0, color: T.ink }}>{l.topic}</p>
                      <p className="sy-mono" style={{ fontSize: 10, color: T.ink60, margin: 0 }}>{l.pct}% đúng</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div style={{ background: T.ink, borderRadius: 14, padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: T.bgSolid, margin: '0 0 4px', letterSpacing: '-0.02em' }}>Sẵn sàng bắt đầu học?</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                Synapsy đã lên lịch ưu tiên các bài yếu của bạn trước.
              </p>
            </div>
            <button onClick={handleStart} style={{ background: T.bgSolid, color: T.ink, padding: '12px 24px', borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: 'pointer', letterSpacing: '-0.02em', flexShrink: 0, border: 'none' }}>
              Bắt đầu học →
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
