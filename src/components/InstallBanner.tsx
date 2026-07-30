import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'dl-install-dismissed';
const DISMISS_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * InstallBanner — PWA install prompt.
 * 
 * Captures the `beforeinstallprompt` event and shows a V2-styled banner.
 * Dismissing it hides the banner for 7 days (localStorage).
 * Automatically hidden if already in standalone/PWA mode or if the event
 * never fires (browser doesn't support PWA installation).
 */
export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Already installed as PWA — hide forever
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // User dismissed recently — respect the delay
    const dismissedAt = localStorage.getItem(DISMISSED_KEY);
    if (dismissedAt && Date.now() - parseInt(dismissedAt) < DISMISS_TTL) return;

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault(); // Prevent the mini-infobar from showing
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Also track if the app was installed later
    window.addEventListener('appinstalled', () => {
      setShowBanner(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
    setInstalling(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:max-w-sm animate-slide-up-v2">
      <div className="glass-v2-strong rounded-2xl overflow-hidden shadow-xl border border-[var(--border-strong)]">
        {/* Gradient accent top bar */}
        <div className="h-1 bg-gradient-to-r from-[var(--brand)] to-emerald-500" />

        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* App icon */}
            <div className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center font-extrabold text-lg shadow-glow"
              style={{ background: 'var(--gradient-brand)', color: 'var(--btn-primary-text)', boxShadow: 'var(--btn-primary-shadow)' }}>
              D
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Install DukaHub</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
                    Install on your home screen for faster access, offline support, and a full-screen experience.
                  </p>
                </div>
                <button
                  onClick={handleDismiss}
                  className="btn-v2-ghost p-1 shrink-0 -mr-1 -mt-1"
                  aria-label="Dismiss"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleInstall}
                  disabled={installing}
                  className="btn-v2-primary btn-v2-sm flex-1"
                >
                  {installing ? (
                    <span className="flex items-center gap-1.5">
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Installing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Install App
                    </span>
                  )}
                </button>
                <button onClick={handleDismiss} className="btn-v2-secondary btn-v2-sm text-xs">
                  Not now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
