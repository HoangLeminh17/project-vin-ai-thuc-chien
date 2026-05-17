'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/lib/contexts/auth-context'
import { useRouter } from 'next/navigation'

export function LandingPage() {
  const { user, login } = useAuth()
  const router = useRouter()
  const navRef = useRef<HTMLElement>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleCTA = () => {
    if (user) {
      router.push('/')
    } else {
      login()
    }
  }

  return (
    <main className="overflow-x-hidden bg-[#020617] text-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=JetBrains+Mono:wght@400;500&display=swap');

        .sy-fractal {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
        }

        .sy-aurora {
          position: absolute;
          inset: -10px;
          z-index: 1;
          pointer-events: none;
          opacity: 0;
          filter: blur(10px);
          background-image:
            repeating-linear-gradient(100deg, #020617 0%, #020617 7%, transparent 10%, transparent 12%, #020617 16%),
            repeating-linear-gradient(100deg, #1648d4 10%, #818cf8 15%, #60a5fa 20%, #a78bfa 25%, #2563eb 30%);
          background-size: 300% 300%, 200% 200%;
          background-position: 50% 50%, 50% 50%;
          animation: sy-aurora-move 60s linear infinite, sy-aurora-in 2.5s ease-out 0.6s forwards;
          -webkit-mask-image: radial-gradient(ellipse at 80% 0%, black 15%, transparent 62%);
          mask-image: radial-gradient(ellipse at 80% 0%, black 15%, transparent 62%);
        }

        .sy-aurora::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            repeating-linear-gradient(100deg, #020617 0%, #020617 7%, transparent 10%, transparent 12%, #020617 16%),
            repeating-linear-gradient(100deg, #1648d4 10%, #818cf8 15%, #60a5fa 20%, #a78bfa 25%, #2563eb 30%);
          background-size: 200% 100%;
          background-attachment: fixed;
          animation: sy-aurora-move 60s linear infinite;
          mix-blend-mode: difference;
        }

        @keyframes sy-aurora-move {
          from { background-position: 50% 50%, 50% 50%; }
          to { background-position: 350% 50%, 350% 50%; }
        }

        @keyframes sy-aurora-in {
          to { opacity: 0.48; }
        }

        @keyframes sy-fade-up {
          from { opacity: 0; transform: translateY(22px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes sy-dot-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 10px #3b7ef8; }
          50% { opacity: 0.4; box-shadow: 0 0 3px #3b7ef8; }
        }

        @keyframes sy-caret-bounce {
          0%, 100% { transform: rotate(45deg) translateY(0); }
          50% { transform: rotate(45deg) translateY(5px); }
        }

        .sy-fade-up { animation: sy-fade-up 0.7s ease-out both; }
        .sy-fade-up.d1 { animation-delay: 0.4s; }
        .sy-fade-up.d2 { animation-delay: 0.6s; }
        .sy-fade-up.d3 { animation-delay: 0.8s; }
        .sy-fade-up.d4 { animation-delay: 1s; }
        .sy-fade-up.d5 { animation-delay: 1.2s; }
        .sy-fade-up.d6 { animation-delay: 1.4s; }

        .sy-scroll-hint { animation: sy-fade-up 0.7s ease-out 1.4s both; }

        .sy-dot-pulse {
          animation: sy-dot-pulse 2.2s ease-in-out infinite;
        }

        .sy-badge-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #3b7ef8;
          box-shadow: 0 0 10px #3b7ef8;
        }

        .sy-scroll-caret {
          animation: sy-caret-bounce 2s ease-in-out infinite;
        }

        .sy-reveal {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }

        .sy-reveal.d1 { transition-delay: 0.1s; }
        .sy-reveal.d2 { transition-delay: 0.2s; }
        .sy-reveal.d3 { transition-delay: 0.3s; }

        .sy-reveal.shown {
          opacity: 1;
          transform: translateY(0);
        }

        .sy-feat-section {
          padding: 112px 52px;
          background: #020617;
          position: relative;
          overflow: hidden;
        }

        .sy-feat-section.alt {
          background: #03091e;
        }

        .sy-feat-section::before {
          content: '';
          position: absolute;
          width: 700px;
          height: 700px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(22,72,212,0.07) 0%, transparent 70%);
          top: 50%;
          pointer-events: none;
        }

        .sy-feat-section:not(.reverse)::before {
          left: -200px;
          transform: translateY(-50%);
        }

        .sy-feat-section.reverse::before {
          right: -200px;
          left: auto;
          transform: translateY(-50%);
        }

        .sy-nav.scrolled {
          background: rgba(2,6,23,0.87);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
      `}
      </style>

      {/* Navigation */}
      <nav
        ref={navRef}
        className={`sy-nav fixed top-0 left-0 right-0 z-50 px-[52px] py-[18px] flex items-center justify-between transition-all duration-400 ${
          scrolled ? 'scrolled' : ''
        }`}
      >
        <a href="#" className="flex items-center gap-[9px] text-[17px] font-bold tracking-tight no-underline">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="2.5" fill="white" />
            <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.45" />
            <line x1="12" y1="3" x2="12" y2="9.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="12" y1="14.5" x2="12" y2="21" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="3" y1="12" x2="9.5" y2="12" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="14.5" y1="12" x2="21" y2="12" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="5.6" y1="5.6" x2="9.8" y2="9.8" stroke="white" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
            <line x1="14.2" y1="14.2" x2="18.4" y2="18.4" stroke="white" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
            <line x1="18.4" y1="5.6" x2="14.2" y2="9.8" stroke="white" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
            <line x1="5.6" y1="18.4" x2="9.8" y2="14.2" stroke="white" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
          </svg>
          Synapsy
        </a>
        <ul className="flex items-center gap-8 list-none">
          <li><a href="#features" className="text-[14px] font-medium text-white/50 no-underline transition-colors hover:text-white/92">Tính năng</a></li>
        </ul>
        <button
          onClick={handleCTA}
          className="text-[13.5px] font-semibold px-5 py-2 bg-white text-[#0a0d1a] rounded-2xl border-none cursor-pointer transition-all hover:opacity-88 hover:-translate-y-0.5"
        >
          {user ? 'Vào ứng dụng' : 'Bắt đầu miễn phí'}
        </button>
      </nav>

      {/* Hero */}
      <section className="relative h-screen min-h-[640px] overflow-hidden bg-[#020617] flex items-center justify-center">
        <div className="sy-fractal" />
        <div className="sy-aurora" />
        <div className="absolute bottom-0 left-0 right-0 h-[280px] bg-gradient-to-t from-[#020617] to-transparent z-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-[740px]">
          <div className="sy-fade-up d1 inline-flex items-center gap-2 bg-white/5.5 border border-white/10 rounded-full px-[15px] py-1.5 mb-7 text-[12px] text-white/65 tracking-wide">
            <div className="sy-badge-dot" />
            Active Recall · Spaced Repetition · Knowledge Mapping
          </div>

          <h1 className="font-serif sy-fade-up d2 text-[clamp(48px,7.5vw,84px)] font-bold tracking-tight leading-tight mb-[22px]">
            Học sâu hơn.<br />
            Nhớ lâu hơn.
          </h1>

          <p className="sy-fade-up d3 text-[clamp(15px,1.8vw,17px)] font-normal text-white/45 max-w-[520px] leading-relaxed mb-10">
            Upload tài liệu y khoa — Synapsy chẩn đoán điểm yếu, tạo flashcard Active Recall và liên kết từng thẻ về đúng đoạn văn trong PDF gốc. Tin AI vì bạn kiểm chứng được.
          </p>

          <div className="sy-fade-up d4 flex gap-3 items-center mb-10">
            <button
              onClick={handleCTA}
              className="text-[15px] font-bold px-7 py-3.5 bg-white text-[#0a0d1a] border-none rounded-[10px] cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(255,255,255,0.16)] flex items-center gap-2"
            >
              Bắt đầu miễn phí
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
            <button className="text-[14px] font-medium px-5 py-3 bg-transparent text-white/55 border border-white/14 rounded-[10px] cursor-pointer transition-all hover:border-white/30 hover:text-white">
              Xem demo
            </button>
          </div>

          <div className="sy-scroll-hint absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.75">
            <span className="font-mono text-[9.5px] tracking-widest text-white/22 uppercase">Cuộn xuống</span>
            <div className="sy-scroll-caret w-[18px] h-[18px] border-r-[1.5px] border-b-[1.5px] border-white/18 rotate-45" />
          </div>
        </div>
      </section>

      {/* Features Section 1 - Upload & Processing */}
      <Features01 />

      {/* Features Section 2 - Diagnostic */}
      <Features02 />

      {/* Features Section 3 - Flashcard Study */}
      <Features03 />

      {/* Features Section 4 - Dashboard */}
      <Features04 />

      {/* Stats Section */}
      <StatsSection />

      {/* CTA Section */}
      <CTASection onCTA={handleCTA} />

      {/* Footer */}
      <Footer />
    </main>
  )
}

function Features01() {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setIsVisible(true)
    }, { threshold: 0.1 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={ref} id="features" className="sy-feat-section alt">
      <div className="max-w-[1180px] mx-auto grid grid-cols-[1fr_1.45fr] gap-[72px] items-center">
        <div>
          <div className={`font-mono text-[10px] tracking-widest text-[#3b7ef8] uppercase mb-3.5 sy-reveal ${isVisible ? 'shown' : ''}`}>
            01 · Upload & Xử lý
          </div>
          <h2 className={`font-serif text-[clamp(26px,2.8vw,40px)] font-bold tracking-tight leading-[1.18] mb-4.5 sy-reveal d1 ${isVisible ? 'shown' : ''}`}>
            Upload tài liệu.<br />
            Synapsy tạo khóa học.
          </h2>
          <p className={`text-[15.5px] text-white/43 leading-relaxed max-w-[400px] sy-reveal d2 ${isVisible ? 'shown' : ''}`}>
            Tải lên PDF hay slide y khoa — AI đọc cấu trúc, phân chia thành chương bài, tạo flashcard và bài kiểm tra chẩn đoán hoàn chỉnh. Chỉ ~2 phút từ lúc upload đến thẻ đầu tiên.
          </p>
        </div>
        <div className={`sy-reveal d3 ${isVisible ? 'shown' : ''}`}>
          <div className="bg-[#f5f6f8] rounded-3xl overflow-hidden shadow-[0_32px_90px_rgba(0,0,0,0.65),0_8px_28px_rgba(0,0,0,0.35)] border border-white/7 font-sans text-[11px] text-[#1a1a2e] w-full" style={{ height: '370px', display: 'flex', flexDirection: 'column' }}>
            {/* Mockup content - simplified preview */}
            <div style={{ background: '#fff', borderBottom: '1px solid #e8e9ed', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700, color: '#0a0d1a' }}>
                <div style={{ width: '18px', height: '18px', background: '#0a0d1a', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px' }}>✳</div>
                <span>Synapsy</span>
              </div>
              <span style={{ color: '#d0d2de' }}>·</span>
              <span style={{ color: '#6b6e84' }}>← Quay về Thư viện</span>
              <span style={{ marginLeft: 'auto', color: '#9598ad', fontSize: '10px' }}>✓ Hoàn thành!</span>
            </div>
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: '#fff' }}>
              <div style={{ flex: 1, padding: '16px 18px', borderRight: '1px solid #e8e9ed', overflow: 'hidden', fontSize: '13px', color: '#0a0d1a' }}>
                <div style={{ fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9598ad', marginBottom: '5px' }}>ĐANG BIÊN SOẠN</div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#0a0d1a', letterSpacing: '-0.03em', marginBottom: '2px' }}>Thuốc Tránh Thai</div>
                <div style={{ fontSize: '10px', color: '#9598ad', marginBottom: '14px' }}>6 chương</div>
              </div>
              <div style={{ width: '230px', flexShrink: 0, padding: '14px', background: '#fafbfc', fontSize: '11px', color: '#6b6e84' }}>
                Chương và lessons preview...
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Features02() {
  return (
    <section className="sy-feat-section">
      <div className="max-w-[1180px] mx-auto text-center mb-[52px]">
        <div className="font-mono text-[10px] tracking-widest text-[#3b7ef8] uppercase mb-3.5 sy-reveal">
          02 · Chẩn đoán trình độ
        </div>
        <h2 className="font-serif text-[clamp(26px,2.8vw,40px)] font-bold tracking-tight leading-[1.18] text-white mb-4 sy-reveal d1">
          Biết điểm yếu.<br />
          Học đúng chỗ.
        </h2>
        <p className="text-[15.5px] text-white/43 leading-relaxed max-w-[480px] mx-auto sy-reveal d2">
          12 câu trắc nghiệm · 3–5 phút. Synapsy vẽ bản đồ kiến thức ngay sau khi bạn nộp — xanh là nắm vững, đỏ là điểm yếu cần ưu tiên.
        </p>
      </div>
      <div className="max-w-[1100px] mx-auto" style={{ display: 'flex', gap: '22px', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
        {/* Simplified quiz mockup */}
        <div style={{ flex: '0 0 43%', fontSize: '13px', color: '#6b6e84' }}>
          <div className="font-mono text-[9.5px] tracking-widest text-[#3b7ef8] uppercase mb-2.5 sy-reveal d2">
            1 · Làm bài test
          </div>
          <div className="bg-[#f5f6f8] rounded-3xl overflow-hidden shadow-[0_32px_90px_rgba(0,0,0,0.65)] border border-white/7" style={{ height: '410px', display: 'flex', flexDirection: 'column' }}>
            Làm bài test preview...
          </div>
        </div>
        {/* Arrow */}
        <div className="sy-reveal d3" style={{ flexShrink: 0, alignSelf: 'center', paddingTop: '28px', color: 'rgba(255,255,255,0.18)' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </div>
        {/* Results mockup */}
        <div style={{ flex: 1 }} className="sy-reveal d4">
          <div className="font-mono text-[9.5px] tracking-widest text-[#3b7ef8] uppercase mb-2.5">
            2 · Kết quả & bản đồ
          </div>
          <div className="bg-[#f5f6f8] rounded-3xl overflow-hidden shadow-[0_32px_90px_rgba(0,0,0,0.65)] border border-white/7" style={{ height: '410px', display: 'flex', flexDirection: 'column' }}>
            Kết quả preview...
          </div>
        </div>
      </div>
    </section>
  )
}

function Features03() {
  return (
    <section className="sy-feat-section alt">
      <div className="max-w-[1180px] mx-auto grid grid-cols-[1.45fr_1fr] gap-[72px] items-center">
        <div>
          <div className="font-mono text-[10px] tracking-widest text-[#3b7ef8] uppercase mb-3.5 sy-reveal">
            03 · Học nhớ lâu
          </div>
          <h2 className="font-serif text-[clamp(26px,2.8vw,40px)] font-bold tracking-tight leading-[1.18] mb-4.5 sy-reveal d1">
            Flashcard liên kết.<br />
            Học từ nguồn.
          </h2>
          <p className="text-[15.5px] text-white/43 leading-relaxed max-w-[400px] sy-reveal d2">
            Mỗi thẻ liên kết trực tiếp đến đoạn gốc trong PDF. Gợi ý AI, dịch tiếng Anh, ví dụ lâm sàng. Học tập có ngữ cảnh, lâu lâu mới quên.
          </p>
        </div>
        <div className="sy-reveal d3">
          <div className="bg-[#f5f6f8] rounded-3xl overflow-hidden shadow-[0_32px_90px_rgba(0,0,0,0.65)] border border-white/7" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
            Flashcard preview...
          </div>
        </div>
      </div>
    </section>
  )
}

function Features04() {
  return (
    <section className="sy-feat-section">
      <div className="max-w-[1180px] mx-auto grid grid-cols-[1fr_1.45fr] gap-[72px] items-center">
        <div>
          <div className="font-mono text-[10px] tracking-widest text-[#3b7ef8] uppercase mb-3.5 sy-reveal">
            04 · Bảng điều khiển
          </div>
          <h2 className="font-serif text-[clamp(26px,2.8vw,40px)] font-bold tracking-tight leading-[1.18] mb-4.5 sy-reveal d1">
            Bản đồ năng lực.<br />
            Lộ trình học mỗi ngày.
          </h2>
          <p className="text-[15.5px] text-white/43 leading-relaxed max-w-[400px] sy-reveal d2">
            Radar 8 module y khoa, heatmap hoạt động 30 ngày, số thẻ cần ôn hôm nay. Synapsy tính toán chính xác — không học thêm, học đúng cái cần.
          </p>
        </div>
        <div className="sy-reveal d3">
          <div className="bg-[#f5f6f8] rounded-3xl overflow-hidden shadow-[0_32px_90px_rgba(0,0,0,0.65)] border border-white/7" style={{ height: '490px', display: 'flex', flexDirection: 'column' }}>
            Dashboard preview...
          </div>
        </div>
      </div>
    </section>
  )
}

function StatsSection() {
  return (
    <div className="bg-[#0a0d1a] px-[52px] py-16 flex justify-center gap-[100px] border-t border-white/5">
      <div className="text-center">
        <div className="text-5xl font-black text-white tracking-tight leading-none mb-2">
          <span className="text-[#3b7ef8]">1000+</span>
        </div>
        <div className="text-[13px] text-white/35">Người dùng đã tạo khóa học</div>
      </div>
      <div className="text-center">
        <div className="text-5xl font-black text-white tracking-tight leading-none mb-2">
          <span className="text-[#3b7ef8]">2m</span>
        </div>
        <div className="text-[13px] text-white/35">Thời gian tạo khóa học</div>
      </div>
      <div className="text-center">
        <div className="text-5xl font-black text-white tracking-tight leading-none mb-2">
          <span className="text-[#3b7ef8]">98%</span>
        </div>
        <div className="text-[13px] text-white/35">Độ hài lòng người dùng</div>
      </div>
    </div>
  )
}

function CTASection({ onCTA }: { onCTA: () => void }) {
  return (
    <section className="bg-[#03091e] px-[52px] py-[100px] text-center border-t border-white/4">
      <h2 className="font-serif text-[clamp(28px,3.5vw,46px)] font-bold text-white tracking-tight mb-4 leading-[1.18]">
        Sẵn sàng học sâu hơn?
      </h2>
      <p className="font-mono text-[13px] text-white/28 mb-9 tracking-widest">
        Upload PDF y khoa đầu tiên của bạn ngay hôm nay
      </p>
      <button
        onClick={onCTA}
        className="text-[15px] font-bold px-7 py-3.5 bg-white text-[#0a0d1a] border-none rounded-[10px] cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(255,255,255,0.16)] inline-flex items-center gap-2"
      >
        Bắt đầu miễn phí ngay
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </section>
  )
}

function Footer() {
  return (
    <footer className="bg-[#020617] px-[52px] py-6 border-t border-white/4 flex items-center justify-between">
      <span className="font-mono text-[10.5px] text-white/16 tracking-widest">
        © 2026 Synapsy. All rights reserved.
      </span>
      <span className="font-mono text-[10.5px] text-white/16 tracking-widest">
        Học Y Khoa Thông Minh
      </span>
    </footer>
  )
}
