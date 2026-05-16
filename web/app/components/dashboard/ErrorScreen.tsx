'use client'

import { T } from '@/app/components/synapsy'
import { FlashFactGallery } from '@/app/components'
import { useGenerationState, useGenerationActions } from '@/lib/contexts/generation-context'

interface ErrorScreenProps {
  file: File | null
  onReset: () => void
}

export function ErrorScreen({ file, onReset }: ErrorScreenProps) {
  const { error, rawMarkdown } = useGenerationState()
  const { startGeneration } = useGenerationActions()

  return (
    <main
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: T.bg, fontFamily: T.fontSans }}
    >
      <div
        className="w-full max-w-2xl"
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}
      >
        <div
          style={{
            padding: 16,
            borderRadius: 16,
            background: '#fff5f5',
            border: '1px solid #fecdcd',
          }}
        >
          <div
            className="sy-serif"
            style={{ fontSize: 20, fontWeight: 600, color: '#7a0000', marginBottom: 6 }}
          >
            Có lỗi khi tạo khóa học
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: '#7a0000' }}>{error}</p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => file && startGeneration(file)}
            disabled={!file}
            style={{
              background: T.ink,
              color: T.bgSolid,
              padding: '11px 20px',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              cursor: file ? 'pointer' : 'not-allowed',
              opacity: file ? 1 : 0.5,
            }}
          >
            Thử lại
          </button>
          <button
            onClick={onReset}
            style={{
              background: T.bgSolid,
              color: T.ink60,
              padding: '11px 20px',
              borderRadius: 10,
              fontSize: 14,
              border: `1px solid ${T.ink10}`,
              cursor: 'pointer',
            }}
          >
            Quay về thư viện
          </button>
        </div>

        <div style={{ width: '100%', maxWidth: 640 }}>
          <FlashFactGallery markdown={rawMarkdown} />
        </div>
      </div>
    </main>
  )
}
