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
  course, filterCi, onFilterCi,
}: {
  course: Course;
  filterCi: number | null;
  onFilterCi: (ci: number | null) => void;
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
      {course.chapters.map((ch, ci) => (
        <button key={ci} onClick={() => onFilterCi(ci)} style={{
          width: '100%', textAlign: 'left', padding: '8px 16px', fontSize: 13, cursor: 'pointer', border: 'none',
          background: filterCi === ci ? 'var(--sy-bg-solid)' : 'transparent',
          color: filterCi === ci ? 'var(--sy-ink)' : 'var(--sy-ink-60)',
          borderLeft: `2px solid ${filterCi === ci ? 'var(--sy-warm)' : 'transparent'}`,
          fontFamily: 'var(--sy-font-serif)',
        }}>
          <span style={{ fontSize: 11, color: 'var(--sy-ink-40)', fontFamily: 'var(--sy-font-mono)', marginRight: 6 }}>0{ci + 1}</span>
          {ch.title}
        </button>
      ))}
    </aside>
  );
}

// ── Browse mode ───────────────────────────────────────────────────────────────

function BrowseMode({
  cards, filterCi, onOpenCard, onOpenQuiz, course, courseContent,
}: {
  cards: FlatCard[];
  filterCi: number | null;
  onOpenCard: (card: FlatCard) => void;
  onOpenQuiz: (ci: number) => void;
  course: Course;
  courseContent: { chapters: ChapterContent[] } | null;
}) {
  const [query, setQuery] = useState('');
  const shown = cards
    .filter(c => filterCi === null || c.ci === filterCi)
    .filter(c => !query || c.concept.question.toLowerCase().includes(query.toLowerCase()));

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--sy-ink-10)', background: 'var(--sy-bg-solid)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--sy-bg-sunken)', padding: '7px 12px', borderRadius: 7, maxWidth: 360 }}>
          <span style={{ color: 'var(--sy-ink-40)', fontSize: 14 }}>⌕</span>
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder={`Tìm trong ${cards.length} thẻ...`}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, fontFamily: 'var(--sy-font-sans)', color: 'var(--sy-ink)' }}
          />
        </div>
        <span className="sy-mono" style={{ fontSize: 11, color: 'var(--sy-ink-40)' }}>{shown.length} thẻ</span>
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
                {['Câu hỏi', 'Chương', 'Bài học'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '9px 16px', fontSize: 10, fontWeight: 600, color: 'var(--sy-ink-40)', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid var(--sy-ink-10)', fontFamily: 'var(--sy-font-mono)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((card, i) => (
                <tr key={card.id} onClick={() => onOpenCard(card)}
                  style={{ cursor: 'pointer', background: i % 2 ? 'var(--sy-bg-soft)' : 'var(--sy-bg-solid)', borderBottom: '1px solid var(--sy-ink-10)' }}>
                  <td className="sy-serif" style={{ padding: '12px 16px', color: 'var(--sy-ink)', lineHeight: 1.4, maxWidth: 480 }}>{card.concept.question}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--sy-ink-60)', whiteSpace: 'nowrap' }}>{card.chapterTitle}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--sy-ink-60)' }}>{card.lessonTitle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Quiz entries */}
        {courseContent && (filterCi !== null ? [filterCi] : course.chapters.map((_, i) => i)).map(ci => {
          const quiz = courseContent.chapters[ci]?.quiz;
          if (!quiz || quiz.questions.length === 0) return null;
          return (
            <div key={ci} style={{ padding: '10px 20px', borderBottom: '1px solid var(--sy-ink-10)', background: 'var(--sy-bg-solid)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="sy-mono" style={{ fontSize: 12, color: 'var(--sy-ink-60)' }}>Quiz — {course.chapters[ci]?.title}</span>
              <button onClick={() => onOpenQuiz(ci)} style={{ fontSize: 12, fontWeight: 500, color: 'var(--sy-warm)', padding: '4px 10px', borderRadius: 5, border: '1px solid rgba(201,100,66,0.25)', background: 'none', cursor: 'pointer', fontFamily: 'var(--sy-font-sans)' }}>
                Làm quiz →
              </button>
            </div>
          );
        })}
      </div>
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
          <ChapterRail course={course} filterCi={filterCi} onFilterCi={ci => { setFilterCi(ci); setQuizCi(null); }} />
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
