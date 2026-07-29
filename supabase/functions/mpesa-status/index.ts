// Supabase Edge Function: mpesa-status
// Checks if an M-Pesa STK Push payment was completed
// Polled by Premium.tsx frontend after initiating payment

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const checkoutRequestId = url.searchParams.get("checkoutRequestId");

    if (!checkoutRequestId) {
      return new Response(
        JSON.stringify({ error: "checkoutRequestId is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Query the premium_payments table
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/premium_payments?checkout_request_id=eq.${checkoutRequestId}&select=*`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    const payments = await res.json();
    const payment = payments?.[0];

    if (!payment) {
      return new Response(
        JSON.stringify({ success: false, message: "Payment not found" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    if (payment.status === "completed") {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment completed successfully",
          amount: payment.amount,
          phone: payment.phone,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    if (payment.status === "failed") {
      return new Response(
        JSON.stringify({
          success: false,
          message: payment.failure_reason || "Payment failed",
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Still pending
    return new Response(
      JSON.stringify({ success: false, message: "Payment still pending" }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
