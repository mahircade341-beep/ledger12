import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const RECIPIENT_PHONE = '254143897900';
const RECIPIENT_NAME = 'salan ali';
const PREMIUM_AMOUNT = 1000;
const PREMIUM_DURATION_DAYS = 40;

function parseMpesaMessage(msg: string) {
  const cleaned = msg.replace(/\s+/g, ' ').trim();
  const codeMatch = cleaned.match(/^([A-Z0-9]{8,12})/i);
  const code = codeMatch ? codeMatch[1].toUpperCase() : null;
  const amountMatch = cleaned.match(/KES\s*([0-9,]+\.?\d*)/i);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null;
  const nameMatch = cleaned.match(/to\s+([A-Za-z\s]+?)\s+on\s+/i);
  const recipientName = nameMatch ? nameMatch[1].trim().toLowerCase() : null;
  const phoneMatch = cleaned.match(/on\s+(\d{10,12})/);
  const recipientPhone = phoneMatch ? phoneMatch[1] : null;
  if (!code) return { code: null, amount: null, recipientName: null, recipientPhone: null, error: 'Could not find transaction code. Paste the full M-Pesa message.' };
  if (!amount) return { code, amount: null, recipientName, recipientPhone, error: 'Could not find the amount.' };
  if (!recipientName) return { code, amount, recipientName: null, recipientPhone, error: 'Could not find recipient name.' };
  if (!recipientPhone) return { code, amount, recipientName, recipientPhone: null, error: 'Could not find phone number.' };
  return { code, amount, recipientName, recipientPhone };
}

export default function Premium() {
  const navigate = useNavigate();
  const { isPremium, premiumExpiresAt, isGodUser, refreshProfile, user } = useAuth();
  const [mpesaMessage, setMpesaMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: string; message: string } | null>(null);

  const formatExpiry = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const daysRemaining = () => {
    if (!premiumExpiresAt) return 0;
    const diff = new Date(premiumExpiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const handleVerifyPayment = async () => {
    setResult(null);
    if (!mpesaMessage.trim()) {
      setResult({ type: 'error', message: 'Paste your M-Pesa confirmation message first.' });
      return;
    }
    if (!user) {
      setResult({ type: 'error', message: 'You must be signed in.' });
      return;
    }

    const parsed = parseMpesaMessage(mpesaMessage);
    if (parsed.error) {
      setResult({ type: 'error', message: parsed.error });
      return;
    }
    if (parsed.amount !== PREMIUM_AMOUNT) {
      setResult({ type: 'error', message: `Expected KES ${PREMIUM_AMOUNT.toLocaleString()} but found KES ${(parsed.amount || 0).toLocaleString()}.` });
      return;
    }
    if (parsed.recipientPhone !== RECIPIENT_PHONE) {
      setResult({ type: 'error', message: `Sent to ${parsed.recipientPhone} but should be ${RECIPIENT_PHONE}.` });
      return;
    }
    if (parsed.recipientName !== RECIPIENT_NAME) {
      setResult({ type: 'error', message: `Recipient "${parsed.recipientName}" doesn't match "${RECIPIENT_NAME}".` });
      return;
    }

    setLoading(true);
    setResult({ type: 'info', message: 'Verifying payment...' });

    try {
      const { data: existing } = await supabase
        .from('premium_payments')
        .select('id')
        .eq('mpesa_receipt_number', parsed.code)
        .maybeSingle();

      if (existing) {
        setResult({ type: 'error', message: 'This confirmation code has already been used. Each code is valid once only.' });
        setLoading(false);
        return;
      }

      const expiresAt = new Date(Date.now() + PREMIUM_DURATION_DAYS * 24 * 60 * 60 * 1000);

      const { error: payError } = await supabase.from('premium_payments').insert({
        user_id: user.id,
        phone: parsed.recipientPhone,
        amount: PREMIUM_AMOUNT,
        status: 'completed',
        mpesa_receipt_number: parsed.code,
        transaction_date: new Date().toISOString(),
      });

      if (payError) {
        if (payError.message?.includes('duplicate') || payError.message?.includes('unique')) {
          setResult({ type: 'error', message: 'This code was already used. Codes cannot be reused.' });
          setLoading(false);
          return;
        }
        throw payError;
      }

      const { error: profError } = await supabase
        .from('profiles')
        .update({ is_premium: true, premium_expires_at: expiresAt.toISOString() })
        .eq('user_id', user.id);

      if (profError) throw profError;

      await refreshProfile();
      setResult({ type: 'success', message: `Payment verified! Premium active ${PREMIUM_DURATION_DAYS} days. Enjoy!` });
    } catch (err: any) {
      setResult({ type: 'error', message: err.message || 'Verification failed. Try again.' });
    }
    setLoading(false);
  };

  // God user view
  if (isGodUser) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">Premium</h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">God mode — lifetime access</p>
          </div>
          <span className="badge-emerald flex items-center gap-1.5 px-3 py-1">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.068 2.485c.714.436 1.599-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
            </svg>
            Lifetime
          </span>
        </div>
        <div className="max-w-lg mx-auto text-center py-12">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-3xl shadow-xl shadow-amber-500/20 mb-4">👑</div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">God Mode Active</h2>
          <p className="text-[var(--text-muted)] mt-2">You have unlimited access. No payment needed.</p>
          <button onClick={() => navigate('/pos')} className="btn-primary mt-4">Go to App</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">Premium</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {isPremium ? 'Premium is active' : 'Unlock premium to use the app'}
          </p>
        </div>
        {isPremium && (
          <span className="badge-emerald flex items-center gap-1.5 px-3 py-1">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.068 2.485c.714.436 1.599-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
            </svg>
            Active
          </span>
        )}
      </div>

      {isPremium && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm font-semibold text-emerald-400">Premium Active</p>
              <p className="text-xs text-[var(--text-muted)]">
                {premiumExpiresAt ? `Expires ${formatExpiry(premiumExpiresAt)} - ${daysRemaining()} days left` : 'Active'}
              </p>
            </div>
            <button onClick={() => navigate('/pos')} className="btn-primary btn-sm text-xs">Go to App</button>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto w-full">
        <div className="rounded-2xl border-2 border-[var(--border-hover)] bg-[var(--bg-surface)] p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-500/15 flex items-center justify-center text-2xl mb-4">
              <svg className="w-8 h-8 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.323 5.677C21.553 7.297 22 9.453 22 12c0 2.547-.447 4.703-1.677 6.323-.531.698-1.323 1.323-2.323 1.677v-2.5c.5-.323.938-.76 1.208-1.323C19.7 15.168 20 13.767 20 12c0-1.767-.3-3.167-.792-4.177-.27-.563-.708-1-1.208-1.323V4c1 .354 1.792.979 2.323 1.677z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">{isPremium ? 'Renew Premium' : 'Get Premium'}</h2>
            <p className="text-sm text-[var(--text-muted)] mt-2">Send <strong>KES {PREMIUM_AMOUNT.toLocaleString()}</strong> via M-Pesa</p>
          </div>

          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 mb-5">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Send To</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Number</span><span className="font-bold font-mono">{RECIPIENT_PHONE}</span></div>
              <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Name</span><span className="font-bold capitalize">{RECIPIENT_NAME}</span></div>
              <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Amount</span><span className="font-bold text-emerald-400">KES {PREMIUM_AMOUNT.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Duration</span><span className="font-bold">{PREMIUM_DURATION_DAYS} days</span></div>
            </div>
          </div>

          <div className="space-y-2 text-sm mb-5">
            {[
              `M-Pesa -> Send Money -> Enter ${RECIPIENT_PHONE}`,
              `Enter KES ${PREMIUM_AMOUNT.toLocaleString()}, enter PIN, send`,
              `Copy the confirmation message and paste below`,
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                <span className="text-[var(--text-primary)]">{step}</span>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-[var(--text-secondary)]">Paste M-Pesa Message</label>
            <textarea value={mpesaMessage} onChange={(e) => setMpesaMessage(e.target.value)}
              className="input-field w-full min-h-[100px] resize-none text-sm"
              placeholder='e.g. "K5Y4G1V4R2 confirmed... Send KES 1,000 to SALAN ALI on 254143897900..."'
              rows={4} disabled={loading || isPremium} />

            {result && (
              <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
                result.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' :
                result.type === 'error' ? 'bg-red-500/10 border border-red-500/20 text-red-400' :
                'bg-amber-500/10 border border-amber-500/20 text-amber-400'
              }`}>
                <span>{result.message}</span>
              </div>
            )}

            {isPremium ? (
              <button onClick={() => navigate('/pos')} className="btn-primary w-full py-3">Go to App</button>
            ) : (
              <button onClick={handleVerifyPayment} disabled={loading || !mpesaMessage.trim()}
                className="btn-primary w-full py-3 text-base font-semibold">
                {loading ? 'Verifying...' : 'Verify Payment'}
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface2)]/50">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <p className="text-xs text-[var(--text-muted)]">Each code is validated against the recipient number & name. Codes can only be used once. Duplicates are automatically rejected.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
