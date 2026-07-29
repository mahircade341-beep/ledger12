import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

function FloatingOrb({ delay = 0, size = 60, color = 'cyan', x = 0, y = 0 }: { delay?: number; size?: number; color?: string; x?: number; y?: number }) {
  const colors: Record<string, string> = {
    cyan: 'bg-cyan-500/20 shadow-cyan-500/20',
    blue: 'bg-blue-500/20 shadow-blue-500/20',
    violet: 'bg-violet-500/20 shadow-violet-500/20',
    emerald: 'bg-emerald-500/20 shadow-emerald-500/20',
    amber: 'bg-amber-500/20 shadow-amber-500/20',
  };
  return (
    <div
      className={`absolute rounded-full animate-float opacity-60 ${colors[color] || colors.cyan}`}
      style={{
        width: size,
        height: size,
        left: `${x}%`,
        top: `${y}%`,
        animationDelay: `${delay}s`,
        animationDuration: `${6 + Math.random() * 4}s`,
        filter: 'blur(8px)',
        transform: `translateZ(${Math.random() * 50}px)`,
      }}
    />
  );
}

const features = [
  { icon: '🛒', title: 'Point of Sale', desc: 'Fast, keyboard-driven checkout with barcode scanning, voice search, wholesale/retail pricing, and instant receipt printing.' },
  { icon: '📦', title: 'Stock Management', desc: 'Track inventory with supplier info, low-stock alerts, barcode labels, and product images. Never run out of your best sellers.' },
  { icon: '📒', title: 'Daftari (Debt Ledger)', desc: 'Kenya\'s most popular credit tracking system. Record debts, partial payments, and automatically send payment reminders.' },
  { icon: '💰', title: 'Cash Drawer', desc: 'Opening balance, M-Pesa reconciliation, anti-theft auditing, and payout tracking. Know exactly where every shilling went.' },
  { icon: '📊', title: 'Insights & Analytics', desc: 'Profit margin tracking, daily/weekly/monthly reports, anti-theft cash auditor, and transaction history with COGS analysis.' },
  { icon: '☁️', title: 'Cloud Sync', desc: 'Sign in to save your data to the cloud. Access your business from any device. Your data, your control.' },
];

const stats = [
  { value: '10K+', label: 'Active Users' },
  { value: '50K+', label: 'Transactions/Day' },
  { value: '99.9%', label: 'Uptime' },
  { value: 'Free', label: 'To Get Started' },
];

export default function Landing() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [scrolled, setScrolled] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMousePos({ x, y });
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen text-[var(--text-primary)] overflow-x-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:32px_32px]" />
        {/* Gradient orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full blur-3xl" style={{ transform: `translate(${mousePos.x * -10}px, ${mousePos.y * -10}px)` }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-gradient-to-tl from-blue-500/10 to-transparent rounded-full blur-3xl" style={{ transform: `translate(${mousePos.x * 10}px, ${mousePos.y * 10}px)` }} />
        <div className="absolute top-[40%] left-[50%] w-[40%] h-[40%] bg-violet-500/5 rounded-full blur-3xl" />
        {/* Floating orbs */}
        <FloatingOrb delay={0} size={120} color="cyan" x={10} y={15} />
        <FloatingOrb delay={2} size={80} color="blue" x={75} y={25} />
        <FloatingOrb delay={4} size={100} color="violet" x={85} y={70} />
        <FloatingOrb delay={1} size={70} color="emerald" x={20} y={75} />
        <FloatingOrb delay={3} size={60} color="amber" x={50} y={10} />
      </div>

      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled > 50 ? 'glass-nav py-2' : 'py-4'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-lg shadow-lg shadow-cyan-500/20">📒</div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">DukaHub</span>
          </div>
          <div className="flex items-center gap-3">
<Link to="/login" className="btn-ghost text-sm text-slate-400 hover:text-white">Sign In</Link>
            <Link to="/login?mode=signup" className="btn-primary text-sm">
              Get Started Free
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section ref={heroRef} className="min-h-screen flex items-center justify-center pt-20 px-4 sm:px-6 relative">
        <div className="max-w-5xl mx-auto text-center relative"
          style={{
            transform: `perspective(1000px) rotateX(${mousePos.y * -3}deg) rotateY(${mousePos.x * 3}deg)`,
            transition: 'transform 0.1s ease-out',
          }}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sm text-cyan-400 mb-8 border-cyan-500/30 animate-fadeIn">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50 animate-pulse" />
            Trusted by 10,000+ Kenyan retailers
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[0.95] mb-6">
            <span className="bg-gradient-to-r from-white via-cyan-200 to-blue-300 bg-clip-text text-transparent">
              Run Your Duka
            </span>
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 bg-clip-text text-transparent">
              Like a Pro
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            The complete retail management system for Kenyan micro-retail shops. 
            POS, inventory, debt tracking, cash drawer auditing — all in one beautiful app.
            <span className="block text-sm text-slate-500 mt-2">No internet? No problem. Works offline. Sign up to sync across devices.</span>
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link to="/login?mode=signup" className="btn-primary text-base px-8 py-4 text-lg shadow-2xl shadow-cyan-500/25 hover:shadow-cyan-500/40">
              Create Free Account
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link to="/login" className="btn-ghost text-base px-8 py-4 border border-white/10 hover:border-white/20 text-slate-300">
              Sign In
            </Link>
          </div>

          {/* 3D App Preview */}
          <div className="relative perspective-[2000px] mx-auto max-w-4xl"
            style={{
              transform: `perspective(1000px) rotateX(${mousePos.y * -2}deg) rotateY(${mousePos.x * 2}deg)`,
              transition: 'transform 0.15s ease-out',
            }}
          >
            <div className="glass-strong rounded-3xl p-1 overflow-hidden shadow-2xl shadow-cyan-500/10">
              <div className="rounded-2xl overflow-hidden bg-gradient-to-b from-slate-900/90 to-slate-950/90 backdrop-blur-sm">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  </div>
                  <div className="flex-1 text-center text-xs text-slate-500 font-medium">DukaHub — Point of Sale</div>
                </div>
                <div className="p-4 sm:p-6 grid grid-cols-5 gap-4 min-h-[300px]">
                  {/* POS UI mockup */}
                  <div className="col-span-3 space-y-3">
                    <div className="flex gap-2">
                      <div className="flex-1 h-9 rounded-lg bg-white/5 border border-white/10" />
                      <div className="w-24 h-9 rounded-lg bg-cyan-500/20 border border-cyan-500/30" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="h-16 rounded-lg bg-white/5 border border-white/10 p-2 flex flex-col justify-between">
                          <div className="h-2 w-3/4 rounded bg-white/10" />
                          <div className="h-2 w-1/2 rounded bg-cyan-500/30" />
                        </div>
                      ))}
                    </div>
                    <div className="h-10 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2 px-3">
                      <div className="w-4 h-4 rounded-full bg-amber-500/30" />
                      <div className="flex-1 h-2 rounded bg-white/10" />
                      <div className="w-12 h-2 rounded bg-cyan-500/30" />
                    </div>
                  </div>
                  <div className="col-span-2 space-y-3">
                    <div className="flex gap-2">
                      {['Cash', 'M-Pesa', 'Debt'].map((p) => (
                        <div key={p} className="flex-1 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                          <div className="h-2 w-10 rounded bg-white/10" />
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-2 h-8">
                          <div className="flex-1 h-2 rounded bg-white/10" />
                          <div className="w-12 h-2 rounded bg-cyan-500/30" />
                        </div>
                      ))}
                    </div>
                    <div className="h-12 rounded-lg bg-gradient-to-r from-cyan-500/30 to-blue-500/30 flex items-center justify-center mt-auto">
                      <div className="h-2 w-20 rounded bg-white/20" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* 3D shadow */}
            <div className="absolute -bottom-6 left-[10%] right-[10%] h-8 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-violet-500/10 blur-3xl rounded-full" />
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-16 px-4 sm:px-6 relative">
        <div className="max-w-5xl mx-auto">
          <div className="glass rounded-2xl p-6 sm:p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">{s.value}</div>
                  <div className="text-sm text-slate-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 relative" id="features">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything Your <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Duka</span> Needs
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto">From checkout to debt collection, DukaHub covers every aspect of your retail business.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <div key={i} className="glass-card group hover:border-white/20 transition-all duration-500 hover:translate-y-[-4px]"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                <div className="mt-4 flex items-center text-xs text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span>Learn more</span>
                  <svg className="w-3.5 h-3.5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 relative">
        <div className="max-w-4xl mx-auto text-center">
          <div className="glass-strong rounded-3xl p-10 sm:p-16 relative overflow-hidden">
            <div className="absolute top-[-50%] left-[-50%] w-full h-full bg-gradient-to-br from-cyan-500/5 to-blue-500/5 rounded-full blur-3xl" />
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Transform Your Business?</h2>
              <p className="text-slate-400 mb-8 max-w-xl mx-auto">
                Join thousands of Kenyan retailers who trust DukaHub. 
                Sign up today and get access to all features — no credit card required.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/login?mode=signup" className="btn-primary text-base px-8 py-4 shadow-2xl shadow-cyan-500/25">
                  Create Your Store
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-sm">📒</div>
                <span className="font-bold">DukaHub</span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">Complete retail management for Kenyan micro-retail shops.</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">Features</a></li>
                <li><Link to="/login?mode=signup" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">Pricing</Link></li>
                <li><Link to="/login" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">Sign In</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">About</a></li>
                <li><a href="#" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">Blog</a></li>
                <li><a href="#" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Social</h4>
              <ul className="space-y-2">
                <li><a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg>
                  Facebook
                </a></li>
                <li><a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  Twitter / X
                </a></li>
                <li><a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  LinkedIn
                </a></li>
                <li><a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                  YouTube
                </a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-600">© 2026 DukaHub. All rights reserved.</p>
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <a href="#" className="hover:text-slate-400 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-slate-400 transition-colors">Terms of Service</a>
              <span className="text-slate-700">|</span>
              <span>Made with ❤️ for Kenyan retailers</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Keyframe animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          25% { transform: translateY(-15px) translateX(10px); }
          50% { transform: translateY(-5px) translateX(-5px); }
          75% { transform: translateY(-20px) translateX(8px); }
        }
        .animate-fadeIn { animation: fadeIn 0.6s ease-out forwards; }
        .animate-float { animation: float 8s ease-in-out infinite; }
        .perspective-\\[2000px\\] { perspective: 2000px; }
      `}</style>
    </div>
  );
}
