import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    // Bypass RLS using Service Role to read gateway configs safely
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { order_id, order_amount, customer_details, order_meta } = body;

    if (!order_amount || order_amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Valid order_amount is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Fetch active Cashfree credentials from table
    const { data: config, error: configErr } = await supabase
      .from('payment_gateway_configs')
      .select('*')
      .eq('id', 'cashfree')
      .eq('is_active', true)
      .maybeSingle();

    if (configErr || !config) {
      return new Response(
        JSON.stringify({ error: 'Active Cashfree configuration not found in database.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const appId = config.app_id?.trim();
    const secretKey = config.secret_key?.trim();
    const env = (config.environment || 'sandbox').toLowerCase().trim();

    if (!appId || !secretKey) {
      return new Response(
        JSON.stringify({ error: 'Cashfree App ID or Secret Key is missing.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine Base URL
    const baseUrl = env === 'production'
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg';

    // Sanitize Customer Phone (must be 10 digits without +91)
    let rawPhone = customer_details?.customer_phone || '9999999999';
    rawPhone = String(rawPhone).replace(/\D/g, '');
    if (rawPhone.length > 10) {
      rawPhone = rawPhone.slice(-10);
    }
    if (rawPhone.length < 10) {
      rawPhone = '9999999999';
    }

    const uniqueOrderId = order_id || `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // Prepare Cashfree API Payload
    const payload = {
      order_id: uniqueOrderId,
      order_amount: Number(order_amount),
      order_currency: 'INR',
      customer_details: {
        customer_id: customer_details?.customer_id || `cust_${Date.now()}`,
        customer_name: customer_details?.customer_name || 'Customer',
        customer_email: customer_details?.customer_email || 'customer@kashvifashions.in',
        customer_phone: rawPhone,
      },
      order_meta: {
        return_url: order_meta?.return_url || `${req.headers.get('origin') || 'https://kashvifashions.in'}/#/order-status?order_id={order_id}`,
        notify_url: order_meta?.notify_url || undefined,
      },
    };

    // 2. Call Cashfree Create Order API
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
      console.error('Cashfree PG Error Response:', data);
      return new Response(
        JSON.stringify({
          error: data.message || 'Failed to generate Cashfree payment session',
          details: data,
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. Return session and order details to Client
    return new Response(
      JSON.stringify({
        success: true,
        order_id: data.order_id,
        payment_session_id: data.payment_session_id,
        environment: env,
        cf_order: data,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Edge Function Internal Error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal Edge Function Error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});