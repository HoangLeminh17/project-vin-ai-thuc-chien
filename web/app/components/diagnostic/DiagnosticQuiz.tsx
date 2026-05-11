'use client'

import { useState } from 'react'
import { SynapsyLogo, T } from '@/app/components/synapsy'
import { DiagnosticQuestion } from '@/core/models/learning-model'
import { SavedCourse } from '@/core/models/saved-course'
import { DiagnosticResults } from './DiagnosticResults'

interface Props {
  course: SavedCourse
  questions: DiagnosticQuestion[]
  onComplete: (results: Record<string, number>) => void
}

export function DiagnosticQuiz({ course, questions, onComplete }: Props) {
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [currentQ, setCurrentQ] = useState(0)
  const [submitted, setSubmitted] = useState(false)

  const answered = Object.keys(answers).length
  const allAnswered = answered === questions.length

  const handleSelect = (qi: number, oi: number) => {
    if (submitted) return
    setAnswers(prev => ({ ...prev, [qi]: oi }))
    const nextIdx = questions.findIndex((_, i) => i > qi && answers[i] === undefined)
    if (nextIdx !== -1) setTimeout(() => setCurrentQ(nextIdx), 180)
    else if (qi < questions.length - 1) setTimeout(() => setCurrentQ(qi + 1), 180)
  }

  if (submitted) {
    return (
      <DiagnosticResults
        questions={questions}
        answers={answers}
        onComplete={onComplete}
      />
    )
  }

  const q = questions[currentQ]
  const progress = answered / questions.length

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: T.bg, overflow: 'hidden', fontFamily: T.fontSans }}>

      {/* Header */}
      <div style={{ padding: '14px 28px', borderBottom: `1px solid ${T.ink10}`, background: T.bgSolid, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SynapsyLogo size={18} />
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.03em', color: T.ink }}>Synapsy</span>
          <span style={{ fontSize: 11, color: T.ink40 }}>·</span>
          <span style={{ fontSize: 12, color: T.ink60 }}>{course.title}</span>
        </div>
        <span className="sy-mono" style={{ fontSize: 11, color: T.ink40 }}>{answered}/{questions.length} đã trả lời</span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: T.ink10, flexShrink: 0 }}>
        <div style={{ width: `${progress * 100}%`, height: '100%', background: T.accent, transition: 'width 0.35s ease' }} />
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left: question navigator */}
        <div style={{ width: 220, flexShrink: 0, borderRight: `1px solid ${T.ink10}`, background: T.bgSolid, padding: '20px 16px', overflowY: 'auto' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: T.ink40, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px' }}>Câu hỏi</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 20 }}>
            {questions.map((_, i) => {
              const hasAns = answers[i] !== undefined
              const isActive = currentQ === i
              return (
                <button key={i} onClick={() => setCurrentQ(i)} style={{
                  aspectRatio: '1', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  background: isActive ? T.ink : hasAns ? T.accentSoft : T.bgSunken,
                  color: isActive ? T.bgSolid : hasAns ? T.accent : T.ink60,
                  border: `1.5px solid ${isActive ? T.ink : hasAns ? T.accent + '40' : T.ink10}`,
                }}>
                  {i + 1}
                </button>
              )
            })}
          </div>

          <div style={{ padding: '14px', background: T.bgSunken, borderRadius: 10 }}>
            <p style={{ fontSize: 11, color: T.ink60, margin: '0 0 4px', fontWeight: 500 }}>Bài kiểm tra đầu vào</p>
            <p style={{ fontSize: 11, color: T.ink40, margin: 0, lineHeight: 1.5 }}>
              Trả lời tất cả câu hỏi rồi nộp bài. Kết quả sẽ tô màu sơ đồ kiến thức của bạn.
            </p>
          </div>
        </div>

        {/* Right: current question */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '36px 52px' }}>

            {/* Topic tag */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: T.ink60, background: T.bgSunken, padding: '3px 9px', borderRadius: 20, letterSpacing: '0.02em' }}>
                  {q.topic}
                </span>
                <span className="sy-mono" style={{ fontSize: 10, color: T.ink40, marginLeft: 'auto' }}>Câu {currentQ + 1} / {questions.length}</span>
              </div>
            </div>

            {/* Question text */}
            <h2 className="sy-serif" style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.35, margin: '0 0 32px', letterSpacing: '-0.02em', color: T.ink, maxWidth: 560 }}>
              {q.question}
            </h2>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 540 }}>
              {q.options.map((opt, oi) => {
                const selected = answers[currentQ] === oi
                return (
                  <button key={oi} onClick={() => handleSelect(currentQ, oi)} style={{
                    textAlign: 'left', padding: '16px 20px', borderRadius: 12, cursor: 'pointer',
                    border: `1.5px solid ${selected ? T.accent : T.ink10}`,
                    background: selected ? T.accentSoft : T.bgSolid,
                    color: selected ? T.accent : T.ink,
                    fontSize: 15, fontWeight: selected ? 600 : 400,
                    transition: 'all 0.15s ease',
                    display: 'flex', alignItems: 'center', gap: 14,
                  }}>
                    <span style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      border: `1.5px solid ${selected ? T.accent : T.ink20}`,
                      background: selected ? T.accent : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, fontFamily: T.fontMono,
                      color: selected ? T.bgSolid : T.ink60,
                    }}>
                      {String.fromCharCode(65 + oi)}
                    </span>
                    <span className="sy-serif" style={{ lineHeight: 1.4 }}>{opt}</span>
                  </button>
                )
              })}
            </div>

            {/* Nav row */}
            <div style={{ display: 'flex', gap: 10, marginTop: 28, maxWidth: 540 }}>
              <button onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0} style={{ padding: '10px 18px', borderRadius: 9, border: `1px solid ${T.ink10}`, background: T.bgSolid, color: currentQ === 0 ? T.ink40 : T.ink60, fontSize: 13, fontWeight: 500, cursor: currentQ === 0 ? 'default' : 'pointer' }}>
                ← Trước
              </button>
              {currentQ < questions.length - 1 && (
                <button onClick={() => setCurrentQ(currentQ + 1)} style={{ padding: '10px 18px', borderRadius: 9, border: `1px solid ${T.ink10}`, background: T.bgSolid, color: T.ink60, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                  Tiếp →
                </button>
              )}
            </div>
          </div>

          {/* Submit bar */}
          <div style={{ flexShrink: 0, padding: '14px 52px', borderTop: `1px solid ${T.ink10}`, background: T.bgSolid, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: T.ink60 }}>
              {allAnswered ? 'Đã trả lời đủ — sẵn sàng nộp bài' : `Còn ${questions.length - answered} câu chưa trả lời`}
            </span>
            <button onClick={() => setSubmitted(true)} disabled={!allAnswered} style={{
              background: allAnswered ? T.ink : T.ink10,
              color: allAnswered ? T.bgSolid : T.ink40,
              padding: '11px 26px', borderRadius: 10, border: 'none',
              fontSize: 14, fontWeight: 700, cursor: allAnswered ? 'pointer' : 'default',
              letterSpacing: '-0.01em', transition: 'all 0.2s',
            }}>
              Nộp bài →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
