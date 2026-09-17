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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch active gateway from DB
    const { data: activeGateway, error: gwError } = await supabase
      .from("payment_gateway_configs")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (gwError || !activeGateway) {
      throw new Error("No active payment gateway found in database.");
    }

    const gatewayId = activeGateway.id.toLowerCase();
    const isProd = activeGateway.environment === "production";

    // 2. Cashfree Flow
    if (gatewayId === "cashfree") {
      const cashfreeUrl = isProd
        ? "https://api.cashfree.com/pg/orders"
        : "https://sandbox.cashfree.com/pg/orders";

      const cfRes = await fetch(cashfreeUrl, {
        method: "POST",
        headers: {
          "x-client-id": activeGateway.app_id,
          "x-client-secret": activeGateway.secret_key,
          "x-api-version": "2023-08-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: orderId,
          order_amount: orderAmount,
          order_currency: "INR",
          customer_details: {
            customer_id: customerPhone || `cust_${Date.now()}`,
            customer_phone: customerPhone,
            customer_name: customerName,
            customer_email: customerEmail || `${customerPhone}@kashvifashions.local`,
          },
          order_meta: {
            return_url: `https://kashvifashions.in/?order_id=${orderId}`,
          },
        }),
      });

      const cfData = await cfRes.json();
      if (!cfRes.ok) {
        throw new Error(cfData.message || "Cashfree order token generation failed");
      }

      return new Response(
        JSON.stringify({
          gateway: "cashfree",
          gatewayName: activeGateway.name,
          paymentSessionId: cfData.payment_session_id,
          orderId: orderId,
          environment: activeGateway.environment,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    throw new Error(`Active gateway '${activeGateway.name}' is not supported yet.`);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});