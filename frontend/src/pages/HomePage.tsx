import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { STATS, FEATURES, TESTIMONIALS, JOB_TYPES } from '../data/constants';
import { AI_EMPLOYEES } from '../data/employees';

const LOGOS = ['Stripe', 'Vercel', 'Linear', 'Notion', 'Figma', 'Shopify', 'Supabase', 'Railway'];

export function HomePage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const go = () => auth.isLoggedIn ? navigate('/catalog') : navigate('/signup');

  return (
    <div className="overflow-hidden">
      {/* ═══════ HERO ═══════ */}
      <section className="relative min-h-[92vh] flex items-center justify-center bg-[#0F0F0F] overflow-hidden">
        {/* Animated floating orbs background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full opacity-40"
              style={{
                width: `${100 + i * 80}px`,
                height: `${100 + i * 80}px`,
                background: `radial-gradient(circle, rgba(251,204,0,${0.15 - i * 0.015}) 0%, transparent 70%)`,
                left: `${10 + i * 10}%`,
                top: `${20 + i * 8}%`,
                animation: `float ${8 + i * 2}s ease-in-out infinite`,
                animationDelay: `${i * 0.3}s`,
              }}
            />
          ))}
        </div>

        {/* Gradient mesh background */}
        <div className="absolute inset-0 opacity-40 pointer-events-none" style={{
          background: `
            linear-gradient(135deg, rgba(251,204,0,0.1) 0%, transparent 50%),
            linear-gradient(45deg, rgba(59,130,246,0.08) 0%, transparent 50%)
          `,
          mixBlendMode: 'screen',
        }} />

        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-30" style={{ background: 'radial-gradient(circle, rgba(251,204,0,.25) 0%, transparent 70%)', animation: 'hero-glow 6s ease-in-out infinite' }} />
        <div className="absolute top-20 right-20 w-[400px] h-[400px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, rgba(251,204,0,.15) 0%, transparent 70%)' }} />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
          <div className="fade-up">
            <div className="inline-flex items-center gap-2 bg-white/[.06] border border-white/[.1] rounded-full px-5 py-2 mb-8 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-gray-300 font-medium">Over 50,000 tasks completed daily</span>
            </div>
          </div>
          <h1 className="hc text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] text-white mb-6 fade-up-d1" style={{ lineHeight: '.95' }}>
            Hire Flawless<br />
            <span className="text-gradient relative inline-block" style={{
              animation: 'shimmer 3s ease-in-out infinite',
              backgroundImage: 'linear-gradient(90deg, rgba(251,204,0,0) 0%, rgba(251,204,0,.4) 50%, rgba(251,204,0,0) 100%)',
              backgroundSize: '200% 100%',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
            }}>AI Employees</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed fade-up-d2">
            Get an AI team who runs your inbox, socials, SEO, lead generation, calls, and support — 24/7, zero overhead. Scale from 1 to 1,000 in seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center fade-up-d3">
            <button onClick={go} className="btn-gold text-base px-10 py-4 shadow-lg shadow-yellow-500/20">Get Started Free</button>
            <button onClick={() => navigate('/pricing')} className="bg-white/[.08] text-white border border-white/[.12] rounded-xl px-10 py-4 font-semibold text-sm uppercase tracking-wide cursor-pointer transition-all hover:bg-white/[.14] hover:border-white/[.2]" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>View Pricing</button>
          </div>

          {/* Floating dashboard mockup */}
          <div className="mt-16 fade-up-d4 relative">
            <div className="relative inline-block">
              {/* Floating glow effect */}
              <div className="absolute inset-0 -z-10 blur-3xl opacity-30" style={{
                background: 'radial-gradient(circle, rgba(251,204,0,.3) 0%, transparent 70%)',
                animation: 'pulse 4s ease-in-out infinite',
              }} />

              {/* Dashboard card mockup */}
              <div className="rounded-2xl overflow-hidden border border-white/[.1] backdrop-blur-xl bg-white/[.05] p-6 max-w-lg mx-auto" style={{
                animation: 'float 6s ease-in-out infinite',
              }}>
                <div className="flex gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <div className="space-y-4">
                  <div className="h-3 bg-gradient-to-r from-yellow-500/30 to-transparent rounded-full w-3/4" />
                  <div className="grid grid-cols-2 gap-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="space-y-2 p-3 rounded-lg bg-white/[.03] border border-white/[.05]">
                        <div className="h-2 bg-yellow-500/20 rounded w-2/3" />
                        <div className="h-2 bg-white/[.1] rounded" />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 bg-white/[.1] rounded" />
                    <div className="h-2 bg-white/[.08] rounded w-4/5" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats row with glassmorphism */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mt-20 fade-up-d5">
            {STATS.map((s, i) => (
              <div key={i} className="relative group">
                {/* Gradient border glow on hover */}
                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-px" style={{
                  background: 'linear-gradient(135deg, rgba(251,204,0,.3) 0%, rgba(59,130,246,.1) 100%)',
                }} />

                <div className="relative bg-white/[.04] backdrop-blur-md border border-white/[.08] rounded-xl p-5 sm:p-6 group-hover:border-white/[.15] transition-all duration-300">
                  <p className="hc text-2xl sm:text-3xl text-white mb-1" style={{
                    animation: 'countUp 2s ease-out forwards',
                  }}>{s.value}</p>
                  <p className="text-xs sm:text-sm text-gray-400 uppercase tracking-wider">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* ═══════ LOGO BAR ═══════ */}
      <section className="bg-white py-10 px-6 border-b border-gray-100 relative overflow-hidden">
        {/* Gradient fade overlays */}
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

        <p className="text-center text-xs text-gray-400 uppercase tracking-widest mb-6 font-semibold relative z-5">Trusted by teams at</p>
        <div className="relative overflow-hidden">
          <div className="flex animate-marquee gap-10 sm:gap-14">
            {[...LOGOS, ...LOGOS].map((name, idx) => (
              <span key={idx} className="text-gray-300 font-bold text-lg tracking-wide flex-shrink-0" style={{ fontFamily: "'Arial Black', sans-serif" }}>{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ ROLES SECTION ═══════ */}
      <section className="bg-white py-24 px-6 relative">
        <div className="dot-pattern absolute inset-0 pointer-events-none" />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-yellow-700 bg-yellow-100 px-4 py-1.5 rounded-full mb-4">Browse by Role</span>
            <h2 className="hc text-4xl sm:text-5xl lg:text-6xl mb-4">Meet Your New<br />AI Team</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">Hire in seconds. Deploy instantly. Every role comes with domain expertise, personality, and 24/7 availability.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
            {JOB_TYPES.map((jt, i) => (
              <button key={jt.id} onClick={() => navigate('/catalog')}
                className="group relative bg-white rounded-2xl p-6 text-left cursor-pointer border border-gray-100 transition-all duration-300 overflow-hidden"
                style={{
                  animationDelay: `${i * .06}s`,
                  background: 'linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0.95) 100%)',
                }}>
                {/* Gradient hover glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{
                  background: 'linear-gradient(135deg, rgba(251,204,0,0.1) 0%, rgba(59,130,246,0.05) 100%)',
                }} />

                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-2xl mb-4 group-hover:bg-yellow-50 transition-colors">{jt.icon}</div>
                  <p className="font-bold text-[15px] text-gray-900 mb-1">{jt.title}</p>
                  <p className="text-xs text-gray-400">{jt.count} available</p>
                </div>

                {/* Number badge */}
                <div className="absolute top-4 right-4 flex items-center gap-1">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center text-xs font-bold text-gray-900 shadow-lg shadow-yellow-500/30 group-hover:shadow-yellow-500/50 transition-all">
                    {jt.count}
                  </div>
                  <div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-yellow-400 group-hover:text-black transition-all text-xs">→</div>
                </div>
              </button>
            ))}
          </div>
          <div className="text-center mt-12">
            <button onClick={() => navigate('/catalog')} className="btn-dark px-10 py-4">Browse All Employees</button>
          </div>
        </div>
      </section>

      {/* ═══════ FEATURED EMPLOYEES ═══════ */}
      <section className="section-dark py-24 px-6">
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-yellow-400 bg-yellow-400/10 px-4 py-1.5 rounded-full mb-4">Featured</span>
            <h2 className="hc text-4xl sm:text-5xl text-white mb-4">Top Performing<br />AI Employees</h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">Each with unique personalities, expertise, and working styles.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {AI_EMPLOYEES.slice(0, 6).map((emp, i) => (
              <div key={emp.id} className="group relative cursor-pointer"
                onClick={() => auth.isLoggedIn ? navigate(`/workspace/${emp.id}`) : navigate('/signup')}>

                {/* Animated gradient border on hover */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 p-px pointer-events-none" style={{
                  background: `linear-gradient(135deg,
                    rgba(251,204,0,0.4) 0%,
                    rgba(59,130,246,0.2) 50%,
                    rgba(139,92,246,0.2) 100%)`,
                  animation: 'gradientShift 3s ease-in-out infinite',
                }} />

                <div className="relative card-dark group-hover:border-white/[.2] transition-colors duration-300">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0 border border-gray-700 group-hover:border-yellow-500/40 transition-colors">
                      <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${emp.name}&backgroundColor=transparent`} alt={emp.name} className="w-full h-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white text-base">{emp.name}</h3>
                      <p className="text-xs text-gray-400 truncate">{emp.role}</p>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed mb-4" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{emp.description}</p>

                  {/* Mini sparkline SVG */}
                  <div className="mb-4 h-8 w-full opacity-60 group-hover:opacity-100 transition-opacity">
                    <svg viewBox="0 0 100 30" className="w-full h-full" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id={`sparkline-${emp.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="rgba(251,204,0,0)" />
                          <stop offset="50%" stopColor="rgba(251,204,0,0.6)" />
                          <stop offset="100%" stopColor="rgba(251,204,0,0)" />
                        </linearGradient>
                      </defs>
                      <polyline
                        points="0,20 12,10 24,15 36,5 48,12 60,8 72,18 84,6 96,12"
                        fill="none"
                        stroke={`url(#sparkline-${emp.id})`}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {emp.skills.slice(0, 3).map(s => (
                      <span key={s} className="text-[10px] font-medium bg-white/[.06] text-gray-300 px-2.5 py-1 rounded-full border border-white/[.06]">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ FEATURES ═══════ */}
      <section className="bg-white py-24 px-6 relative">
        {/* Subtle grid lines background */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-yellow-700 bg-yellow-100 px-4 py-1.5 rounded-full mb-4">Platform</span>
            <h2 className="hc text-4xl sm:text-5xl mb-4">Why NexusHR AI?</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">Enterprise-grade AI workforce platform with the tools you need to scale.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => {
              const gradients = [
                'from-yellow-400 to-orange-400',
                'from-blue-400 to-blue-600',
                'from-purple-400 to-purple-600'
              ];
              const bgGradient = gradients[i % gradients.length];

              return (
                <div key={i} className="group p-8 rounded-2xl border border-gray-100 bg-white transition-all duration-300 hover:border-yellow-200 hover:shadow-xl hover:shadow-yellow-500/[.04] relative overflow-hidden">
                  {/* Gradient icon background with alternating colors */}
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${bgGradient} absolute -right-4 -top-4 opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />

                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${bgGradient} flex items-center justify-center text-2xl mb-5 transition-all duration-300 shadow-lg opacity-0 group-hover:opacity-100 absolute right-6 top-6`} style={{ color: 'white' }}>{f.icon}</div>

                  <div className={`w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-2xl mb-5 group-hover:opacity-0 transition-opacity duration-300`}>{f.icon}</div>

                  <h3 className="font-bold text-lg mb-3 text-gray-900">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════ SOCIAL PROOF ═══════ */}
      <section className="bg-[#FAFAF8] py-24 px-6 relative overflow-hidden">
        <div className="dot-pattern absolute inset-0 pointer-events-none opacity-50" />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-yellow-700 bg-yellow-100 px-4 py-1.5 rounded-full mb-4">Testimonials</span>
            <h2 className="hc text-4xl sm:text-5xl mb-4">What Our Clients Say</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => {
              const accentColors = ['bg-yellow-400', 'bg-blue-400', 'bg-purple-400'];
              const accentColor = accentColors[i % accentColors.length];

              return (
                <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative">
                  {/* Left-side color accent bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentColor}`} />

                  <div className="p-7">
                    {/* Large quote marks */}
                    <div className="text-6xl text-gray-200 mb-3 leading-none" style={{ fontFamily: 'Georgia, serif' }}>
                      "
                    </div>

                    <div className="flex gap-1 mb-4">{[...Array(5)].map((_, j) => <span key={j} className="text-yellow-400 text-sm">★</span>)}</div>
                    <p className="text-[15px] text-gray-700 leading-relaxed mb-6">{t.quote}</p>
                    <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs text-white" style={{ background: `linear-gradient(135deg, ${['#FBCC00','#3B82F6','#8B5CF6'][i]}, ${['#E5BA00','#2563EB','#7C3AED'][i]})` }}>{t.avatar}</div>
                      <div><p className="font-bold text-sm text-gray-900">{t.name}</p><p className="text-xs text-gray-400">{t.role}</p></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════ FINAL CTA ═══════ */}
      <section className="relative py-28 px-6 overflow-hidden bg-[#0F0F0F]">
        {/* Floating particles/stars animation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-yellow-400"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.6 + 0.2,
                animation: `twinkle ${3 + Math.random() * 3}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`,
                boxShadow: '0 0 6px rgba(251,204,0,0.6)',
              }}
            />
          ))}
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, rgba(251,204,0,.3) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h2 className="hc text-4xl sm:text-5xl lg:text-6xl text-white mb-6" style={{ lineHeight: '.95' }}>
            If You're Reading This,<br />
            <span className="text-gradient">You're Already Ahead.</span>
          </h2>
          <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">Join thousands of companies scaling with AI employees. Start your free trial today — no credit card required.</p>

          {/* Larger, bolder button with arrow icon */}
          <button onClick={go} className="btn-gold text-base sm:text-lg px-14 sm:px-16 py-5 sm:py-6 shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50 transition-all duration-300 hover:scale-105 font-bold tracking-wide flex items-center gap-3 mx-auto">
            <span>Meet Your AI Team</span>
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </section>
    </div>
  );
}
