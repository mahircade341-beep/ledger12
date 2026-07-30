import { useState, useEffect, useRef, type ReactNode } from 'react';

interface StickyAddCartProps {
  visible: boolean;
  itemCount: number;
  total: number;
  currency?: string;
  children?: ReactNode;
  onCheckout?: () => void;
}

export default function StickyAddCart({
  visible,
  itemCount,
  total,
  currency = 'KES',
  children,
  onCheckout,
}: StickyAddCartProps) {
  const [scrollPast, setScrollPast] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    // Passive scroll listener — no layout thrashing
    const handler = () => {
      const y = window.scrollY;
      if (y > 600 && !lastY.current) {
        setScrollPast(true);
      } else if (y <= 600 && lastY.current) {
        setScrollPast(false);
      }
      lastY.current = y > 600 ? 1 : 0;
    };

    // Initial check
    handler();

    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const show = visible && scrollPast;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-out lg:hidden ${
        show ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="bg-[var(--glass-strong-bg)] backdrop-blur-2xl border-t border-[var(--border-color)] shadow-2xl">
        <div className="p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--accent-primary)] text-white text-xs font-bold">
              {itemCount}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                Cart · {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </p>
              <p className="text-xs text-[var(--accent-primary)] font-medium">
                {currency} {total.toLocaleString()}
              </p>
            </div>
          </div>

          {children ? (
            children
          ) : (
            <button
              onClick={onCheckout}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg transition-all duration-200 active:scale-[0.97]"
              style={{
                background: 'var(--btn-primary-bg)',
                color: 'var(--btn-primary-text)',
              }}
            >
              Checkout
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
