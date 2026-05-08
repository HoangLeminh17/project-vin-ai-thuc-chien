'use client'

import { useState, useCallback, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/TextLayer.css'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import { T } from '@/app/components/synapsy'

interface Props {
  pdfLocalPath: string
  sourceExcerpt: string
  chunkId?: string
  onClose: () => void
}

function parsePageFromChunkId(chunkId?: string): number {
  const match = chunkId?.match(/^chunk-(\d+)-/)
  return match ? parseInt(match[1]) + 1 : 1
}

function normalise(s: string) {
  return s.replace(/\s+/g, ' ').trim().toLowerCase()
}

export function PdfPanel({ pdfLocalPath, sourceExcerpt, chunkId, onClose }: Props) {
  const targetPage = parsePageFromChunkId(chunkId)
  const [numPages, setNumPages] = useState<number | null>(null)
  const [page, setPage] = useState(targetPage)
  const [scale, setScale] = useState(1.2)

  useEffect(() => {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString()
  }, [])

  const pdfUrl = `/api/pdf-source?path=${encodeURIComponent(pdfLocalPath)}`

  const highlightText = useCallback(({ str }: { str: string; itemIndex: number }) => {
    const needle = normalise(sourceExcerpt)
    const hay = normalise(str)
    if (needle.includes(hay) || hay.includes(needle.slice(0, 20))) {
      return `<mark style="background:#2563eb22;border-radius:2px;padding:1px 0">${str}</mark>`
    }
    return str
  }, [sourceExcerpt])

  return (
    <div style={{
      width: '40%', minWidth: 280, maxWidth: 420, flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      background: '#f0efe9',
      borderLeft: `1px solid ${T.ink10}`,
      animation: 'sy-slideInRight 0.2s ease',
    }}>
      <style>{`@keyframes sy-slideInRight { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>

      {/* Header */}
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${T.ink10}`, background: T.bgSolid, display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
        <span style={{ fontSize: 14 }}>📄</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11.5, fontWeight: 700, margin: 0, color: T.ink }}>Nguồn tài liệu</p>
          {numPages && <p className="sy-mono" style={{ fontSize: 9, color: T.ink40, margin: 0 }}>Trang {page} / {numPages}</p>}
        </div>
        {/* Scale controls */}
        <button onClick={() => setScale(s => Math.max(0.6, s - 0.2))} style={iconBtn}>−</button>
        <button onClick={() => setScale(s => Math.min(2.5, s + 0.2))} style={iconBtn}>+</button>
        <button
          onClick={onClose}
          style={{ ...iconBtn, marginLeft: 4 }}
          onMouseEnter={e => (e.currentTarget.style.background = T.ink10)}
          onMouseLeave={e => (e.currentTarget.style.background = T.bgSunken)}
        >×</button>
      </div>

      {/* PDF viewer */}
      <div style={{ flex: 1, overflow: 'auto', padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <Document
          file={pdfUrl}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          onLoadError={err => console.error('[PdfPanel] load error', err)}
          loading={<div style={loadingStyle}>Đang tải PDF...</div>}
          error={<div style={loadingStyle}>Không tải được PDF.</div>}
        >
          <Page
            pageNumber={page}
            scale={scale}
            customTextRenderer={highlightText}
            renderAnnotationLayer={false}
          />
        </Document>
      </div>

      {/* Page nav */}
      {numPages && numPages > 1 && (
        <div style={{ padding: '8px 14px', borderTop: `1px solid ${T.ink10}`, background: T.bgSolid, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexShrink: 0 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={navBtn(page <= 1)}>‹</button>
          <span className="sy-mono" style={{ fontSize: 11, color: T.ink60 }}>{page} / {numPages}</span>
          <button onClick={() => setPage(p => Math.min(numPages, p + 1))} disabled={page >= numPages} style={navBtn(page >= numPages)}>›</button>
        </div>
      )}
    </div>
  )
}

const iconBtn: React.CSSProperties = {
  width: 24, height: 24, borderRadius: 5,
  background: T.bgSunken, border: `1px solid ${T.ink10}`,
  fontSize: 13, color: T.ink60,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', flexShrink: 0,
}

const loadingStyle: React.CSSProperties = {
  padding: '32px 0', textAlign: 'center',
  fontSize: 12, color: T.ink40, fontFamily: T.fontSans,
}

function navBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: '4px 10px', fontSize: 14, borderRadius: 5,
    background: disabled ? T.bgSunken : T.ink,
    color: disabled ? T.ink20 : T.bgSolid,
    border: 'none', cursor: disabled ? 'default' : 'pointer',
  }
}
