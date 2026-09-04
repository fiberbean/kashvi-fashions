import { supabase } from './supabase.js';
import { clearLocalCart } from './cart.js';

let cashfreeSdk = null;

async function loadCashfreeSDK() {
  if (window.Cashfree) return window.Cashfree;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    script.onload = () => resolve(window.Cashfree);
    script.onerror = () => reject(new Error('Failed to load Cashfree SDK'));
    document.head.appendChild(script);
  });
}

// Format exact string matching your required pattern
async function resolveAccuratePaymentMethod(uniqueOrderId, config, rawDetails) {
  let paymentItem = null;

  try {
    const { data: payments, error } = await supabase.functions.invoke('create-cashfree-order', {
      body: {
        action: 'get_payment_details',
        order_id: uniqueOrderId,
        app_id: config.app_id,
        secret_key: config.secret_key,
        environment: config.environment || 'sandbox'
      }
    });

    if (!error && Array.isArray(payments) && payments.length > 0) {
      paymentItem = payments.find(p => (p.payment_status || '').toUpperCase() === 'SUCCESS') || payments[0];
    }
  } catch (err) {
    console.warn("Backend payment verification fallback:", err);
  }

  const target = paymentItem || rawDetails || {};
  const methodObj = target.payment_method || target.paymentMethod || {};
  const group = String(target.payment_group || '').toLowerCase();
  const mode = String(target.payment_mode || '').toLowerCase();

  // 1. CARDS: "Debit Card - 1234" or "Credit Card - 5678"
  if (methodObj.card || group.includes('card') || mode.includes('card')) {
    const c = methodObj.card || target.card || {};
    const rawCard = String(c.card_number || c.last_four || '').trim();
    const last4 = rawCard.replace(/[^0-9]/g, '').slice(-4) || '****';
    const cardType = (c.card_type && c.card_type.toLowerCase().includes('debit')) || mode.includes('debit') 
      ? 'Debit Card' 
      : 'Credit Card';

    return `${cardType} - ${last4}`;
  }

  // 2. WALLET: "Wallet - Paytm" or "Wallet - PhonePe"
  if (methodObj.wallet || methodObj.app || group === 'wallet' || mode === 'wallet') {
    const ch = String(methodObj.wallet?.channel || methodObj.app?.channel || target.payment_mode || 'PhonePe').toLowerCase();
    let walletName = 'PhonePe';
    if (ch.includes('paytm')) walletName = 'Paytm';
    else if (ch.includes('amazon')) walletName = 'Amazon Pay';
    else if (ch.includes('mobikwik')) walletName = 'Mobikwik';
    else if (ch.includes('phonepe') || ch.includes('link')) walletName = 'PhonePe';
    else walletName = ch.charAt(0).toUpperCase() + ch.slice(1);

    return `Wallet - ${walletName}`;
  }

  // 3. UPI: "UPI - PhonePe", "UPI - Google Pay", "UPI - Paytm"
  if (methodObj.upi || group === 'upi' || mode === 'upi') {
    const vpa = String(methodObj.upi?.upi_id || methodObj.upi?.channel || target.upi?.upi_id || '').toLowerCase();
    let upiApp = 'UPI';

    if (vpa.includes('ybl') || vpa.includes('ibl') || vpa.includes('axl') || vpa.includes('phonepe')) {
      upiApp = 'PhonePe';
    } else if (vpa.includes('okhdfcbank') || vpa.includes('okaxis') || vpa.includes('oksbi') || vpa.includes('okicici') || vpa.includes('google')) {
      upiApp = 'Google Pay';
    } else if (vpa.includes('paytm')) {
      upiApp = 'Paytm';
    } else if (vpa.includes('cred')) {
      upiApp = 'CRED';
    } else {
      upiApp = 'PhonePe';
    }

    return `UPI - ${upiApp}`;
  }

  // 4. NET BANKING: "Net Banking - HDFC Bank"
  if (methodObj.netbanking || group.includes('banking')) {
    const bank = methodObj.netbanking?.bank_name || methodObj.netbanking?.channel || 'Bank';
    return `Net Banking - ${bank}`;
  }

  return 'Online Payment';
}

export async function initiatePaymentFlow(order) {
  const submitBtn = document.getElementById('btn-submit-order');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerText = 'Connecting Gateway...';
  }

  try {
    const { data: config, error: cfgErr } = await supabase
      .from('payment_gateway_configs')
      .select('*')
      .eq('id', 'cashfree')
      .single();

    if (cfgErr || !config?.app_id || !config?.secret_key) {
      throw new Error('Please configure Cashfree App ID and Secret Key in Admin Panel first.');
    }

    const mode = config.environment || 'sandbox';
    const Cashfree = await loadCashfreeSDK();
    cashfreeSdk = Cashfree({ mode: mode });

    const uniqueOrderId = `${order.id}_${Date.now().toString().slice(-4)}`;

    const { data, error } = await supabase.functions.invoke('create-cashfree-order', {
      body: {
        order_id: uniqueOrderId,
        order_amount: Number(order.total_amount || order.total),
        customer_phone: String(order.customer_phone || '9999999999').replace(/[^0-9]/g, '').slice(-10),
        customer_name: order.customer_name || 'Customer',
        customer_email: order.customer_email || 'orders@kashvifashions.com',
        customer_id: (order.customer_id || order.customer_phone || 'cust_1').replace(/[^a-zA-Z0-9_-]/g, ''),
        app_id: config.app_id,
        secret_key: config.secret_key,
        environment: mode
      }
    });

    if (error) {
      throw new Error(error.message || 'Failed to communicate with Edge Function');
    }

    if (!data?.payment_session_id) {
      throw new Error(data?.message || JSON.stringify(data));
    }

    cashfreeSdk.checkout({
      paymentSessionId: data.payment_session_id,
      redirectTarget: '_modal'
    }).then(async (result) => {
      if (result.error) {
        await handlePaymentCancelled(order, result.error);
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span>⚡</span> <span>Proceed to Payment</span>';
        }
        return;
      }

      if (result.paymentDetails) {
        const verifiedMethod = await resolveAccuratePaymentMethod(uniqueOrderId, config, result.paymentDetails);
        await handlePaymentSuccess(order, result.paymentDetails, verifiedMethod);
      }
    });

  } catch (err) {
    console.error('Payment Flow Error:', err);
    alert('Payment Initiation Failed: ' + err.message);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>⚡</span> <span>Proceed to Payment</span>';
    }
  }
}

async function handlePaymentCancelled(order, errDetails) {
  document.getElementById('checkout-modal-overlay')?.classList.add('active');

  await supabase
    .from('orders')
    .update({
      payment_status: 'cancelled_by_user',
      updated_at: new Date().toISOString()
    })
    .eq('id', order.id);

  alert('Payment was not completed. You can re-attempt payment when ready.');
}

async function handlePaymentSuccess(order, paymentDetails, exactMethod) {
  try {
    const paymentRef = paymentDetails.payment_id || paymentDetails.cf_payment_id || `CF_${Date.now()}`;
    const paymentMethodDisplay = exactMethod || 'Online Payment';
    const amountVal = Number(order.total_amount || order.total || 0);

    // 1. Update Database: status remains 'new' for admin review
    await supabase
      .from('orders')
      .update({
        status: 'new',
        order_status: 'new',
        payment_status: 'confirmed',
        payment_verified: true,
        payment_method: paymentMethodDisplay,
        payment_ref: paymentRef,
        payment_reference: paymentRef,
        payment_time: new Date().toISOString(),
        payment: {
          gateway: 'Cashfree',
          payment_id: paymentRef,
          status: 'SUCCESS',
          payment_source: paymentMethodDisplay,
          raw_details: paymentDetails,
          amount: amountVal,
          timestamp: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id);

    // 2. Clear Carts
    clearLocalCart();

    const authUserId = order.customer_id;
    if (authUserId) {
      supabase
        .from('user_carts')
        .upsert([{ user_id: authUserId, cart_items: [], updated_at: new Date().toISOString() }])
        .then();
    }

    // 3. Hide Checkout Modal
    const checkoutModal = document.getElementById('checkout-modal-overlay');
    if (checkoutModal) {
      checkoutModal.classList.remove('active');
    }

    // 4. Render High-End Luxury Receipt Modal
    const successModal = document.getElementById('order-success-modal');
    if (successModal) {
      // Complete Premium UI Structure Replacement
      successModal.innerHTML = `
        <div class="modal-card" style="background:#ffffff; border-radius:18px; max-width:440px; width:92%; padding:28px 24px; box-shadow:0 24px 60px rgba(0,0,0,0.18); border:1px solid rgba(0,86,75,0.08); text-align:center; animation:popIn 0.25s ease-out; font-family:inherit;">
          
          <!-- Animated Green Checkmark Header -->
          <div style="width:68px; height:68px; background:linear-gradient(135deg, #e6f7f0 0%, #c8efe0 100%); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 16px auto; box-shadow:0 8px 20px rgba(0,135,90,0.15); border:2px solid #a4e5c8;">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#00875a" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>

          <h3 style="font-size:1.35rem; font-weight:800; color:var(--brand-emerald-dark); margin:0 0 4px 0; letter-spacing:-0.4px;">
            Payment Confirmed!
          </h3>
          <p style="font-size:0.78rem; color:#6b8277; margin:0 0 20px 0; line-height:1.4;">
            Thank you! Your order has been placed and sent to our fulfillment team.
          </p>

          <!-- Premium Digital Receipt Box -->
          <div style="background:#f8faf9; border:1px dashed #cfe0d8; border-radius:14px; padding:16px 18px; margin-bottom:22px; text-align:left; display:flex; flex-direction:column; gap:10px;">
            
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:0.75rem; color:#789287; font-weight:600;">Order ID</span>
              <strong style="font-family:monospace; font-size:0.88rem; color:var(--brand-emerald-dark); letter-spacing:0.5px;">#${order.id}</strong>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:0.75rem; color:#789287; font-weight:600;">Amount Paid</span>
              <strong style="font-size:1.05rem; color:#112019; font-weight:800;">₹ ${amountVal.toLocaleString('en-IN')}</strong>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:0.75rem; color:#789287; font-weight:600;">Payment Mode</span>
              <span style="font-size:0.78rem; font-weight:700; color:#1f332a; background:#ffffff; padding:2px 8px; border-radius:6px; border:1px solid #dce8e2;">${paymentMethodDisplay}</span>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:0.75rem; color:#789287; font-weight:600;">Transaction Ref</span>
              <span style="font-family:monospace; font-size:0.7rem; color:#859c91;">${paymentRef.slice(-14)}</span>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; padding-top:8px; border-top:1px solid #e7eee9;">
              <span style="font-size:0.75rem; color:#789287; font-weight:600;">Order Status</span>
              <span style="font-size:0.68rem; font-weight:800; background:#eaf8f1; color:#00875a; padding:3px 9px; border-radius:20px; border:1px solid #a3e6c5; text-transform:uppercase;">
                ● NEW ORDER
              </span>
            </div>

          </div>

          <!-- Action Buttons -->
          <div style="display:flex; flex-direction:column; gap:8px;">
            <button type="button" id="btn-view-my-orders" style="background:var(--brand-emerald); color:#ffffff; font-weight:700; font-size:0.85rem; padding:12px; border-radius:10px; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 4px 12px rgba(0,86,75,0.22); transition:all 0.2s;">
              <span>📦</span> <span>Track Order in My Orders</span>
            </button>
            <button type="button" id="btn-continue-shopping" style="background:transparent; color:#5c7368; font-weight:600; font-size:0.78rem; padding:10px; border-radius:10px; border:1px solid #d7e4de; cursor:pointer; transition:all 0.2s;">
              Continue Shopping
            </button>
          </div>

        </div>
      `;

      successModal.style.display = 'flex';

      // Re-bind Action Buttons
      document.getElementById('btn-view-my-orders').onclick = () => {
        successModal.style.display = 'none';
        const menuItemOrders = document.getElementById('menu-item-orders');
        if (menuItemOrders) {
          menuItemOrders.click();
        } else {
          document.getElementById('modal-my-orders')?.classList.add('active');
        }
      };

      document.getElementById('btn-continue-shopping').onclick = () => {
        window.location.reload();
      };
    }

  } catch (err) {
    console.error('Post-payment handling error:', err);
    window.location.reload();
  }
}