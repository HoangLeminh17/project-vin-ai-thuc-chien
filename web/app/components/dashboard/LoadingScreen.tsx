'use client'

import { T } from '@/app/components/synapsy'
import { Spinner } from '@/app/components'
import { FlashFactGallery } from '@/app/components'
import { useGenerationState, useGenerationProgress } from '@/lib/contexts/generation-context'

export function LoadingScreen() {
  const { status, course, rawMarkdown } = useGenerationState()
  const { parseProgress } = useGenerationProgress()

  if (status === 'idle' || (status === 'generating' && course)) return null

  return (
    <main
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: T.bg, fontFamily: T.fontSans }}
    >
      <div
        className="w-full max-w-xl"
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40 }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              padding: 16,
              borderRadius: 16,
              background: T.bgSolid,
              border: `1px solid ${T.ink10}`,
            }}
          >
            <Spinner />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p
              className="sy-serif"
              style={{ fontSize: 20, fontWeight: 600, color: T.ink, margin: '0 0 4px' }}
            >
              {status === 'parsing' ? 'Đang đọc tài liệu PDF...' : 'Đang thiết kế lộ trình khóa học...'}
            </p>
            {status === 'parsing' && (
              <p style={{ fontSize: 13, color: T.ink60, margin: '0 0 8px' }}>
                Tài liệu đang được xử lý, vui lòng đợi chút nhé.
              </p>
            )}
            {parseProgress && status === 'parsing' && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div
                  aria-hidden="true"
                  style={{
                    width: '100%',
                    height: 8,
                    borderRadius: 999,
                    background: T.ink10,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${parseProgress.percentComplete}%`,
                      height: '100%',
                      borderRadius: 999,
                      background: `linear-gradient(90deg, ${T.accent}, ${T.srsGood})`,
                      transition: 'width 0.35s ease',
                    }}
                  />
                </div>
                <p style={{ fontSize: 13, color: T.ink60, margin: 0 }}>
                  Chunk {parseProgress.currentChunk}/{parseProgress.totalChunks} (
                  {parseProgress.percentComplete}%)
                </p>
              </div>
            )}
            <p
              style={{
                fontSize: 13,
                color: T.ink60,
                margin: parseProgress && status === 'parsing' ? '4px 0 0' : 0,
              }}
            >
              Quá trình này mất 3 - 5 phút.
            </p>
          </div>
        </div>
        <FlashFactGallery markdown={rawMarkdown} />
      </div>
    </main>
  )
}
