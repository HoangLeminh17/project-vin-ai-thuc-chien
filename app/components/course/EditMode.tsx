'use client'

import { useState, useRef, useEffect, useMemo, Fragment } from 'react'
import dynamic from 'next/dynamic'
import { T } from '@/app/components/synapsy'
import { FlatCard } from './types'
import { parseCitations } from '@/lib/citations'
import { buildValidChunkIds } from '@/lib/citation-utils'

const PdfPanel = dynamic(() => import('./PdfPanel').then(m => ({ default: m.PdfPanel })), { ssr: false })

const AI_CHIPS = ['💡 Giải thích dễ hơn', '📌 Thêm ví dụ lâm sàng', '🎯 Tại sao quan trọng?', '🧪 Câu hỏi biến thể', '🇬🇧 Dịch tiếng Anh']

interface Props {
  cards: FlatCard[]
  initialCardId?: string | null
  /** When set, overrides internal card selection — used by master-detail parent */
  controlledCardId?: string | null
  /** Hides the left card list — used when the tree nav IS the card list */
  hideList?: boolean
  layoutStorageUrl?: string | null
}

export function EditMode({ cards, initialCardId, controlledCardId, hideList, layoutStorageUrl }: Props) {
  const [selectedId, setSelectedId] = useState(controlledCardId ?? initialCardId ?? cards[0]?.id ?? null)
  const [aiInput, setAiInput] = useState('')
  const [aiProposal, setAiProposal] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [citationOpen, setCitationOpen] = useState(false)
  const [showSource, setShowSource] = useState(false)
  const [selectedChunkId, setSelectedChunkId] = useState<string | null>(null)
  const [validChunkIds, setValidChunkIds] = useState<Set<string>>(new Set())
  const aiInputRef = useRef<HTMLInputElement>(null)

  const card = cards.find(c => c.id === selectedId) ?? cards[0] ?? null
  // Shared display map so answer + detail citations share one numbering sequence per card
  const cardCiteMap = useMemo(() => {
    // Reset map when card changes
    void selectedId; 
    return new Map<string, number>();
  }, [selectedId])
  // New courses use source_chunk_start; legacy courses fall back to source_chunk_id
  const chunkStart = card?.concept.source_chunk_start ?? card?.concept.source_chunk_id ?? null
  const chunkEnd   = card?.concept.source_chunk_end   ?? card?.concept.source_chunk_id ?? null
  const hasCitation = !!chunkStart

  useEffect(() => {
    if (controlledCardId != null) setSelectedId(controlledCardId)
  }, [controlledCardId])

  useEffect(() => {
    if (cards.length > 0 && !cards.find(c => c.id === selectedId)) {
      setSelectedId(cards[0].id)
    }
  }, [cards, selectedId])

  // Fetch layout JSON to build valid chunk ID set for citation rendering
  useEffect(() => {
    if (!layoutStorageUrl) return
    fetch(layoutStorageUrl)
      .then(r => r.json())
      .then((items: Array<{ type?: string; page_idx?: number }>) => setValidChunkIds(buildValidChunkIds(items)))
      .catch(() => {})
  }, [layoutStorageUrl])

  // Reset citation state when active card changes
  useEffect(() => {
    setCitationOpen(false)
    setShowSource(false)
    setSelectedChunkId(null)
  }, [selectedId])

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

      {/* Card list — hidden when parent provides its own navigation (hideList=true) */}
      {!hideList && <div style={{ width: 300, flexShrink: 0, borderRight: `1px solid ${T.ink10}`, background: T.bgSolid, overflowY: 'auto' }}>
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
      </div>}

      {/* Detail pane + optional PdfPanel */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: T.bg }}>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ maxWidth: 660, margin: '0 auto', padding: '22px 28px 24px' }}>

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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className="sy-mono" style={{ fontSize: 10, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>TL;DR</span>
              {hasCitation &&  (
                <button
                  onClick={() => setCitationOpen(v => !v)}
                  style={{
                    marginLeft: 'auto', fontSize: 11, fontWeight: 600,
                    color: citationOpen ? T.accent : T.ink60,
                    background: citationOpen ? `${T.accent}18` : 'transparent',
                    border: `1px solid ${citationOpen ? T.accent : T.ink20}`,
                    borderRadius: 5, cursor: 'pointer', padding: '2px 7px',
                    lineHeight: 1.6, display: 'flex', alignItems: 'center', gap: 3,
                  }}>
                  ① nguồn
                </button>
              )}
            </div>
            <div className="sy-serif" style={{ fontSize: 15, fontWeight: 500, color: T.ink, lineHeight: 1.5 }}>
              <CitedText text={card.concept.answer} validChunkIds={validChunkIds} sharedMap={cardCiteMap} onCiteClick={id => { setSelectedChunkId(id); setShowSource(true); setCitationOpen(false) }} />
            </div>
            {/* Citation popover */}
            {hasCitation && citationOpen && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: '#fffbee', borderRadius: 8, border: `1px solid #f0e27a` }}>
                <p className="sy-serif" style={{ fontSize: 12, color: '#333', margin: '0 0 8px', lineHeight: 1.5, fontStyle: 'italic' }}>
                  Trích xuất từ: {chunkStart}{chunkEnd && chunkEnd !== chunkStart ? ` → ${chunkEnd}` : ''}
                </p>
                
                {layoutStorageUrl ? (
                  <button onClick={() => { setShowSource(true); setCitationOpen(false) }} style={{ fontSize: 11, color: '#ff6b00', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}>
                    Xem trong tài liệu →
                  </button>
                ) : (
                  <span style={{ fontSize: 11, color: '#999' }}>Chưa có tài liệu nguồn</span>
                )}
              </div>
            )}
          </div>

          {/* Detail */}
          {card.concept.detail && (
            <div style={{ background: T.bgSolid, border: `1px solid ${T.ink10}`, borderRadius: 12, padding: '16px 22px', marginBottom: 10 }}>
              <span className="sy-mono" style={{ fontSize: 10, color: T.ink40, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Chi tiết</span>
              <div className="sy-serif" style={{ fontSize: 14, lineHeight: 1.65, color: T.ink80, marginTop: 6 }}>
                <CitedText text={card.concept.detail!} validChunkIds={validChunkIds} sharedMap={cardCiteMap} onCiteClick={id => { setSelectedChunkId(id); setShowSource(true) }} />
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
      </div>{/* end scrollable content */}

        {/* AI dock */}
        <div style={{ flexShrink: 0, background: T.bgSolid, borderTop: `1px solid ${T.ink10}`, padding: '12px 28px', boxShadow: '0 -4px 24px rgba(0,0,0,0.05)' }}>
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

      {/* Document reader — slides in from the right when user clicks "Xem trong tài liệu" */}
      {showSource && layoutStorageUrl && (
        <div style={{ width: 420, flexShrink: 0, borderLeft: `1px solid ${T.ink10}`, overflow: 'hidden' }}>
          <PdfPanel
            layoutStorageUrl={layoutStorageUrl}
            chunkStart={chunkStart}
            chunkEnd={chunkEnd}
            selectedChunkId={selectedChunkId}
            onClose={() => { setShowSource(false); setSelectedChunkId(null) }}
          />
        </div>
      )}
    </div>
    </div>
  )
}

function CitedText({ text, validChunkIds, sharedMap, onCiteClick }: {
  text: string
  validChunkIds: Set<string>
  sharedMap?: Map<string, number>
  onCiteClick: (chunkId: string) => void
}) {
  const segments = parseCitations(text, validChunkIds, sharedMap)
  const layoutLoaded = validChunkIds.size > 0
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === 'text') return <Fragment key={i}>{seg.value}</Fragment>
        if (seg.valid) return (
          <sup key={i} onClick={() => onCiteClick(seg.chunkId)} style={{ cursor: 'pointer', color: T.accent, fontSize: 10, fontWeight: 700, marginLeft: 1, userSelect: 'none' }}>
            [{seg.displayNum}]
          </sup>
        )
        // Layout not loaded yet → show number in gray, non-clickable (can't validate)
        // Layout loaded but ID absent → hallucinated marker, show [?]
        return (
          <sup key={i} style={{ color: T.ink40, fontSize: 10, fontWeight: 700, marginLeft: 1 }}>
            {layoutLoaded ? '[?]' : `[${seg.displayNum}]`}
          </sup>
        )
      })}
    </>
  )
}
