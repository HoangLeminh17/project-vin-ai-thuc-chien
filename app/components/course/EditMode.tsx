'use client'

import { useState, useRef, useEffect } from 'react'
import { T } from '@/app/components/synapsy'
import { FlatCard } from './types'

const AI_CHIPS = ['💡 Giải thích dễ hơn', '📌 Thêm ví dụ lâm sàng', '🎯 Tại sao quan trọng?', '🧪 Câu hỏi biến thể', '🇬🇧 Dịch tiếng Anh']

interface Props {
  cards: FlatCard[]
  initialCardId?: string | null
}

export function EditMode({ cards, initialCardId }: Props) {
  const [selectedId, setSelectedId] = useState(initialCardId ?? cards[0]?.id ?? null)
  const [aiInput, setAiInput] = useState('')
  const [aiProposal, setAiProposal] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const aiInputRef = useRef<HTMLInputElement>(null)

  const card = cards.find(c => c.id === selectedId) ?? cards[0] ?? null

  useEffect(() => {
    if (cards.length > 0 && !cards.find(c => c.id === selectedId)) {
      setSelectedId(cards[0].id)
    }
  }, [cards, selectedId])

  const runAI = (prompt: string) => {
    if (!card || aiLoading) return
    setAiLoading(true)
    setAiProposal(null)
    const mock = `**Gợi ý AI (${prompt}):**\n\n${card.concept.answer}\n\nĐây là đề xuất mẫu — AI thực tế sẽ được tích hợp trong sprint tiếp theo.`
    let i = 0
    const iv = setInterval(() => {
      i += 8
      setAiProposal(mock.slice(0, i))
      if (i >= mock.length) { clearInterval(iv); setAiLoading(false) }
    }, 30)
  }

  if (!card) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.ink40, fontSize: 13, fontFamily: T.fontSans }}>
      Chưa có thẻ nào trong bài này.
    </div>
  )

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', fontFamily: T.fontSans }}>

      {/* Card list */}
      <div style={{ width: 300, flexShrink: 0, borderRight: `1px solid ${T.ink10}`, background: T.bgSolid, overflowY: 'auto' }}>
        <div style={{ padding: '13px 18px', borderBottom: `1px solid ${T.ink10}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: T.ink60, fontWeight: 500 }}>{cards.length} thẻ</span>
          <button style={{ fontSize: 11, color: T.ink, fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: T.bgSunken, border: 'none', cursor: 'pointer' }}>+ Thẻ mới</button>
        </div>
        {cards.map(c => {
          const active = c.id === selectedId
          return (
            <button key={c.id} onClick={() => setSelectedId(c.id)} style={{
              width: '100%', textAlign: 'left', padding: '11px 18px',
              background: active ? T.bgSunken : 'transparent',
              borderBottom: `1px solid ${T.ink10}`,
              borderLeft: `3px solid ${active ? T.ink : 'transparent'}`,
              borderTop: 'none', borderRight: 'none',
              display: 'flex', flexDirection: 'column', gap: 5, cursor: 'pointer',
            }}>
              <p className="sy-serif" style={{ fontSize: 13, color: T.ink, margin: 0, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontWeight: active ? 600 : 400 }}>
                {c.concept.question}
              </p>
              <span className="sy-mono" style={{ fontSize: 10, color: T.ink40 }}>{c.chapterTitle}</span>
            </button>
          )
        })}
      </div>

      {/* Detail pane */}
      <div style={{ flex: 1, overflow: 'auto', background: T.bg }}>
        <div style={{ maxWidth: 660, margin: '0 auto', padding: '22px 28px 100px' }}>

          {/* Breadcrumb */}
          <div className="sy-mono" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: T.ink40, marginBottom: 16 }}>
            <span>{card.chapterTitle}</span><span>›</span><span>{card.lessonTitle}</span>
          </div>

          {/* Question */}
          <div style={{ background: T.bgSolid, border: `1.5px solid ${T.ink}`, borderRadius: 12, padding: '18px 22px', marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span className="sy-mono" style={{ fontSize: 10, color: T.ink40, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Câu hỏi</span>
              <span style={{ fontSize: 10, color: T.accent, fontWeight: 600 }}>✎ đang chỉnh sửa</span>
            </div>
            <div contentEditable suppressContentEditableWarning className="sy-serif"
              style={{ fontSize: 18, lineHeight: 1.4, color: T.ink, outline: 'none', borderBottom: `1px dashed ${T.ink10}`, paddingBottom: 6, letterSpacing: '-0.01em' }}>
              {card.concept.question}
            </div>
          </div>

          {/* TL;DR */}
          <div style={{ background: T.bgSolid, border: `1px solid ${T.ink10}`, borderRadius: 12, padding: '16px 22px', marginBottom: 10 }}>
            <span className="sy-mono" style={{ fontSize: 10, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>TL;DR</span>
            <div contentEditable suppressContentEditableWarning className="sy-serif"
              style={{ fontSize: 15, fontWeight: 500, color: T.ink, outline: 'none', marginTop: 6, lineHeight: 1.5 }}>
              {card.concept.answer}
            </div>
          </div>

          {/* Detail */}
          {card.concept.detail && (
            <div style={{ background: T.bgSolid, border: `1px solid ${T.ink10}`, borderRadius: 12, padding: '16px 22px', marginBottom: 10 }}>
              <span className="sy-mono" style={{ fontSize: 10, color: T.ink40, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Chi tiết</span>
              <div contentEditable suppressContentEditableWarning className="sy-serif"
                style={{ fontSize: 14, lineHeight: 1.65, color: T.ink80, outline: 'none', marginTop: 6 }}>
                {card.concept.detail}
              </div>
            </div>
          )}

          {/* AI proposal */}
          {(aiProposal !== null || aiLoading) && (
            <div style={{ border: `1.5px solid ${T.ink20}`, background: T.bgSoft, borderRadius: 12, padding: '16px 22px', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="sy-mono" style={{ fontSize: 10, color: T.ink, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>✦ Đề xuất AI</span>
                {aiLoading && <span className="sy-mono" style={{ fontSize: 10, color: T.ink40 }}>đang viết...</span>}
              </div>
              <p className="sy-serif" style={{ fontSize: 14, lineHeight: 1.6, color: T.ink80, margin: '0 0 12px', whiteSpace: 'pre-line' }}>
                {aiProposal}{aiLoading && <span className="sy-animate-blink" style={{ color: T.accent }}>▌</span>}
              </p>
              {!aiLoading && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setAiProposal(null)} style={{ background: T.ink, color: T.bgSolid, padding: '7px 15px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none' }}>Chấp nhận &amp; thêm</button>
                  <button onClick={() => setAiProposal(null)} style={{ color: T.ink60, padding: '7px 13px', borderRadius: 7, fontSize: 12, border: `1px solid ${T.ink10}`, background: 'transparent', cursor: 'pointer' }}>Bỏ</button>
                </div>
              )}
            </div>
          )}

          {/* Follow-ups */}
          {card.concept.followUps.length > 0 && (
            <div style={{ background: T.bgSolid, border: `1px solid ${T.ink10}`, borderRadius: 12, padding: '16px 22px' }}>
              <span className="sy-mono" style={{ fontSize: 10, color: T.ink40, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Follow-up</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {card.concept.followUps.map((q, i) => (
                  <button key={i} style={{ padding: '5px 12px', fontSize: 12, color: T.ink80, background: T.bgSunken, borderRadius: 20, display: 'flex', alignItems: 'center', gap: 5, border: `1px solid ${T.ink10}`, cursor: 'pointer' }}>
                    {q} <span style={{ color: T.ink40, fontSize: 10 }}>→</span>
                  </button>
                ))}
                <button style={{ padding: '5px 12px', fontSize: 12, color: T.ink40, border: `1px dashed ${T.ink20}`, borderRadius: 20, background: 'transparent', cursor: 'pointer' }}>+ thêm</button>
              </div>
            </div>
          )}
        </div>

        {/* AI dock */}
        <div style={{ position: 'sticky', bottom: 0, background: T.bgSolid, borderTop: `1px solid ${T.ink10}`, padding: '12px 28px', boxShadow: '0 -4px 24px rgba(0,0,0,0.05)' }}>
          <div style={{ maxWidth: 660, margin: '0 auto' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 9 }}>
              {AI_CHIPS.map(chip => (
                <button key={chip} onClick={() => runAI(chip)} style={{ padding: '5px 12px', fontSize: 12, color: T.ink80, background: T.bgSunken, borderRadius: 20, border: `1px solid ${T.ink10}`, cursor: 'pointer' }}>
                  {chip}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.bgSunken, padding: '9px 14px', borderRadius: 10, border: `1px solid ${T.ink10}` }}>
              <span style={{ color: T.ink60, fontSize: 13 }}>✦</span>
              <input ref={aiInputRef} value={aiInput} onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && aiInput.trim()) { runAI(aiInput); setAiInput('') } }}
                placeholder="Hỏi AI bất kỳ điều gì về thẻ này..."
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: T.ink, fontFamily: T.fontSans }} />
              <span className="sy-mono" style={{ fontSize: 10, padding: '2px 5px', background: T.bgSolid, border: `1px solid ${T.ink10}`, borderRadius: 3, color: T.ink60 }}>⏎</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
