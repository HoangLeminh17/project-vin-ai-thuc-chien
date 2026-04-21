'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { useCourses } from '@/lib/hooks/use-courses';
import { SavedCourse } from '@/core/models/saved-course';

function CourseCard({ course, onDelete }: { course: SavedCourse; onDelete: () => void }) {
  const router = useRouter();
  const chapterCount = course.course.chapters.length;
  const lessonCount = course.course.chapters.reduce((n, ch) => n + ch.lessons.length, 0);
  const date = new Date(course.createdAt).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">{course.title}</h3>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          title="Delete course"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span>{chapterCount} chapter{chapterCount !== 1 ? 's' : ''}</span>
        <span className="text-gray-300">·</span>
        <span>{lessonCount} lesson{lessonCount !== 1 ? 's' : ''}</span>
        <span className="text-gray-300">·</span>
        <span>{date}</span>
      </div>

      <button
        onClick={() => router.push(`/course/${course.id}`)}
        className="mt-auto w-full py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
      >
        Open course
      </button>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, login, logout } = useAuth();
  const { courses, loading, error, deleteCourse } = useCourses(user?.uid ?? null);

  if (authLoading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400 text-sm">Loading...</div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-600">Đăng nhập để xem courses của bạn</p>
        <button onClick={login} className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          Đăng nhập với Google
        </button>
      </main>
    );
  }

  async function handleDelete(id: string) {
    if (!confirm('Xóa course này?')) return;
    await deleteCourse(id);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/')} className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
            ← Upload mới
          </button>
          <span className="text-gray-300">|</span>
          <h1 className="font-semibold text-gray-900">My Courses</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{user.displayName || user.email}</span>
          {user.photoURL && <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full border" />}
          <button onClick={logout} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Đăng xuất</button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {loading && (
          <div className="text-center py-16 text-gray-400 text-sm">Đang tải...</div>
        )}

        {error && (
          <div className="text-center py-16 text-red-500 text-sm">{error}</div>
        )}

        {!loading && !error && courses.length === 0 && (
          <div className="text-center py-20 space-y-3">
            <p className="text-gray-500">Chưa có course nào.</p>
            <button
              onClick={() => router.push('/')}
              className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Tạo course đầu tiên
            </button>
          </div>
        )}

        {!loading && courses.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map(c => (
              <CourseCard key={c.id} course={c} onDelete={() => handleDelete(c.id)} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
