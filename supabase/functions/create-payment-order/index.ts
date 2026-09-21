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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

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
        JSON.stringify({ error: 'Cashfree App ID or Secret Key is missing in database.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const baseUrl = env === 'production'
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg';

    // Sanitize phone to exact 10 digits
    let sanitizedPhone = String(rawPhone || '9999999999').replace(/\D/g, '');
    if (sanitizedPhone.length > 10) sanitizedPhone = sanitizedPhone.slice(-10);
    if (sanitizedPhone.length < 10) sanitizedPhone = '9999999999';

    const orderId = rawOrderId || `KFOD_${Date.now()}`;

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
        gatewayName: config.name || 'Cashfree Payments',
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