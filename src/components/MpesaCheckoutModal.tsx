import { useState, useRef, useEffect } from 'react';
import { sendStkPush } from '../lib/mpesa';

interface MpesaCheckoutModalProps {
  total: number;
  items: any[];
  /** True when the device has no connection — M-Pesa can't send an STK push. */
  offline?: boolean;
  onComplete: (phone: string) => void;
  /** Offered while offline: record the sale as cash instead. */
  onPayCash?: () => void;
  onClose: () => void;
}

type Step = 'phone' | 'confirm' | 'sending' | 'sent' | 'failed';

/**
 * M-Pesa checkout modal:
 * 1. Enter phone number (07XX XXX XXX)
 * 2. Review amount → sends a real Daraja STK push via the edge function
 *    (graceful demo fallback until live credentials are configured)
 * 3. Waiting / sent / failed states
 */
export default function MpesaCheckoutModal({ total, items, offline, onComplete, onPayCash, onClose }: MpesaCheckoutModalProps) {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [sendError, setSendError] = useState('');
  const [checkoutRequestId, setCheckoutRequestId] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const phoneRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus phone input on mount
  useEffect(() => {
    setTimeout(() => phoneRef.current?.focus(), 100);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step === 'phone') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [step, onClose]);

  // Swipe down to dismiss
  useEffect(() => {
    const el = modalRef.current;
    if (!el) return;
    let startY = 0;
    const onTouchStart = (e: TouchEvent) => { startY = e.touches[0].clientY; };
    const onTouchEnd = (e: TouchEvent) => {
      const dy = e.changedTouches[0].clientY - startY;
      if (dy > 100 && step === 'phone') onClose();
    };
    el.addEventListener('touchstart', onTouchStart);
    el.addEventListener('touchend', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [step, onClose]);

  // Format Kenyan phone: 07XX XXX XXX
  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, '');
    if (digits.startsWith('254')) {
      const rest = digits.slice(3);
      if (rest.length <= 3) return `+254 ${rest}`;
      if (rest.length <= 6) return `+254 ${rest.slice(0, 3)} ${rest.slice(3)}`;
      return `+254 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6, 9)}`;
    }
    if (digits.startsWith('0')) {
      const rest = digits.slice(1);
      if (rest.length <= 3) return `0${rest}`;
      if (rest.length <= 6) return `0${rest.slice(0, 3)} ${rest.slice(3)}`;
      return `0${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6, 9)}`;
    }
    return val;
  };

  const validatePhone = (raw: string): string | null => {
    const digits = raw.replace(/\D/g, '');
    // Accept 07XX XXX XXX or 2547XX XXX XXX
    if (digits.startsWith('254') && digits.length === 12) return null;
    if (digits.startsWith('0') && digits.length === 10) return null;
    if (digits.length === 9 && !digits.startsWith('0') && !digits.startsWith('254')) {
      // 7XX XXX XXX — assume 07 prefix
      return null;
    }
    return 'Enter a valid Kenyan phone number (e.g. 0712 345 678)';
  };

  const normalizedPhone = () => {
    const digits = phone.replace(/\D/g, '');
    return digits.startsWith('0') ? '254' + digits.slice(1) : digits;
  };

  const handlePhoneSubmit = () => {
    const err = validatePhone(phone);
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setStep('confirm');
  };

  const handleConfirm = async () => {
    setStep('sending');
    setSendError('');
    const reference = `DH${Date.now().toString(36).toUpperCase().slice(-8)}`;
    const res = await sendStkPush({
      phone: normalizedPhone(),
      amount: total,
      reference,
      description: 'DukaHub sale',
    });
    if (res.ok) {
      setCheckoutRequestId(res.checkoutRequestId || '');
      setDemoMode(res.simulated);
      setStep('sent');
    } else {
      setSendError(res.message || 'Payment request failed');
      setStep('failed');
    }
  };

  const handleDone = () => {
    onComplete(normalizedPhone());
  };

  const formatKES = (val: number) => `KES ${val.toLocaleString()}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in-v2"
      onClick={(e) => { if (e.target === e.currentTarget && step === 'phone') onClose(); }}
    >
      <div
        ref={modalRef}
        className={`w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl overflow-hidden transition-all duration-300 ${
          step === 'phone' ? 'animate-slide-up-v2' : 'animate-scale-in-v2'
        }`}
        style={{ background: 'var(--glass-strong-bg)', backdropFilter: 'blur(24px)', border: '1px solid var(--border-strong)' }}
      >
        {/* Header drag handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-[var(--text-muted)]/40" />
        </div>

        {/* Brand header */}
        <div className="px-5 pt-3 pb-2 text-center border-b border-[var(--border-color)]">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-2 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">M-Pesa Payment</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Secure mobile money checkout</p>
        </div>

        <div className="p-5 space-y-4">
          {step === 'phone' && (
            <>
              {/* Offline notice */}
              {offline && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xs text-[var(--color-warning)] flex items-center gap-1.5 font-medium">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728m-2.829-2.829a5 5 0 000-7.07m-4.243 4.243a1 1 0 010-1.414" />
                    </svg>
                    You're offline — M-Pesa needs an internet connection
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">
                    Your cart is safe on this device. Record this sale as cash now and it will back up when you're back online.
                  </p>
                </div>
              )}

              {/* Phone Input */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                  M-Pesa Phone Number
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--text-muted)] pointer-events-none">
                    📱
                  </div>
                  <input
                    ref={phoneRef}
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => {
                      setError('');
                      setPhone(formatPhone(e.target.value));
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handlePhoneSubmit(); }}
                    className="input-v2-lg pl-10 text-center text-lg tracking-wider font-mono"
                    placeholder="07XX XXX XXX"
                    maxLength={18}
                  />
                </div>
                {error && (
                  <p className="text-xs text-[var(--color-danger)] mt-1.5 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    {error}
                  </p>
                )}
              </div>

              {/* Amount Preview */}
              <div className="flex items-center justify-between py-2 px-3 rounded-xl" style={{ background: 'var(--accent-dim)', border: '1px solid var(--nav-active-border)' }}>
                <span className="text-sm text-[var(--text-muted)]">Amount to pay</span>
                <span className="text-base font-extrabold font-mono" style={{ color: 'var(--text-accent)' }}>{formatKES(total)}</span>
              </div>

              {/* Items summary */}
              <div className="space-y-1 max-h-20 overflow-y-auto scrollbar-thin">
                {items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs text-[var(--text-secondary)]">
                    <span className="truncate flex-1">{item.name} ×{item.quantity}</span>
                    <span className="font-mono">KES {item.subtotal.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* Action */}
              <button
                onClick={offline && onPayCash ? onPayCash : handlePhoneSubmit}
                className="btn-v2-success w-full py-3 text-base"
              >
                {offline && onPayCash ? 'Record as Cash Instead' : `Continue — ${formatKES(total)}`}
              </button>
              {offline && (
                <button onClick={handlePhoneSubmit} className="w-full text-center text-xs text-[var(--text-muted)] underline underline-offset-2">
                  Try M-Pesa anyway
                </button>
              )}

              {/* Security note */}
              <p className="text-[10px] text-center text-[var(--text-muted)]">
                🔒 You'll receive an STK push prompt on your phone
              </p>
            </>
          )}

          {step === 'confirm' && (
            <>
              <div className="text-center py-2">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Confirm Payment</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Sending payment request to
                </p>
                <p className="text-sm font-mono font-bold text-[var(--text-primary)] mt-0.5">
                  {phone}
                </p>
              </div>

              <div className="flex items-center justify-between py-3 px-3 rounded-xl" style={{ background: 'var(--bg-surface2)' }}>
                <span className="text-sm text-[var(--text-secondary)]">Total</span>
                <span className="text-xl font-extrabold font-mono" style={{ color: 'var(--brand)' }}>{formatKES(total)}</span>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setStep('phone')} className="btn-v2-secondary flex-1">Back</button>
                <button onClick={handleConfirm} className="btn-v2-success flex-[2] py-3">Confirm & Send</button>
              </div>
            </>
          )}

          {step === 'sending' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-[var(--accent-dim)] flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">Sending STK Push...</h3>
              <p className="text-xs text-[var(--text-muted)] mt-2">
                Please wait — a payment prompt is being sent to your phone
              </p>
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
                <span>📱 {phone}</span>
              </div>
            </div>
          )}

          {step === 'sent' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3 animate-scale-in-v2">
                <svg className="w-8 h-8 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">STK Push Sent!</h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Check your phone and enter your M-Pesa PIN to complete payment
              </p>
              <div className="mt-4 p-3 rounded-xl" style={{ background: 'var(--accent-dim)', border: '1px solid var(--nav-active-border)' }}>
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-muted)]">Phone</span>
                  <span className="text-[var(--text-primary)] font-medium font-mono">{phone}</span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-[var(--text-muted)]">Amount</span>
                  <span className="text-[var(--brand)] font-bold">{formatKES(total)}</span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-[var(--text-muted)]">Reference</span>
                  <span className="text-[var(--text-primary)] font-mono truncate">{checkoutRequestId || `DH-${Date.now().toString(36).toUpperCase().slice(-6)}`}</span>
                </div>
              </div>

              {demoMode && (
                <div className="mt-3 p-2.5 rounded-lg text-[11px] text-left bg-amber-500/10 border border-amber-500/20 text-[var(--color-warning)]">
                  <span className="font-semibold">Demo mode</span> — no live M-Pesa service connected yet, so no real STK push was sent.
                  This sale will still be recorded as M-Pesa. See <span className="font-mono">docs/mpesa-daraja.md</span> to enable live payments.
                </div>
              )}

              <div className="flex gap-2 mt-5">
                <button onClick={onClose} className="btn-v2-secondary flex-1">Close</button>
                <button onClick={handleDone} className="btn-v2-success flex-1">
                  Complete Sale
                </button>
              </div>
            </div>
          )}

          {step === 'failed' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-[var(--color-danger)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">Payment Not Sent</h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">{sendError}</p>
              <div className="flex gap-2 mt-5">
                <button onClick={() => setStep('phone')} className="btn-v2-secondary flex-1">Back</button>
                <button onClick={() => setStep('confirm')} className="btn-v2-primary flex-1">Retry</button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-4 pt-0">
          <p className="text-[9px] text-center text-[var(--text-muted)]/60">
            Powered by Safaricom Daraja API · Secured by TLS
          </p>
        </div>
      </div>
    </div>
  );
}
