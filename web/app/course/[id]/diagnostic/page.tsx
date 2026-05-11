'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/auth-context';
import { DiagnosticQuiz } from '@/core/models/learning-model';

export default function DiagnosticPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<DiagnosticQuiz | null>(null);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<'confident' | 'unsure' | 'guess' | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    
    async function loadQuiz() {
      try {
        // 1. Fetch course details to get markdown_url
        const courseRes = await fetch(`/api/courses/${id}`);
        if (!courseRes.ok) throw new Error('Không tìm thấy khóa học');
        const courseData = await courseRes.json();
        
        if (!courseData.markdownUrl) {
           throw new Error('Khóa học chưa có tài liệu gốc để chẩn đoán');
        }

        // 2. Fetch markdown text
        const mdRes = await fetch(courseData.markdownUrl);
        const markdown = await mdRes.text();

        // 3. Generate quiz
        const token = await user!.getIdToken();
        const quizRes = await fetch('/api/diagnostic-quiz', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ markdown })
        });
        
        if (!quizRes.ok) throw new Error('Lỗi khi sinh bài chẩn đoán');
        const quizData = await quizRes.json();
        setQuiz(quizData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    loadQuiz();
  }, [id, user, authLoading]);

  const handleReveal = () => {
    if (selectedOption === null || confidence === null) return;
    setIsAnswerRevealed(true);
  };

  const handleNext = async () => {
    if (!quiz || !user) return;
    const currentQ = quiz.questions[currentIndex];
    
    // 1. Send update to UKT
    const isCorrect = selectedOption === currentQ.answer;
    let uktRating: 'hard' | 'ok' | 'easy' = 'ok';
    
    if (!isCorrect) {
      uktRating = 'hard';
    } else {
      if (confidence === 'guess') uktRating = 'hard';
      else if (confidence === 'unsure') uktRating = 'ok';
      else uktRating = 'easy'; // confident and correct
    }

    try {
      // In a real implementation, you'd call a Next.js API route that calls the UKT service
      // Example: await fetch('/api/ukt/update', { ... })
      console.log('Sending to UKT:', { topic: currentQ.topic, rating: uktRating });
    } catch (e) {
      console.error('Failed to update UKT', e);
    }

    // 2. Move to next question
    if (currentIndex < quiz.questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setConfidence(null);
      setIsAnswerRevealed(false);
    } else {
      setIsFinished(true);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="sy-animate-spin w-8 h-8 border-4 border-gray-200 border-t-orange-500 rounded-full mb-4"></div>
        <p className="text-gray-500 font-medium">Đang tạo bài kiểm tra chẩn đoán...</p>
        <p className="text-sm text-gray-400 mt-2">AI đang phân tích tài liệu để tìm ra các chủ đề chính.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Link href={`/course/${id}`} className="text-blue-600 hover:underline">Quay lại khóa học</Link>
        </div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center space-y-4 max-w-sm w-full shadow-xl">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto text-2xl">🎯</div>
          <h2 className="text-xl font-bold text-gray-900">Hoàn thành chẩn đoán!</h2>
          <p className="text-gray-500 text-sm mb-6">Hệ thống đã thu thập đủ dữ liệu. Các thẻ bài của bạn giờ đây sẽ được sắp xếp ưu tiên theo những điểm bạn còn yếu.</p>
          <button 
            onClick={() => router.push(`/course/${id}`)}
            className="block w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Bắt đầu học ngay
          </button>
        </div>
      </div>
    );
  }

  if (!quiz || quiz.questions.length === 0) return null;

  const currentQ = quiz.questions[currentIndex];

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <Link href={`/course/${id}`} className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
            ← Bỏ qua
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-32 height-2 bg-gray-200 rounded-full overflow-hidden h-2">
              <div 
                className="bg-orange-500 h-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / quiz.questions.length) * 100}%` }}
              />
            </div>
            <span className="text-xs font-mono text-gray-400">
              {currentIndex + 1} / {quiz.questions.length}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          <div className="mb-6">
            <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 text-xs font-semibold rounded-full mb-4 uppercase tracking-wider">
              {currentQ.topic}
            </span>
            <h2 className="text-xl font-medium text-gray-900 leading-snug">
              {currentQ.question}
            </h2>
          </div>

          <div className="space-y-3 mb-8">
            {currentQ.options.map((opt, idx) => {
              const isSelected = selectedOption === idx;
              const isCorrect = idx === currentQ.answer;
              
              let bg = 'bg-gray-50 hover:bg-gray-100';
              let border = 'border-gray-200';
              let textColor = 'text-gray-700';

              if (isAnswerRevealed) {
                if (isCorrect) {
                  bg = 'bg-green-50';
                  border = 'border-green-500';
                  textColor = 'text-green-800';
                } else if (isSelected) {
                  bg = 'bg-red-50';
                  border = 'border-red-500';
                  textColor = 'text-red-800';
                } else {
                  bg = 'bg-gray-50 opacity-50';
                }
              } else if (isSelected) {
                bg = 'bg-blue-50';
                border = 'border-blue-500';
                textColor = 'text-blue-800';
              }

              return (
                <button
                  key={idx}
                  disabled={isAnswerRevealed}
                  onClick={() => setSelectedOption(idx)}
                  className={`w-full text-left p-4 rounded-xl border ${border} ${bg} ${textColor} transition-all duration-200 flex gap-3 items-start`}
                >
                  <span className="font-mono mt-0.5 opacity-60">{String.fromCharCode(65 + idx)}.</span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>

          {!isAnswerRevealed ? (
            <div className={`transition-all duration-300 ${selectedOption !== null ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
              <p className="text-sm font-medium text-gray-600 mb-3 text-center">Bạn có tự tin với đáp án này không?</p>
              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => { setConfidence('confident'); setTimeout(handleReveal, 100); }} className="py-2.5 rounded-lg border border-green-200 bg-green-50 text-green-700 text-sm font-medium hover:bg-green-100">Chắc chắn</button>
                <button onClick={() => { setConfidence('unsure'); setTimeout(handleReveal, 100); }} className="py-2.5 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-700 text-sm font-medium hover:bg-yellow-100">Phân vân</button>
                <button onClick={() => { setConfidence('guess'); setTimeout(handleReveal, 100); }} className="py-2.5 rounded-lg border border-orange-200 bg-orange-50 text-orange-700 text-sm font-medium hover:bg-orange-100">Đoán mò</button>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className={`p-4 rounded-xl mb-6 ${selectedOption === currentQ.answer ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
                <p className="font-semibold mb-1 flex items-center gap-2">
                  {selectedOption === currentQ.answer ? (
                    <><span className="text-green-600">✓ Chính xác!</span></>
                  ) : (
                    <><span className="text-orange-600">✗ Chưa chính xác.</span> <span className="text-gray-600 font-normal text-sm">Đáp án đúng là {String.fromCharCode(65 + currentQ.answer)}</span></>
                  )}
                </p>
                <p className="text-sm text-gray-700">{currentQ.explanation}</p>
              </div>
              
              <button
                onClick={handleNext}
                className="w-full py-4 bg-gray-900 text-white rounded-xl font-medium shadow-lg hover:bg-black transition-colors"
              >
                Tiếp tục →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
