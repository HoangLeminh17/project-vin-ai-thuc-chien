'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { SavedCourse } from '@/core/models/saved-course';
import { Course, Chapter, Lesson, CourseContent, ChapterContent, LessonContent, ConceptCard, QuizQuestion } from '@/core/models/learning-model';
import { LocalCourseAdapter } from '@/infrastructure/adapters/local-course.adapter';

const isLocal = process.env.NEXT_PUBLIC_COURSE_STORE === 'local';
const localAdapter = isLocal ? new LocalCourseAdapter() : null;

// ── Sub-components (same as page.tsx) ─────────────────────────────────────────

function ConceptCardView({ concept, index, total }: { concept: ConceptCard; index: number; total: number }) {
  const [answer, setAnswer] = useState('');
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <span key={i} className={`inline-block h-1.5 w-4 rounded-full ${i === index ? 'bg-teal-500' : 'bg-gray-200'}`} />
          ))}
        </div>
        <span className="text-xs text-gray-400 font-mono">Concept {index + 1} / {total}</span>
      </div>

      <p className="text-[17px] font-medium text-gray-900 leading-snug">{concept.question}</p>

      <textarea
        disabled={revealed}
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        placeholder="Thử trả lời trước khi reveal..."
        rows={3}
        className={`w-full resize-none rounded-lg border px-3 py-2.5 text-sm leading-relaxed outline-none transition-colors
          ${revealed ? 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed' : 'border-gray-300 bg-white text-gray-800 focus:border-teal-400'}`}
      />

      {!revealed && (
        <button onClick={() => setRevealed(true)} className="w-full py-2 rounded-lg bg-teal-500 text-white text-sm font-medium hover:bg-teal-600 transition-colors">
          Reveal
        </button>
      )}

      {revealed && (
        <>
          <hr className="border-gray-100" />
          <div className="space-y-1">
            <p className="text-xs font-semibold text-teal-600 uppercase tracking-wider">TL;DR</p>
            <p className="text-sm text-gray-800 leading-relaxed">{concept.answer}</p>
          </div>
          {concept.detail && <p className="text-sm text-gray-600 leading-relaxed">{concept.detail}</p>}
          {concept.followUps.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Follow-up</p>
              <div className="flex flex-wrap gap-2">
                {concept.followUps.map((q, i) => (
                  <button key={i} className="px-3 py-1.5 rounded-full border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors">{q}</button>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-4 gap-2 pt-1">
            {(['Again', 'Hard', 'Good', 'Easy'] as const).map((label, i) => {
              const sub = ['không nhớ', 'lờ mờ', 'nhớ rồi', 'quá dễ'][i];
              const colors = ['border-red-200 text-red-600 hover:bg-red-50', 'border-orange-200 text-orange-600 hover:bg-orange-50', 'border-green-200 text-green-700 hover:bg-green-50', 'border-blue-200 text-blue-600 hover:bg-blue-50'][i];
              return (
                <button key={label} className={`flex flex-col items-center py-2 rounded-lg border text-xs font-medium transition-colors ${colors}`}>
                  {label}
                  <span className="text-[10px] font-normal opacity-70 mt-0.5">{sub}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function QuizView({ quiz }: { quiz: ChapterContent['quiz'] }) {
  const [selected, setSelected] = useState<(number | null)[]>(() => quiz.questions.map(() => null));

  if (quiz.questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-64 text-gray-400">
        <p className="text-sm">Quiz không có câu hỏi</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Quiz: {quiz.topic}</h2>
      {quiz.questions.map((q, qi) => {
        const answered = selected[qi] !== null;
        return (
          <div key={qi} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <p className="font-medium text-gray-800 text-sm leading-relaxed">{qi + 1}. {q.question}</p>
            <div className="space-y-2">
              {q.options.map((opt, oi) => {
                const isSelected = selected[qi] === oi;
                const isCorrect = oi === q.answer;
                let cls = 'w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-colors ';
                if (!answered) cls += 'border-gray-200 hover:bg-gray-50 cursor-pointer';
                else if (isCorrect) cls += 'border-green-400 bg-green-50 text-green-800 font-medium';
                else if (isSelected) cls += 'border-red-300 bg-red-50 text-red-700';
                else cls += 'border-gray-100 text-gray-400';
                return (
                  <button key={oi} disabled={answered} onClick={() => setSelected(prev => prev.map((v, i) => i === qi ? oi : v))} className={cls}>
                    {String.fromCharCode(65 + oi)}. {opt}
                  </button>
                );
              })}
            </div>
            {answered && (
              <p className={`text-xs p-3 rounded-lg leading-relaxed ${selected[qi] === q.answer ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                {selected[qi] === q.answer ? 'Correct. ' : `Incorrect — answer is ${String.fromCharCode(65 + q.answer)}. `}
                {q.explanation}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [saved, setSaved] = useState<SavedCourse | null>(null);
  const [fetchError, setFetchError] = useState('');
  const [openChapter, setOpenChapter] = useState<number | null>(0);
  const [openLesson, setOpenLesson] = useState<{ ci: number; li: number } | null>(null);
  const [quizChapter, setQuizChapter] = useState<number | null>(null);

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

  if (authLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 text-sm">Loading...</div>;
  if (!user) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 text-sm">Bạn cần đăng nhập</div>;
  if (fetchError) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-red-500 text-sm">{fetchError}</div>;
  if (!saved) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 text-sm animate-pulse">Đang tải course...</div>;

  const { course, courseContent } = saved;
  const selectedLesson = openLesson ? course.chapters[openLesson.ci]?.lessons[openLesson.li] : null;
  const lessonContent = openLesson && courseContent ? courseContent.chapters[openLesson.ci]?.lessons[openLesson.li] : null;
  const chapterLessonCount = openLesson ? (course.chapters[openLesson.ci]?.lessons.length ?? 1) : 1;
  const quizContent = quizChapter !== null && courseContent ? courseContent.chapters[quizChapter]?.quiz : null;
  const isLessonView = openLesson !== null && quizChapter === null;

  return (
    <main className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Top bar */}
      <div className="shrink-0 bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-500 hover:text-gray-800 transition-colors shrink-0">
            ← Dashboard
          </button>
          <h1 className="font-semibold text-gray-900 truncate">{course.title}</h1>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {user.photoURL && <img src={user.photoURL} alt="" className="h-7 w-7 rounded-full border border-gray-200" />}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-72 shrink-0 bg-white border-r overflow-y-auto">
          <nav className="py-2">
            {course.chapters.map((ch, ci) => (
              <div key={ci}>
                <button
                  onClick={() => setOpenChapter(openChapter === ci ? null : ci)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-semibold text-gray-700 leading-snug pr-2">
                    <span className="text-blue-500 mr-1">Ch {ci + 1}.</span>{ch.title}
                  </span>
                  <svg className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${openChapter === ci ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openChapter === ci && (
                  <div>
                    {ch.lessons?.map((lesson, li) => {
                      const active = openLesson?.ci === ci && openLesson?.li === li;
                      return (
                        <button key={li} onClick={() => { setOpenLesson({ ci, li }); setQuizChapter(null); }}
                          className={`w-full text-left px-5 py-2 text-sm transition-colors border-r-2 ${active ? 'bg-blue-50 text-blue-700 border-blue-500' : 'text-gray-600 hover:bg-gray-50 border-transparent'}`}>
                          {lesson.title}
                        </button>
                      );
                    })}
                    <button onClick={() => { setQuizChapter(ci); setOpenLesson(null); }}
                      className={`w-full text-left px-5 py-2 text-sm font-medium transition-colors border-r-2 ${quizChapter === ci ? 'bg-orange-50 text-orange-700 border-orange-400' : 'text-gray-400 hover:bg-gray-50 border-transparent hover:text-gray-600'}`}>
                      Quiz
                    </button>
                  </div>
                )}
              </div>
            ))}
          </nav>
        </aside>

        {/* Content panel */}
        <div className="flex-1 overflow-y-auto">
          {isLessonView && selectedLesson && (
            <div className="px-8 py-6 space-y-5">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">{course.chapters[openLesson!.ci]?.title}</p>
                <h2 className="text-lg font-semibold text-gray-900">{selectedLesson.title}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{selectedLesson.key_concept}</p>
              </div>
              {lessonContent?.concept && (
                <ConceptCardView key={`${openLesson!.ci}-${openLesson!.li}`} concept={lessonContent.concept} index={openLesson!.li} total={chapterLessonCount} />
              )}
              <hr className="border-gray-100" />
              <ul className="space-y-2">
                {selectedLesson.outline?.map((point, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-700">
                    <span className="text-blue-400 mt-0.5 shrink-0">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {quizChapter !== null && (
            quizContent
              ? <QuizView key={quizChapter} quiz={quizContent} />
              : <div className="flex items-center justify-center min-h-64 text-gray-400 text-sm">Quiz không có sẵn</div>
          )}

          {openLesson === null && quizChapter === null && (
            <div className="flex items-center justify-center min-h-[60vh] text-gray-400">
              <p className="text-sm">Chọn một bài học để xem nội dung</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
