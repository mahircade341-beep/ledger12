/**
 * mpesa.ts — M-Pesa STK Push client.
 *
 * Sends the payment prompt to the Daraja STK-push endpoint hosted as a Supabase
 * Edge Function (see supabase/functions/mpesa-stkpush). The browser never talks
 * to Safaricom directly — the function holds the secret Daraja credentials.
 *
 * Configuration (client side, optional):
 *   VITE_MPESA_ENDPOINT  — full URL of the STK-push endpoint. Defaults to
 *                          `{VITE_SUPABASE_URL}/functions/v1/mpesa-stkpush`.
 *
 * If the endpoint is unreachable (not deployed yet), the request gracefully
 * falls back to a clearly-labelled DEMO mode so the checkout flow stays usable
 * during development. Enable live payments by deploying the edge function and
 * setting its secrets (see docs/mpesa-daraja.md).
 */

export interface StkPushResult {
  ok: boolean;
  /** true when the request was simulated (no live Daraja service connected). */
  simulated: boolean;
  checkoutRequestId?: string;
  message?: string;
}

function defaultEndpoint(): string {
  const url = (import.meta.env.VITE_SUPABASE_URL as string) || '';
  return url ? `${url.replace(/\/+$/, '')}/functions/v1/mpesa-stkpush` : '';
}

export async function sendStkPush(opts: {
  phone: string;
  amount: number;
  reference: string;
  description?: string;
}): Promise<StkPushResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { ok: false, simulated: false, message: 'You are offline — M-Pesa needs an internet connection.' };
  }
  if (!opts.phone || opts.amount < 1) {
    return { ok: false, simulated: false, message: 'M-Pesa requires a valid phone number and an amount of at least KES 1.' };
  }

  const endpoint = (import.meta.env.VITE_MPESA_ENDPOINT as string) || defaultEndpoint();
  if (!endpoint) {
    return { ok: true, simulated: true, message: 'No M-Pesa endpoint configured' };
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts),
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok && (data.ok === true || data.ResponseCode === '0')) {
      return {
        ok: true,
        simulated: false,
        checkoutRequestId: data.CheckoutRequestID || data.checkoutRequestId || '',
      };
    }
    return {
      ok: false,
      simulated: false,
      message: data.errorMessage || data.message || `M-Pesa request failed (${res.status})`,
    };
  } catch {
    // Endpoint missing or unreachable — demo fallback so the UI flow still works.
    return {
      ok: true,
      simulated: true,
      checkoutRequestId: `DEMO-${Date.now().toString(36).toUpperCase().slice(-6)}`,
      message: 'M-Pesa service is not connected — recorded as a demo payment',
    };
  }
}
