import { Link } from 'react-router-dom';
import AnimatedBackground from '../components/AnimatedBackground';

// ── Shared legal content ──
const LAST_UPDATED = 'August 3, 2026';

interface LegalSection {
  title: string;
  body: (string | string[])[];
}

const TERMS_SECTIONS: LegalSection[] = [
  {
    title: '1. Agreement to These Terms',
    body: [
      'Welcome to DukaHub, the simple point-of-sale (POS) and retail management system built for Kenyan shops. By creating an account or using the DukaHub app, website, or services ("DukaHub", "we", "our"), you agree to these Terms of Service ("Terms"). Please read them carefully — if you do not agree, please do not use the service.',
    ],
  },
  {
    title: '2. Who We Are',
    body: [
      'DukaHub is a retail management tool that helps shop owners record sales, track inventory, manage M-Pesa and cash payments, issue receipts, and follow up on credit (Daftari) debts.',
      'You can reach us at:',
      [
        '📧 Email: fahmanmanka25@gmail.com',
        '💬 WhatsApp: 0143 897 900',
        '📍 Nairobi, Kenya · Mon–Sat, 8am–8pm',
      ],
    ],
  },
  {
    title: '3. Your Account',
    body: [
      'To use DukaHub you must create an account with accurate, up-to-date information. You are responsible for keeping your login credentials secure and for all activity that happens under your account. Please contact us immediately if you believe your account has been compromised.',
      'One account is intended for one shop or business. If you run multiple shops, you may create separate accounts for each.',
    ],
  },
  {
    title: '4. Your Data Is Your Own',
    body: [
      'All business data you enter into DukaHub — products, prices, stock levels, sales, transactions, and customer debt records — belongs to you. We do not sell your data, and we only use it to provide and improve the service you asked for.',
      'You can export or delete your data at any time by contacting us, and deleting your account removes your data in accordance with our Privacy Policy.',
      'We process personal data in line with the Kenya Data Protection Act, 2019 (No. 24 of 2019). See our Privacy Policy for the full detail on your rights.',
    ],
  },
  {
    title: '5. Acceptable Use',
    body: [
      'You agree not to misuse DukaHub. Specifically, you must not:',
      [
        'Use the service for any unlawful purpose or to defraud anyone',
        'Attempt to access, probe, or breach the security of the service or other users',
        'Interfere with, disrupt, or overload the service or its infrastructure',
        'Sell, resell, or sublicense access to the service without our written permission',
        'Enter false or misleading information about your shop or transactions',
      ],
    ],
  },
  {
    title: '6. Free Service & Fees',
    body: [
      'DukaHub is currently free forever for Kenyan shops — no card required, no hidden trial period. We may add optional paid features in the future, and we will clearly announce any paid plans before they launch. Existing free features will not be taken away without notice.',
    ],
  },
  {
    title: '7. Availability & Changes',
    body: [
      'We work hard to keep DukaHub fast and reliable, but the service may occasionally be unavailable for maintenance, upgrades, or reasons beyond our control. We may add, change, or remove features over time, and we will give reasonable notice for material changes that affect how you use the service.',
    ],
  },
  {
    title: '8. Intellectual Property',
    body: [
      'DukaHub — including the app, design, logo, and branding — is our property. We grant you a limited, non-exclusive, non-transferable license to use the service for your business. You may not copy, modify, or reverse-engineer the service or use our branding without permission.',
    ],
  },
  {
    title: '9. Disclaimer of Warranties',
    body: [
      'DukaHub is provided "as is" and "as available", without warranties of any kind, express or implied. While we aim for accuracy, we are not a licensed accounting firm, and you are responsible for verifying your own financial records and for compliance with tax and legal obligations in Kenya.',
    ],
  },
  {
    title: '10. Limitation of Liability',
    body: [
      'To the maximum extent permitted by law, DukaHub shall not be liable for indirect, incidental, special, or consequential damages — including lost profits, lost data, or business interruption — arising from your use of the service. Our total liability to you shall not exceed the amount you paid us in the twelve (12) months before the claim (which, while the service is free, is zero).',
    ],
  },
  {
    title: '11. Termination',
    body: [
      'You may stop using DukaHub at any time and delete your account by contacting us. We may suspend or terminate accounts that violate these Terms or that pose a risk to the service or other users. On termination, your rights to use the service end, and your data will be handled per our Privacy Policy.',
    ],
  },
  {
    title: '12. Changes to These Terms',
    body: [
      'We may update these Terms from time to time. We will post the updated Terms here with a new "last updated" date. If a change is significant, we will notify you by email or in-app. Continued use of DukaHub after changes take effect means you accept the updated Terms.',
    ],
  },
  {
    title: '13. Governing Law',
    body: [
      'These Terms are governed by the laws of the Republic of Kenya, including the Kenya Data Protection Act, 2019 (No. 24 of 2019) and its subsidiary regulations. Any disputes arising from these Terms or your use of DukaHub will be resolved in the courts of Kenya.',
    ],
  },
  {
    title: '14. Contact',
    body: [
      'Questions about these Terms? We are happy to help:',
      [
        '📧 Email: fahmanmanka25@gmail.com',
        '💬 WhatsApp: 0143 897 900',
      ],
    ],
  },
];

const PRIVACY_SECTIONS: LegalSection[] = [
  {
    title: '1. Overview',
    body: [
      'DukaHub respects your privacy and the confidentiality of your shop\u2019s data. This Privacy Policy explains what information we collect, why we collect it, how it is stored and protected, and the choices you have over it — in line with the Kenya Data Protection Act, 2019 (No. 24 of 2019). By using DukaHub, you agree to the practices described here.',
    ],
  },
  {
    title: '2. Data We Collect',
    body: [
      'We collect the following categories of information:',
      [
        'Account information — your name, email address, and phone number when you sign up',
        'Business data — the products, prices, stock levels, sales, transactions, receipts, and debt records you enter, which we store on your behalf',
        'Shop profile — your shop name and preferences',
        'Technical information — device type, browser, and basic usage data so we can keep the app fast and fix issues',
        'Contact messages — anything you send us through the contact form, WhatsApp, or email',
      ],
      'Under the Act, "personal data" means any information relating to an identified or identifiable individual. The business records you enter (like product prices or sales) are treated with the same confidentiality as your personal data, and every protection in this policy applies to both.',
    ],
  },
  {
    title: '3. How We Use Your Data',
    body: [
      'We use your data only to:',
      [
        'Provide and operate the service — syncing your data across your devices',
        'Send service and security updates',
        'Improve features and fix bugs',
        'Respond to your support requests',
        'Comply with legal obligations',
      ],
      'We do not sell your personal or business data, and we do not use it to show you third-party ads.',
      'Our legal bases for processing, as set out in Section 25 of the Kenya Data Protection Act, 2019, are: your consent; the performance of the service contract you enter into when you create an account; compliance with legal obligations; and our legitimate interests in keeping the service secure and functional. We do not process "sensitive personal data" (as defined by the Act) and will never do so without your explicit consent.',
    ],
  },
  {
    title: '4. Where Your Data Is Stored',
    body: [
      'Your data is stored securely in cloud infrastructure (currently Supabase, hosted in secure data centers) and is encrypted in transit. You can export or delete your data at any time by contacting us.',
    ],
  },
  {
    title: '5. Data Security',
    body: [
      'As required by Section 33 of the Kenya Data Protection Act, 2019, we implement appropriate technical and organisational measures to secure personal data — including encryption in transit, secure authentication, and restricted access to stored data. No method of transmission or storage is 100% secure, but we work hard to keep your data safe and will notify you — and the Office of the Data Protection Commissioner (ODPC) where required — promptly if we become aware of a breach affecting your data.',
    ],
  },
  {
    title: '6. Data Sharing',
    body: [
      'We share your data only with trusted service providers who help us run the app (such as our cloud database provider), under confidentiality obligations, and only to the extent needed to provide the service. We may also disclose data where required by law or to protect our legal rights.',
    ],
  },
  {
    title: '7. Data Retention & Deletion',
    body: [
      'We keep your data for as long as your account is active so the app works as expected. When you delete your account, we remove your data from active systems within a reasonable period (typically 30 days). Backups may retain data briefly beyond that, but it is not used for any purpose.',
    ],
  },
  {
    title: '8. Your Rights (Kenya Data Protection Act, 2019)',
    body: [
      'Section 26 of the Kenya Data Protection Act, 2019 gives you the right to:',
      [
        'Be informed about how your data is used',
        'Access the data we hold about you',
        'Have inaccurate or incomplete data corrected',
        'Have your data deleted (erasure) where applicable',
        'Object to the processing of your data',
        'Receive your data in a structured, portable format and transfer it to another service',
        'Not be subject to automated decision-making that significantly affects you',
      ],
      'To exercise any of these rights, contact us at fahmanmanka25@gmail.com and we will respond within the timelines set by the Act. If you are not satisfied with our response, you may lodge a complaint with the Office of the Data Protection Commissioner (ODPC) under Section 72 of the Act.',
    ],
  },
  {
    title: '9. Children\u2019s Privacy',
    body: [
      'DukaHub is intended for shop owners and business operators. We do not knowingly collect personal information from children under 16. If you believe a child has provided us data, please contact us and we will delete it.',
    ],
  },
  {
    title: '10. Cookies & Local Storage',
    body: [
      'DukaHub uses local storage in your browser to remember preferences such as your theme and to keep the app fast.',
    ],
  },
  {
    title: '11. Analytics',
    body: [
      'DukaHub uses privacy-first, first-party analytics to understand how the app is used and improve it. We do not use Google Analytics, Facebook Pixel, or any third-party advertising trackers.',
      'Our analytics system:',
      [
        'Tracks page views, feature usage, and ecommerce events (add to cart, purchase) in an anonymized way',
        'Uses a random session identifier stored in your browser — no names, emails, IP addresses, or device fingerprints are recorded',
        'Stores data in our own Supabase database (hosted in secure data centers), not shared with any third party',
        'Keeps event data for 90 days, after which it is automatically removed',
        'Is never used for advertising, retargeting, or behavioral profiling',
      ],
      'This approach is designed to comply with the Kenya Data Protection Act, 2019 — including the principles of data minimization, purpose limitation, and transparency. If you disable JavaScript in your browser, analytics will not run.',
    ],
  },
  {
    title: '11. Changes to This Policy',
    body: [
      'We may update this Privacy Policy from time to time. The latest version will always be available at this page with an updated "last updated" date. Significant changes will be announced by email or in-app.',
    ],
  },
  {
    title: '12. Contact',
    body: [
      'For any privacy questions or requests:',
      [
        '📧 Email: fahmanmanka25@gmail.com',
        '💬 WhatsApp: 0143 897 900',
        '📍 Nairobi, Kenya',
      ],
      'DukaHub acts as a data controller under the Kenya Data Protection Act, 2019. You may also lodge a complaint directly with the Office of the Data Protection Commissioner (ODPC) at any time.',
    ],
  },
];

// ── Shared layout ──
function LegalShell({
  badge,
  title,
  intro,
  sections,
}: {
  badge: string;
  title: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <div className="relative min-h-screen bg-[var(--bg-primary)]">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <AnimatedBackground />
      <div id="main-content" tabIndex={-1} className="relative z-10 flex flex-col min-h-screen">
        {/* Sticky nav */}
        <header className="sticky top-0 z-40 glass-v2-nav border-b border-[var(--border-color)]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shadow-lg"
                style={{ background: 'var(--gradient-brand)' }}
              >
                <span className="text-sm font-extrabold text-white">D</span>
              </div>
              <span className="font-bold text-[var(--text-primary)]">DukaHub</span>
            </Link>
            <Link
              to="/"
              className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors inline-flex items-center gap-1.5"
            >
              ← Back to home
            </Link>
          </div>
        </header>

        {/* Hero */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-14 pb-8 text-center">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-4"
            style={{ background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)', color: 'var(--accent-primary)' }}>
            {badge}
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3 text-[var(--text-primary)]">
            {title}
          </h1>
          <p className="text-[var(--text-muted)] text-sm">{intro}</p>
          <p className="text-xs text-[var(--text-muted)] mt-2 font-mono">Last updated: {LAST_UPDATED}</p>
        </section>

        {/* Content */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 flex-1 w-full pb-16">
          <div className="card-v2 p-6 sm:p-10">
            <div className="space-y-8">
              {sections.map((section) => (
                <div key={section.title}>
                  <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] mb-3">
                    {section.title}
                  </h2>
                  <div className="space-y-3">
                    {section.body.map((item, i) =>
                      Array.isArray(item) ? (
                        <ul key={i} className="space-y-1.5 pl-1">
                          {item.map((li, j) => (
                            <li key={j} className="text-sm text-[var(--text-secondary)] flex gap-2">
                              <span className="text-[var(--accent-primary)] shrink-0">•</span>
                              <span>{li}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p key={i} className="text-sm leading-relaxed text-[var(--text-secondary)]">
                          {item}
                        </p>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-[var(--border-color)] bg-[var(--bg-primary)]/60">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
            <p>© {new Date().getFullYear()} DukaHub. Built for Kenyan retail.</p>
            <div className="flex items-center gap-4">
              <Link to="/terms" className="hover:text-[var(--text-primary)] transition-colors">Terms of Service</Link>
              <Link to="/privacy" className="hover:text-[var(--text-primary)] transition-colors">Privacy Policy</Link>
              <Link to="/" className="hover:text-[var(--text-primary)] transition-colors">Home</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

// ── Pages ──
export function TermsPage() {
  return (
    <LegalShell
      badge="Legal"
      title="Terms of Service"
      intro="The rules for using DukaHub, the simple POS and retail management system for Kenyan shops."
      sections={TERMS_SECTIONS}
    />
  );
}

export function PrivacyPage() {
  return (
    <LegalShell
      badge="Legal"
      title="Privacy Policy"
      intro="How DukaHub collects, uses, and protects your shop's data."
      sections={PRIVACY_SECTIONS}
    />
  );
}
