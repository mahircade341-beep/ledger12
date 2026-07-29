// Supabase Edge Function: mpesa-callback
// Handles the Daraja API callback after STK Push completes on user's phone
// Called by Safaricom Daraja automatically after user enters PIN

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const PREMIUM_PRICE = 1000;
const PREMIUM_DURATION_DAYS = 40;

serve(async (req) => {
  try {
    const body = await req.json();
    const stkCallback = body?.Body?.stkCallback;

    if (!stkCallback) {
      return new Response(JSON.stringify({ error: "Invalid callback" }), { status: 400 });
    }

    const {
      ResultCode,
      ResultDesc,
      CheckoutRequestID,
      MerchantRequestID,
    } = stkCallback;

    const metadata = stkCallback?.CallbackMetadata?.Item || [];
    const getItem = (key: string) => {
      const item = metadata.find((i: any) => i.Name === key);
      return item ? item.Value || item.Value : null;
    };

    const mpesaReceiptNumber = getItem("MpesaReceiptNumber");
    const transactionDate = getItem("TransactionDate");
    const phoneNumber = getItem("PhoneNumber");
    const amount = getItem("Amount");

    // Fetch the payment record
    const payRes = await fetch(
      `${SUPABASE_URL}/rest/v1/premium_payments?checkout_request_id=eq.${CheckoutRequestID}&select=*`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    const payments = await payRes.json();
    const payment = payments?.[0];

    if (!payment) {
      console.error("Payment record not found for:", CheckoutRequestID);
      return new Response(JSON.stringify({ error: "Payment not found" }), { status: 404 });
    }

    if (ResultCode === 0) {
      // Payment successful
      const now = new Date();
      const expiresAt = new Date(now.getTime() + PREMIUM_DURATION_DAYS * 24 * 60 * 60 * 1000);

      // Update premium_payments record
      await fetch(
        `${SUPABASE_URL}/rest/v1/premium_payments?checkout_request_id=eq.${CheckoutRequestID}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            status: "completed",
            mpesa_receipt_number: mpesaReceiptNumber,
            merchant_request_id: MerchantRequestID,
            transaction_date: transactionDate ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          }),
        }
      );

      // Activate premium for the user
      await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${payment.user_id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            is_premium: true,
            premium_expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          }),
        }
      );

      console.log("Premium activated for user:", payment.user_id);
    } else {
      // Payment failed
      await fetch(
        `${SUPABASE_URL}/rest/v1/premium_payments?checkout_request_id=eq.${CheckoutRequestID}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            status: "failed",
            failure_reason: ResultDesc || "Unknown error",
            updated_at: new Date().toISOString(),
          }),
        }
      );
    }

    // Daraja expects a success response to not retry
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: "Success" }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Callback error:", err.message);
    return new Response(
      JSON.stringify({ ResultCode: 1, ResultDesc: err.message || "Internal error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
