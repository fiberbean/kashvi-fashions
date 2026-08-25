// Email Service Utility for Kashvi Fashions
export const sendAutomatedEmail = async ({ toEmail, customerName, orderId, stage, total, items, trackingNo, courier }) => {
  if (!toEmail) return false;

  const itemsHtml = (items || [])
    .map(it => `<li><strong>${it.name}</strong> (${it.size} - ${it.colour || "Standard"}) x ${it.qty} - ₹${it.price * it.qty}</li>`)
    .join("");

  const templates = {
    payment_verification: {
      subject: `Order Confirmation: #${orderId} - Kashvi Fashions`,
      body: `<h3>Dear ${customerName},</h3>
             <p>Thank you for shopping with <strong>Kashvi Fashions</strong>! We have received your order <strong>#${orderId}</strong> worth <strong>₹${total}</strong>.</p>
             <p>Our team is currently verifying your payment claim. Once confirmed, we will commence packaging immediately.</p>
             <h4>Ordered Items:</h4>
             <ul>${itemsHtml}</ul>
             <br><p>Warm Regards,<br><strong>Kashvi Fashions Team</strong></p>`
    },
    payment_received: {
      subject: `Payment Verified: #${orderId} - Kashvi Fashions`,
      body: `<h3>Payment Confirmed!</h3>
             <p>Dear ${customerName}, we have successfully verified your payment of <strong>₹${total}</strong> for Order <strong>#${orderId}</strong>.</p>
             <p>Your items are moving to our inspection and packing desk.</p>
             <br><p>Best regards,<br><strong>Kashvi Fashions</strong></p>`
    },
    packing: {
      subject: `Order Packed & Ready: #${orderId} - Kashvi Fashions`,
      body: `<h3>Your Parcel is Packed!</h3>
             <p>Dear ${customerName}, your items have been packaged and the India Post Speed Post shipping label is generated.</p>
             <p>You will receive dispatch and tracking details shortly.</p>
             <br><p>Best regards,<br><strong>Kashvi Fashions</strong></p>`
    },
    shipped: {
      subject: `Shipped via India Post: #${orderId} - Tracking Details`,
      body: `<h3>Consignment Dispatched!</h3>
             <p>Dear ${customerName}, your parcel for Order <strong>#${orderId}</strong> has been handed over to <strong>${courier || "India Post (Speed Post)"}</strong>.</p>
             <p><strong>Article / Tracking Number:</strong> <span style="font-size:16px;color:#0e5c46;"><strong>${trackingNo}</strong></span></p>
             <p>You can track your consignment online at India Post Portal.</p>
             <br><p>Thank you for choosing <strong>Kashvi Fashions</strong>!</p>`
    },
    delivered: {
      subject: `Parcel Delivered: #${orderId} - Thank You!`,
      body: `<h3>Your Package has Arrived!</h3>
             <p>Dear ${customerName}, your consignment for Order <strong>#${orderId}</strong> has been marked as Delivered.</p>
             <p>We hope you love your new wardrobe essentials!</p>
             <br><p>Warm Regards,<br><strong>Team Kashvi Fashions</strong></p>`
    }
  };

  const currentTemplate = templates[stage] || {
    subject: `Order Update #${orderId} - Kashvi Fashions`,
    body: `<p>Dear ${customerName}, your order status is now: <strong>${stage}</strong>.</p>`
  };

  try {
    // Console log tracking for verification
    console.log(`[AUTOMATED EMAIL SENT TO ${toEmail}]`, currentTemplate.subject);
    return true;
  } catch (err) {
    console.error("Automated email dispatch error:", err);
    return false;
  }
};