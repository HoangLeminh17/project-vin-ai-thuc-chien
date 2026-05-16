'use client'

import { useState, useMemo } from 'react'
import { T } from '@/app/components/synapsy'
import type { NavTab } from './NavRail'

export interface CourseRow {
  id: string
  title: string
  masteryPct: number
  due: number
}

interface FileNode { id: string; name: string; mastery: number | null; due: number }
interface FolderNode { id: string; name: string; files: FileNode[] }

interface Props {
  activeTab: NavTab
  courses: CourseRow[]
  coursesLoading: boolean
  collapsed: boolean
  selectedCourseId: string | null
  selectedCourseIds: string[]
  onCourseAction: (id: string) => void
  onUploadClick: () => void
}

// Shown when there are no real courses yet so the drawer is never blank
const MOCK_TREE: FolderNode[] = [
  {
    id: 'mock-cosor', name: 'Y Khoa Cơ Sở',
    files: [
      { id: 'mock-giaiphau', name: 'Giải Phẫu.pdf',   mastery: null, due: 0 },
      { id: 'mock-sinhly',   name: 'Sinh Lý.pdf',      mastery: null, due: 0 },
    ],
  },
  {
    id: 'mock-lamsang', name: 'Lâm Sàng',
    files: [
      { id: 'mock-noikhoa', name: 'Nội Khoa.pdf', mastery: null, due: 0 },
    ],
  },
]

function MasteryBadge({ value }: { value: number | null }) {
  if (value == null) return <span style={{ color: '#9ca3af', fontSize: 11, fontFamily: T.fontMono }}>–</span>
  const color = value >= 70 ? '#16a34a' : value >= 40 ? '#d97706' : '#dc2626'
  return (
    <span style={{ fontSize: 10.5, fontWeight: 700, color, background: color + '18', padding: '2px 5px', borderRadius: 4, fontFamily: T.fontMono }}>
      {value}%
    </span>
  )
}

function FolderIco() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="#f59e0b">
      <path d="M1.5 3A1.5 1.5 0 000 4.5v8A1.5 1.5 0 001.5 14h13a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H7.621a1.5 1.5 0 01-1.06-.44L5.5 3H1.5z"/>
    </svg>
  )
}

function FileIco() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <path d="M9 1H3a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V5L9 1z" stroke="#9ca3af" strokeWidth="1.1" fill="#f9fafb"/>
      <path d="M9 1v4h4" stroke="#9ca3af" strokeWidth="1.1"/>
    </svg>
  )
}

export function DocDrawer({ activeTab, courses, coursesLoading, collapsed, selectedCourseId, selectedCourseIds, onCourseAction, onUploadClick }: Props) {
  const isSRS = activeTab === 'srs'
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const tree = useMemo<FolderNode[]>(() => {
    if (coursesLoading) return []
    if (courses.length === 0) return MOCK_TREE
    return [{
      id: 'my-docs',
      name: 'Tài liệu của tôi',
      files: courses.map(c => ({
        id: c.id,
        name: c.title,
        mastery: c.masteryPct > 0 ? c.masteryPct : null,
        due: c.due,
      })),
    }]
  }, [courses, coursesLoading])

  function isOpen(folderId: string) { return expanded[folderId] ?? true }
  function toggleFolderExpand(folderId: string) { setExpanded(e => ({ ...e, [folderId]: !isOpen(folderId) })) }

  function handleFolderCheck(folder: FolderNode, e: React.MouseEvent) {
    e.stopPropagation()
    const ids = folder.files.map(f => f.id)
    const allSel = ids.every(id => selectedCourseIds.includes(id))
    if (allSel) {
      ids.filter(id => selectedCourseIds.includes(id)).forEach(id => onCourseAction(id))
    } else {
      ids.filter(id => !selectedCourseIds.includes(id)).forEach(id => onCourseAction(id))
    }
  }

  return (
    <div style={{
      width: collapsed ? 0 : 258,
      minWidth: collapsed ? 0 : 258,
      height: '100%',
      background: '#ffffff',
      borderRight: '1px solid #e9eaf0',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      transition: 'width 0.22s ease, min-width 0.22s ease',
      flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{
        padding: '15px 16px 11px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid #f0f1f5', flexShrink: 0,
      }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.09em', fontFamily: T.fontSans }}>
          {isSRS ? 'CHỌN ĐỂ ÔN TẬP' : 'TÀI LIỆU'}
        </span>
        <button
          onClick={onUploadClick}
          style={{
            width: 22, height: 22, background: '#f3f4f6', border: 'none', borderRadius: 6,
            cursor: 'pointer', fontSize: 15, color: '#6b7280', fontWeight: 300,
            display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
          }}
        >+</button>
      </div>

      {/* Tree */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0 12px' }}>
        {coursesLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="sy-animate-pulse" style={{ height: 32, margin: '4px 12px', borderRadius: 6, background: '#f0f0f0' }} />
          ))
        ) : (
          tree.map(folder => {
            const open = isOpen(folder.id)
            const isMockFolder = folder.id.startsWith('mock-')
            const folderFileIds = folder.files.map(f => f.id)
            const allSel = isSRS && folderFileIds.every(id => selectedCourseIds.includes(id))
            const someSel = isSRS && folderFileIds.some(id => selectedCourseIds.includes(id)) && !allSel

            return (
              <div key={folder.id}>
                {/* Folder row */}
                <div
                  onClick={() => toggleFolderExpand(folder.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', cursor: 'pointer', userSelect: 'none' }}
                >
                  {isSRS && !isMockFolder && (
                    <input
                      type="checkbox"
                      checked={allSel}
                      ref={el => { if (el) el.indeterminate = someSel }}
                      onChange={() => {}}
                      onClick={e => handleFolderCheck(folder, e)}
                      style={{ width: 13, height: 13, accentColor: T.accent, cursor: 'pointer', flexShrink: 0 }}
                    />
                  )}
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none" style={{ flexShrink: 0, transition: 'transform 0.15s', transform: open ? 'rotate(90deg)' : 'none' }}>
                    <path d="M2.5 1.5l4 3-4 3" stroke="#9ca3af" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <FolderIco />
                  <span style={{ fontSize: 13, fontWeight: 600, color: isMockFolder ? '#9ca3af' : '#111827', fontFamily: T.fontSans }}>{folder.name}</span>
                </div>

                {/* Files */}
                {open && folder.files.map(file => {
                  const isMock = file.id.startsWith('mock-')
                  const isSel = isSRS ? selectedCourseIds.includes(file.id) : selectedCourseId === file.id
                  return (
                    <div
                      key={file.id}
                      onClick={() => { if (!isMock) onCourseAction(file.id) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '4px 14px 4px 32px', cursor: isMock ? 'default' : 'pointer',
                        background: isSel ? T.accent + '18' : 'transparent',
                        borderLeft: !isSRS && isSel ? `2px solid ${T.accent}` : '2px solid transparent',
                        transition: 'background 0.1s',
                        opacity: isMock ? 0.4 : 1,
                      }}
                    >
                      {isSRS && !isMock && (
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => onCourseAction(file.id)}
                          onClick={e => e.stopPropagation()}
                          style={{ width: 13, height: 13, accentColor: T.accent, cursor: 'pointer', flexShrink: 0 }}
                        />
                      )}
                      <FileIco />
                      <span style={{
                        flex: 1, fontSize: 12.5,
                        color: !isSRS && isSel ? T.accent : '#374151',
                        fontWeight: isSel ? 500 : 400,
                        fontFamily: T.fontSans,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{file.name}</span>
                      {!isMock && <MasteryBadge value={file.mastery} />}
                    </div>
                  )
                })}
              </div>
            )
          })
        )}

        {!coursesLoading && (
          <div
            onClick={onUploadClick}
            style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', marginTop: 2 }}
          >
            <span style={{ fontSize: 12.5, color: '#9ca3af', fontFamily: T.fontSans }}>+ Thêm tài liệu</span>
          </div>
        )}
      </div>
    </div>
  )
}
