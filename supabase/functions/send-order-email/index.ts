import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const {
      orderId,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      totalAmount,
      subtotal,
      deliveryFee,
      items,
    } = payload;

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!customerEmail) {
      return new Response(JSON.stringify({ message: 'No customer email provided, skipped.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const itemsHtml = (items || [])
      .map(
        (item: any) => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 12px 10px; font-size: 13px;">
            <strong>${item.name}</strong><br/>
            <span style="font-size: 11px; color: #64748b;">
              ${item.color ? 'Color: ' + item.color : ''} 
              ${item.size ? '• Size: ' + item.size : ''}
            </span>
          </td>
          <td style="padding: 12px 10px; text-align: center; font-size: 13px;">${item.qty}</td>
          <td style="padding: 12px 10px; text-align: right; font-size: 13px;">₹${(item.price * item.qty).toLocaleString('en-IN')}</td>
        </tr>
      `
      )
      .join('');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #e2e8f0; }
          .header { background: #0b3b2c; color: #ffffff; padding: 32px 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; letter-spacing: 2px; }
          .header p { margin: 4px 0 0; color: #e5c07b; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
          .content { padding: 32px 24px; }
          .badge { display: inline-block; background: #ecfdf5; color: #047857; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #f8fafc; padding: 10px; font-size: 11px; text-align: left; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; }
          .total-box { margin-top: 20px; background: #f8fafc; border-radius: 16px; padding: 16px; font-size: 13px; }
          .total-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
          .grand-total { border-top: 1px solid #cbd5e1; padding-top: 8px; font-weight: bold; font-size: 16px; color: #0b3b2c; }
          .footer { text-align: center; padding: 24px; font-size: 11px; color: #94a3b8; border-top: 1px dashed #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>KASHVI FASHIONS</h1>
            <p>Haute Couture & Royal Vault • Kakinada</p>
          </div>
          <div class="content">
            <span class="badge">Order Confirmed & Paid</span>
            <h2 style="font-size: 20px; color: #0f172a; margin: 12px 0 4px;">Thank you for your order, ${customerName}!</h2>
            <p style="font-size: 13px; color: #64748b; margin: 0;">Order Reference: <strong>${orderId}</strong></p>

            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div class="total-box">
              <div class="total-row"><span>Subtotal:</span><span>₹${subtotal.toLocaleString('en-IN')}</span></div>
              <div class="total-row"><span>Delivery:</span><span>₹${deliveryFee}</span></div>
              <div class="total-row grand-total"><span>Total Paid:</span><span>₹${totalAmount.toLocaleString('en-IN')}</span></div>
            </div>

            <div style="margin-top: 24px; padding: 16px; background: #fdf2f4; border-radius: 16px; font-size: 12px; color: #334155;">
              <strong style="color: #0f172a; display: block; margin-bottom: 4px;">Delivering To:</strong>
              ${shippingAddress}
            </div>
          </div>
          <div class="footer">
            Kashvi Fashions • Kakinada, Andhra Pradesh<br/>
            Need assistance? WhatsApp Support: +91 8686353574
          </div>
        </div>
      </body>
      </html>
    `;

    // Resend API కాల్ - noreply@kashvifashions.in తో పంపడం
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Kashvi Fashions <noreply@kashvifashions.in>',
        to: [customerEmail],
        bcc: ['kashvifashions@gmail.com'],
        subject: `Order Confirmed: ${orderId} - Kashvi Fashions`,
        html: emailHtml,
      }),
    });

    const resData = await res.json();
    return new Response(JSON.stringify(resData), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});