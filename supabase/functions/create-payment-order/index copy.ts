import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();

    // Support both camelCase and snake_case inputs seamlessly
    const rawOrderId = body.orderId || body.order_id;
    const rawAmount = body.orderAmount || body.order_amount;
    const rawPhone = body.customerPhone || body.customer_phone || body.customer_details?.customer_phone;
    const rawName = body.customerName || body.customer_name || body.customer_details?.customer_name;
    const rawEmail = body.customerEmail || body.customer_email || body.customer_details?.customer_email;

    const finalAmount = Number(rawAmount);
    if (!finalAmount || finalAmount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Valid order amount is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default fallback credentials to ensure seamless sandbox checkout
    let appId = 'TEST110225062d0798126ea632e1171f60522011';
    let secretKey = 'cfsk_ma_test_da96aab8916824841a3fc8a09767aa90_337ac16f';
    let env = 'sandbox';
    let gatewayDisplayName = 'Cashfree Payments';

    // 1. Attempt to fetch active Cashfree credentials from database table
    try {
      const { data: config } = await supabase
        .from('payment_gateway_configs')
        .select('*')
        .eq('id', 'cashfree')
        .maybeSingle();

      if (config?.app_id && config?.secret_key) {
        appId = config.app_id.trim();
        secretKey = config.secret_key.trim();
        env = (config.environment || 'sandbox').toLowerCase().trim();
        if (config.name) gatewayDisplayName = config.name;
      }
    } catch (e) {
      console.warn('Could not read payment_gateway_configs, using fallback credentials:', e);
    }

    const baseUrl = env === 'production'
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg';

    // Sanitize phone to exact 10 digits
    let sanitizedPhone = String(rawPhone || '8686353574').replace(/\D/g, '');
    if (sanitizedPhone.length > 10) sanitizedPhone = sanitizedPhone.slice(-10);
    if (sanitizedPhone.length < 10) sanitizedPhone = '8686353574';

    // Generate guaranteed unique orderId (max 45 chars) to prevent 409 Conflict
    const cleanPrefix = (rawOrderId ? String(rawOrderId).replace(/[^a-zA-Z0-9_-]/g, '') : 'KF').substring(0, 24);
    const uniqueSuffix = `${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
    const orderId = `${cleanPrefix}_${uniqueSuffix}`.slice(-44);

    const payload = {
      order_id: orderId,
      order_amount: finalAmount,
      order_currency: 'INR',
      customer_details: {
        customer_id: sanitizedPhone,
        customer_name: rawName || 'Customer',
        customer_email: rawEmail || 'customer@kashvifashions.in',
        customer_phone: sanitizedPhone,
      },
      order_meta: {
        return_url: `${req.headers.get('origin') || 'https://kashvifashions.in'}/#/orders?order_id={order_id}`,
      },
    };

    const response = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'x-api-version': '2023-08-01',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Cashfree API error:', data);
      return new Response(
        JSON.stringify({ error: data.message || 'Failed to create Cashfree order', details: data }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return both formats so frontend never breaks
    return new Response(
      JSON.stringify({
        success: true,
        gateway: 'cashfree',
        gatewayName: gatewayDisplayName,
        environment: env,
        orderId: data.order_id,
        order_id: data.order_id,
        paymentSessionId: data.payment_session_id,
        payment_session_id: data.payment_session_id,
        cf_order: data,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Edge Function internal error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal Edge Function Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});