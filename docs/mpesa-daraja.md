# Live M-Pesa Payments (Safaricom Daraja API)

The app's M-Pesa checkout now performs a **real STK push** through a Supabase Edge
Function. Until that function is deployed with your credentials, the checkout runs
in a clearly-labelled **demo mode** — sales are recorded as M-Pesa but no real
payment prompt is sent.

## What you need to do (one-time, ~30 minutes)

### 1. Get Daraja credentials from Safaricom

1. Go to the **Safaricom Developer Portal**: https://developer.safaricom.co.ke
   (tap **"Create an account"** — you'll get a confirmation email and phone
   verification).
2. After logging in, open **API Console** and subscribe to **Daraja API**.
3. Open **Test Credentials** → **Consumer Keys** and copy:
   - `Consumer Key`
   - `Consumer Secret`
4. Open **MPESA Portal** → your Paybill account → **Go Live / Lipa na M-Pesa Online
   (STK Push)** → get:
   - `Passkey` (often called the LNMK / STK passkey)
   - `Shortcode` (your Paybill number, e.g. `174379` in sandbox)
5. To test with real money later, take the Paybill **live** (request via the
   portal; Safaricom reviews it).

> **Sandbox tip:** you can test end-to-end with the sandbox shortcode `174379` and
> the sandbox test phone numbers listed in the Daraja docs — no real money moves.

### 2. Deploy the edge function to Supabase

From a terminal in this repo (requires the Supabase CLI and project link):

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy mpesa-stkpush
```

### 3. Set the function secrets

In the **Supabase Dashboard** → **Edge Functions** → `mpesa-stkpush` → **Secrets**:

| Secret | What it is |
|--------|------------|
| `DARAJA_CONSUMER_KEY` | From the Safaricom developer portal |
| `DARAJA_CONSUMER_SECRET` | From the Safaricom developer portal |
| `DARAJA_PASSKEY` | From MPESA Portal (STK push passkey) |
| `DARAJA_SHORTCODE` | Your Paybill, e.g. `174379` (sandbox) |
| `MPESA_ENV` | `sandbox` (default) or `production` |
| `DARAJA_CALLBACK_URL` | Optional HTTPS URL Safaricom pings with the result |

### 4. Point the app at the function

The app already defaults to
`{VITE_SUPABASE_URL}/functions/v1/mpesa-stkpush` — **no app change needed** if you
use Supabase. If you deploy the function elsewhere, set `VITE_MPESA_ENDPOINT` to
its URL.

After deploying, every M-Pesa sale in the POS sends a real STK push to the
customer's phone, and the payer's phone number is stored on the transaction
(`mpesa_phone`) for reconciliation.

## How it works

```
POS (browser)                Edge Function (server)              Safaricom
     │  POST {phone, amount}      │                                  │
     ├───────────────────────────►│  OAuth token (key+secret) ──────►│
     │                            │  STK push (shortcode+passkey) ──►│
     │  {CheckoutRequestID}       │◄── {ResponseCode: "0"} ──────────┤
     ◄────────────────────────────┤                                  │
     │  Sale recorded, receipt    │   customer's phone gets the PIN   │
     │  shows M-Pesa + payer #    │   prompt to approve payment       │
```

- **Secrets never touch the browser** — they live only in the edge function.
- **Offline:** the checkout explains M-Pesa needs a connection and offers to
  record the sale as cash (saved on-device, synced later).
- **Demo mode:** if the function isn't reachable, the modal says so explicitly
  and records the sale as M-Pesa so the flow stays testable.

## Checking money actually arrived

Daraja's STK push only *initiates* the payment. To confirm funds, wire the
`CallBackURL` to an endpoint that verifies the transaction (or check the
transaction via the **Query Status** API). Until then, use the customer's M-Pesa
message and the payer phone recorded on the sale to reconcile.
