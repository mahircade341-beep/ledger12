// Supabase Edge Function: mpesa-stk-push
// Initiates M-Pesa STK Push (Lipa Na M-Pesa Online) to user's phone
// Called from Premium.tsx frontend

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CONSUMER_KEY = Deno.env.get("MPESA_CONSUMER_KEY") || "";
const CONSUMER_SECRET = Deno.env.get("MPESA_CONSUMER_SECRET") || "";
const PASSKEY = Deno.env.get("MPESA_PASSKEY") || "";
const BUSINESS_SHORTCODE = Deno.env.get("MPESA_SHORTCODE") || "174379";
const CALLBACK_URL = Deno.env.get("MPESA_CALLBACK_URL") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

async function getAccessToken(): Promise<string> {
  const auth = btoa(`${CONSUMER_KEY}:${CONSUMER_SECRET}`);
  const res = await fetch(
    "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    { headers: { Authorization: `Basic ${auth}` } }
  );
  const data = await res.json();
  if (!data.access_token) throw new Error("Failed to get access token");
  return data.access_token;
}

function timestamp(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  return `${y}${m}${d}${h}${min}${s}`;
}

async function generatePassword(): Promise<string> {
  const ts = timestamp();
  const raw = BUSINESS_SHORTCODE + PASSKEY + ts;
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return Buffer.from(hex, "hex").toString("base64");
}

function bufferFromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

serve(async (req) => {
  try {
    const { phone, amount } = await req.json();

    if (!phone || !amount || amount < 1) {
      return new Response(
        JSON.stringify({ error: "Phone and amount are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const accessToken = await getAccessToken();
    const password = await generatePassword();
    const ts = timestamp();

    const stkRes = await fetch(
      "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          BusinessShortCode: BUSINESS_SHORTCODE,
          Password: password,
          Timestamp: ts,
          TransactionType: "CustomerPayBillOnline",
          Amount: Math.floor(amount),
          PartyA: phone,
          PartyB: BUSINESS_SHORTCODE,
          PhoneNumber: phone,
          CallBackURL: CALLBACK_URL,
          AccountReference: "DukaHub-Premium",
          TransactionDesc: "DukaHub Premium Subscription",
        }),
      }
    );

    const result = await stkRes.json();

    if (result.ResponseCode === "0") {
      // Payment request sent successfully - store checkout request for polling
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        await fetch(`${SUPABASE_URL}/rest/v1/premium_payments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            checkout_request_id: result.CheckoutRequestID,
            phone,
            amount: Math.floor(amount),
            status: "pending",
            created_at: new Date().toISOString(),
          }),
        }).catch(() => {});
      }

      return new Response(
        JSON.stringify({
          success: true,
          checkoutRequestId: result.CheckoutRequestID,
          message: "STK Push sent to your phone",
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        error: result.errorMessage || "Failed to initiate payment",
        detail: result,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
