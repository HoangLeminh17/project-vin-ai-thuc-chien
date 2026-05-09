'use client'

import { useState, useEffect, useRef } from 'react'
import { T } from '@/app/components/synapsy'

interface ContentItem {
  type: string
  text?: string
  text_level?: number
  img_path?: string
  table_body?: string
  page_idx?: number
}

interface Props {
  layoutStorageUrl: string
  chunkStart?: string | null
  chunkEnd?: string | null
  onClose: () => void
}

// Extract the flat-array global index from "chunk-{page}-{globalIdx}"
function parseGlobalIdx(id: string): number {
  const m = id.match(/chunk-\d+-(\d+)/)
  return m ? parseInt(m[1]) : -1
}

export function PdfPanel({ layoutStorageUrl, chunkStart, chunkEnd, onClose }: Props) {
  const [items, setItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    setError('')
    setItems([])
    fetch(layoutStorageUrl)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: ContentItem[]) => {
        setItems(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(e => {
        setError(e instanceof Error ? e.message : 'Tải thất bại')
        setLoading(false)
      })
  }, [layoutStorageUrl])

  // Scroll to the first highlighted chunk.
  // Double-rAF guarantees the browser has fully painted before scrollIntoView fires.
  useEffect(() => {
    if (!items.length || !chunkStart) return
    let raf2 = -1
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const el = containerRef.current?.querySelector(`[data-chunk-id="${chunkStart}"]`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    })
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2) }
  }, [items, chunkStart])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: T.bgSolid, overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${T.ink10}`, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span className="sy-mono" style={{ fontSize: 10, color: T.ink60, flex: 1, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Tài liệu nguồn
        </span>
        <button
          onClick={onClose}
          style={{ fontSize: 16, color: T.ink40, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', lineHeight: 1 }}>
          ×
        </button>
      </div>

      {/* Document body */}
      <div ref={containerRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 40px' }}>
        {loading && (
          <p className="sy-mono" style={{ fontSize: 12, color: T.ink40, textAlign: 'center', padding: '40px 0' }}>
            Đang tải tài liệu...
          </p>
        )}

        {error && (
          <p className="sy-mono" style={{ fontSize: 12, color: T.srsAgain, textAlign: 'center', padding: '40px 0' }}>
            Không tải được tài liệu: {error}
          </p>
        )}

        {!loading && !error && (
          <DocBody items={items} chunkStart={chunkStart ?? null} chunkEnd={chunkEnd ?? null} />
        )}
      </div>
    </div>
  )
}

// ── DocBody ────────────────────────────────────────────────────────────────────

function DocBody({ items, chunkStart, chunkEnd }: {
  items: ContentItem[]
  chunkStart: string | null
  chunkEnd: string | null
}) {
  if (items.length === 0) {
    return (
      <p className="sy-mono" style={{ fontSize: 12, color: T.ink40, textAlign: 'center', padding: '40px 0' }}>
        Không có nội dung.
      </p>
    )
  }

  // Compute highlight range from chunk IDs (both inclusive)
  const startIdx = chunkStart ? parseGlobalIdx(chunkStart) : -1
  const endIdx   = chunkEnd   ? parseGlobalIdx(chunkEnd)   : startIdx

  // Pre-compute page break positions (no mutations during render)
  const pageBreakAt = new Set<number>()
  let prevPage = -1
  items.forEach((item, i) => {
    if (item.type === 'discarded') return
    const p = item.page_idx ?? 0
    if (prevPage !== -1 && p !== prevPage) pageBreakAt.add(i)
    prevPage = p
  })

  return (
    <>
      {items.map((item, index) => {
        if (item.type === 'discarded') return null

        const itemChunkId  = `chunk-${item.page_idx ?? 0}-${index}`
        const isHighlighted = startIdx >= 0 && index >= startIdx && index <= Math.max(startIdx, endIdx)
        const showPageBreak = pageBreakAt.has(index)
        const pageIdx = item.page_idx ?? 0

        const hlStyle: React.CSSProperties = isHighlighted
          ? { background: 'rgba(255, 226, 0, 0.45)', borderRadius: 4, padding: '2px 6px' }
          : {}

        if (item.type === 'text') {
          const text = (item.text ?? '').trim()
          if (!text) return null

          if (item.text_level === 1) {
            return (
              <span key={index}>
                {showPageBreak && <PageBreak page={pageIdx} />}
                <h3
                  data-chunk-id={itemChunkId}
                  className="sy-serif"
                  style={{ fontSize: 15, fontWeight: 700, color: T.ink, margin: '20px 0 6px', lineHeight: 1.4, ...hlStyle }}
                >
                  {text}
                </h3>
              </span>
            )
          }

          return (
            <span key={index}>
              {showPageBreak && <PageBreak page={pageIdx} />}
              <p
                data-chunk-id={itemChunkId}
                className="sy-serif"
                style={{ fontSize: 13.5, color: T.ink80, lineHeight: 1.65, margin: '0 0 10px', ...hlStyle }}
              >
                {text}
              </p>
            </span>
          )
        }

        if (item.type === 'table') {
          const content = (item.table_body ?? item.text ?? '').trim()
          if (!content) return null
          return (
            <span key={index}>
              {showPageBreak && <PageBreak page={pageIdx} />}
              <pre
                data-chunk-id={itemChunkId}
                className="sy-mono"
                style={{
                  fontSize: 11, color: T.ink80, lineHeight: 1.5,
                  background: isHighlighted ? 'rgba(255, 226, 0, 0.45)' : T.bgSunken,
                  border: `1px solid ${T.ink10}`, borderRadius: 6,
                  padding: '8px 12px', margin: '8px 0',
                  overflowX: 'auto', whiteSpace: 'pre',
                }}
              >
                {content}
              </pre>
            </span>
          )
        }

        if (item.type === 'image') {
          return (
            <span key={index}>
              {showPageBreak && <PageBreak page={pageIdx} />}
              <div
                data-chunk-id={itemChunkId}
                style={{
                  margin: '8px 0', padding: '8px 12px',
                  background: isHighlighted ? 'rgba(255, 226, 0, 0.45)' : T.bgSunken,
                  border: `1px solid ${T.ink10}`, borderRadius: 6,
                  fontSize: 11, color: T.ink40, fontFamily: T.fontSans,
                }}
              >
                [Hình ảnh]
              </div>
            </span>
          )
        }

        return null
      })}
    </>
  )
}

function PageBreak({ page }: { page: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0 12px' }}>
      <div style={{ flex: 1, height: 1, background: T.ink10 }} />
      <span className="sy-mono" style={{ fontSize: 9, color: T.ink40, letterSpacing: '0.08em' }}>
        TRANG {page + 1}
      </span>
      <div style={{ flex: 1, height: 1, background: T.ink10 }} />
    </div>
  )
}
