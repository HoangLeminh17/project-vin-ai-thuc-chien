'use client';

import { useState, useEffect, use, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { SavedCourse } from '@/core/models/saved-course';
import { Course, ChapterContent, LessonContent, ConceptCard } from '@/core/models/learning-model';
import { LocalCourseAdapter } from '@/infrastructure/adapters/local-course.adapter';

const isLocal = process.env.NEXT_PUBLIC_COURSE_STORE === 'local';
const localAdapter = isLocal ? new LocalCourseAdapter() : null;

type Mode = 'browse' | 'study' | 'edit';

// ── SRS progress map (server-fetched) ────────────────────────────────────────

type BrowseStatus = 'new' | 'learning' | 'due' | 'mature';
interface ProgressMapEntry { status: 'NEW' | 'LEARNING' | 'REVIEW'; nextReviewDate: string; lastReviewedAt?: string; isDue: boolean }
type ProgressMap = Record<string, ProgressMapEntry>;

// Map a raw progress entry (plus absence) to the four UI states shown in the mock.
function statusOf(entry: ProgressMapEntry | undefined): BrowseStatus {
  if (!entry) return 'new';
  if (entry.isDue) return 'due';
  if (entry.status === 'LEARNING') return 'learning';
  return 'mature';
}

// Human "Kế tiếp" label for the Browse column.
function formatNextReview(entry: ProgressMapEntry | undefined): string {
  if (!entry) return 'chưa học';
  const now = Date.now();
  const next = new Date(entry.nextReviewDate).getTime();
  const diffMs = next - now;
  if (diffMs <= 0) return 'hôm nay';
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `${mins} phút`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} giờ`;
  const days = Math.round(hours / 24);
  return `${days} ngày`;
}

// Stable pseudo source page derived from card id. Placeholder until the
// generator emits real PDF page numbers. TODO(generator): replace with real value.
function derivePseudoPage(cardId: string): number {
  let h = 0;
  for (let i = 0; i < cardId.length; i++) h = (h * 31 + cardId.charCodeAt(i)) >>> 0;
  return (h % 148) + 1;
}

// ── MiniRing ─────────────────────────────────────────────────────────────────

function MiniRing({ pct, size = 14, strokeWidth = 2 }: { pct: number; size?: number; strokeWidth?: number }) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(100, pct)) / 100);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--sy-ink-10)" strokeWidth={strokeWidth} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--sy-accent)" strokeWidth={strokeWidth}
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" style={{ transition: 'stroke-dashoffset .4s ease' }} />
    </svg>
  );
}

// ── StateChip ────────────────────────────────────────────────────────────────

function StateChip({ state }: { state: BrowseStatus }) {
  const map: Record<BrowseStatus, { label: string; bg: string; fg: string }> = {
    new:      { label: 'Mới',      bg: 'var(--sy-bg-sunken)',   fg: 'var(--sy-ink-60)' },
    learning: { label: 'Đang học', bg: '#fdf3e6',               fg: 'var(--sy-hard)'   },
    due:      { label: 'Cần ôn',   bg: 'var(--sy-warm-soft)',   fg: 'var(--sy-warm)'   },
    mature:   { label: 'Đã thuộc', bg: 'var(--sy-accent-soft)', fg: 'var(--sy-accent)' },
  };
  const m = map[state];
  return <span style={{ fontSize: 10, fontWeight: 500, color: m.fg, background: m.bg, padding: '2px 7px', borderRadius: 8, whiteSpace: 'nowrap' }}>{m.label}</span>;
}

// ── Flat card model ───────────────────────────────────────────────────────────

interface FlatCard {
  id: string;
  ci: number;
  chapterTitle: string;
  li: number;
  lessonTitle: string;
  concept: ConceptCard;
}

// Stable pseudo source page derived from card id. Placeholder until the
// generator emits real PDF page numbers. TODO(generator): replace with real value.
function derivePseudoPage(cardId: string): number {
  let h = 0;
  for (let i = 0; i < cardId.length; i++) h = (h * 31 + cardId.charCodeAt(i)) >>> 0;
  return (h % 148) + 1;
}

function flattenCards(course: Course, courseContent: { chapters: ChapterContent[] } | null): FlatCard[] {
  if (!courseContent) return [];
  const cards: FlatCard[] = [];
  course.chapters.forEach((ch, ci) => {
    const chContent = courseContent.chapters[ci];
    if (!chContent) return;
    chContent.lessons.forEach((lesson, li) => {
      cards.push({
        id: `${ci}-${li}`,
        ci, chapterTitle: ch.title,
        li, lessonTitle: lesson.lesson_title,
        concept: lesson.concept,
      });
    });
  });
  return cards;
}

// ── Rating ────────────────────────────────────────────────────────────────────

const RATING_META = [
  { label: 'Again', sub: 'không nhớ', interval: '1 phút',  color: 'var(--sy-again)'  },
  { label: 'Hard',  sub: 'lờ mờ',     interval: '10 phút', color: 'var(--sy-hard)'   },
  { label: 'Good',  sub: 'nhớ rồi',   interval: '1 ngày',  color: 'var(--sy-good)'   },
  { label: 'Easy',  sub: 'quá dễ',    interval: '4 ngày',  color: 'var(--sy-easy)'   },
] as const;

async function submitRating(card: FlatCard, ratingIndex: number) {
  fetch('/api/progress/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cardId: card.id,
      rating: ratingIndex,
      question: card.concept.question,
      answer: card.concept.answer,
    }),
  });
}

// ── Mode switcher ─────────────────────────────────────────────────────────────

function ModeSwitcher({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const modes: { id: Mode; label: string }[] = [
    { id: 'browse', label: 'Browse' },
    { id: 'study',  label: 'Study'  },
    { id: 'edit',   label: 'Edit'   },
  ];
  return (
    <div style={{ display: 'inline-flex', background: 'var(--sy-bg-sunken)', borderRadius: 8, padding: 3, gap: 2 }}>
      {modes.map(m => (
        <button key={m.id} onClick={() => onChange(m.id)} style={{
          padding: '6px 14px', fontSize: 12, fontWeight: 500, borderRadius: 6, cursor: 'pointer',
          background: mode === m.id ? 'var(--sy-bg-solid)' : 'transparent',
          color: mode === m.id ? 'var(--sy-ink)' : 'var(--sy-ink-60)',
          border: 'none',
          boxShadow: mode === m.id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
        }}>
          {m.label}
        </button>
      ))}
    </div>
  );
}

// ── Chapter rail ──────────────────────────────────────────────────────────────

function ChapterRail({
  course, cards, filterCi, onFilterCi, progressMap,
}: {
  course: Course;
  cards: FlatCard[];
  filterCi: number | null;
  onFilterCi: (ci: number | null) => void;
  progressMap: ProgressMap;
}) {
  return (
    <aside style={{ width: 240, flexShrink: 0, background: 'var(--sy-bg-sunken)', borderRight: '1px solid var(--sy-ink-10)', overflowY: 'auto', padding: '12px 0' }}>
      <button
        onClick={() => onFilterCi(null)}
        style={{
          width: '100%', textAlign: 'left', padding: '7px 16px', fontSize: 12, cursor: 'pointer', border: 'none',
          background: filterCi === null ? 'var(--sy-bg-solid)' : 'transparent',
          color: filterCi === null ? 'var(--sy-ink)' : 'var(--sy-ink-60)',
          borderLeft: `2px solid ${filterCi === null ? 'var(--sy-warm)' : 'transparent'}`,
          fontFamily: 'var(--sy-font-sans)',
        }}
      >
        Tất cả chương
      </button>
      {course.chapters.map((ch, ci) => {
        const chapterCards = cards.filter(c => c.ci === ci);
        const chapterDue = chapterCards.filter(c => statusOf(progressMap[c.id]) === 'due').length;
        const active = filterCi === ci;
        return (
          <div key={ci} style={{ marginTop: 6 }}>
            <button onClick={() => onFilterCi(ci)} style={{
              width: '100%', textAlign: 'left', padding: '7px 16px 3px', cursor: 'pointer', border: 'none',
              background: active ? 'var(--sy-bg-solid)' : 'transparent',
              borderLeft: `2px solid ${active ? 'var(--sy-warm)' : 'transparent'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
              fontFamily: 'var(--sy-font-sans)',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <span className="sy-mono" style={{ fontSize: 10, color: 'var(--sy-ink-40)', flexShrink: 0 }}>0{ci + 1}</span>
                <span className="sy-serif" style={{ fontSize: 13, fontWeight: 500, color: active ? 'var(--sy-ink)' : 'var(--sy-ink-80)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ch.title}</span>
              </span>
              {chapterDue > 0 && (
                <span style={{ fontSize: 9, color: 'var(--sy-warm)', background: 'var(--sy-warm-soft)', padding: '1px 6px', borderRadius: 8, fontWeight: 600, flexShrink: 0 }}>{chapterDue}</span>
              )}
            </button>
            {(ch.lessons ?? []).map((lesson, li) => {
              const lessonCards = chapterCards.filter(c => c.li === li);
              if (lessonCards.length === 0) return null;
              const matureCount = lessonCards.filter(c => statusOf(progressMap[c.id]) === 'mature').length;
              const masteryPct = Math.round((matureCount / lessonCards.length) * 100);
              return (
                <div key={li} style={{
                  padding: '3px 16px 3px 32px',
                  fontSize: 12, color: 'var(--sy-ink-60)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                }}>
                  <span className="sy-serif" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flex: 1 }}>{lesson.title}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    <MiniRing pct={masteryPct} />
                    <span className="sy-mono" style={{ fontSize: 10, color: 'var(--sy-ink-40)' }}>{lessonCards.length}</span>
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </aside>
  );
}

// ── Browse mode ───────────────────────────────────────────────────────────────

function BrowseMode({
  cards, filterCi, onOpenCard, onOpenQuiz, course, courseContent, progressMap,
}: {
  cards: FlatCard[];
  filterCi: number | null;
  onOpenCard: (card: FlatCard) => void;
  onOpenQuiz: (ci: number) => void;
  course: Course;
  courseContent: { chapters: ChapterContent[] } | null;
  progressMap: ProgressMap;
}) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | BrowseStatus>('all');

  const scoped = cards.filter(c => filterCi === null || c.ci === filterCi);
  const counts: Record<'all' | BrowseStatus, number> = { all: scoped.length, new: 0, learning: 0, due: 0, mature: 0 };
  for (const c of scoped) counts[statusOf(progressMap[c.id])]++;

  const filters: { id: 'all' | BrowseStatus; label: string }[] = [
    { id: 'all',      label: 'Tất cả'   },
    { id: 'due',      label: 'Cần ôn'   },
    { id: 'learning', label: 'Đang học' },
    { id: 'new',      label: 'Mới'      },
    { id: 'mature',   label: 'Đã thuộc' },
  ];

  const shown = scoped
    .filter(c => statusFilter === 'all' || statusOf(progressMap[c.id]) === statusFilter)
    .filter(c => !query || c.concept.question.toLowerCase().includes(query.toLowerCase()));

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--sy-ink-10)', background: 'var(--sy-bg-solid)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--sy-bg-sunken)', padding: '7px 12px', borderRadius: 7, maxWidth: 340 }}>
          <span style={{ color: 'var(--sy-ink-40)', fontSize: 14 }}>⌕</span>
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder={`Tìm trong ${cards.length} thẻ...`}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, fontFamily: 'var(--sy-font-sans)', color: 'var(--sy-ink)' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {filters.map(f => {
            const active = statusFilter === f.id;
            return (
              <button key={f.id} onClick={() => setStatusFilter(f.id)} style={{
                padding: '6px 10px', fontSize: 12, borderRadius: 6, fontWeight: 500, cursor: 'pointer', border: 'none',
                background: active ? 'var(--sy-ink)' : 'transparent',
                color: active ? 'var(--sy-bg)' : 'var(--sy-ink-60)',
                fontFamily: 'var(--sy-font-sans)',
              }}>
                {f.label} <span className="sy-mono" style={{ opacity: 0.6, marginLeft: 3 }}>{counts[f.id]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {shown.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--sy-ink-40)', fontSize: 13 }}>
            Không tìm thấy thẻ nào.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--sy-bg-soft)', position: 'sticky', top: 0, zIndex: 1 }}>
                {[
                  { label: 'Câu hỏi',    width: undefined },
                  { label: 'Chương',     width: 140 },
                  { label: 'Trạng thái', width: 90  },
                  { label: 'Kế tiếp',    width: 90  },
                  { label: 'Nguồn',      width: 70  },
                ].map(h => (
                  <th key={h.label} style={{ textAlign: 'left', padding: '9px 16px', fontSize: 10, fontWeight: 600, color: 'var(--sy-ink-40)', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid var(--sy-ink-10)', fontFamily: 'var(--sy-font-mono)', width: h.width }}>{h.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((card, i) => {
                const entry = progressMap[card.id];
                return (
                  <tr key={card.id} onClick={() => onOpenCard(card)}
                    style={{ cursor: 'pointer', background: i % 2 ? 'var(--sy-bg-soft)' : 'var(--sy-bg-solid)', borderBottom: '1px solid var(--sy-ink-10)' }}>
                    <td className="sy-serif" style={{ padding: '12px 16px', color: 'var(--sy-ink)', lineHeight: 1.4, maxWidth: 480 }}>{card.concept.question}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--sy-ink-60)', whiteSpace: 'nowrap' }}>{card.chapterTitle}</td>
                    <td style={{ padding: '12px 16px' }}><StateChip state={statusOf(entry)} /></td>
                    <td className="sy-mono" style={{ padding: '12px 16px', fontSize: 12, color: 'var(--sy-ink-60)' }}>{formatNextReview(entry)}</td>
                    <td className="sy-mono" style={{ padding: '12px 16px', fontSize: 11, color: 'var(--sy-ink-40)' }}>tr. {derivePseudoPage(card.id)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

      </div>

      {/* Quiz strip — kept out of the card table so the list reads like Anki */}
      {courseContent && (() => {
        const scope = filterCi !== null ? [filterCi] : course.chapters.map((_, i) => i);
        const withQuiz = scope.filter(ci => (courseContent.chapters[ci]?.quiz?.questions.length ?? 0) > 0);
        if (withQuiz.length === 0) return null;
        return (
          <div style={{ padding: '8px 20px', borderTop: '1px solid var(--sy-ink-10)', background: 'var(--sy-bg-soft)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className="sy-mono" style={{ fontSize: 10, color: 'var(--sy-ink-40)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Quiz</span>
            {withQuiz.map(ci => (
              <button key={ci} onClick={() => onOpenQuiz(ci)}
                style={{ fontSize: 12, fontWeight: 500, color: 'var(--sy-warm)', padding: '4px 10px', borderRadius: 5, border: '1px solid rgba(201,100,66,0.25)', background: 'none', cursor: 'pointer', fontFamily: 'var(--sy-font-sans)' }}>
                {course.chapters[ci]?.title} →
              </button>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

// ── Card detail modal (Browse → click row) ────────────────────────────────────

function CardDetailModal({ card, onClose }: { card: FlatCard; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 50 }}
      onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 560, background: 'var(--sy-bg-solid)', borderRadius: 14, padding: '28px 32px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <span className="sy-mono" style={{ fontSize: 11, color: 'var(--sy-ink-40)' }}>{card.chapterTitle} · {card.lessonTitle}</span>
          <button onClick={onClose} style={{ color: 'var(--sy-ink-40)', fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>
        <h2 className="sy-serif" style={{ fontSize: 20, fontWeight: 400, lineHeight: 1.4, margin: '0 0 18px', color: 'var(--sy-ink)' }}>{card.concept.question}</h2>
        <div style={{ padding: '14px 16px', background: 'var(--sy-accent-soft)', borderRadius: 8, borderLeft: '3px solid var(--sy-accent)', marginBottom: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--sy-accent)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>TL;DR</p>
          <p className="sy-serif" style={{ fontSize: 15, fontWeight: 500, margin: 0, lineHeight: 1.5, color: 'var(--sy-ink)' }}>{card.concept.answer}</p>
        </div>
        {card.concept.detail && (
          <p className="sy-serif" style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--sy-ink-80)', margin: '0 0 14px' }}>{card.concept.detail}</p>
        )}
        {card.concept.followUps.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {card.concept.followUps.map((q, i) => (
              <span key={i} style={{ padding: '4px 10px', fontSize: 12, color: 'var(--sy-ink-60)', background: 'var(--sy-bg-sunken)', borderRadius: 12 }}>{q}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Quiz view ─────────────────────────────────────────────────────────────────

function QuizView({ quiz, onBack }: { quiz: ChapterContent['quiz']; onBack: () => void }) {
  const [selected, setSelected] = useState<(number | null)[]>(() => quiz.questions.map(() => null));

  if (quiz.questions.length === 0) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <p style={{ fontSize: 13, color: 'var(--sy-ink-40)' }}>Quiz không có câu hỏi.</p>
      <button onClick={onBack} style={{ fontSize: 13, color: 'var(--sy-warm)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--sy-font-sans)' }}>← Quay lại</button>
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 40px' }}>
      <button onClick={onBack} style={{ fontSize: 12, color: 'var(--sy-ink-60)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 20, fontFamily: 'var(--sy-font-sans)' }}>← Quay lại Browse</button>
      <h2 className="sy-serif" style={{ fontSize: 20, fontWeight: 500, margin: '0 0 20px', color: 'var(--sy-ink)' }}>Quiz: {quiz.topic}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {quiz.questions.map((q, qi) => {
          const answered = selected[qi] !== null;
          return (
            <div key={qi} style={{ background: 'var(--sy-bg-solid)', border: '1px solid var(--sy-ink-10)', borderRadius: 10, padding: '18px 20px' }}>
              <p className="sy-serif" style={{ fontSize: 15, fontWeight: 500, margin: '0 0 12px', lineHeight: 1.4, color: 'var(--sy-ink)' }}>{qi + 1}. {q.question}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {q.options.map((opt, oi) => {
                  const isSelected = selected[qi] === oi;
                  const isCorrect = oi === q.answer;
                  let bg = 'var(--sy-bg-soft)', border = 'var(--sy-ink-10)', color = 'var(--sy-ink-80)';
                  if (answered && isCorrect) { bg = 'var(--sy-accent-soft)'; border = 'var(--sy-accent)'; color = 'var(--sy-accent)'; }
                  else if (answered && isSelected) { bg = 'var(--sy-warm-soft)'; border = 'var(--sy-warm)'; color = 'var(--sy-warm)'; }
                  return (
                    <button key={oi} disabled={answered}
                      onClick={() => setSelected(prev => prev.map((v, i) => i === qi ? oi : v))}
                      style={{ textAlign: 'left', padding: '9px 14px', borderRadius: 7, border: `1px solid ${border}`, background: bg, color, fontSize: 13, cursor: answered ? 'default' : 'pointer', fontFamily: 'var(--sy-font-sans)', transition: 'background 0.15s' }}>
                      {String.fromCharCode(65 + oi)}. {opt}
                    </button>
                  );
                })}
              </div>
              {answered && (
                <p className="sy-serif" style={{ fontSize: 12, marginTop: 10, padding: '8px 12px', borderRadius: 6, background: selected[qi] === q.answer ? 'var(--sy-accent-soft)' : 'var(--sy-warm-soft)', color: selected[qi] === q.answer ? 'var(--sy-accent)' : 'var(--sy-warm)', lineHeight: 1.55 }}>
                  {selected[qi] === q.answer ? '✓ Đúng. ' : `✗ Đáp án là ${String.fromCharCode(65 + q.answer)}. `}{q.explanation}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Study mode ────────────────────────────────────────────────────────────────

function StudyMode({ cards, filterCi, onExit, onRequestEdit }: {
  cards: FlatCard[];
  filterCi: number | null;
  onExit: () => void;
  onRequestEdit: (cardId: string, focusAi: boolean) => void;
}) {
  const subset = filterCi !== null ? cards.filter(c => c.ci === filterCi) : cards;
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const card = subset[idx];
  const total = subset.length;

  const advance = useCallback((ratingIndex: number) => {
    if (!card) return;
    submitRating(card, ratingIndex);
    const { label, interval } = RATING_META[ratingIndex];
    setToast(`${label} · ${interval}`);
    setTimeout(() => {
      setToast(null);
      setRevealed(false);
      setIdx(i => (i + 1) % total);
    }, 800);
  }, [card, total]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ') { e.preventDefault(); setRevealed(r => !r); }
      if (revealed) {
        if (e.key === '1') advance(0);
        if (e.key === '2') advance(1);
        if (e.key === '3') advance(2);
        if (e.key === '4') advance(3);
      }
      if ((e.key === 'e' || e.key === 'E') && card) onRequestEdit(card.id, false);
      if ((e.key === 'a' || e.key === 'A') && card) onRequestEdit(card.id, true);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [revealed, advance, card, onRequestEdit]);

  if (total === 0) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <p style={{ color: 'var(--sy-ink-40)', fontSize: 13 }}>Không có thẻ nào.</p>
      <button onClick={onExit} style={{ color: 'var(--sy-warm)', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}>← Quay lại Browse</button>
    </div>
  );

  const pct = ((idx + 1) / total) * 100;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--sy-bg)', position: 'relative' }}>
      {/* Progress + exit */}
      <div style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: '1px solid var(--sy-ink-10)' }}>
        <button onClick={onExit} style={{ fontSize: 12, color: 'var(--sy-ink-60)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--sy-font-sans)' }}>Thoát</button>
        <div style={{ flex: 1, height: 3, background: 'var(--sy-ink-10)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--sy-accent)', transition: 'width 0.3s' }} />
        </div>
        <span className="sy-mono" style={{ fontSize: 11, color: 'var(--sy-ink-60)' }}>{idx + 1} / {total}</span>
      </div>

      {/* Card */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflowY: 'auto' }}>
        <div style={{ maxWidth: 620, width: '100%', background: 'var(--sy-bg-solid)', border: '1px solid var(--sy-ink-10)', borderRadius: 14, padding: '36px 40px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', position: 'relative' }}>
          {toast && (
            <div style={{ position: 'absolute', top: -36, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }}>
              <span className="sy-mono sy-animate-slide-in" style={{ background: 'var(--sy-ink)', color: 'var(--sy-bg)', fontSize: 12, padding: '7px 16px', borderRadius: 20, display: 'block', whiteSpace: 'nowrap' }}>{toast}</span>
            </div>
          )}

          {/* Meta */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, fontSize: 11, gap: 10 }}>
            <span className="sy-mono" style={{ color: 'var(--sy-ink-40)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {card.chapterTitle} · {card.lessonTitle}
            </span>
            <span className="sy-mono" style={{ fontSize: 11, color: 'var(--sy-ink-60)', padding: '3px 8px', borderRadius: 5, background: 'var(--sy-bg-sunken)', flexShrink: 0 }}>
              📄 tr. {derivePseudoPage(card.id)}
            </span>
          </div>

          {/* Question */}
          <h2 className="sy-serif" style={{ fontSize: 22, fontWeight: 400, lineHeight: 1.4, margin: '0 0 24px', letterSpacing: '-0.01em', color: 'var(--sy-ink)' }}>
            {card.concept.question}
          </h2>

          {!revealed ? (
            <button onClick={() => setRevealed(true)} disabled={!!toast}
              style={{ width: '100%', background: 'var(--sy-ink)', color: 'var(--sy-bg)', padding: '12px', borderRadius: 8, fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: 'var(--sy-font-sans)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              Xem đáp án <kbd style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'rgba(255,255,255,0.75)', fontSize: 10, padding: '2px 6px', borderRadius: 3, fontFamily: 'var(--sy-font-mono)' }}>Space</kbd>
            </button>
          ) : (
            <>
              <div style={{ padding: '14px 16px', background: 'var(--sy-accent-soft)', borderRadius: 8, marginBottom: 14, borderLeft: '3px solid var(--sy-accent)' }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--sy-accent)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>TL;DR</p>
                <p className="sy-serif" style={{ fontSize: 15, fontWeight: 500, margin: 0, lineHeight: 1.5, color: 'var(--sy-ink)' }}>{card.concept.answer}</p>
              </div>
              {card.concept.detail && (
                <p className="sy-serif" style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--sy-ink-80)', margin: '0 0 16px' }}>{card.concept.detail}</p>
              )}
              {card.concept.followUps.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                  {card.concept.followUps.map((q, i) => (
                    <span key={i} style={{ padding: '4px 10px', fontSize: 11, color: 'var(--sy-ink-60)', background: 'var(--sy-bg-sunken)', borderRadius: 12 }}>{q}</span>
                  ))}
                </div>
              )}
              {/* Rating */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                {RATING_META.map(({ label, sub, interval, color }, i) => (
                  <button key={label} onClick={() => advance(i)} disabled={!!toast}
                    style={{ padding: '10px 8px', borderRadius: 8, border: `1px solid ${color}30`, background: `${color}08`, color, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer', fontFamily: 'var(--sy-font-sans)', opacity: toast ? 0.5 : 1 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{label} <kbd style={{ fontSize: 10, background: `${color}15`, border: 'none', borderRadius: 3, padding: '1px 4px', fontFamily: 'var(--sy-font-mono)' }}>{i + 1}</kbd></span>
                    <span className="sy-mono" style={{ fontSize: 10, opacity: 0.75 }}>{interval}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Keyboard hints */}
      <div style={{ padding: '10px 24px', borderTop: '1px solid var(--sy-ink-10)', background: 'var(--sy-bg-soft)', fontSize: 11, color: 'var(--sy-ink-40)', display: 'flex', gap: 16, justifyContent: 'center' }}>
        {[['Space','xem đáp án'], ['1–4','đánh giá'], ['E','sửa'], ['A','hỏi AI']].map(([k, v]) => (
          <span key={k}><kbd style={{ fontSize: 10, padding: '1px 5px', background: 'var(--sy-bg-solid)', border: '1px solid var(--sy-ink-10)', borderRadius: 3, fontFamily: 'var(--sy-font-mono)' }}>{k}</kbd> {v}</span>
        ))}
      </div>
    </div>
  );
}

// ── Edit mode ─────────────────────────────────────────────────────────────────

const AI_CHIPS = ['💡 Giải thích dễ hơn', '📌 Thêm ví dụ', '🎯 Tại sao quan trọng?', '🧪 Tạo câu hỏi biến thể', '🇬🇧 Dịch sang tiếng Anh'] as const;

function EditMode({ cards, filterCi, initialCardId, focusAi, onFocusHandled }: {
  cards: FlatCard[];
  filterCi: number | null;
  initialCardId?: string | null;
  focusAi?: boolean;
  onFocusHandled?: () => void;
}) {
  const subset = filterCi !== null ? cards.filter(c => c.ci === filterCi) : cards;
  const [selectedId, setSelectedId] = useState(initialCardId ?? subset[0]?.id ?? null);
  const [aiInput, setAiInput] = useState('');
  const [aiProposal, setAiProposal] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const aiInputRef = useRef<HTMLInputElement>(null);

  const card = subset.find(c => c.id === selectedId) ?? subset[0] ?? null;

  // Keep selection valid when filter changes
  useEffect(() => {
    if (subset.length > 0 && !subset.find(c => c.id === selectedId)) {
      setSelectedId(subset[0].id);
    }
  }, [filterCi, subset, selectedId]);

  // Honor incoming selection + AI focus requests from Study → Edit handoff
  useEffect(() => {
    if (initialCardId) setSelectedId(initialCardId);
    if (focusAi) {
      aiInputRef.current?.focus();
      onFocusHandled?.();
    }
  }, [initialCardId, focusAi, onFocusHandled]);

  const runAI = (prompt: string) => {
    if (!card || aiLoading) return;
    setAiLoading(true);
    setAiProposal(null);
    // Mock: stream a placeholder response after a short delay
    const mockText = `**Gợi ý AI (${prompt}):**\n\n${card.concept.answer}\n\nĐây là phần mở rộng mẫu — kết nối AI thực tế sẽ được tích hợp trong sprint tiếp theo.`;
    let i = 0;
    const interval = setInterval(() => {
      i += 8;
      setAiProposal(mockText.slice(0, i));
      if (i >= mockText.length) { clearInterval(interval); setAiLoading(false); }
    }, 30);
  };

  if (!card) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sy-ink-40)', fontSize: 13 }}>
      Không có thẻ nào.
    </div>
  );

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      {/* Card list */}
      <div style={{ width: 300, flexShrink: 0, borderRight: '1px solid var(--sy-ink-10)', background: 'var(--sy-bg-solid)', overflowY: 'auto' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--sy-ink-10)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--sy-ink-60)' }}>{subset.length} thẻ</span>
        </div>
        {subset.map(c => (
          <button key={c.id} onClick={() => setSelectedId(c.id)} style={{
            width: '100%', textAlign: 'left', padding: '12px 16px',
            background: c.id === selectedId ? 'var(--sy-bg-sunken)' : 'transparent',
            borderBottom: '1px solid var(--sy-ink-10)',
            borderLeft: `3px solid ${c.id === selectedId ? 'var(--sy-warm)' : 'transparent'}`,
            cursor: 'pointer', border: 'none', borderLeftWidth: 3,
            display: 'flex', flexDirection: 'column', gap: 4, fontFamily: 'var(--sy-font-sans)',
          }}>
            <p className="sy-serif" style={{ fontSize: 13, color: 'var(--sy-ink)', margin: 0, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {c.concept.question}
            </p>
            <span className="sy-mono" style={{ fontSize: 10, color: 'var(--sy-ink-40)' }}>{c.chapterTitle}</span>
          </button>
        ))}
      </div>

      {/* Detail pane */}
      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--sy-bg)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, maxWidth: 680, margin: '0 auto', padding: '24px 28px 20px', width: '100%' }}>
          <div className="sy-mono" style={{ display: 'flex', gap: 6, fontSize: 11, color: 'var(--sy-ink-40)', marginBottom: 14 }}>
            <span>{card.chapterTitle}</span><span>›</span><span>{card.lessonTitle}</span>
          </div>

          {/* Question */}
          <div style={{ background: 'var(--sy-bg-solid)', border: '1px solid var(--sy-ink-10)', borderRadius: 10, padding: '16px 20px', marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span className="sy-mono" style={{ fontSize: 10, color: 'var(--sy-ink-40)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Câu hỏi</span>
              <span style={{ fontSize: 10, color: 'var(--sy-accent)' }}>✎ có thể chỉnh sửa</span>
            </div>
            <div contentEditable suppressContentEditableWarning className="sy-serif"
              style={{ fontSize: 17, lineHeight: 1.4, color: 'var(--sy-ink)', outline: 'none', borderBottom: '1px dashed var(--sy-ink-10)', paddingBottom: 6 }}>
              {card.concept.question}
            </div>
          </div>

          {/* TL;DR */}
          <div style={{ background: 'var(--sy-bg-solid)', border: '1px solid var(--sy-ink-10)', borderRadius: 10, padding: '14px 20px', marginBottom: 10 }}>
            <span className="sy-mono" style={{ fontSize: 10, color: 'var(--sy-accent)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>TL;DR</span>
            <div contentEditable suppressContentEditableWarning className="sy-serif"
              style={{ fontSize: 14, fontWeight: 500, color: 'var(--sy-ink)', outline: 'none', marginTop: 6, lineHeight: 1.5 }}>
              {card.concept.answer}
            </div>
          </div>

          {/* Detail */}
          {card.concept.detail && (
            <div style={{ background: 'var(--sy-bg-solid)', border: '1px solid var(--sy-ink-10)', borderRadius: 10, padding: '14px 20px', marginBottom: 10 }}>
              <span className="sy-mono" style={{ fontSize: 10, color: 'var(--sy-ink-40)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Chi tiết</span>
              <div contentEditable suppressContentEditableWarning className="sy-serif"
                style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--sy-ink-80)', outline: 'none', marginTop: 6 }}>
                {card.concept.detail}
              </div>
            </div>
          )}

          {/* AI proposal */}
          {(aiProposal !== null || aiLoading) && (
            <div style={{ border: '1.5px solid rgba(201,100,66,0.35)', background: `linear-gradient(to bottom, var(--sy-warm-soft), var(--sy-bg-solid))`, borderRadius: 10, padding: '14px 20px', marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="sy-mono" style={{ fontSize: 10, color: 'var(--sy-warm)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>✨ Đề xuất AI</span>
                {aiLoading && <span className="sy-mono" style={{ fontSize: 10, color: 'var(--sy-ink-40)' }}>đang viết...</span>}
              </div>
              <p className="sy-serif" style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--sy-ink-80)', margin: '0 0 12px', whiteSpace: 'pre-line' }}>
                {aiProposal}{aiLoading && <span className="sy-animate-blink" style={{ color: 'var(--sy-warm)' }}>▌</span>}
              </p>
              {!aiLoading && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setAiProposal(null)} style={{ background: 'var(--sy-warm)', color: '#fff', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: 'var(--sy-font-sans)' }}>Chấp nhận & thêm</button>
                  <button onClick={() => setAiProposal(null)} style={{ color: 'var(--sy-ink-60)', padding: '6px 14px', borderRadius: 6, fontSize: 12, border: '1px solid var(--sy-ink-10)', background: 'none', cursor: 'pointer', fontFamily: 'var(--sy-font-sans)' }}>Bỏ</button>
                </div>
              )}
            </div>
          )}

          {/* Follow-ups */}
          {card.concept.followUps.length > 0 && (
            <div style={{ background: 'var(--sy-bg-solid)', border: '1px solid var(--sy-ink-10)', borderRadius: 10, padding: '14px 20px' }}>
              <span className="sy-mono" style={{ fontSize: 10, color: 'var(--sy-ink-40)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Follow-up</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {card.concept.followUps.map((q, i) => (
                  <span key={i} style={{ padding: '5px 11px', fontSize: 12, color: 'var(--sy-ink-80)', background: 'var(--sy-bg-sunken)', borderRadius: 14 }}>{q} <span style={{ color: 'var(--sy-ink-40)', fontSize: 10 }}>→</span></span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AI dock — sticky */}
        <div style={{ position: 'sticky', bottom: 0, background: 'var(--sy-bg-solid)', borderTop: '1px solid var(--sy-ink-10)', padding: '12px 28px', boxShadow: '0 -4px 20px rgba(0,0,0,0.04)' }}>
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            <p className="sy-mono" style={{ fontSize: 10, color: 'var(--sy-ink-40)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, margin: '0 0 8px' }}>✨ AI assist</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {AI_CHIPS.map(chip => (
                <button key={chip} onClick={() => runAI(chip)}
                  style={{ padding: '6px 11px', fontSize: 12, color: 'var(--sy-ink-80)', background: 'var(--sy-bg-sunken)', borderRadius: 14, border: '1px solid var(--sy-ink-10)', cursor: 'pointer', fontFamily: 'var(--sy-font-sans)' }}>
                  {chip}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--sy-bg-sunken)', padding: '8px 12px', borderRadius: 8 }}>
              <span style={{ color: 'var(--sy-warm)', fontSize: 13 }}>✨</span>
              <input ref={aiInputRef} value={aiInput} onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && aiInput.trim()) { runAI(aiInput); setAiInput(''); } }}
                placeholder="Hỏi AI bất kỳ điều gì về thẻ này..."
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, fontFamily: 'var(--sy-font-sans)', color: 'var(--sy-ink)' }} />
              <kbd style={{ fontSize: 10, padding: '2px 5px', background: 'var(--sy-bg-solid)', border: '1px solid var(--sy-ink-10)', borderRadius: 3, color: 'var(--sy-ink-60)', fontFamily: 'var(--sy-font-mono)' }}>⏎</kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [saved, setSaved] = useState<SavedCourse | null>(null);
  const [fetchError, setFetchError] = useState('');
  const [mode, setMode] = useState<Mode>('browse');
  const [filterCi, setFilterCi] = useState<number | null>(null);
  const [openCard, setOpenCard] = useState<FlatCard | null>(null);
  const [quizCi, setQuizCi] = useState<number | null>(null);
  const [progressMap, setProgressMap] = useState<ProgressMap>({});

  useEffect(() => {
    if (authLoading || !user) return;
    fetch('/api/progress/map')
      .then(r => r.ok ? r.json() : {})
      .then((m: ProgressMap | { error?: string }) => { if (!('error' in m)) setProgressMap(m as ProgressMap); })
      .catch(() => {});
  }, [user, authLoading]);
  const [editInitialCardId, setEditInitialCardId] = useState<string | null>(null);
  const [editFocusAi, setEditFocusAi] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    async function load() {
      try {
        if (localAdapter) {
          const data = await localAdapter.getById(id, user!.uid);
          setSaved(data);
        } else {
          const res = await fetch(`/api/courses/${id}`);
          const data = await res.json();
          if (!data.success) throw new Error(data.error);
          setSaved(data.course);
        }
      } catch (e) {
        setFetchError(e instanceof Error ? e.message : 'Failed to load course');
      }
    }
    load();
  }, [id, user, authLoading]);

  if (authLoading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--sy-bg)', color: 'var(--sy-ink-40)', fontSize: 13 }}>Loading...</div>;
  if (!user) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--sy-bg)', color: 'var(--sy-ink-60)', fontSize: 13 }}>Bạn cần đăng nhập</div>;
  if (fetchError) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--sy-bg)', color: 'var(--sy-again)', fontSize: 13 }}>{fetchError}</div>;
  if (!saved) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--sy-bg)', color: 'var(--sy-ink-40)', fontSize: 13 }}>Đang tải khóa học...</div>;

  const { course, courseContent } = saved;
  const cards = flattenCards(course, courseContent);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--sy-bg)', fontFamily: 'var(--sy-font-sans)', color: 'var(--sy-ink)' }}>
      {/* ── Course header ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid var(--sy-ink-10)', background: 'var(--sy-bg-solid)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <button onClick={() => router.push('/')} style={{ color: 'var(--sy-ink-60)', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--sy-font-sans)' }}>← Thư viện</button>
          <div style={{ minWidth: 0 }}>
            <p className="sy-serif" style={{ fontSize: 15, fontWeight: 500, margin: 0, letterSpacing: '-0.005em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--sy-ink)' }}>{course.title}</p>
            <p className="sy-mono" style={{ fontSize: 11, color: 'var(--sy-ink-40)', margin: 0 }}>{cards.length} thẻ · {course.chapters.length} chương</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <ModeSwitcher mode={mode} onChange={m => { setMode(m); setQuizCi(null); }} />
          {user.photoURL && <img src={user.photoURL} alt="" style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--sy-ink-10)' }} />}
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Chapter rail (hidden in Study) */}
        {mode !== 'study' && (
          <ChapterRail
            course={course}
            cards={cards}
            filterCi={filterCi}
            onFilterCi={ci => { setFilterCi(ci); setQuizCi(null); }}
            progressMap={progressMap}
          />
        )}

        {/* Content area */}
        {mode === 'browse' && quizCi === null && (
          <BrowseMode
            cards={cards}
            filterCi={filterCi}
            onOpenCard={setOpenCard}
            onOpenQuiz={setQuizCi}
            course={course}
            courseContent={courseContent}
            progressMap={progressMap}
          />
        )}

        {mode === 'browse' && quizCi !== null && courseContent && (
          <QuizView quiz={courseContent.chapters[quizCi]?.quiz ?? { topic: '', questions: [] }} onBack={() => setQuizCi(null)} />
        )}

        {mode === 'study' && (
          <StudyMode
            cards={cards}
            filterCi={filterCi}
            onExit={() => setMode('browse')}
            onRequestEdit={(cardId, focusAi) => {
              setEditInitialCardId(cardId);
              setEditFocusAi(focusAi);
              setMode('edit');
            }}
          />
        )}

        {mode === 'edit' && (
          <EditMode
            cards={cards}
            filterCi={filterCi}
            initialCardId={editInitialCardId}
            focusAi={editFocusAi}
            onFocusHandled={() => setEditFocusAi(false)}
          />
        )}
      </div>

      {/* ── Card detail modal ─────────────────────────────────────────────── */}
      {openCard && <CardDetailModal card={openCard} onClose={() => setOpenCard(null)} />}
    </div>
  );
}
