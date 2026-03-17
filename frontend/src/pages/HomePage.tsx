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
            <span className="text-gradient">AI Employees</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed fade-up-d2">
            Get an AI team who runs your inbox, socials, SEO, lead generation, calls, and support — 24/7, zero overhead. Scale from 1 to 1,000 in seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center fade-up-d3">
            <button onClick={go} className="btn-gold text-base px-10 py-4 shadow-lg shadow-yellow-500/20">Get Started Free</button>
            <button onClick={() => navigate('/pricing')} className="bg-white/[.08] text-white border border-white/[.12] rounded-xl px-10 py-4 font-semibold text-sm uppercase tracking-wide cursor-pointer transition-all hover:bg-white/[.14] hover:border-white/[.2]" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>View Pricing</button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 fade-up-d4">
            {STATS.map((s, i) => (
              <div key={i} className="text-center">
                <p className="hc text-3xl sm:text-4xl text-white mb-1">{s.value}</p>
                <p className="text-xs sm:text-sm text-gray-500 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* ═══════ LOGO BAR ═══════ */}
      <section className="bg-white py-10 px-6 border-b border-gray-100">
        <p className="text-center text-xs text-gray-400 uppercase tracking-widest mb-6 font-semibold">Trusted by teams at</p>
        <div className="flex items-center justify-center gap-10 sm:gap-14 flex-wrap max-w-4xl mx-auto">
          {LOGOS.map(name => (
            <span key={name} className="text-gray-300 font-bold text-lg tracking-wide" style={{ fontFamily: "'Arial Black', sans-serif" }}>{name}</span>
          ))}
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
                className="group relative bg-white rounded-2xl p-6 text-left cursor-pointer border border-gray-100 transition-all duration-300 hover:border-yellow-300 hover:shadow-xl hover:shadow-yellow-500/[.06] hover:-translate-y-1"
                style={{ animationDelay: `${i * .06}s` }}>
                <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-2xl mb-4 group-hover:bg-yellow-50 transition-colors">{jt.icon}</div>
                <p className="font-bold text-[15px] text-gray-900 mb-1">{jt.title}</p>
                <p className="text-xs text-gray-400">{jt.count} available</p>
                <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-yellow-400 group-hover:text-black transition-all text-xs">→</div>
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
              <div key={emp.id} className="card-dark group cursor-pointer" onClick={() => auth.isLoggedIn ? navigate(`/workspace/${emp.id}`) : navigate('/signup')}>
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
                <div className="flex flex-wrap gap-1.5">
                  {emp.skills.slice(0, 3).map(s => (
                    <span key={s} className="text-[10px] font-medium bg-white/[.06] text-gray-300 px-2.5 py-1 rounded-full border border-white/[.06]">{s}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ FEATURES ═══════ */}
      <section className="bg-white py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-yellow-700 bg-yellow-100 px-4 py-1.5 rounded-full mb-4">Platform</span>
            <h2 className="hc text-4xl sm:text-5xl mb-4">Why NexusHR AI?</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">Enterprise-grade AI workforce platform with the tools you need to scale.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div key={i} className="group p-8 rounded-2xl border border-gray-100 bg-white transition-all duration-300 hover:border-yellow-200 hover:shadow-xl hover:shadow-yellow-500/[.04]">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-2xl mb-5 group-hover:bg-yellow-50 transition-colors">{f.icon}</div>
                <h3 className="font-bold text-lg mb-3 text-gray-900">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
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
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="flex gap-1 mb-4">{[...Array(5)].map((_, j) => <span key={j} className="text-yellow-400 text-sm">★</span>)}</div>
                <p className="text-[15px] text-gray-700 leading-relaxed mb-6">"{t.quote}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs text-white" style={{ background: `linear-gradient(135deg, ${['#FBCC00','#3B82F6','#8B5CF6'][i]}, ${['#E5BA00','#2563EB','#7C3AED'][i]})` }}>{t.avatar}</div>
                  <div><p className="font-bold text-sm text-gray-900">{t.name}</p><p className="text-xs text-gray-400">{t.role}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ FINAL CTA ═══════ */}
      <section className="relative py-28 px-6 overflow-hidden bg-[#0F0F0F]">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, rgba(251,204,0,.3) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h2 className="hc text-4xl sm:text-5xl lg:text-6xl text-white mb-6" style={{ lineHeight: '.95' }}>
            If You're Reading This,<br />
            <span className="text-gradient">You're Already Ahead.</span>
          </h2>
          <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">Join thousands of companies scaling with AI employees. Start your free trial today — no credit card required.</p>
          <button onClick={go} className="btn-gold text-base px-12 py-5 shadow-lg shadow-yellow-500/20">Meet Your AI Team</button>
        </div>
      </section>
    </div>
  );
}
