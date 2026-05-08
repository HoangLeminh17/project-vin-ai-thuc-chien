'use client'

import { T } from '@/app/components/synapsy'

interface Props {
  sourceExcerpt: string
  chunkId?: string
  onClose: () => void
}

function parsePageFromChunkId(chunkId?: string): string | null {
  const match = chunkId?.match(/^chunk-(\d+)-/)
  return match ? String(parseInt(match[1]) + 1) : null
}

export function PdfPanel({ sourceExcerpt, chunkId, onClose }: Props) {
  const page = parsePageFromChunkId(chunkId)

  return (
    <div style={{
      width: '40%', minWidth: 260, maxWidth: 400, flexShrink: 0,
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
          {page && <p className="sy-mono" style={{ fontSize: 9, color: T.ink40, margin: 0 }}>Trang {page}</p>}
        </div>
        <button
          onClick={onClose}
          style={{ width: 24, height: 24, borderRadius: 5, background: T.bgSunken, border: `1px solid ${T.ink10}`, fontSize: 13, color: T.ink60, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.background = T.ink10)}
          onMouseLeave={e => (e.currentTarget.style.background = T.bgSunken)}
        >×</button>
      </div>

      {/* Page mock with highlighted excerpt */}
      <div style={{ flex: 1, overflow: 'auto', padding: 14 }}>
        <div style={{ background: '#fff', borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.09)', padding: '24px 26px', fontSize: 11, lineHeight: 1.7, fontFamily: 'Georgia, serif', color: '#1a1a1a', position: 'relative' }}>
          {page && (
            <div style={{ position: 'absolute', top: 8, right: 12, fontSize: 9, color: '#bbb', fontFamily: 'monospace' }}>— {page} —</div>
          )}
          <p style={{
            margin: 0,
            background: '#2563eb12',
            borderLeft: '2.5px solid #2563eb',
            padding: '6px 9px',
            borderRadius: '0 3px 3px 0',
          }}>{sourceExcerpt}</p>
        </div>
      </div>

      {/* Action */}
      <div style={{ padding: '9px 14px', borderTop: `1px solid ${T.ink10}`, background: T.bgSolid, flexShrink: 0 }}>
        <button style={{ width: '100%', padding: '7px', fontSize: 11, fontWeight: 700, background: T.ink, color: T.bgSolid, borderRadius: 7, cursor: 'pointer', border: 'none', fontFamily: T.fontSans }}>
          ✦ Tạo thẻ từ đoạn này
        </button>
      </div>
    </div>
  )
}
