/**
 * M-Pesa STK Push — Supabase Edge Function (Deno).
 *
 * The PWA posts { phone, amount, reference, description } here; this function
 * performs the Daraja STK push on its behalf so Safaricom credentials never
 * leave the server.
 *
 * ── Deploy ────────────────────────────────────────────────────────────────
 *   supabase functions deploy mpesa-stkpush
 *
 * ── Secrets (Supabase → Edge Functions → mpesa-stkpush → Secrets) ─────────
 *   DARAJA_CONSUMER_KEY     from Safaricom Developer Portal (Daraja API)
 *   DARAJA_CONSUMER_SECRET  from Safaricom Developer Portal
 *   DARAJA_PASSKEY          from your Paybill (MPESA Portal → LNMK)
 *   DARAJA_SHORTCODE        e.g. 174379 (sandbox) or your real Paybill till
 *   MPESA_ENV               "sandbox" (default) or "production"
 *   DARAJA_CALLBACK_URL     optional HTTPS URL Safaricom pings with the result
 *
 * Full walkthrough: docs/mpesa-daraja.md
 */

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    const { phone, amount, reference, description } = await req.json();

    const env = Deno.env.get('MPESA_ENV') === 'production' ? 'production' : 'sandbox';
    const base = env === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';
    const consumerKey = Deno.env.get('DARAJA_CONSUMER_KEY') || '';
    const consumerSecret = Deno.env.get('DARAJA_CONSUMER_SECRET') || '';
    const passkey = Deno.env.get('DARAJA_PASSKEY') || '';
    const shortcode = Deno.env.get('DARAJA_SHORTCODE') || '';

    if (!consumerKey || !consumerSecret || !passkey || !shortcode) {
      return json(
        { ok: false, errorMessage: 'M-Pesa (Daraja) credentials are not configured on this server.' },
        500
      );
    }

    // 1) OAuth access token
    const tokenRes = await fetch(`${base}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${btoa(`${consumerKey}:${consumerSecret}`)}` },
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return json(
        { ok: false, errorMessage: 'Daraja authentication failed — check your consumer key and secret.' },
        502
      );
    }

    // 2) STK push request
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const password = btoa(`${shortcode}${passkey}${timestamp}`);

    const stkRes = await fetch(`${base}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: String(Math.round(amount)),
        PartyA: phone,
        PartyB: shortcode,
        PhoneNumber: phone,
        CallBackURL: Deno.env.get('DARAJA_CALLBACK_URL') || 'https://example.com/daraja-callback',
        AccountReference: (reference || 'DukaHub').slice(0, 12),
        TransactionDesc: (description || 'DukaHub payment').slice(0, 13),
      }),
    });
    const stk = await stkRes.json();

    const ok = stk.ResponseCode === '0';
    return json(
      {
        ok,
        ResponseCode: stk.ResponseCode,
        ResponseDescription: stk.ResponseDescription,
        CheckoutRequestID: stk.CheckoutRequestID || '',
        MerchantRequestID: stk.MerchantRequestID || '',
        errorMessage: ok ? undefined : stk.ResponseDescription || 'STK push was declined by Safaricom',
      },
      200
    );
  } catch (err) {
    return json({ ok: false, errorMessage: `Server error: ${err instanceof Error ? err.message : String(err)}` }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}
