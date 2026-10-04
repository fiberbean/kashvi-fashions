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

    // Read the active gateway configuration from the database.
    // Credentials stay server-side and are never returned to the Customer App.
    const requestedGatewayId = String(
      body.gatewayId || body.gateway_id || 'cashfree'
    ).trim().toLowerCase();

    let gatewayId = requestedGatewayId || 'cashfree';
    let gatewayDisplayName = 'Cashfree Payments';
    let appId = '';
    let secretKey = '';
    let env = 'test';

    // IMPORTANT: TEST / PRODUCTION is controlled only by the Admin Gateway
    // configuration. Never trust an environment value sent by the browser.
    // The currently ACTIVE configuration is the single source of truth.
    const { data: activeConfigs, error: configError } = await supabase
      .from('payment_gateway_configs')
      .select(
        'id,name,gateway_id,is_active,environment,app_id,secret_key,webhook_secret,updated_at'
      )
      .eq('gateway_id', gatewayId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(2);

    if (configError) {
      console.error('Payment gateway config lookup error:', configError);
      return new Response(
        JSON.stringify({ error: 'Unable to read payment gateway configuration.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if ((activeConfigs || []).length > 1) {
      console.error('Multiple active environments found for gateway:', gatewayId);
      return new Response(
        JSON.stringify({
          error: `Multiple active environments found for gateway: ${gatewayId}. Please keep only TEST or PRODUCTION active.`,
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const config = activeConfigs?.[0];

    if (!config) {
      return new Response(
        JSON.stringify({
          error: `No active payment configuration found for gateway: ${gatewayId}.`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    gatewayId = String(config.gateway_id || gatewayId).trim().toLowerCase();
    gatewayDisplayName = config.name || gatewayDisplayName;
    appId = String(config.app_id || '').trim();
    secretKey = String(config.secret_key || '').trim();
    env = String(config.environment || '').trim().toLowerCase();

    if (env !== 'test' && env !== 'production') {
      return new Response(
        JSON.stringify({
          error: `${gatewayDisplayName} has an invalid active environment configuration.`,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!appId || !secretKey) {
      return new Response(
        JSON.stringify({
          error: `${gatewayDisplayName} ${env.toUpperCase()} credentials are not configured.`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // The Customer App currently has a Cashfree checkout adapter.
    // Other gateways can use the same config-selection contract when their
    // server-side adapter is added.
    if (gatewayId !== 'cashfree') {
      return new Response(
        JSON.stringify({
          error: `${gatewayDisplayName} is configured, but its checkout adapter is not implemented yet.`,
          gateway: gatewayId,
          gatewayName: gatewayDisplayName,
          environment: env,
        }),
        { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Active DB environment directly controls Cashfree API environment.
    const cashfreeEnvironment = env === 'production' ? 'production' : 'sandbox';

    const baseUrl = cashfreeEnvironment === 'production'
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
        gateway: gatewayId,
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