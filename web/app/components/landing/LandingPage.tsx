'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/contexts/auth-context'
import { useRouter } from 'next/navigation'

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=JetBrains+Mono:wght@400;500&display=swap');

.sy-landing { font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; -webkit-font-smoothing: antialiased; background: #020617; overflow-x: hidden; }
.sy-landing :where(*, *::before, *::after) { box-sizing: border-box; }

/* Nav */
.sy-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 200; padding: 18px 52px; display: flex; align-items: center; justify-content: space-between; transition: background 0.4s, backdrop-filter 0.4s; }
.sy-nav.scrolled { background: rgba(2,6,23,0.87); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255,255,255,0.05); }
.sy-nav-logo { display: flex; align-items: center; gap: 9px; font-size: 17px; font-weight: 700; letter-spacing: -0.03em; color: #fff; text-decoration: none; user-select: none; }
.sy-nav-links { display: flex; align-items: center; gap: 32px; list-style: none; margin: 0; padding: 0; }
.sy-nav-links a { color: rgba(255,255,255,0.5); text-decoration: none; font-size: 14px; font-weight: 500; transition: color 0.2s; }
.sy-nav-links a:hover { color: rgba(255,255,255,0.92); }
.sy-nav-btn { font-family: 'Inter', sans-serif; font-size: 13.5px; font-weight: 600; padding: 8px 20px; border-radius: 8px; background: #fff; color: #0a0d1a; border: none; cursor: pointer; transition: opacity 0.2s, transform 0.15s; }
.sy-nav-btn:hover { opacity: 0.88; transform: translateY(-1px); }

/* Hero */
.sy-hero { position: relative; height: 100vh; min-height: 760px; overflow: hidden; background: #020617; display: flex; align-items: center; justify-content: center; }
.sy-fractal-canvas { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 0; }
.sy-aurora { position: absolute; inset: -10px; z-index: 1; pointer-events: none; opacity: 0; filter: blur(10px);
  background-image:
    repeating-linear-gradient(100deg,#020617 0%,#020617 7%,transparent 10%,transparent 12%,#020617 16%),
    repeating-linear-gradient(100deg,#1648d4 10%,#818cf8 15%,#60a5fa 20%,#a78bfa 25%,#2563eb 30%);
  background-size: 300% 300%, 200% 200%;
  background-position: 50% 50%, 50% 50%;
  animation: sy-aurora-move 60s linear infinite, sy-aurora-in 2.5s ease-out 0.6s forwards;
  -webkit-mask-image: radial-gradient(ellipse at 80% 0%, black 15%, transparent 62%);
  mask-image: radial-gradient(ellipse at 80% 0%, black 15%, transparent 62%);
}
.sy-aurora::after { content: ''; position: absolute; inset: 0;
  background-image:
    repeating-linear-gradient(100deg,#020617 0%,#020617 7%,transparent 10%,transparent 12%,#020617 16%),
    repeating-linear-gradient(100deg,#1648d4 10%,#818cf8 15%,#60a5fa 20%,#a78bfa 25%,#2563eb 30%);
  background-size: 200% 100%; background-attachment: fixed;
  animation: sy-aurora-move 60s linear infinite; mix-blend-mode: difference;
}
@keyframes sy-aurora-move { from { background-position: 50% 50%, 50% 50%; } to { background-position: 350% 50%, 350% 50%; } }
@keyframes sy-aurora-in { to { opacity: 0.48; } }
.sy-hero-fade { position: absolute; bottom: 0; left: 0; right: 0; height: 280px; background: linear-gradient(to bottom, transparent, #020617); z-index: 2; pointer-events: none; }
.sy-hero-content { position: relative; z-index: 10; display: flex; flex-direction: column; align-items: center; text-align: center; padding: 0 24px; max-width: 740px; }
.sy-hero-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.055); border: 1px solid rgba(255,255,255,0.1); border-radius: 100px; padding: 6px 15px; margin-bottom: 28px; font-size: 12px; color: rgba(255,255,255,0.65); letter-spacing: 0.005em; animation: sy-fade-up 0.7s ease-out 0.4s both; }
.sy-badge-dot { width: 7px; height: 7px; border-radius: 50%; background: #3b7ef8; box-shadow: 0 0 10px #3b7ef8; animation: sy-dot-pulse 2.2s ease-in-out infinite; }
@keyframes sy-dot-pulse { 0%,100% { opacity: 1; box-shadow: 0 0 10px #3b7ef8; } 50% { opacity: 0.4; box-shadow: 0 0 3px #3b7ef8; } }
.sy-hero-h1 { font-family: 'Source Serif 4', Georgia, serif; font-size: clamp(48px, 7.5vw, 84px); font-weight: 700; letter-spacing: -0.03em; line-height: 1.06; color: #fff; margin: 0 0 22px; animation: sy-fade-up 0.7s ease-out 0.6s both; }
.sy-hero-sub { font-size: clamp(15px, 1.8vw, 17px); font-weight: 400; color: rgba(255,255,255,0.45); max-width: 520px; line-height: 1.74; margin: 0 0 40px; animation: sy-fade-up 0.7s ease-out 0.8s both; }
.sy-hero-actions { display: flex; gap: 12px; align-items: center; animation: sy-fade-up 0.7s ease-out 1s both; }
.sy-btn-primary { font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 700; padding: 13px 28px; background: #fff; color: #0a0d1a; border: none; border-radius: 10px; cursor: pointer; letter-spacing: -0.02em; display: inline-flex; align-items: center; gap: 8px; transition: transform 0.18s, box-shadow 0.18s; }
.sy-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(255,255,255,0.16); }
.sy-btn-ghost { font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 500; padding: 12px 20px; background: transparent; color: rgba(255,255,255,0.55); border: 1px solid rgba(255,255,255,0.14); border-radius: 10px; cursor: pointer; transition: border-color 0.2s, color 0.2s; }
.sy-btn-ghost:hover { border-color: rgba(255,255,255,0.3); color: #fff; }
.sy-scroll-hint { position: absolute; bottom: 32px; left: 50%; transform: translateX(-50%); z-index: 10; display: flex; flex-direction: column; align-items: center; gap: 7px; animation: sy-fade-up 0.7s ease-out 1.4s both; pointer-events: none; }
.sy-scroll-label { font-family: 'JetBrains Mono', "SF Mono", monospace; font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255,255,255,0.22); }
.sy-scroll-caret { width: 18px; height: 18px; border-right: 1.5px solid rgba(255,255,255,0.18); border-bottom: 1.5px solid rgba(255,255,255,0.18); transform: rotate(45deg); animation: sy-caret-bounce 2s ease-in-out infinite; }
@keyframes sy-caret-bounce { 0%,100% { transform: rotate(45deg) translateY(0); } 50% { transform: rotate(45deg) translateY(5px); } }
@keyframes sy-fade-up { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }

/* Feature sections */
.sy-feat-section { padding: 112px 52px; background: #020617; position: relative; overflow: hidden; }
.sy-feat-section.alt { background: #03091e; }
.sy-feat-section::before { content: ''; position: absolute; width: 700px; height: 700px; border-radius: 50%; background: radial-gradient(circle, rgba(22,72,212,0.07) 0%, transparent 70%); top: 50%; pointer-events: none; }
.sy-feat-section:not(.reverse)::before { left: -200px; transform: translateY(-50%); }
.sy-feat-section.reverse::before { right: -200px; left: auto; transform: translateY(-50%); }
.sy-feat-inner { max-width: 1180px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1.45fr; gap: 72px; align-items: center; }
.sy-feat-inner.reverse { grid-template-columns: 1.45fr 1fr; }
.sy-feat-inner.reverse .sy-feat-text { order: 2; }
.sy-feat-inner.reverse .sy-feat-mockup { order: 1; }
.sy-feat-eyebrow { font-family: 'JetBrains Mono', "SF Mono", monospace; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: #3b7ef8; margin-bottom: 14px; }
.sy-feat-text h2 { font-family: 'Source Serif 4', Georgia, serif; font-size: clamp(26px, 2.8vw, 40px); font-weight: 700; letter-spacing: -0.02em; line-height: 1.18; color: #fff; margin: 0 0 18px; }
.sy-feat-text p { font-size: 15.5px; color: rgba(255,255,255,0.43); line-height: 1.76; max-width: 400px; margin: 0; }

/* Reveal */
.sy-reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.6s ease, transform 0.6s ease; }
.sy-reveal.d1 { transition-delay: 0.1s; }
.sy-reveal.d2 { transition-delay: 0.2s; }
.sy-reveal.d3 { transition-delay: 0.3s; }
.sy-reveal.d4 { transition-delay: 0.4s; }
.sy-reveal.shown { opacity: 1; transform: translateY(0); }

/* Mockup shell */
.sy-mockup-win { background: #f5f6f8; border-radius: 12px; overflow: hidden; box-shadow: 0 32px 90px rgba(0,0,0,0.65), 0 8px 28px rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.07); font-family: 'Inter', -apple-system, sans-serif; font-size: 11px; color: #1a1a2e; width: 100%; }
.sy-m-topbar { background: #fff; border-bottom: 1px solid #e8e9ed; padding: 8px 14px; display: flex; align-items: center; gap: 10px; font-size: 11px; flex-shrink: 0; }
.sy-m-topbar-logo { display: flex; align-items: center; gap: 5px; font-weight: 700; color: #0a0d1a; }
.sy-m-topbar-logo-sq { width: 18px; height: 18px; background: #0a0d1a; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 10px; }
.sy-m-topbar-sep { color: #d0d2de; }
.sy-m-topbar-crumb { color: #6b6e84; }
.sy-m-topbar-right { margin-left: auto; color: #9598ad; font-size: 10px; }
.sy-m-body { display: flex; }
.sy-m-rail { width: 44px; background: #fff; border-right: 1px solid #e8e9ed; display: flex; flex-direction: column; align-items: center; padding: 10px 0; gap: 2px; flex-shrink: 0; }
.sy-m-rail-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #9598ad; font-size: 13px; }
.sy-m-rail-icon.active { background: #eef2ff; color: #1648d4; }
.sy-m-drawer { width: 176px; background: #fff; border-right: 1px solid #e8e9ed; padding: 10px 8px; flex-shrink: 0; overflow: hidden; }
.sy-m-drawer-label { font-size: 8.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #9598ad; margin-bottom: 8px; padding: 0 4px; }
.sy-m-folder { display: flex; align-items: center; gap: 5px; padding: 4px 4px; border-radius: 4px; font-size: 10px; font-weight: 600; color: #1a1a2e; }
.sy-m-file { display: flex; align-items: center; gap: 5px; padding: 3px 4px 3px 18px; border-radius: 4px; font-size: 9.5px; color: #6b6e84; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sy-m-file.active { background: #eef2ff; color: #1648d4; font-weight: 600; }

/* Diagnostic */
.sy-diag-section { padding: 100px 40px; background: #03091e; position: relative; overflow: hidden; }
.sy-diag-section::before { content: ''; position: absolute; width: 800px; height: 800px; border-radius: 50%; background: radial-gradient(circle, rgba(22,72,212,0.06) 0%, transparent 70%); top: 50%; left: 50%; transform: translate(-50%,-50%); pointer-events: none; }
.sy-diag-header { max-width: 1100px; margin: 0 auto 52px; text-align: center; }
.sy-diag-header h2 { font-family: 'Source Serif 4', Georgia, serif; font-size: clamp(26px, 2.8vw, 40px); font-weight: 700; letter-spacing: -0.02em; line-height: 1.18; color: #fff; margin: 0 0 16px; }
.sy-diag-header p { font-size: 15.5px; color: rgba(255,255,255,0.43); line-height: 1.76; max-width: 480px; margin: 0 auto; }
.sy-diag-row { max-width: 1100px; margin: 0 auto; display: flex; gap: 22px; align-items: flex-start; position: relative; z-index: 1; }
.sy-diag-col-label { font-family: 'JetBrains Mono', "SF Mono", monospace; font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase; color: #3b7ef8; margin-bottom: 10px; display: flex; align-items: center; gap: 7px; }
.sy-diag-col-label::before { content: attr(data-step); width: 18px; height: 18px; background: #1648d4; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 9px; font-weight: 700; flex-shrink: 0; }
.sy-diag-arrow { flex-shrink: 0; align-self: center; padding-top: 28px; color: rgba(255,255,255,0.18); }

/* Stats */
.sy-stats { background: #0a0d1a; padding: 64px 52px; display: flex; justify-content: center; gap: 100px; border-top: 1px solid rgba(255,255,255,0.05); flex-wrap: wrap; }
.sy-stat { text-align: center; }
.sy-stat-num { font-size: 40px; font-weight: 800; color: #fff; letter-spacing: -0.04em; line-height: 1; margin-bottom: 8px; }
.sy-stat-num span { color: #3b7ef8; }
.sy-stat-label { font-size: 13px; color: rgba(255,255,255,0.35); }

/* CTA */
.sy-cta-section { background: #03091e; padding: 100px 52px 120px; text-align: center; border-top: 1px solid rgba(255,255,255,0.04); }
.sy-cta-section h2 { font-family: 'Source Serif 4', Georgia, serif; font-size: clamp(28px, 3.5vw, 46px); font-weight: 700; color: #fff; letter-spacing: -0.02em; margin: 0 0 16px; line-height: 1.18; }
.sy-cta-section p { font-size: 13px; color: rgba(255,255,255,0.28); margin: 0 0 36px; font-family: 'JetBrains Mono', "SF Mono", monospace; letter-spacing: 0.05em; }

/* Footer */
.sy-footer { background: #020617; padding: 24px 52px; border-top: 1px solid rgba(255,255,255,0.04); display: flex; align-items: center; justify-content: space-between; }
.sy-footer span { font-family: 'JetBrains Mono', "SF Mono", monospace; font-size: 10.5px; color: rgba(255,255,255,0.16); letter-spacing: 0.06em; }

@media (max-width: 900px) {
  .sy-feat-inner, .sy-feat-inner.reverse { grid-template-columns: 1fr; gap: 40px; }
  .sy-feat-inner.reverse .sy-feat-text, .sy-feat-inner.reverse .sy-feat-mockup { order: unset; }
  .sy-nav { padding: 14px 20px; }
  .sy-nav-links { display: none; }
  .sy-feat-section { padding: 80px 20px; }
  .sy-diag-row { flex-direction: column; }
  .sy-diag-arrow { transform: rotate(90deg); padding: 0; align-self: center; }
  .sy-stats { gap: 32px; padding: 40px 20px; }
  .sy-cta-section { padding: 80px 20px 100px; }
  .sy-footer { padding: 20px; flex-direction: column; gap: 8px; }
}
`

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    const targets = el.querySelectorAll('.sy-reveal')
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('shown')
            io.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.08 },
    )
    targets.forEach((t) => io.observe(t))
    return () => io.disconnect()
  }, [])
  return ref
}

function FractalCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const mouse = { x: 0, y: 0 }
    let depth = 0
    const MAX_DEPTH = 9
    let raf = 0
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      mouse.x = canvas.width / 2
      mouse.y = canvas.height
    }
    const drawBranch = (x: number, y: number, angle: number, len: number, d: number) => {
      if (d > depth) return
      const ex = x + Math.cos(angle) * len
      const ey = y + Math.sin(angle) * len
      const op = (1 - d / MAX_DEPTH) * 0.55
      const lw = Math.max(0.25, 1.6 - (d / MAX_DEPTH) * 1.3)
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(ex, ey)
      ctx.strokeStyle = `rgba(255,255,255,${op.toFixed(3)})`
      ctx.lineWidth = lw
      ctx.stroke()
      const dist = Math.hypot(ex - mouse.x, ey - mouse.y)
      const effect = Math.max(0, 1 - dist / (canvas.height * 0.55)) * 0.12
      const spread = Math.PI / 10.5
      const next = len * 0.77
      drawBranch(ex, ey, angle - spread - effect, next, d + 1)
      drawBranch(ex, ey, angle + spread + effect, next, d + 1)
    }
    const animate = () => {
      ctx.fillStyle = 'rgba(2,6,23,0.22)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      drawBranch(canvas.width / 2, canvas.height, -Math.PI / 2, canvas.height / 4.8, 0)
      if (depth < MAX_DEPTH) depth += 0.018
      raf = requestAnimationFrame(animate)
    }
    const handleMouse = (e: MouseEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
    }
    resize()
    animate()
    window.addEventListener('resize', resize, { passive: true })
    window.addEventListener('mousemove', handleMouse, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouse)
    }
  }, [])
  return <canvas ref={canvasRef} className="sy-fractal-canvas" />
}

export function LandingPage() {
  const { user, login } = useAuth()
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)
  const rootRef = useReveal<HTMLDivElement>()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleCTA = () => {
    if (user) router.push('/')
    else login()
  }

  return (
    <div ref={rootRef} className="sy-landing">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* Nav */}
      <nav className={`sy-nav ${scrolled ? 'scrolled' : ''}`}>
        <a href="#" className="sy-nav-logo">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="2.5" fill="white"/>
            <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.45"/>
            <line x1="12" y1="3" x2="12" y2="9.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="12" y1="14.5" x2="12" y2="21" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="3" y1="12" x2="9.5" y2="12" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="14.5" y1="12" x2="21" y2="12" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="5.6" y1="5.6" x2="9.8" y2="9.8" stroke="white" strokeWidth="1.1" strokeLinecap="round" opacity="0.55"/>
            <line x1="14.2" y1="14.2" x2="18.4" y2="18.4" stroke="white" strokeWidth="1.1" strokeLinecap="round" opacity="0.55"/>
            <line x1="18.4" y1="5.6" x2="14.2" y2="9.8" stroke="white" strokeWidth="1.1" strokeLinecap="round" opacity="0.55"/>
            <line x1="5.6" y1="18.4" x2="9.8" y2="14.2" stroke="white" strokeWidth="1.1" strokeLinecap="round" opacity="0.55"/>
          </svg>
          Synapsy
        </a>
        <ul className="sy-nav-links"><li><a href="#features">Tính năng</a></li></ul>
        <button className="sy-nav-btn" onClick={handleCTA}>{user ? 'Vào ứng dụng' : 'Bắt đầu miễn phí'}</button>
      </nav>

      {/* Hero */}
      <section className="sy-hero">
        <FractalCanvas />
        <div className="sy-aurora" />
        <div className="sy-hero-fade" />
        <div className="sy-hero-content">
          <div className="sy-hero-badge"><div className="sy-badge-dot" />Active Recall · Spaced Repetition · Knowledge Mapping</div>
          <h1 className="sy-hero-h1">Học sâu hơn.<br />Nhớ lâu hơn.</h1>
          <p className="sy-hero-sub">Upload tài liệu y khoa — Synapsy chẩn đoán điểm yếu, tạo flashcard Active Recall và liên kết từng thẻ về đúng đoạn văn trong PDF gốc. Tin AI vì bạn kiểm chứng được.</p>
          <div className="sy-hero-actions">
            <button className="sy-btn-primary" onClick={handleCTA}>
              Bắt đầu miễn phí
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
            <button className="sy-btn-ghost">Xem demo</button>
          </div>
        </div>
        <div className="sy-scroll-hint">
          <span className="sy-scroll-label">Cuộn xuống</span>
          <div className="sy-scroll-caret" />
        </div>
      </section>

      <Feature01Upload />
      <Feature02Diagnostic />
      <Feature03Citation />
      <Feature04Dashboard />

      {/* Stats */}
      <div className="sy-stats">
        <div className="sy-stat"><div className="sy-stat-num">~<span>2</span>p</div><div className="sy-stat-label">từ upload đến flashcard đầu tiên</div></div>
        <div className="sy-stat"><div className="sy-stat-num"><span>8</span></div><div className="sy-stat-label">module y khoa được ánh xạ</div></div>
        <div className="sy-stat"><div className="sy-stat-num"><span>3×</span></div><div className="sy-stat-label">hiệu quả ghi nhớ hơn học thụ động</div></div>
      </div>

      {/* CTA */}
      <section className="sy-cta-section">
        <h2>Bắt đầu học<br />thực sự hôm nay.</h2>
        <p>Miễn phí · Không cần thẻ tín dụng · Bắt đầu trong 2 phút</p>
        <button className="sy-btn-primary" style={{ margin: '0 auto', fontSize: 15, padding: '14px 36px' }} onClick={handleCTA}>
          Thử Synapsy miễn phí
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </button>
      </section>

      {/* Footer */}
      <footer className="sy-footer">
        <span>© 2026 Synapsy</span>
        <span>Inter · Source Serif 4 · Active Recall Engine</span>
      </footer>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature 01 — Upload & Course Creation
// ─────────────────────────────────────────────────────────────────────────────
function Feature01Upload() {
  return (
    <section className="sy-feat-section alt" id="features">
      <div className="sy-feat-inner">
        <div className="sy-feat-text">
          <div className="sy-feat-eyebrow sy-reveal">01 · Upload & Xử lý</div>
          <h2 className="sy-reveal d1">Upload tài liệu.<br />Synapsy tạo khóa học.</h2>
          <p className="sy-reveal d2">Tải lên PDF hay slide y khoa — AI đọc cấu trúc, phân chia thành chương bài, tạo flashcard và bài kiểm tra chẩn đoán hoàn chỉnh. Chỉ ~2 phút từ lúc upload đến thẻ đầu tiên.</p>
        </div>
        <div className="sy-feat-mockup sy-reveal d3">
          <div className="sy-mockup-win" style={{ height: 370, display: 'flex', flexDirection: 'column' }}>
            <div className="sy-m-topbar">
              <div className="sy-m-topbar-logo"><div className="sy-m-topbar-logo-sq">✳</div><span>Synapsy</span></div>
              <span className="sy-m-topbar-sep">·</span><span className="sy-m-topbar-crumb">← Quay về Thư viện</span>
              <span className="sy-m-topbar-right">✓ Hoàn thành!</span>
            </div>
            <div className="sy-m-body" style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ flex: 1, padding: '16px 18px', background: '#fff', borderRight: '1px solid #e8e9ed', overflow: 'hidden' }}>
                <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9598ad', marginBottom: 5 }}>ĐANG BIÊN SOẠN</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#0a0d1a', letterSpacing: '-0.03em', marginBottom: 2 }}>Thuốc Tránh Thai</div>
                <div style={{ fontSize: 10, color: '#9598ad', marginBottom: 14 }}>6 chương</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ border: '1px solid #e8e9ed', borderRadius: 8, padding: '9px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 9, color: '#9598ad', marginBottom: 2 }}>01</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#0a0d1a' }}>Giới thiệu về thuốc tránh thai</div>
                      <div style={{ fontSize: 9.5, color: '#1648d4', marginTop: 2 }}>1 bài · sẵn sàng đọc</div>
                      <div style={{ fontSize: 9, color: '#6b6e84', marginTop: 3 }}>✓ Mục tiêu học tập</div>
                    </div>
                    <span style={{ color: '#22c55e', fontSize: 13 }}>✓</span>
                  </div>
                  <div style={{ border: '1px solid #e8e9ed', borderRadius: 8, padding: '9px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 9, color: '#9598ad', marginBottom: 2 }}>02</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#0a0d1a' }}>Phân loại thuốc tránh thai</div>
                      <div style={{ fontSize: 9.5, color: '#1648d4', marginTop: 2 }}>1 bài · sẵn sàng đọc</div>
                      <div style={{ fontSize: 9, color: '#6b6e84', marginTop: 3 }}>✓ Phân loại thuốc tránh thai</div>
                    </div>
                    <span style={{ color: '#22c55e', fontSize: 13 }}>✓</span>
                  </div>
                  <div style={{ border: '1px solid #e8e9ed', borderRadius: 8, padding: '9px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 9, color: '#9598ad', marginBottom: 2 }}>03</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#0a0d1a' }}>Thuốc tránh thai phối hợp</div>
                      <div style={{ fontSize: 9.5, color: '#1648d4', marginTop: 2 }}>3 bài · sẵn sàng đọc</div>
                      <div style={{ fontSize: 9, color: '#6b6e84', marginTop: 3 }}>✓ COCs · ✓ Tác dụng phụ · ✓ Chống chỉ định</div>
                    </div>
                    <span style={{ color: '#22c55e', fontSize: 13 }}>✓</span>
                  </div>
                </div>
              </div>
              <div style={{ width: 230, flexShrink: 0, padding: 14, background: '#fafbfc', display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
                <div style={{ background: '#eff4ff', border: '1px solid #dce7fd', borderRadius: 8, padding: '11px 12px' }}>
                  <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1648d4', marginBottom: 8 }}>⚡ FLASH KNOWLEDGE</div>
                  <div style={{ fontSize: 11, color: '#1e293b', lineHeight: 1.5, fontStyle: 'italic' }}>&quot;Estrogen có nguồn gốc từ buồng trứng và nhau thai.&quot;</div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                    <div style={{ height: 3, width: 22, background: '#1648d4', borderRadius: 2 }} />
                    <div style={{ height: 3, width: 8, background: '#dce7fd', borderRadius: 2 }} />
                    <div style={{ height: 3, width: 8, background: '#dce7fd', borderRadius: 2 }} />
                    <div style={{ height: 3, width: 8, background: '#dce7fd', borderRadius: 2 }} />
                  </div>
                </div>
                <div style={{ background: '#f5f6f8', border: '1px solid #e8e9ed', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9598ad', marginBottom: 8 }}>PIPELINE</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontSize: 10, color: '#6b6e84' }}>✓ Đọc PDF</div>
                    <div style={{ fontSize: 10, color: '#6b6e84' }}>✓ Phân tích cấu trúc</div>
                    <div style={{ fontSize: 10, color: '#6b6e84' }}>✓ Tạo concept cards · 6/6</div>
                    <div style={{ fontSize: 10, color: '#6b6e84' }}>✓ Tạo bài test trình độ</div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#0a0d1a', marginBottom: 4 }}>Khóa học đã sẵn sàng!</div>
                  <div style={{ fontSize: 9.5, color: '#6b6e84', marginBottom: 10 }}>Bạn có thể vào test ngay hoặc vào học luôn.</div>
                  <div style={{ background: '#0a0d1a', borderRadius: 6, padding: '8px 12px', textAlign: 'center', color: '#fff', fontSize: 10, fontWeight: 600, marginBottom: 5 }}>Vào bài test trình độ</div>
                  <div style={{ border: '1px solid #e8e9ed', borderRadius: 6, padding: '7px 12px', textAlign: 'center', color: '#0a0d1a', fontSize: 10, fontWeight: 500 }}>Vào học luôn</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature 02 — Diagnostic Quiz + Results
// ─────────────────────────────────────────────────────────────────────────────
function Feature02Diagnostic() {
  return (
    <section className="sy-diag-section">
      <div className="sy-diag-header">
        <div className="sy-feat-eyebrow sy-reveal" style={{ textAlign: 'center', display: 'block' }}>02 · Chẩn đoán trình độ</div>
        <h2 className="sy-reveal d1">Biết điểm yếu.<br />Học đúng chỗ.</h2>
        <p className="sy-reveal d2">12 câu trắc nghiệm · 3–5 phút. Synapsy vẽ bản đồ kiến thức ngay sau khi bạn nộp — xanh là nắm vững, đỏ là điểm yếu cần ưu tiên.</p>
      </div>
      <div className="sy-diag-row">
        {/* Left: Quiz */}
        <div style={{ flex: '0 0 43%' }} className="sy-reveal d2">
          <div className="sy-diag-col-label" data-step="1">Làm bài test</div>
          <div className="sy-mockup-win" style={{ height: 410, display: 'flex', flexDirection: 'column' }}>
            <div className="sy-m-topbar">
              <div className="sy-m-topbar-logo"><div className="sy-m-topbar-logo-sq">✳</div><span>Synapsy</span></div>
              <span className="sy-m-topbar-sep">·</span><span className="sy-m-topbar-crumb">Thuốc Tránh Thai</span>
              <div style={{ marginLeft: 'auto', fontSize: 10, color: '#9598ad' }}>1/10 đã trả lời</div>
            </div>
            <div style={{ height: 2, background: '#e8e9ed', flexShrink: 0 }}>
              <div style={{ width: '10%', height: '100%', background: '#1648d4' }} />
            </div>
            <div className="sy-m-body" style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ width: 136, background: '#f9f9fb', borderRight: '1px solid #e8e9ed', padding: '14px 12px', flexShrink: 0, overflow: 'hidden' }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9598ad', marginBottom: 10 }}>CÂU HỎI</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5, marginBottom: 14 }}>
                  <div style={{ aspectRatio: '1', background: '#0a0d1a', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>1</div>
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <div key={n} style={{ aspectRatio: '1', border: '1px solid #e8e9ed', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#6b6e84' }}>{n}</div>
                  ))}
                </div>
                <div style={{ background: '#f0f0f2', borderRadius: 6, padding: 8, fontSize: 9.5 }}>
                  <div style={{ fontWeight: 700, color: '#0a0d1a', marginBottom: 3 }}>Bài kiểm tra đầu vào</div>
                  <div style={{ color: '#6b6e84', lineHeight: 1.5 }}>Trả lời tất cả câu hỏi rồi nộp bài. Kết quả sẽ tô màu sơ đồ kiến thức.</div>
                </div>
              </div>
              <div style={{ flex: 1, padding: '20px 22px', overflow: 'hidden' }}>
                <div style={{ fontSize: 9.5, color: '#9598ad', marginBottom: 6 }}>Dược lý đại cương</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0a0d1a', lineHeight: 1.42, marginBottom: 16 }}>Mục tiêu học tập liên quan đến thuốc tránh thai là gì?</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <QuizOption letter="A" text="Nắm vững các kiến thức cơ bản về thuốc tránh thai." selected />
                  <QuizOption letter="B" text="Hiểu rõ về tác dụng phụ của thuốc." />
                  <QuizOption letter="C" text="Biết cách sử dụng thuốc đúng cách." />
                  <QuizOption letter="D" text="Nắm vững các loại thuốc hiện có." />
                </div>
              </div>
            </div>
            <div style={{ borderTop: '1px solid #e8e9ed', padding: '9px 16px', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, flexShrink: 0 }}>
              <span style={{ color: '#9598ad' }}>Còn 9 câu chưa trả lời</span>
              <div style={{ display: 'flex', gap: 7 }}>
                <div style={{ border: '1px solid #e8e9ed', borderRadius: 6, padding: '5px 12px', color: '#6b6e84', background: '#fff' }}>← Trước</div>
                <div style={{ border: '1px solid #e8e9ed', borderRadius: 6, padding: '5px 12px', color: '#0a0d1a', fontWeight: 600, background: '#fff' }}>Tiếp →</div>
              </div>
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div className="sy-diag-arrow sy-reveal d3">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </div>

        {/* Right: Results */}
        <div style={{ flex: 1 }} className="sy-reveal d4">
          <div className="sy-diag-col-label" data-step="2">Kết quả & bản đồ kiến thức</div>
          <div className="sy-mockup-win" style={{ height: 410, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="sy-m-topbar">
              <div className="sy-m-topbar-logo"><div className="sy-m-topbar-logo-sq">✳</div><span>Synapsy</span></div>
              <span className="sy-m-topbar-sep">·</span><span className="sy-m-topbar-crumb">Kết quả kiểm tra đầu vào</span>
            </div>
            <div style={{ flex: 1, overflow: 'hidden', background: '#f5f6f8', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 12, borderBottom: '1px solid #e8e9ed' }}>
                <svg width="64" height="64" viewBox="0 0 70 70" style={{ flexShrink: 0 }}>
                  <circle cx="35" cy="35" r="28" fill="none" stroke="#e8e9ed" strokeWidth="4.5"/>
                  <circle cx="35" cy="35" r="28" fill="none" stroke="#ef4444" strokeWidth="4.5" strokeDasharray="14 162" strokeLinecap="round" transform="rotate(-90 35 35)"/>
                  <text x="35" y="40" textAnchor="middle" fontSize="13" fontWeight="700" fill="#0a0d1a" fontFamily="Inter,sans-serif">8%</text>
                </svg>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: '#0a0d1a', letterSpacing: '-0.03em' }}>1/13 câu đúng</span>
                    <span style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 100, padding: '2px 9px', fontSize: 10, fontWeight: 600 }}>Cần cải thiện</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#6b6e84', lineHeight: 1.5 }}>Có 7 chủ đề cần tập trung học. Synapsy đã tô màu sơ đồ kiến thức theo điểm của bạn.</div>
                </div>
              </div>

              <div style={{ background: '#fff', border: '1px solid #e8e9ed', borderRadius: 8, padding: '11px 14px', flexShrink: 0 }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9598ad', marginBottom: 2 }}>BẢN ĐỒ NĂNG LỰC</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0a0d1a', marginBottom: 10, letterSpacing: '-0.02em' }}>Năng lực theo module y khoa</div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <RadarSVG />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9598ad' }}>NẮM VỮNG</span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7.5, color: '#9598ad', textTransform: 'uppercase', letterSpacing: '0.06em' }}>CHẮC</span>
                    </div>
                    <ResultBar label="Giải phẫu" pct={57} />
                    <ResultBar label="Sinh lý" pct={23} />
                    <ResultBar label="Dược lý" pct={33} />
                    <ResultBar label="Vi sinh" pct={36} />
                    <ResultBar label="Bệnh lý" pct={22} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9598ad', marginBottom: 4 }}>THEO CHỦ ĐỀ</div>
                <div style={{ background: '#fff', border: '1px solid #e8e9ed', borderRadius: 7, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: '#0a0d1a' }}>Giải phẫu đại cương</span>
                  <span style={{ fontSize: 10, color: '#9598ad' }}>0/1</span>
                </div>
                <div style={{ background: '#fff', border: '1px solid #e8e9ed', borderRadius: 7, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: '#0a0d1a' }}>Bệnh lý đại cương</span>
                  <span style={{ fontSize: 10, color: '#9598ad' }}>0/1</span>
                </div>
              </div>

              <div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9598ad', marginBottom: 6 }}>VÙNG YẾU — CẦN ƯU TIÊN HỌC</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <WeakChip label="Giải phẫu đại cương" />
                  <WeakChip label="Bệnh lý đại cương" />
                  <WeakChip label="Vi sinh đại cương" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function QuizOption({ letter, text, selected }: { letter: string; text: string; selected?: boolean }) {
  return (
    <div style={{ border: selected ? '1.5px solid #1648d4' : '1px solid #e8e9ed', borderRadius: 8, padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 10, background: selected ? '#eef2ff' : '#fff' }}>
      <div style={{ width: 20, height: 20, borderRadius: '50%', background: selected ? '#1648d4' : 'transparent', border: selected ? 'none' : '1.5px solid #d0d2de', display: 'flex', alignItems: 'center', justifyContent: 'center', color: selected ? '#fff' : '#9598ad', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{letter}</div>
      <span style={{ fontSize: 11, color: selected ? '#1648d4' : '#1e293b', fontWeight: selected ? 500 : 400 }}>{text}</span>
    </div>
  )
}

function ResultBar({ label, pct }: { label: string; pct: number }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontSize: 9.5, fontWeight: 600, color: '#0a0d1a' }}>{label}</span>
        <span style={{ fontSize: 9, color: '#9598ad' }}>{pct}%</span>
      </div>
      <div style={{ height: 3, background: '#e8e9ed', borderRadius: 2 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: '#1648d4', borderRadius: 2 }} />
      </div>
    </div>
  )
}

function WeakChip({ label }: { label: string }) {
  return (
    <div style={{ border: '1px solid #fecaca', background: '#fef2f2', borderRadius: 7, padding: '5px 9px', fontSize: 9.5, color: '#ef4444', fontWeight: 600 }}>
      <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#ef4444', marginRight: 5, verticalAlign: 'middle' }} />
      {label}
      <span style={{ fontSize: 9, fontWeight: 400, color: '#9598ad', marginLeft: 3 }}>0% đúng</span>
    </div>
  )
}

function RadarSVG() {
  return (
    <svg viewBox="0 0 240 240" style={{ width: 110, height: 110, flexShrink: 0 }} xmlns="http://www.w3.org/2000/svg">
      <polygon points="120,102 132.7,107.3 138,120 132.7,132.7 120,138 107.3,132.7 102,120 107.3,107.3" fill="none" stroke="#e8e9ed" strokeWidth="0.8"/>
      <polygon points="120,84 145.5,94.5 156,120 145.5,145.5 120,156 94.5,145.5 84,120 94.5,94.5" fill="none" stroke="#e8e9ed" strokeWidth="0.8"/>
      <polygon points="120,66 158.2,81.8 174,120 158.2,158.2 120,174 81.8,158.2 66,120 81.8,81.8" fill="none" stroke="#e8e9ed" strokeWidth="0.8"/>
      <polygon points="120,48 170.9,69.1 192,120 170.9,170.9 120,192 69.1,170.9 48,120 69.1,69.1" fill="none" stroke="#e8e9ed" strokeWidth="0.8"/>
      <polygon points="120,30 183.6,56.4 210,120 183.6,183.6 120,210 56.4,183.6 30,120 56.4,56.4" fill="none" stroke="#e8e9ed" strokeWidth="0.8"/>
      <line x1="120" y1="30" x2="120" y2="210" stroke="#e8e9ed" strokeWidth="0.8"/>
      <line x1="183.6" y1="56.4" x2="56.4" y2="183.6" stroke="#e8e9ed" strokeWidth="0.8"/>
      <line x1="210" y1="120" x2="30" y2="120" stroke="#e8e9ed" strokeWidth="0.8"/>
      <line x1="183.6" y1="183.6" x2="56.4" y2="56.4" stroke="#e8e9ed" strokeWidth="0.8"/>
      <polygon points="120,68.7 134.6,105.4 149.7,120 142.9,142.9 120,139.8 98.4,141.6 89.4,120 118.6,118.6" fill="rgba(22,72,212,0.12)" stroke="#1648d4" strokeWidth="1.5"/>
      <circle cx="120" cy="68.7" r="3" fill="#1648d4"/>
      <circle cx="134.6" cy="105.4" r="3" fill="#1648d4"/>
      <circle cx="149.7" cy="120" r="3" fill="#1648d4"/>
      <circle cx="142.9" cy="142.9" r="3" fill="#1648d4"/>
      <circle cx="120" cy="139.8" r="3" fill="#1648d4"/>
      <circle cx="98.4" cy="141.6" r="3" fill="#1648d4"/>
      <circle cx="89.4" cy="120" r="3" fill="#1648d4"/>
      <circle cx="118.6" cy="118.6" r="3" fill="#c0c3d0"/>
      <text x="120" y="19" textAnchor="middle" fontSize="8.5" fill="#6b6e84" fontFamily="Inter,sans-serif">Giải phẫu</text>
      <text x="193" y="52" textAnchor="start" fontSize="8.5" fill="#6b6e84" fontFamily="Inter,sans-serif">Sinh lý</text>
      <text x="218" y="123" textAnchor="start" fontSize="8.5" fill="#6b6e84" fontFamily="Inter,sans-serif">Dược lý</text>
      <text x="193" y="194" textAnchor="start" fontSize="8.5" fill="#6b6e84" fontFamily="Inter,sans-serif">Vi sinh</text>
      <text x="120" y="224" textAnchor="middle" fontSize="8.5" fill="#6b6e84" fontFamily="Inter,sans-serif">Bệnh lý</text>
      <text x="47" y="194" textAnchor="end" fontSize="8.5" fill="#6b6e84" fontFamily="Inter,sans-serif">Lâm sàng</text>
      <text x="22" y="123" textAnchor="end" fontSize="8.5" fill="#6b6e84" fontFamily="Inter,sans-serif">Hóa sinh</text>
      <text x="47" y="52" textAnchor="end" fontSize="8.5" fill="#6b6e84" fontFamily="Inter,sans-serif">Miễn dịch</text>
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature 03 — Source Traceability (Citation)
// ─────────────────────────────────────────────────────────────────────────────
function Feature03Citation() {
  return (
    <section className="sy-feat-section" style={{ padding: '112px 40px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto 48px', textAlign: 'center' }}>
        <div className="sy-feat-eyebrow sy-reveal" style={{ textAlign: 'center', display: 'block' }}>03 · Minh bạch nguồn gốc</div>
        <h2 className="sy-reveal d1" style={{ fontFamily: "'Source Serif 4',Georgia,serif", fontSize: 'clamp(26px,2.8vw,40px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.18, color: '#fff', margin: '0 0 16px' }}>Tin AI vì bạn có thể kiểm chứng.</h2>
        <p className="sy-reveal d2" style={{ fontSize: 15.5, color: 'rgba(255,255,255,0.43)', lineHeight: 1.76, maxWidth: 520, margin: '0 auto' }}>Mỗi câu trả lời có số trích dẫn <sup style={{ color: '#3b7ef8' }}>[7]</sup> — ấn vào là PDF nguồn mở ngay, đoạn liên quan highlight vàng. Không cần đoán AI đang dựa vào đâu.</p>
      </div>

      <div className="sy-reveal d3" style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div className="sy-mockup-win" style={{ height: 420, display: 'flex', flexDirection: 'column' }}>
          <div className="sy-m-topbar" style={{ borderBottom: '1px solid #e8e9ed', position: 'relative' }}>
            <div className="sy-m-topbar-logo"><div className="sy-m-topbar-logo-sq">✳</div><span>Synapsy</span></div>
            <span style={{ color: '#d0d2de', margin: '0 6px' }}>←</span>
            <span style={{ fontSize: 11, color: '#6b6e84' }}>Thư viện</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#0a0d1a', marginLeft: 8 }}>✳ Hormon buồng trứng và chu kỳ kinh nguyệt</span>
            <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 0, height: '100%', alignItems: 'flex-end' }}>
              <div style={{ padding: '0 14px 8px', fontSize: 11, fontWeight: 600, color: '#1648d4', borderBottom: '2px solid #1648d4', cursor: 'pointer' }}>Sửa</div>
              <div style={{ padding: '0 14px 8px', fontSize: 11, color: '#9598ad', cursor: 'pointer' }}>Học</div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center', fontSize: 10, color: '#9598ad' }}>
              <span><span style={{ color: '#ef4444', fontWeight: 700 }}>0</span> CẦN ÔN</span>
              <span><span style={{ fontWeight: 700, color: '#0a0d1a' }}>27</span> THẺ</span>
              <span><span style={{ fontWeight: 700, color: '#9598ad' }}>0%</span> VỮNG</span>
              <div style={{ background: '#0a0d1a', borderRadius: 5, padding: '5px 10px', color: '#fff', fontSize: 10, fontWeight: 600, marginLeft: 4 }}>▶ Ôn</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 14px', background: '#fafbfc', borderBottom: '1px solid #e8e9ed', fontSize: 9, color: '#6b6e84' }}>
            <span style={{ color: '#ef4444', fontWeight: 600 }}>≥80%</span>
            <div style={{ width: 12, height: 5, background: '#ef4444', borderRadius: 3, opacity: 0.4 }} />
            <span style={{ color: '#f59e0b', fontWeight: 600 }}>40–79%</span>
            <div style={{ width: 12, height: 5, background: '#f59e0b', borderRadius: 3, opacity: 0.4 }} />
            <span style={{ color: '#9598ad', fontWeight: 600 }}>&lt;40%</span>
            <div style={{ width: 12, height: 5, background: '#e8e9ed', borderRadius: 3 }} />
            <span style={{ color: '#9598ad' }}>Chưa test</span>
          </div>

          <div className="sy-m-body" style={{ flex: 1, overflow: 'hidden' }}>
            {/* Left: Chapter navigator */}
            <div style={{ width: 206, background: '#fff', borderRight: '1px solid #e8e9ed', overflow: 'hidden', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '6px 10px 5px', borderBottom: '1px solid #e8e9ed', borderLeft: '3px solid #ef4444', background: '#fff' }}>
                <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9598ad', marginBottom: 1 }}>CH.01</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0a0d1a' }}>Hormon buồng trứng</div>
              </div>
              <div style={{ flex: 1, overflow: 'hidden', padding: '4px 0' }}>
                <div style={{ padding: '5px 10px 2px' }}>
                  <div style={{ fontSize: 9.5, fontWeight: 600, color: '#1a1a2e', marginBottom: 2 }}>1. Các hormon của buồng trứng</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
                    <span style={{ fontSize: 8.5, color: '#22c55e', fontWeight: 600 }}>Nắm vững 1 thẻ</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', borderRadius: 4 }}>
                    <span style={{ fontSize: 9, color: '#9598ad', fontWeight: 600, width: 10, flexShrink: 0 }}>1</span>
                    <span style={{ fontSize: 9, color: '#6b6e84', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Buồng trứng bài tiết những hormon nào?</span>
                    <span style={{ fontSize: 8, color: '#1648d4', fontWeight: 700, background: '#eef2ff', padding: '1px 5px', borderRadius: 3, flexShrink: 0 }}>HỌC</span>
                  </div>
                </div>
                <div style={{ padding: '5px 10px 2px', borderTop: '1px solid #f0f0f4', marginTop: 3 }}>
                  <div style={{ fontSize: 9.5, fontWeight: 600, color: '#1a1a2e', marginBottom: 2 }}>1.1. Estrogen</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                    <span style={{ fontSize: 8.5, color: '#ef4444', fontWeight: 600 }}>Yếu 4 thẻ</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <NavCard num="1" text="Các dạng estrogen trong huyết tương..." tag="MỚI" />
                    <NavCard num="2" text="Estrogen tổng hợp và vận chuyển..." tag="MỚI" />
                    <NavCard num="3" text="Estrogen được chuyển hóa và thải trừ..." tag="MỚI" />
                    <NavCard num="4" text="Estrogen tác động lên chất nhày cổ tử cung..." tag="MỚI" active />
                  </div>
                </div>
                <div style={{ padding: '5px 10px 2px', borderTop: '1px solid #f0f0f4', marginTop: 3 }}>
                  <div style={{ fontSize: 9.5, fontWeight: 600, color: '#1a1a2e', marginBottom: 2 }}>1.2. Progesteron</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                    <span style={{ fontSize: 8.5, color: '#ef4444', fontWeight: 600 }}>Yếu 1 thẻ</span>
                  </div>
                  <NavCard num="1" text="Progesteron được vận chuyển..." tag="MỚI" />
                </div>
              </div>
            </div>

            {/* Center: Flashcard Q&A */}
            <div style={{ flex: 1, background: '#f5f6f8', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '8px 20px', borderBottom: '1px solid #e8e9ed', fontSize: 9.5, color: '#9598ad', background: '#fafbfc' }}>Hormon buồng trứng › 1.1. Estrogen</div>
              <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
                <div style={{ background: '#fff', border: '1.5px solid #e8e9ed', borderRadius: 9, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9598ad' }}>CÂU HỎI</div>
                    <span style={{ fontSize: 9, color: '#1648d4', fontWeight: 500 }}>🔗 đang chỉnh sửa</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0a0d1a', lineHeight: 1.45 }}>Estrogen tác động lên chất nhày cổ tử cung và biểu mô âm đạo như thế nào?</div>
                </div>
                <div style={{ background: '#fff', border: '1.5px solid #e8e9ed', borderRadius: 9, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9598ad' }}>CÂU TRẢ LỜI</div>
                    <span style={{ fontSize: 9, color: '#ef4444', fontWeight: 500 }}>⚠ Báo cáo lỗi AI</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: '#1e293b', lineHeight: 1.65 }}>
                    Dưới tác dụng của estrogen, niêm mạc cổ tử cung tiết dịch nhày loãng, có thể kéo thành sợi, khi khô tạo hình ảnh tinh thể dương xi.
                    <sup style={{ fontSize: 9, color: '#1648d4', fontWeight: 700, cursor: 'pointer' }}>[7]</sup>
                    {' '}Estrogen làm biểu mô âm đạo chuyển từ dạng khối thành dạng tầng vững chắc, tăng tiết dịch acid, giúp chống chấn thương và nhiễm khuẩn.
                    <sup style={{ fontSize: 9, color: '#1648d4', fontWeight: 700, cursor: 'pointer' }}>[8]</sup>
                    <sup style={{ fontSize: 9, color: '#1648d4', fontWeight: 700, cursor: 'pointer' }}>[9]</sup>
                  </div>
                </div>
                <div style={{ background: '#fafbfc', border: '1px solid #f0f0f4', borderRadius: 8, padding: '9px 12px' }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#c0c3d0', marginBottom: 6 }}>AI TUTOR</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontSize: 9.5, color: '#6b6e84', cursor: 'pointer' }}>Xét nghiệm tinh thể dương xi được ứng dụng lâm sàng như thế nào? <span style={{ color: '#9598ad' }}>→</span></div>
                    <div style={{ fontSize: 9.5, color: '#6b6e84', cursor: 'pointer' }}>Tại sao estrogen giúp bảo vệ âm đạo chống viêm nhiễm? <span style={{ color: '#9598ad' }}>→</span></div>
                    <div style={{ fontSize: 9, color: '#1648d4', marginTop: 2, cursor: 'pointer' }}>+ thêm</div>
                  </div>
                </div>
              </div>
              <div style={{ borderTop: '1px solid #e8e9ed', padding: '8px 20px', background: '#fff', display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
                {['💡 Giải thích đơn hơn', '🔬 Thêm ví dụ lâm sàng', '❓ Tại sao quan trọng?', '✏️ Câu hỏi biến thể', '🌐 Dịch tiếng Anh'].map((t) => (
                  <div key={t} style={{ border: '1px solid #e8e9ed', borderRadius: 6, padding: '4px 9px', fontSize: 9.5, color: '#6b6e84', background: '#fff' }}>{t}</div>
                ))}
              </div>
            </div>

            {/* Right: Source PDF */}
            <div style={{ width: 282, background: '#fff', borderLeft: '1px solid #e8e9ed', padding: 14, overflow: 'hidden', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9598ad' }}>TÀI LIỆU NGUỒN</div>
                <span style={{ color: '#c0c3d0', fontSize: 16, cursor: 'pointer', lineHeight: 1 }}>×</span>
              </div>
              <div style={{ fontSize: 10, color: '#6b6e84', lineHeight: 1.6 }}>...niêm mạc cổ tử cung bài tiết một lớp dịch nhày loãng, mỏng. Dịch này có thể kéo thành sợi dài khi được đặt vào lam kính. Khi để khô trên lam kính, dịch cổ tử cung có hiện tượng tinh thể hoá và soi lam kính hiển vi thấy hình ảnh &quot;dương xi&quot;</div>
              <div style={{ fontSize: 10, color: '#6b6e84', lineHeight: 1.6 }}>- Tác dụng lên vòi trứng</div>
              <div style={{ fontSize: 10, color: '#6b6e84', lineHeight: 1.6 }}>Tất cả các tác dụng của estrogen lên ống dẫn trứng đều nhằm giúp trứng đã thụ tinh di chuyển dễ dàng vào tử cung.</div>
              <div style={{ fontSize: 10, color: '#6b6e84', lineHeight: 1.6 }}>- Tác dụng lên âm đạo</div>
              <div style={{ fontSize: 10, color: '#6b6e84', lineHeight: 1.6 }}>+ Estrogen làm thay đổi biểu mô âm đạo từ dạng khối thành biểu mô tầng. Cấu trúc biểu mô tầng này vững chắc hơn do vậy tăng khả năng chống đỡ với các chấn thương và nhiễm khuẩn.</div>
              <div style={{ background: '#fef9c3', borderRadius: 4, padding: '8px 10px', fontSize: 10.5, color: '#1a1a2e', lineHeight: 1.6, fontWeight: 500 }}>
                + Kích thích các tuyến của âm đạo bài tiết dịch acid.
              </div>
              <div style={{ fontSize: 10, color: '#6b6e84', lineHeight: 1.6 }}>- Tác dụng lên tuyến vú</div>
              <div style={{ fontSize: 10, color: '#6b6e84', lineHeight: 1.6 }}>- Tác dụng lên chuyển hoá</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function NavCard({ num, text, tag, active }: { num: string; text: string; tag: string; active?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: active ? '3px 4px' : '2px 0', borderRadius: 4, background: active ? '#eef2ff' : 'transparent' }}>
      <span style={{ fontSize: 9, color: active ? '#1648d4' : '#9598ad', fontWeight: active ? 700 : 600, width: 10, flexShrink: 0 }}>{num}</span>
      <span style={{ fontSize: 8.5, color: active ? '#1648d4' : '#6b6e84', fontWeight: active ? 600 : 400, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</span>
      <span style={{ fontSize: 7.5, color: '#9598ad', fontWeight: 600, background: active ? '#dce7fd' : '#f5f6f8', padding: '1px 4px', borderRadius: 3, flexShrink: 0 }}>{tag}</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature 04 — Dashboard
// ─────────────────────────────────────────────────────────────────────────────
function Feature04Dashboard() {
  return (
    <section className="sy-feat-section alt">
      <div className="sy-feat-inner">
        <div className="sy-feat-text">
          <div className="sy-feat-eyebrow sy-reveal">04 · Bảng điều khiển</div>
          <h2 className="sy-reveal d1">Bản đồ năng lực.<br />Lộ trình học mỗi ngày.</h2>
          <p className="sy-reveal d2">Radar 8 module y khoa, heatmap hoạt động 30 ngày, số thẻ cần ôn hôm nay. Synapsy tính toán chính xác — không học thêm, học đúng cái cần.</p>
        </div>
        <div className="sy-feat-mockup sy-reveal d3">
          <div className="sy-mockup-win" style={{ height: 490, display: 'flex', flexDirection: 'column' }}>
            <div className="sy-m-topbar">
              <div className="sy-m-topbar-logo"><div className="sy-m-topbar-logo-sq">✳</div><span>Synapsy</span></div>
              <span className="sy-m-topbar-sep">·</span><span className="sy-m-topbar-crumb">Tổng quan</span>
              <span className="sy-m-topbar-right">Nguyễn Bình Thành <span style={{ display: 'inline-flex', width: 18, height: 18, borderRadius: '50%', background: '#1648d4', color: '#fff', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, marginLeft: 4 }}>N</span></span>
            </div>
            <div className="sy-m-body" style={{ flex: 1, overflow: 'hidden' }}>
              <div className="sy-m-rail">
                <div className="sy-m-rail-icon" style={{ fontSize: 13, color: '#9598ad' }}>+</div>
                <div className="sy-m-rail-icon active" style={{ fontSize: 9, fontWeight: 800 }}>KHO</div>
                <div className="sy-m-rail-icon" style={{ fontSize: 8.5, color: '#9598ad', fontWeight: 600, lineHeight: 1.2, textAlign: 'center' }}>THƯ<br />VIỆN</div>
                <div className="sy-m-rail-icon" style={{ fontSize: 9, color: '#9598ad', fontWeight: 600 }}>SRS</div>
              </div>
              <div className="sy-m-drawer">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7, padding: '0 4px' }}>
                  <span className="sy-m-drawer-label" style={{ margin: 0 }}>TÀI LIỆU</span>
                  <span style={{ fontSize: 14, color: '#9598ad', lineHeight: 1 }}>+</span>
                </div>
                <div className="sy-m-folder"><span style={{ color: '#f59e0b' }}>▼</span> Tài liệu của tôi</div>
                <div className="sy-m-file"><span style={{ color: '#c0c3d0' }}>📄</span><span>Nhiễm trùng cơ quan sinh du...</span></div>
                <div className="sy-m-file"><span style={{ color: '#c0c3d0' }}>📄</span><span>Thuốc Tránh Thai</span></div>
                <div className="sy-m-file"><span style={{ color: '#c0c3d0' }}>📄</span><span>Rối Loạn Chuyển Hóa Lipid</span></div>
                <div className="sy-m-file"><span style={{ color: '#c0c3d0' }}>📄</span><span>Hormon và Chu Kỳ Kinh Ngu...</span></div>
                <div className="sy-m-file"><span style={{ color: '#c0c3d0' }}>📄</span><span>VIM ĐỨNG SINH DC DƯỚI</span></div>
                <div className="sy-m-file"><span style={{ color: '#c0c3d0' }}>📄</span><span>Giới Tính và Xu Hướng Tình...</span></div>
                <div className="sy-m-folder" style={{ marginTop: 3 }}><span style={{ color: '#f59e0b' }}>▶</span> Năm 3</div>
                <div style={{ padding: '7px 4px', fontSize: 9.5, color: '#1648d4' }}>+ Thêm tài liệu</div>
              </div>
              <div style={{ flex: 1, padding: '12px 14px', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ background: '#0a0d1a', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                  <div>
                    <div style={{ fontSize: 8, color: '#9598ad', marginBottom: 3 }}>🔥 1 NGÀY LIÊN TIẾP</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>4 thẻ cần ôn hôm nay</div>
                    <div style={{ fontSize: 9, color: '#6b6e84', marginTop: 2 }}>Ước tính ~2 phút</div>
                  </div>
                  <div style={{ background: '#1648d4', borderRadius: 6, padding: '7px 12px', color: '#fff', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>Bắt đầu →</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, flexShrink: 0 }}>
                  <DashStat label="CHUỖI NGÀY" value="1" sub="ngày liên tiếp" accent />
                  <DashStat label="30 NGÀY QUA" value="25" sub="thẻ đã ôn" />
                  <DashStat label="CẦN ÔN" value="4" sub="thẻ hôm nay" />
                </div>
                <div style={{ border: '1px solid #e8e9ed', borderRadius: 8, padding: '12px 14px', background: '#fff', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9598ad' }}>BẢN ĐỒ NĂNG LỰC</div>
                    <div style={{ fontSize: 8.5, color: '#9598ad' }}>Thành thạo · độ chắc chắn</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0a0d1a', marginBottom: 8, letterSpacing: '-0.02em' }}>Năng lực theo module y khoa</div>
                  <div style={{ display: 'flex', gap: 14, flex: 1, overflow: 'hidden', alignItems: 'flex-start' }}>
                    <DashRadarSVG />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, overflow: 'hidden' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 3, alignItems: 'center', marginBottom: 3 }}>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9598ad' }}>NẮM VỮNG</span>
                        <span />
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7, color: '#9598ad', textAlign: 'right', minWidth: 26 }}>CHẮC</span>
                      </div>
                      <DashRow label="Giải phẫu" pct={57} certainty="89%" />
                      <DashRow label="Sinh lý" pct={23} certainty="84%" />
                      <DashRow label="Dược lý" pct={33} certainty="85%" />
                      <DashRow label="Vi sinh" pct={38} certainty="88%" />
                      <DashRow label="Bệnh lý" pct={22} certainty="88%" />
                      <DashRow label="Lâm sàng" pct={34} certainty="82%" />
                      <DashRow label="Hóa sinh" pct={34} certainty="76%" />
                      <DashRow label="Miễn dịch" pct={0} certainty="n=0" empty />
                    </div>
                  </div>
                </div>
                <div style={{ border: '1px solid #e8e9ed', borderRadius: 8, padding: '9px 12px', background: '#fff', flexShrink: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9598ad' }}>HOẠT ĐỘNG 30 NGÀY</span>
                    <span style={{ fontSize: 8.5, color: '#9598ad' }}>25 thẻ đã ôn</span>
                  </div>
                  <Heatmap />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontSize: 8, color: '#c0c3d0' }}>38 ngày trước</span>
                    <span style={{ fontSize: 8, color: '#c0c3d0' }}>Hôm nay</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function DashStat({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div style={{ border: '1px solid #e8e9ed', borderRadius: 7, padding: '8px 10px', background: '#fff' }}>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9598ad', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: accent ? '#1648d4' : '#0a0d1a', letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: '#9598ad', marginTop: 3 }}>{sub}</div>
    </div>
  )
}

function DashRow({ label, pct, certainty, empty }: { label: string; pct: number; certainty: string; empty?: boolean }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 3, alignItems: 'center' }}>
      <div>
        <div style={{ fontSize: 9, fontWeight: 600, color: '#0a0d1a', marginBottom: 2 }}>{label}</div>
        <div style={{ height: 3, background: '#e8e9ed', borderRadius: 2 }}>
          {!empty && <div style={{ width: `${pct}%`, height: '100%', background: '#1648d4', borderRadius: 2 }} />}
        </div>
      </div>
      <span style={{ fontSize: 8, color: empty ? '#9598ad' : '#6b6e84', minWidth: 24, textAlign: 'right' }}>{empty ? '—' : `${pct}%`}</span>
      <span style={{ fontSize: 8, color: '#9598ad', minWidth: 26, textAlign: 'right' }}>{certainty}</span>
    </div>
  )
}

function DashRadarSVG() {
  return (
    <svg viewBox="0 0 240 240" style={{ width: 125, height: 125, flexShrink: 0 }} xmlns="http://www.w3.org/2000/svg">
      <polygon points="120,102 132.7,107.3 138,120 132.7,132.7 120,138 107.3,132.7 102,120 107.3,107.3" fill="none" stroke="#e8e9ed" strokeWidth="0.8"/>
      <polygon points="120,84 145.5,94.5 156,120 145.5,145.5 120,156 94.5,145.5 84,120 94.5,94.5" fill="none" stroke="#e8e9ed" strokeWidth="0.8"/>
      <polygon points="120,66 158.2,81.8 174,120 158.2,158.2 120,174 81.8,158.2 66,120 81.8,81.8" fill="none" stroke="#e8e9ed" strokeWidth="0.8"/>
      <polygon points="120,48 170.9,69.1 192,120 170.9,170.9 120,192 69.1,170.9 48,120 69.1,69.1" fill="none" stroke="#e8e9ed" strokeWidth="0.8"/>
      <polygon points="120,30 183.6,56.4 210,120 183.6,183.6 120,210 56.4,183.6 30,120 56.4,56.4" fill="none" stroke="#e8e9ed" strokeWidth="0.8"/>
      <line x1="120" y1="30" x2="120" y2="210" stroke="#e8e9ed" strokeWidth="0.8"/>
      <line x1="183.6" y1="56.4" x2="56.4" y2="183.6" stroke="#e8e9ed" strokeWidth="0.8"/>
      <line x1="210" y1="120" x2="30" y2="120" stroke="#e8e9ed" strokeWidth="0.8"/>
      <line x1="183.6" y1="183.6" x2="56.4" y2="56.4" stroke="#e8e9ed" strokeWidth="0.8"/>
      <polygon points="120,66.9 134.6,105.4 158.7,120 137.2,137.2 120,135.3 93.3,146.7 89.4,120 118.1,118.1" fill="rgba(22,72,212,0.12)" stroke="#1648d4" strokeWidth="1.5"/>
      <circle cx="120" cy="66.9" r="3" fill="#1648d4"/><circle cx="134.6" cy="105.4" r="3" fill="#1648d4"/>
      <circle cx="158.7" cy="120" r="3" fill="#1648d4"/><circle cx="137.2" cy="137.2" r="3" fill="#1648d4"/>
      <circle cx="120" cy="135.3" r="3" fill="#1648d4"/><circle cx="93.3" cy="146.7" r="3" fill="#1648d4"/>
      <circle cx="89.4" cy="120" r="3" fill="#1648d4"/><circle cx="118.1" cy="118.1" r="3" fill="#c0c3d0"/>
      <text x="120" y="19" textAnchor="middle" fontSize="8.5" fill="#6b6e84" fontFamily="Inter,sans-serif">Giải phẫu</text>
      <text x="193" y="52" textAnchor="start" fontSize="8.5" fill="#6b6e84" fontFamily="Inter,sans-serif">Sinh lý</text>
      <text x="218" y="123" textAnchor="start" fontSize="8.5" fill="#6b6e84" fontFamily="Inter,sans-serif">Dược lý</text>
      <text x="193" y="194" textAnchor="start" fontSize="8.5" fill="#6b6e84" fontFamily="Inter,sans-serif">Vi sinh</text>
      <text x="120" y="224" textAnchor="middle" fontSize="8.5" fill="#6b6e84" fontFamily="Inter,sans-serif">Bệnh lý</text>
      <text x="47" y="194" textAnchor="end" fontSize="8.5" fill="#6b6e84" fontFamily="Inter,sans-serif">Lâm sàng</text>
      <text x="22" y="123" textAnchor="end" fontSize="8.5" fill="#6b6e84" fontFamily="Inter,sans-serif">Hóa sinh</text>
      <text x="47" y="52" textAnchor="end" fontSize="8.5" fill="#6b6e84" fontFamily="Inter,sans-serif">Miễn dịch</text>
    </svg>
  )
}

function Heatmap() {
  const cells: string[] = [
    ...Array(28).fill('#e8e9ed'),
    '#bfdbfe', '#e8e9ed', '#bfdbfe', '#93c5fd', '#bfdbfe',
    '#e8e9ed', '#e8e9ed', '#e8e9ed', '#e8e9ed', '#1648d4',
  ]
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {cells.map((c, i) => (
        <div key={i} style={{ width: 8, height: 8, borderRadius: 2, background: c, flexShrink: 0 }} />
      ))}
    </div>
  )
}
