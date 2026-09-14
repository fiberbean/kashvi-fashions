import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client using service role or standard client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(req: Request) {
  try {
    const { orderId, orderAmount, customerName, customerPhone, customerEmail } = await req.json();

    // 1. Fetch active payment gateway config from database
    const { data: configData, error: configError } = await supabase
      .from("payment_gateway_configs")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .single();

    if (configError || !configData) {
      throw new Error("No active payment gateway configured in database.");
    }

    const { app_id, secret_key, environment } = configData;

    // 2. Determine Cashfree Environment Endpoint
    const cashfreeEnv = 
      environment === "production" 
        ? "https://api.cashfree.com/pg/orders" 
        : "https://sandbox.cashfree.com/pg/orders";
    
    // 3. Call Cashfree API
    const response = await fetch(cashfreeEnv, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": app_id,
        "x-client-secret": secret_key,
        "x-api-version": "2023-08-01",
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: orderAmount,
        order_currency: "INR",
        customer_details: {
          customer_id: customerPhone || "cust_1",
          customer_name: customerName,
          customer_email: customerEmail || "customer@kashvi.com",
          customer_phone: customerPhone,
        },
        order_meta: {
          // localhost కోసం http లేదా ప్రొడక్షన్ కోసం https వాడేలా లేదా శాండ్‌బాక్స్ కి అవసరమైన ఫార్మాట్
          return_url: `https://www.cashfree.com/devstudio/preview/pg/web/checkout?order_id=${orderId}`, 
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to create Cashfree order");
    }

    return NextResponse.json({
      payment_session_id: data.payment_session_id,
      order_id: data.order_id,
      environment: environment,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}