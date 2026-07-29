import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const PREMIUM_PRICE = 1000;
const PREMIUM_DURATION_DAYS = 40;
const PREMIUM_DURATION_TEXT = '40 days';

export default function Premium() {
  const { isPremium, premiumExpiresAt, refreshProfile } = useAuth();
  const [phone, setPhone] = useState('254');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'success' | 'failed'>('idle');
  const [message, setMessage] = useState('');

  const formatExpiry = (dateStr: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const daysRemaining = () => {
    if (!premiumExpiresAt) return 0;
    const diff = new Date(premiumExpiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const handleMpesaPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      setMessage('Enter a valid M-Pesa phone number (e.g. 254712345678)');
      return;
    }
    setLoading(true);
    setStatus('sending');
    setMessage('');

    try {
      // Call Supabase Edge Function to initiate STK Push
      const res = await fetch(`${SUPABASE_URL}/functions/v1/mpesa-stk-push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          amount: PREMIUM_PRICE,
          description: `DukaHub Premium - ${PREMIUM_DURATION_TEXT}`,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Payment request failed');
      }

      setStatus('sent');
      setMessage(
        'STK Push sent to your phone. Check M-Pesa and enter your PIN to complete payment. The page will update automatically once confirmed.'
      );

      // Poll for confirmation every 5 seconds for up to 2 minutes
      const checkoutRequestId = data.checkoutRequestId;
      if (checkoutRequestId) {
        let attempts = 0;
        const poll = setInterval(async () => {
          attempts++;
          try {
            const statusRes = await fetch(
              `${SUPABASE_URL}/functions/v1/mpesa-status?checkoutRequestId=${checkoutRequestId}`
            );
            const statusData = await statusRes.json();
            if (statusData.success) {
              clearInterval(poll);
              setStatus('success');
              setMessage('Payment confirmed! Premium is now active. Thank you!');
              await refreshProfile();
            } else if (attempts > 24) {
              // 2 minutes timeout
              clearInterval(poll);
              setStatus('failed');
              setMessage('Payment not received yet. If you sent M-Pesa, it will activate shortly. Contact support if needed.');
            }
          } catch {
            if (attempts > 24) {
              clearInterval(poll);
              setStatus('sent');
            }
          }
        }, 5000);
      }
    } catch (err: any) {
      setStatus('failed');
      setMessage(err.message || 'Something went wrong. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">Premium</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {isPremium
              ? 'You have premium access'
              : 'Unlock premium features for your shop'}
          </p>
        </div>
        {isPremium && (
          <span className="badge-emerald flex items-center gap-1.5 px-3 py-1">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.068 2.485c.714.436 1.599-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
            </svg>
            Premium Active
          </span>
        )}
      </div>

      {/* Premium Status Banner */}
      {isPremium && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.068 2.485c.714.436 1.599-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-400">Premium Active</p>
                <p className="text-xs text-[var(--text-muted)]">
                  Expires {formatExpiry(premiumExpiresAt)} · {daysRemaining()} days remaining
                </p>
              </div>
            </div>
            <button onClick={() => refreshProfile()} className="btn-secondary btn-sm text-xs">
              Refresh Status
            </button>
          </div>
        </div>
      )}

      {/* Pricing Card */}
      <div className="max-w-lg mx-auto w-full">
        <div className={`rounded-2xl border-2 p-6 sm:p-8 text-center transition-all ${
          isPremium
            ? 'border-emerald-500/30 bg-emerald-500/5'
            : 'border-[var(--border-hover)] bg-[var(--bg-surface)] hover:shadow-xl'
        }`}>
          {/* Crown Icon */}
          <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-2xl mb-4 ${
            isPremium
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'bg-amber-500/15 text-amber-400'
          }`}>
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            {isPremium ? 'Premium Active' : 'Go Premium'}
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            {isPremium
              ? 'Thank you for supporting DukaHub!'
              : 'Unlock advanced features for your business'}
          </p>

          {/* Price */}
          <div className="mt-6 mb-6">
            <span className="text-4xl font-bold text-[var(--text-primary)]">KES {PREMIUM_PRICE.toLocaleString()}</span>
            <span className="text-[var(--text-muted)] text-sm ml-2">/ {PREMIUM_DURATION_TEXT}</span>
          </div>

          {/* Features */}
          <div className="space-y-2.5 text-left mb-6">
            {[
              'Unlimited transactions',
              'Advanced analytics & insights',
              'CSV export for all data',
              'Priority support via WhatsApp',
              'Barcode scanning',
              'All future premium features',
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-2.5 text-sm">
                <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-[var(--text-primary)]">{feat}</span>
              </div>
            ))}
          </div>

          {/* M-Pesa Payment Form */}
          {!isPremium && (
            <form onSubmit={handleMpesaPayment} className="space-y-3 border-t border-[var(--border-white)] pt-5">
              <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
                Pay with M-Pesa
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    className="input-field w-full text-center text-lg font-mono tracking-wider"
                    placeholder="254712345678"
                    disabled={loading}
                  />
                </div>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] text-center -mt-2">
                Enter your M-Pesa phone number (e.g. 254712345678)
              </p>

              <button
                type="submit"
                disabled={loading || phone.length < 10}
                className="btn-primary w-full py-3 text-base font-semibold"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending STK Push...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.323 5.677C21.553 7.297 22 9.453 22 12c0 2.547-.447 4.703-1.677 6.323-.531.698-1.323 1.323-2.323 1.677v-2.5c.5-.323.938-.76 1.208-1.323C19.7 15.168 20 13.767 20 12c0-1.767-.3-3.167-.792-4.177-.27-.563-.708-1-1.208-1.323V4c1 .354 1.792.979 2.323 1.677zM12 5c-1.292 0-2.323 1-2.323 2.354v1.26H5.484v-1.26C5.484 6 6.516 5 7.807 5H12zM7.807 5C6.516 5 5.484 6 5.484 7.354v1.26H3.677C2.76 8.614 2 9.401 2 10.354v7.292C2 18.599 2.76 20 3.677 20h8.645c.917 0 2.323-1.401 2.323-2.354v-7.292c0-.953-.76-1.74-1.677-1.74h-1.807v-1.26C10.839 6 9.807 5 8.516 5h-.709z" />
                    </svg>
                    Pay KES {PREMIUM_PRICE.toLocaleString()} via M-Pesa
                  </span>
                )}
              </button>

              {/* Status Messages */}
              {message && (
                <div className={`p-3 rounded-lg text-xs ${
                  status === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' :
                  status === 'failed' ? 'bg-red-500/10 border border-red-500/20 text-red-400' :
                  'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                }`}>
                  {status === 'sent' && (
                    <div className="flex items-start gap-2">
                      <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin shrink-0 mt-0.5" />
                      <span>{message}</span>
                    </div>
                  )}
                  {(status === 'success' || status === 'failed') && (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        {status === 'success' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        )}
                      </svg>
                      <span>{message}</span>
                    </div>
                  )}
                </div>
              )}
            </form>
          )}

          {/* Already premium: show renewal option */}
          {isPremium && (
            <div className="border-t border-[var(--border-white)] pt-5">
              <p className="text-xs text-[var(--text-muted)] mb-3">
                Premium is active until {formatExpiry(premiumExpiresAt)}. Renew before expiry to keep access.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="btn-secondary w-full text-sm"
              >
                Check Status
              </button>
            </div>
          )}
        </div>

        {/* Payment Info */}
        <div className="mt-4 p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface2)]/50">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-xs text-[var(--text-muted)]">
              You'll receive an M-Pesa STK Push prompt on your phone. Enter your M-Pesa PIN to complete payment. Premium activates automatically once confirmed.
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface2)]/50">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-green-400 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.323 5.677C21.553 7.297 22 9.453 22 12c0 2.547-.447 4.703-1.677 6.323-.531.698-1.323 1.323-2.323 1.677v-2.5c.5-.323.938-.76 1.208-1.323C19.7 15.168 20 13.767 20 12c0-1.767-.3-3.167-.792-4.177-.27-.563-.708-1-1.208-1.323V4c1 .354 1.792.979 2.323 1.677z" />
            </svg>
            <p className="text-xs text-[var(--text-muted)]">
              Powered by <strong>Safaricom M-Pesa</strong>. Your payment is processed securely via the Daraja API.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
