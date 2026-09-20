import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { orderId, orderAmount, customerPhone, customerName, customerEmail } = await req.json();

    if (!orderId || !orderAmount || !customerPhone) {
      return new Response(
        JSON.stringify({ error: "Missing required order parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Initialize Supabase Admin Client using Service Role Key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Fetch active gateway config securely
    const { data: config, error: configError } = await supabaseAdmin
      .from("payment_gateway_configs")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (configError || !config) {
      return new Response(
        JSON.stringify({ error: "No active payment gateway configured in store settings" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { app_id, secret_key, environment } = config;

    if (!app_id || !secret_key) {
      return new Response(
        JSON.stringify({ error: "Gateway credentials missing in database" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Cashfree API URL selection
    const isProd = (environment || "").toLowerCase().trim() === "production";
    const cashfreeBaseUrl = isProd
      ? "https://api.cashfree.com/pg/orders"
      : "https://sandbox.cashfree.com/pg/orders";

    // Format phone: strip non-digits, ensure 10 digits
    const cleanPhone = String(customerPhone).replace(/\D/g, "").slice(-10);

    const payload = {
      order_id: String(orderId),
      order_amount: Number(orderAmount),
      order_currency: "INR",
      customer_details: {
        customer_id: cleanPhone || `cust_${Date.now()}`,
        customer_name: customerName || "Customer",
        customer_phone: cleanPhone,
        customer_email: customerEmail || `${cleanPhone}@kashvifashions.local`,
      },
      order_meta: {
        return_url: `https://kashvifashions.in/#/order-status?order_id={order_id}`,
      },
    };

    // 4. Call Cashfree Orders API
    const response = await fetch(cashfreeBaseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": app_id.trim(),
        "x-client-secret": secret_key.trim(),
        "x-api-version": "2023-08-01",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Cashfree API Error:", result);
      return new Response(
        JSON.stringify({
          error: result.message || "Failed to initialize payment session with Cashfree",
          details: result,
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Return payment_session_id back to CartDrawer.tsx
    return new Response(
      JSON.stringify({
        gateway: "cashfree",
        gatewayName: config.name || "Cashfree Payments",
        environment: environment || "sandbox",
        orderId: result.order_id,
        paymentSessionId: result.payment_session_id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error connecting to gateway" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});