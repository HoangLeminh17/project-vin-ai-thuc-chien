'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { T } from '@/app/components/synapsy'
import type { NavTab } from './NavRail'

export interface CourseRow {
  id: string
  title: string
  masteryPct: number
  due: number
}

interface FileNode { id: string; name: string; mastery: number | null; due: number }
interface FolderNode { id: string; name: string; files: FileNode[]; isUser?: boolean }

interface Props {
  activeTab: NavTab
  courses: CourseRow[]
  coursesLoading: boolean
  collapsed: boolean
  onCourseAction: (id: string) => void
  onDeleteCourse?: (id: string) => void
  onUploadClick: () => void
}

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
    files: [{ id: 'mock-noikhoa', name: 'Nội Khoa.pdf', mastery: null, due: 0 }],
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

export function DocDrawer({ courses, coursesLoading, collapsed, onCourseAction, onDeleteCourse, onUploadClick }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [menuOpen, setMenuOpen] = useState(false)
  const [addingFolder, setAddingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [userFolders, setUserFolders] = useState<string[]>([])
  const [hoveredFileId, setHoveredFileId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sy_folders')
      if (stored) setUserFolders(JSON.parse(stored))
    } catch {}
  }, [])

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    if (menuOpen) document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [menuOpen])

  useEffect(() => {
    if (addingFolder) nameInputRef.current?.focus()
  }, [addingFolder])

  function saveFolder(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    const updated = [...userFolders, trimmed]
    setUserFolders(updated)
    try { localStorage.setItem('sy_folders', JSON.stringify(updated)) } catch {}
  }

  function commitFolder() {
    saveFolder(newFolderName)
    setNewFolderName('')
    setAddingFolder(false)
  }

  const realTree = useMemo<FolderNode[]>(() => {
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

  const userFolderNodes: FolderNode[] = userFolders.map((name, i) => ({
    id: `uf-${i}`,
    name,
    files: [],
    isUser: true,
  }))

  const tree = [...realTree, ...userFolderNodes]

  function isOpen(folderId: string) { return expanded[folderId] ?? true }
  function toggleFolder(folderId: string) { setExpanded(e => ({ ...e, [folderId]: !isOpen(folderId) })) }

  const menuItemStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '7px 10px', width: '100%', background: 'none', border: 'none',
    borderRadius: 6, cursor: 'pointer', fontSize: 12.5, color: '#374151',
    fontFamily: T.fontSans, textAlign: 'left', whiteSpace: 'nowrap',
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
          TÀI LIỆU
        </span>
        {/* "+" dropdown */}
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            style={{
              width: 22, height: 22, background: menuOpen ? '#e5e7eb' : '#f3f4f6',
              border: 'none', borderRadius: 6, cursor: 'pointer',
              fontSize: 15, color: '#6b7280', fontWeight: 300,
              display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
            }}
          >+</button>
          {menuOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 4px)',
              background: '#fff', border: '1px solid #e5e7eb',
              borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              padding: 4, zIndex: 200, minWidth: 164,
            }}>
              <button
                style={menuItemStyle}
                onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                onClick={() => { setAddingFolder(true); setMenuOpen(false) }}
              >
                <FolderIco /> Tạo thư mục
              </button>
              <button
                style={menuItemStyle}
                onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                onClick={() => { onUploadClick(); setMenuOpen(false) }}
              >
                <FileIco /> Thêm tài liệu PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Inline folder name input */}
      {addingFolder && (
        <div style={{ padding: '8px 14px', borderBottom: '1px solid #f0f1f5', flexShrink: 0 }}>
          <input
            ref={nameInputRef}
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') commitFolder()
              if (e.key === 'Escape') { setAddingFolder(false); setNewFolderName('') }
            }}
            onBlur={commitFolder}
            placeholder="Tên thư mục..."
            style={{
              width: '100%', fontSize: 12.5, border: `1px solid ${T.accent}`,
              borderRadius: 6, padding: '5px 8px', fontFamily: T.fontSans,
              outline: 'none', color: '#111827',
            }}
          />
        </div>
      )}

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

            return (
              <div key={folder.id}>
                {/* Folder row */}
                <div
                  onClick={() => toggleFolder(folder.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', cursor: 'pointer', userSelect: 'none' }}
                >
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none" style={{ flexShrink: 0, transition: 'transform 0.15s', transform: open ? 'rotate(90deg)' : 'none' }}>
                    <path d="M2.5 1.5l4 3-4 3" stroke="#9ca3af" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <FolderIco />
                  <span style={{ fontSize: 13, fontWeight: 600, color: isMockFolder ? '#9ca3af' : '#111827', fontFamily: T.fontSans, flex: 1 }}>
                    {folder.name}
                  </span>
                </div>

                {/* Files */}
                {open && folder.files.map(file => {
                  const isMock = file.id.startsWith('mock-')
                  const isHovered = hoveredFileId === file.id
                  return (
                    <div
                      key={file.id}
                      onClick={() => { if (!isMock) onCourseAction(file.id) }}
                      onMouseEnter={() => { if (!isMock) setHoveredFileId(file.id) }}
                      onMouseLeave={() => setHoveredFileId(null)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '4px 8px 4px 32px',
                        cursor: isMock ? 'default' : 'pointer',
                        borderLeft: '2px solid transparent',
                        background: isHovered ? '#f9fafb' : 'transparent',
                        transition: 'background 0.1s',
                        opacity: isMock ? 0.4 : 1,
                      }}
                    >
                      <FileIco />
                      <span style={{
                        flex: 1, fontSize: 12.5, color: '#374151', fontWeight: 400,
                        fontFamily: T.fontSans,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{file.name}</span>
                      {!isMock && isHovered && onDeleteCourse ? (
                        <button
                          onClick={e => { e.stopPropagation(); onDeleteCourse(file.id) }}
                          title="Xóa tài liệu"
                          style={{
                            flexShrink: 0, width: 18, height: 18, border: 'none', borderRadius: 4,
                            background: '#fee2e2', color: '#dc2626', cursor: 'pointer',
                            fontSize: 12, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >×</button>
                      ) : (
                        <>
                          {!isMock && file.due > 0 && (
                            <span style={{ fontSize: 9.5, fontWeight: 700, color: '#dc2626', background: '#fff1f1', padding: '1px 4px', borderRadius: 3, flexShrink: 0 }}>
                              {file.due}
                            </span>
                          )}
                          {!isMock && <MasteryBadge value={file.mastery} />}
                        </>
                      )}
                    </div>
                  )
                })}

                {/* Empty user folder hint */}
                {open && folder.isUser && folder.files.length === 0 && (
                  <div style={{ padding: '4px 14px 4px 32px' }}>
                    <span style={{ fontSize: 11.5, color: '#d1d5db', fontFamily: T.fontSans }}>Chưa có tài liệu</span>
                  </div>
                )}
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
