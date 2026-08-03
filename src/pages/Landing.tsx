import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AnimatedBackground from '../components/AnimatedBackground';

// ── Support contacts ──
// Displayed exactly as the shop owner gave it: 0143 897 900
// wa.me requires the international format (Kenya: +254, drop leading 0)
const SUPPORT_WA_NUMBER = '254143897900';
const SUPPORT_WA_DISPLAY = '0143 897 900';
const SUPPORT_EMAIL = 'fahmanmanka25@gmail.com';

// ── Feature data ──
const FEATURES = [
  {
    icon: '🛒',
    title: 'Lightning-Fast POS',
    desc: 'Ring up sales in seconds with keyboard shortcuts, barcode scanning, and automatic stock deduction. No more queues at the counter.',
    gradient: 'from-blue-600 to-blue-800',
  },
  {
    icon: '📦',
    title: 'Never Lose Stock',
    desc: 'Real-time inventory with low-stock alerts. Know exactly what to reorder, what sold, and what\'s sitting on the shelf.',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    icon: '📱',
    title: 'M-Pesa Ready',
    desc: 'Record M-Pesa, cash, and credit (Daftari) sales side by side. Your daily float reconciles itself — every shilling accounted for.',
    gradient: 'from-teal-500 to-teal-700',
  },
  {
    icon: '🧾',
    title: 'Instant Receipts',
    desc: 'Print or share a clean, branded receipt for every sale. Your shop name, your prices, zero math errors.',
    gradient: 'from-slate-600 to-slate-800',
  },
  {
    icon: '📊',
    title: 'Know Your Profit',
    desc: 'Daily profit, margins, and cash audits without spreadsheets. See what you actually earned — not what you think you earned.',
    gradient: 'from-cyan-500 to-blue-700',
  },
  {
    icon: '📒',
    title: 'Daftari Debt Ledger',
    desc: 'Track customers who buy on credit, record payments, and get reminded who owes you. No more torn notebook pages.',
    gradient: 'from-emerald-600 to-blue-800',
  },
];

const TESTIMONIALS = [
  {
    quote: 'I used to count my stock on paper every Sunday. Now I open the app and know everything. My wife and I both use it on our phones.',
    name: 'Mama Wanjiru',
    shop: 'Wanjiru Groceries, Nakuru',
    initials: 'MW',
  },
  {
    quote: 'The M-Pesa tracking alone saved me. I could never figure out where my float went. Now the cash drawer checks itself.',
    name: 'David Otieno',
    shop: 'Otieno Hardware, Kisumu',
    initials: 'DO',
  },
  {
    quote: 'Daftari changed how I deal with credit customers. I used to lose track of who owed what. Not anymore.',
    name: 'Amina Hassan',
    shop: 'Hassan Mini-Mart, Mombasa',
    initials: 'AH',
  },
];

const STEPS = [
  { n: '01', title: 'Create your shop', desc: 'Sign up free — tell us your shop name and what you sell. Takes under a minute, no card required.' },
  { n: '02', title: 'Add your products', desc: 'Type or scan barcodes, set your buying and selling prices. DukaHub calculates your margin automatically.' },
  { n: '03', title: 'Sell & track', desc: 'Ring up sales at the counter, record M-Pesa and cash, and watch your daily profit update in real time.' },
];

const FAQS = [
  {
    q: 'Is DukaHub really free?',
    a: 'Yes — DukaHub is free for Kenyan shop owners, forever. No trial period, no credit card, no hidden fees. We keep it free because we believe every duka deserves modern tools.',
  },
  {
    q: 'Do I need an internet connection to use it?',
    a: 'No. DukaHub works offline — ring up sales and view your catalog even when the network drops. Everything syncs automatically once you\'re back online.',
  },
  {
    q: 'Can I use it on my phone?',
    a: 'Absolutely. DukaHub is built mobile-first and can be installed on your phone\'s home screen like a real app — even on iOS and Android.',
  },
  {
    q: 'Is my shop data safe?',
    a: 'Your data is stored securely with encrypted login and row-level security — only you can see your shop\'s data. You can export everything any time.',
  },
  {
    q: 'Can I track customers who buy on credit?',
    a: 'Yes — the Daftari ledger tracks debtors, records payments, and keeps a history of every credit transaction.',
  },
];

// ── Data safety trust points ──
const DATA_SAFETY = [
  {
    icon: '🔐',
    title: 'Encrypted & locked down',
    desc: 'Secure login and row-level security — only you can see your shop\u2019s data. Encrypted in transit, always.',
  },
  {
    icon: '🏠',
    title: 'Your data is yours',
    desc: 'We never sell your data and never use it for ads. What you enter in DukaHub stays your business.',
  },
  {
    icon: '📤',
    title: 'Export or delete anytime',
    desc: 'Take your products, sales, and debts with you — or delete everything when you close your account.',
  },
  {
    icon: '🇰🇪',
    title: 'Kenya Data Protection Act',
    desc: 'We comply with the Kenya Data Protection Act, 2019 — and honor the rights it gives you over your data.',
  },
];

function useRevealOnScroll() {
  const [revealed, setRevealed] = useState<string[]>([]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = (entry.target as HTMLElement).dataset.reveal;
            if (id) setRevealed((prev) => (prev.includes(id) ? prev : [...prev, id]));
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll('[data-reveal]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return revealed;
}

export default function Landing() {
  const revealed = useRevealOnScroll();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [contact, setContact] = useState({ name: '', phone: '', message: '' });
  const [contactSent, setContactSent] = useState(false);
  const [contactError, setContactError] = useState('');

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact.name.trim() || !contact.message.trim()) {
      setContactError('Please fill in your name and message.');
      return;
    }
    setContactError('');
    const text = [
      '*New enquiry — DukaHub support*',
      '',
      `👤 Name: ${contact.name.trim()}`,
      contact.phone.trim() ? `📱 Phone: ${contact.phone.trim()}` : '',
      '',
      contact.message.trim(),
    ]
      .filter(Boolean)
      .join('\n');
    window.open(`https://wa.me/${SUPPORT_WA_NUMBER}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    setContactSent(true);
  };

  return (
    <div className="min-h-screen bg-ios26 text-[var(--text-primary)] relative overflow-x-hidden">
      <a href="#top" className="skip-link">Skip to content</a>
      <AnimatedBackground />

      {/* ── Sticky Nav ── */}
      <header className="sticky top-0 z-40 glass-v2-nav border-b border-[var(--border-color)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: 'var(--gradient-brand-mark)', boxShadow: 'var(--btn-primary-shadow)' }}>
              <span className="text-lg font-extrabold text-[var(--mark-text)]">D</span>
            </div>
            <span className="font-bold text-lg tracking-tight">DukaHub</span>
          </a>
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
            <a href="#features" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Features</a>
            <a href="#how" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">How it works</a>
            <a href="#pricing" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Pricing</a>
            <a href="#faq" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">FAQ</a>
            <a href="#contact" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Contact</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden sm:inline-flex btn-v2-ghost text-sm">Sign In</Link>
            <Link to="/login?mode=signup" className="btn-v2-primary text-sm">Start Free</Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section id="top" tabIndex={-1} className="relative pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex flex-wrap items-center justify-center gap-2 text-xs mb-6 animate-fade-in-v2">
            <span className="inline-flex items-center gap-2 badge-v2-success">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] animate-pulse" />
              Free for Kenyan shops · No card required
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold text-[var(--text-secondary)] bg-[var(--accent-dim)] border border-[var(--border-hover)]">
              <span className="text-gradient-aurora font-extrabold">Faster checkout · Deeper insights</span>
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.1] max-w-3xl mx-auto animate-spring-up">
            Stop losing stock. Track every{' '}
            <span className="bg-gradient-to-r from-[var(--color-success)] to-[var(--color-info)] bg-clip-text text-transparent">shilling</span>.
          </h1>
          <p className="mt-5 text-lg sm:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed animate-spring-up" style={{ animationDelay: '80ms' }}>
            Ring up sales in seconds, watch stock and profit update live, and reconcile
            every shilling — from your phone or laptop. Built for how Kenyan dukas actually run.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3 animate-spring-up" style={{ animationDelay: '160ms' }}>
            <Link to="/login?mode=signup"
              className="btn-v2-primary px-7 py-3.5 text-base w-full sm:w-auto">
              Start Free Trial — No Card Required
            </Link>
            <a href="#features"
              className="btn-v2-secondary px-7 py-3.5 text-base w-full sm:w-auto">
              See How It Works
            </a>
          </div>

          <p className="mt-5 text-xs text-[var(--text-muted)] animate-fade-in-v2">
            Setup takes under 1 minute · Works offline · Your data stays yours · Free forever
          </p>

          {/* ── Product mockup ── */}
          <div className="mt-16 relative max-w-3xl mx-auto animate-scale-in-v2" style={{ animationDelay: '240ms' }}>
            <div className="absolute -inset-6 rounded-3xl opacity-40 blur-2xl pointer-events-none"
              style={{ background: 'radial-gradient(circle at 30% 20%, rgba(59,130,246,0.25), transparent 60%), radial-gradient(circle at 70% 80%, rgba(16,185,129,0.2), transparent 60%)' }} />
            <div className="relative glass-v2-strong rounded-2xl border border-[var(--border-strong)] p-4 sm:p-6 text-left shadow-2xl">
              {/* Mock window chrome */}
              <div className="flex items-center gap-1.5 mb-4">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
                <span className="ml-3 text-[10px] font-mono text-[var(--text-muted)]">dukahub.app/pos</span>
              </div>
              <div className="grid grid-cols-5 gap-3">
                {/* Left: product grid */}
                <div className="col-span-3 grid grid-cols-2 gap-2">
                  {[
                    { name: 'Cooking Oil 1L', price: '320', emoji: '🫙' },
                    { name: 'Unga 2kg', price: '185', emoji: '🌾' },
                    { name: 'Sugar 1kg', price: '150', emoji: '🧂' },
                    { name: 'Bread', price: '65', emoji: '🍞' },
                  ].map((p) => (
                    <div key={p.name} className="rounded-xl bg-[var(--item-bg)] border border-[var(--border-color)] p-2.5 hover:border-[var(--border-hover)] transition-colors cursor-pointer">
                      <div className="w-8 h-8 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center text-base mb-1.5">{p.emoji}</div>
                      <p className="text-[11px] font-medium truncate">{p.name}</p>
                      <p className="text-[11px] text-[var(--accent-primary)] font-semibold">KES {p.price}</p>
                    </div>
                  ))}
                </div>
                {/* Right: cart summary */}
                <div className="col-span-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] p-3 flex flex-col">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-2">Current Sale</p>
                  {[
                    { name: 'Cooking Oil 1L', q: '×2', amount: '640' },
                    { name: 'Unga 2kg', q: '×1', amount: '185' },
                    { name: 'Sugar 1kg', q: '×1', amount: '150' },
                  ].map((i) => (
                    <div key={i.name} className="flex items-center justify-between py-1 text-[11px] border-b border-[var(--border-color)] last:border-0">
                      <span className="truncate pr-1">{i.name} <span className="text-[var(--text-muted)]">{i.q}</span></span>
                      <span className="font-mono shrink-0">{i.amount}</span>
                    </div>
                  ))}
                  <div className="mt-auto pt-2">
                    <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                      <span>Total</span><span className="font-mono">KES 975</span>
                    </div>
                    <div className="mt-1.5 rounded-lg py-1.5 text-center text-[11px] font-bold text-[var(--mark-text)]"
                      style={{ background: 'var(--gradient-brand-mark)', boxShadow: 'var(--btn-primary-shadow)' }}>
                      Charge KES 975
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Social proof strip ── */}
      <section className="border-y border-[var(--border-color)] bg-[var(--bg-primary)]/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            { v: '1,000+', l: 'Shop owners onboard' },
            { v: 'KES 50M+', l: 'Sales tracked monthly' },
            { v: '99.9%', l: 'Receipt accuracy' },
            { v: '45+', l: 'Counties across Kenya' },
          ].map((s) => (
            <div key={s.l}>
              <p className="text-xl sm:text-2xl font-extrabold text-gradient-aurora">{s.v}</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Everything a modern duka needs</h2>
            <p className="mt-3 text-[var(--text-secondary)]">Faster at the counter, sharper on profit insights — everything below runs on your phone or laptop.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <div key={f.title}
                data-reveal={`f${i}`}
                className={`card-v2 p-5 transition-all duration-500 ${
                  revealed.includes(`f${i}`) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                }`}>
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center text-xl shadow-lg mb-4`}>
                  {f.icon}
                </div>
                <h3 className="font-bold text-base mb-1.5">{f.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="py-16 sm:py-24 border-t border-[var(--border-color)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Up and running in minutes</h2>
            <p className="mt-3 text-[var(--text-secondary)]">No training. No POS hardware to buy. Just your phone or laptop.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {STEPS.map((s, i) => (
              <div key={s.n} data-reveal={`s${i}`}
                className={`glass-v2 rounded-2xl p-6 transition-all duration-500 ${
                  revealed.includes(`s${i}`) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                }`}>
                <span className="text-4xl font-extrabold bg-gradient-to-br from-[var(--accent-primary)] to-transparent bg-clip-text text-transparent opacity-80">{s.n}</span>
                <h3 className="font-bold text-lg mt-3">{s.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1.5 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-16 sm:py-24 border-t border-[var(--border-color)] bg-[var(--bg-primary)]/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Trusted by shop owners across Kenya</h2>
            <p className="mt-3 text-[var(--text-secondary)]">Real dukas, real dailies, real shillings.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t, i) => (
              <figure key={t.name} data-reveal={`t${i}`}
                className={`card-v2 p-6 transition-all duration-500 ${
                  revealed.includes(`t${i}`) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                }`}>
                <div className="flex gap-1 mb-3 text-[var(--color-warning)] text-sm">★★★★★</div>
                <blockquote className="text-sm text-[var(--text-secondary)] leading-relaxed">“{t.quote}”</blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-emerald-500 flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{t.shop}</p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing clarity ── */}
      <section id="pricing" className="py-16 sm:py-24 border-t border-[var(--border-color)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Simple, honest pricing</h2>
            <p className="mt-3 text-[var(--text-secondary)]">No trials that expire. No "call for a quote". No selling your data.</p>
          </div>
          <div className="max-w-md mx-auto">
            <div className="card-v2 p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1" style={{ background: 'var(--gradient-aurora)' }} />
              <div className="text-5xl font-extrabold mb-1">KES 0</div>
              <p className="text-sm text-[var(--text-muted)] mb-5">per month · forever · for Kenyan shops</p>
              <ul className="text-sm text-[var(--text-secondary)] space-y-2.5 mb-7 text-left max-w-xs mx-auto">
                <li className="flex items-center gap-2"><span className="text-[var(--color-success)]">✓</span> Unlimited products &amp; transactions</li>
                <li className="flex items-center gap-2"><span className="text-[var(--color-success)]">✓</span> POS, inventory, Daftari &amp; insights</li>
                <li className="flex items-center gap-2"><span className="text-[var(--color-success)]">✓</span> Offline mode &amp; home-screen app</li>
                <li className="flex items-center gap-2"><span className="text-[var(--color-success)]">✓</span> No credit card, ever</li>
              </ul>
              <Link to="/login?mode=signup" className="btn-v2-primary w-full py-3.5">
                Create your free shop
              </Link>
              <p className="text-[11px] text-[var(--text-muted)] mt-3">We make money the honest way — through optional paid upgrades later, never by selling your shop data.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Data safety ── */}
      <section id="data-safety" className="py-16 sm:py-24 border-t border-[var(--border-color)] bg-[var(--bg-primary)]/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Your shop data is safe with us</h2>
            <p className="mt-3 text-[var(--text-secondary)]">
              Built on a simple promise: your business data belongs to you — and only you. Never sold, never shared for ads.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {DATA_SAFETY.map((d, i) => (
              <div key={d.title} data-reveal={`ds${i}`}
                className={`card-v2 p-6 transition-all duration-500 ${
                  revealed.includes(`ds${i}`) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                }`}>
                <div className="text-2xl mb-3">{d.icon}</div>
                <h3 className="font-bold text-sm mb-1.5">{d.title}</h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">{d.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link to="/privacy" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent-primary)] hover:opacity-80 transition-opacity">
              Read our full Privacy Policy →
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-16 sm:py-24 border-t border-[var(--border-color)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Questions shop owners ask</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((f, i) => (
              <div key={f.q} className="card-v2 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left">
                  <span className="font-semibold text-sm sm:text-base">{f.q}</span>
                  <span className={`shrink-0 text-[var(--accent-primary)] transition-transform duration-300 ${openFaq === i ? 'rotate-45' : ''}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  </span>
                </button>
                <div className={`grid transition-all duration-300 ease-out ${openFaq === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="overflow-hidden">
                    <p className="px-5 pb-4 text-sm text-[var(--text-secondary)] leading-relaxed">{f.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section id="contact" className="py-16 sm:py-24 border-t border-[var(--border-color)] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 80% 20%, rgba(16,185,129,0.1), transparent 55%)' }} />
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-10 items-start">
            {/* Left: pitch + direct channels */}
            <div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Talk to a real person</h2>
              <p className="mt-3 text-[var(--text-secondary)] leading-relaxed">
                Questions about DukaHub, need help setting up, or want us to add a feature?
                Message us on WhatsApp and a human will reply — usually within minutes.
              </p>
              <div className="mt-6 space-y-3">
                <a
                  href={`https://wa.me/${SUPPORT_WA_NUMBER}?text=${encodeURIComponent('Hi DukaHub! I have a question about the app.')}`}
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-3 card-v2 p-4 hover:border-emerald-500/40 transition-colors group">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 flex items-center justify-center text-xl shadow-lg shrink-0">
                    💬
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">WhatsApp support</p>
                    <p className="text-xs text-[var(--text-muted)] font-mono">{SUPPORT_WA_DISPLAY} · Mon–Sat, 8am–8pm</p>
                  </div>
                  <span className="ml-auto text-[var(--text-muted)] group-hover:text-[var(--color-success)] transition-colors">→</span>
                </a>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="flex items-center gap-3 card-v2 p-4 hover:border-blue-500/40 transition-colors group">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center text-xl shadow-lg shrink-0">
                    ✉️
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">Email</p>
                    <p className="text-xs text-[var(--text-muted)] font-mono truncate">{SUPPORT_EMAIL}</p>
                  </div>
                  <span className="ml-auto text-[var(--text-muted)] group-hover:text-[var(--text-accent)] transition-colors">→</span>
                </a>
              </div>
              <div className="mt-6 badge-v2-info">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Average reply time: under 15 minutes
              </div>
            </div>

            {/* Right: form → WhatsApp */}
            <div className="card-v2 p-6 sm:p-7">
              <h3 className="font-bold text-lg mb-1">Send us a message</h3>
              <p className="text-xs text-[var(--text-muted)] mb-5">
                Fill this in and we'll open WhatsApp with your message ready to send — no account needed.
              </p>
              {contactSent ? (
                <div className="alert-v2-success animate-spring-in">
                  <span>✅</span>
                  <span>WhatsApp should have opened with your message. Hit send there and we'll get back to you shortly!</span>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="form-grid">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Your name *</label>
                      <input
                        type="text"
                        value={contact.name}
                        onChange={(e) => setContact({ ...contact, name: e.target.value })}
                        className="input-v2"
                        placeholder="e.g. James Kamau"
                        autoComplete="name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Phone (optional)</label>
                      <input
                        type="tel"
                        value={contact.phone}
                        onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                        className="input-v2"
                        placeholder="07XX XXX XXX"
                        autoComplete="tel"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Message *</label>
                    <textarea
                      value={contact.message}
                      onChange={(e) => setContact({ ...contact, message: e.target.value })}
                      className="input-v2 min-h-[120px] resize-y"
                      placeholder="How can we help? e.g. I run a shop in Kisumu and want to try DukaHub…"
                      rows={5}
                    />
                  </div>
                  {contactError && (
                    <div className="alert-v2-error">
                      <span>⚠️</span>
                      <span>{contactError}</span>
                    </div>
                  )}
                  <button type="submit" className="btn-v2-success w-full py-3">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Send via WhatsApp
                  </button>
                  <p className="text-[11px] text-[var(--text-muted)] text-center">
                    Opens WhatsApp to <span className="font-mono">{SUPPORT_WA_DISPLAY}</span> with your message prefilled.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-16 sm:py-24 border-t border-[var(--border-color)] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 50% 120%, rgba(59,130,246,0.15), transparent 60%)' }} />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative">
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Your duka, running like a <span className="text-gradient-aurora">business</span>
          </h2>
          <p className="mt-4 text-lg text-[var(--text-secondary)]">Join over 1,000 Kenyan shop owners who stopped guessing and started knowing.</p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/login?mode=signup" className="btn-v2-primary px-8 py-3.5 text-base w-full sm:w-auto">
              Start Free — No Card Required
            </Link>
            <Link to="/login" className="btn-v2-secondary px-8 py-3.5 text-base w-full sm:w-auto">
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[var(--border-color)] bg-[var(--bg-primary)]/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid sm:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--gradient-brand)' }}>
                  <span className="text-sm font-extrabold text-white">D</span>
                </div>
                <span className="font-bold">DukaHub</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed max-w-xs">
                The simple POS and retail management system built for Kenyan shops. Free forever.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Product</p>
              <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                <li><a href="#features" className="hover:text-[var(--text-primary)] transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-[var(--text-primary)] transition-colors">Pricing</a></li>
                <li><a href="#faq" className="hover:text-[var(--text-primary)] transition-colors">FAQ</a></li>
                <li><Link to="/login?mode=signup" className="hover:text-[var(--text-primary)] transition-colors">Create account</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Support</p>
              <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                <li>
                  <a href={`https://wa.me/${SUPPORT_WA_NUMBER}?text=${encodeURIComponent('Hi DukaHub! I have a question.')}`} target="_blank" rel="noreferrer" className="hover:text-[var(--text-primary)] transition-colors inline-flex items-center gap-1.5">
                    💬 WhatsApp support · <span className="font-mono">{SUPPORT_WA_DISPLAY}</span>
                  </a>
                </li>
                <li>
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-[var(--text-primary)] transition-colors inline-flex items-center gap-1.5">
                    ✉️ {SUPPORT_EMAIL}
                  </a>
                </li>
                <li>
                  <a href="#contact" className="hover:text-[var(--text-primary)] transition-colors">Contact form</a>
                </li>
                <li className="text-xs text-[var(--text-muted)]">Nairobi, Kenya · Mon–Sat, 8am–8pm</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-[var(--border-color)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
            <p>© {new Date().getFullYear()} DukaHub. Built for Kenyan retail.</p>
            <div className="flex items-center gap-4">
              <Link to="/terms" className="hover:text-[var(--text-primary)] transition-colors">Terms of Service</Link>
              <Link to="/privacy" className="hover:text-[var(--text-primary)] transition-colors">Privacy Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
