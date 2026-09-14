import { supabase } from './supabase.js';
import { initiatePaymentFlow } from './payment-engine.js';
import { getCurrentUser, getCurrentCustomer } from './auth.js';

let storeConfig = { 
  free_delivery_above: 999, 
  flat_delivery_fee: 60,
  store_pincode: '533001',
  store_state: 'Andhra Pradesh'
};

let rateCards = [];
let currentSubtotal = 0;
let currentDeliveryFee = 0;
let currentOrderTotal = 0;
let currentTotalWeightGm = 200;
let savedAddresses = [];
let selectedAddress = null;
let isAddingNew = false;

// ================= SEQUENCE GENERATOR (KFOD & KFOINV) =================
async function generateNextOrderAndInvoiceId() {
  try {
    const { data: latestOrders, error } = await supabase
      .from('orders')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(20);

    let maxNum = 0;

    if (!error && latestOrders && latestOrders.length > 0) {
      latestOrders.forEach(row => {
        const idStr = String(row.id || '');
        const match = idStr.match(/KFOD(\d+)/i);
        if (match && match[1]) {
          const val = parseInt(match[1], 10);
          if (val > maxNum) maxNum = val;
        }
      });
    }

    const nextNumber = maxNum + 1;
    const padded = String(nextNumber).padStart(4, '0');

    return {
      orderId: `KFOD${padded}`,
      invoiceId: `KFOINV${padded}`
    };
  } catch (err) {
    console.warn('Sequence query fallback:', err);
    const fallbackPadded = String(Math.floor(1000 + Math.random() * 9000));
    return {
      orderId: `KFOD${fallbackPadded}`,
      invoiceId: `KFOINV${fallbackPadded}`
    };
  }
}

export async function initCheckout() {
  try {
    const { data: config } = await supabase.from('store_settings').select('*').eq('id', 'store_config').maybeSingle();
    if (config) {
      storeConfig.free_delivery_above = config.free_delivery_above ?? 999;
      storeConfig.flat_delivery_fee = config.flat_delivery_fee ?? 60;
      if (config.pincode) storeConfig.store_pincode = String(config.pincode).trim();
      if (config.state) storeConfig.store_state = config.state.trim();
    }

    const { data: matrix } = await supabase
      .from('delivery_rate_cards')
      .select('*')
      .eq('active', true)
      .order('weight_from', { ascending: true });

    if (matrix && matrix.length > 0) {
      rateCards = matrix;
    }
  } catch (err) {
    console.warn("Delivery rates setup fallback:", err);
  }
  bindCheckoutEvents();
}

export async function openCheckoutModal(cartItems) {
  if (!cartItems || cartItems.length === 0) {
    alert("Your cart is empty!");
    return;
  }

  currentSubtotal = cartItems.reduce((acc, i) => acc + (parseFloat(i.price || 0) * parseInt(i.qty || 1)), 0);
  currentTotalWeightGm = cartItems.reduce((acc, i) => acc + ((parseInt(i.weight_gm) || 200) * parseInt(i.qty || 1)), 0);

  const subtotalEl = document.getElementById('checkout-subtotal');
  if (subtotalEl) subtotalEl.innerText = `₹ ${currentSubtotal.toLocaleString('en-IN')}`;

  const user = getCurrentUser();
  const customer = getCurrentCustomer();
  await fetchAndDisplayAddresses(user, customer);

  document.getElementById('checkout-modal-overlay')?.classList.add('active');
  document.getElementById('cart-drawer-overlay')?.classList.remove('active');
  bindCheckoutEvents();
}

function calculateDeliveryFee(destPincode, destState) {
  if (currentSubtotal >= storeConfig.free_delivery_above) {
    return 0;
  }

  const cleanDestPin = String(destPincode || '').trim();
  const cleanStorePin = String(storeConfig.store_pincode || '533001').trim();
  const cleanState = (destState || '').toLowerCase().trim();
  const originState = (storeConfig.store_state || 'Andhra Pradesh').toLowerCase().trim();

  let zoneType = 'other_states_rate';

  if (cleanDestPin.substring(0, 3) === cleanStorePin.substring(0, 3)) {
    zoneType = 'local_rate';
  } else if (cleanState === originState || cleanDestPin.startsWith('51') || cleanDestPin.startsWith('52') || cleanDestPin.startsWith('53')) {
    zoneType = 'within_state_rate';
  } else {
    const metroPrefixes = ['110', '400', '700', '600', '560', '500'];
    const isMetro = metroPrefixes.some(pref => cleanDestPin.startsWith(pref));
    zoneType = isMetro ? 'zone_metro_rate' : 'other_states_rate';
  }

  if (!rateCards || rateCards.length === 0) {
    if (zoneType === 'local_rate') return 27;
    if (zoneType === 'within_state_rate') return 31;
    if (zoneType === 'zone_metro_rate') return 34;
    return 35;
  }

  const slab = rateCards.find(r => currentTotalWeightGm >= Number(r.weight_from) && currentTotalWeightGm <= Number(r.weight_to)) 
                || rateCards[0];

  const finalRate = slab[zoneType] !== undefined ? Number(slab[zoneType]) : Number(slab.other_states_rate || 35);
  return Math.round(finalRate);
}

function refreshBillAmounts(pincode, state) {
  currentDeliveryFee = calculateDeliveryFee(pincode, state);
  currentOrderTotal = currentSubtotal + currentDeliveryFee;

  const deliveryEl = document.getElementById('checkout-delivery');
  const grandTotalEl = document.getElementById('checkout-grand-total');

  if (deliveryEl) {
    deliveryEl.innerText = currentDeliveryFee === 0 ? 'FREE' : `₹ ${currentDeliveryFee}`;
  }
  if (grandTotalEl) {
    grandTotalEl.innerText = `₹ ${currentOrderTotal.toLocaleString('en-IN')}`;
  }
}

async function fetchAndDisplayAddresses(user, customer) {
  savedAddresses = [];

  try {
    if (user?.id) {
      const { data } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('auth_user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (data && data.length > 0) savedAddresses = data;
    }

    if (savedAddresses.length === 0 && customer) {
      const fallbackAddr = {
        id: 'primary_cust_addr',
        full_name: customer.name || 'Customer',
        mobile: customer.mobile || '',
        door_address: customer.address || 'Address on file',
        pincode: customer.pincode || customer.pin || '533001',
        city: customer.city || 'Kakinada',
        state: 'Andhra Pradesh',
        address_type: 'Home',
        is_default: true
      };
      savedAddresses = [fallbackAddr];
    }

    if (savedAddresses.length > 0) {
      selectedAddress = savedAddresses[0];
      showAddressCardsView();
      refreshBillAmounts(selectedAddress.pincode, selectedAddress.state);
    } else {
      showNewAddressFormView();
    }
  } catch (err) {
    showNewAddressFormView();
  }
}

function showAddressCardsView() {
  isAddingNew = false;
  const listContainer = document.getElementById('checkout-saved-addresses-list');
  const formContainer = document.getElementById('checkout-new-address-form');
  const toggleBtn = document.getElementById('btn-toggle-add-address');

  if (formContainer) formContainer.style.display = 'none';
  if (listContainer) {
    listContainer.style.display = 'flex';
    listContainer.innerHTML = savedAddresses.map(addr => `
      <label class="address-select-card ${addr.id === selectedAddress?.id ? 'active' : ''}" data-id="${addr.id}">
        <input type="radio" name="checkout_addr_radio" class="address-radio-input" value="${addr.id}" ${addr.id === selectedAddress?.id ? 'checked' : ''}>
        <div class="address-card-body">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="font-size:0.86rem; color:var(--brand-emerald-dark);">${addr.full_name}</strong>
            <span class="address-tag-badge">${addr.address_type || 'Home'}</span>
          </div>
          <span style="font-size:0.75rem; color:var(--text-main); margin-top:2px; line-height:1.3;">
            ${addr.door_address}, ${addr.city} - ${addr.pincode}
          </span>
          <span style="font-size:0.72rem; color:var(--text-muted); margin-top:3px;">
            📱 ${addr.mobile}
          </span>
        </div>
      </label>
    `).join('');
  }

  if (toggleBtn) {
    toggleBtn.style.display = 'flex';
    toggleBtn.innerHTML = '<span>➕</span> <span>Add Another Delivery Address</span>';
  }
}

function showNewAddressFormView() {
  isAddingNew = true;
  selectedAddress = null;
  const listContainer = document.getElementById('checkout-saved-addresses-list');
  const formContainer = document.getElementById('checkout-new-address-form');
  const toggleBtn = document.getElementById('btn-toggle-add-address');

  if (listContainer) listContainer.style.display = 'none';
  if (formContainer) formContainer.style.display = 'flex';
  
  if (toggleBtn) {
    toggleBtn.style.display = savedAddresses.length > 0 ? 'flex' : 'none';
    toggleBtn.innerHTML = '<span>←</span> <span>Use Saved Addresses</span>';
  }

  const customer = getCurrentCustomer();
  const user = getCurrentUser();
  if (customer?.name) document.getElementById('new-addr-name').value = customer.name;
  if (customer?.mobile) document.getElementById('new-addr-phone').value = customer.mobile;
  if (user?.email) document.getElementById('new-addr-email').value = user.email;

  const currentPin = document.getElementById('new-addr-pincode')?.value || '533001';
  const currentState = document.getElementById('new-addr-state')?.value || 'Andhra Pradesh';
  refreshBillAmounts(currentPin, currentState);
}

// Global Direct Execution
window.triggerProceedToUPIPayment = async function() {
  const submitBtn = document.getElementById('btn-submit-order');
  const overlay = document.getElementById('checkout-modal-overlay');

  let finalName = '';
  let finalPhone = '';
  let finalEmail = '';
  let finalShippingAddress = '';
  let finalPincode = '';

  const user = getCurrentUser();
  const customer = getCurrentCustomer();

  if (!isAddingNew && selectedAddress) {
    finalName = selectedAddress.full_name || customer?.name || 'Customer';
    finalPhone = selectedAddress.mobile || customer?.mobile || '9999999999';
    finalEmail = user?.email || customer?.email || '';
    finalShippingAddress = `${selectedAddress.door_address || ''}, ${selectedAddress.city || ''}, ${selectedAddress.state || 'Andhra Pradesh'} - ${selectedAddress.pincode || ''}`;
    finalPincode = selectedAddress.pincode || '533001';
  } else {
    finalName = document.getElementById('new-addr-name')?.value.trim();
    finalPhone = document.getElementById('new-addr-phone')?.value.trim();
    finalEmail = document.getElementById('new-addr-email')?.value.trim() || user?.email || customer?.email || '';
    const door = document.getElementById('new-addr-door')?.value.trim();
    const city = document.getElementById('new-addr-city')?.value.trim();
    const state = document.getElementById('new-addr-state')?.value.trim() || 'Andhra Pradesh';
    finalPincode = document.getElementById('new-addr-pincode')?.value.trim();

    if (!finalName || !finalPhone || !door || !finalPincode) {
      alert("Please fill in Name, Phone, Door Address and Pincode.");
      return;
    }

    finalShippingAddress = `${door}, ${city}, ${state} - ${finalPincode}`;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerText = 'Creating Order...';
  }

  const rawCart = localStorage.getItem('kashvi_customer_cart');
  const cart = rawCart ? JSON.parse(rawCart) : [];

  if (cart.length === 0) {
    alert("Your cart is empty!");
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>⚡</span> <span>Proceed to Payment</span>';
    }
    return;
  }

  // 1. Generate sequential KFOD and KFOINV IDs
  const { orderId, invoiceId } = await generateNextOrderAndInvoiceId();

  // 2. Strict mapping matching public.orders table schema
  const orderPayload = {
    id: orderId,
    customer_id: user?.id || null, // Matches 'customer_id' column in public.orders
    customer_name: finalName,
    customer_phone: String(finalPhone).replace(/[^0-9]/g, '').slice(-10),
    customer_email: finalEmail || null,
    shipping_address: finalShippingAddress,
    pincode: String(finalPincode).trim(),
    items: cart,
    subtotal: Number(currentSubtotal) || 0,
    delivery_fee: Number(currentDeliveryFee) || 0,
    total: Number(currentOrderTotal) || 0,
    total_amount: Number(currentOrderTotal) || 0,
    total_weight: Number(currentTotalWeightGm) || 0,
    status: 'new',
    order_status: 'new',
    payment_status: 'payment_pending',
    payment_method: 'Cashfree PG',
    invoice_id: invoiceId,
    shipping: {
      address: finalShippingAddress,
      pincode: finalPincode,
      courier: 'India Post'
    },
    customer: {
      name: finalName,
      phone: finalPhone,
      email: finalEmail
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    const { error: insertErr } = await supabase.from('orders').insert([orderPayload]);

    if (insertErr) {
      console.error("Supabase Order Insert Error:", insertErr);
      alert("Order could not be saved: " + insertErr.message);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>⚡</span> <span>Proceed to Payment</span>';
      }
      return;
    }

    // 3. Hide checkout modal and trigger gateway
    overlay?.classList.remove('active');
    await initiatePaymentFlow(orderPayload);

  } catch (err) {
    console.error("Checkout process error:", err);
    alert("Payment error: " + err.message);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>⚡</span> <span>Proceed to Payment</span>';
    }
  }
};

function bindCheckoutEvents() {
  const overlay = document.getElementById('checkout-modal-overlay');
  const closeBtn = document.getElementById('btn-close-checkout');
  const toggleBtn = document.getElementById('btn-toggle-add-address');
  const listContainer = document.getElementById('checkout-saved-addresses-list');
  const pinInput = document.getElementById('new-addr-pincode');
  const submitBtn = document.getElementById('btn-submit-order');

  if (closeBtn && overlay) {
    closeBtn.onclick = () => overlay.classList.remove('active');
  }

  if (toggleBtn) {
    toggleBtn.onclick = (e) => {
      e.preventDefault();
      if (isAddingNew) {
        showAddressCardsView();
        if (selectedAddress) refreshBillAmounts(selectedAddress.pincode, selectedAddress.state);
      } else {
        showNewAddressFormView();
      }
    };
  }

  if (listContainer) {
    listContainer.addEventListener('change', (e) => {
      const radio = e.target.closest('.address-radio-input');
      if (!radio) return;
      selectedAddress = savedAddresses.find(a => String(a.id) === String(radio.value));
      document.querySelectorAll('.address-select-card').forEach(c => c.classList.remove('active'));
      radio.closest('.address-select-card').classList.add('active');

      if (selectedAddress) {
        refreshBillAmounts(selectedAddress.pincode, selectedAddress.state);
      }
    });
  }

  if (pinInput) {
    pinInput.addEventListener('input', async (e) => {
      const pin = e.target.value.trim();
      if (pin.length === 6) {
        try {
          const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
          const data = await res.json();
          if (data && data[0]?.Status === 'Success') {
            const po = data[0].PostOffice[0];
            const cityInput = document.getElementById('new-addr-city');
            const stateInput = document.getElementById('new-addr-state');
            if (cityInput) cityInput.value = po.District || po.Name;
            if (stateInput) stateInput.value = po.State;
            refreshBillAmounts(pin, po.State);
          } else {
            refreshBillAmounts(pin, 'Andhra Pradesh');
          }
        } catch (err) {
          refreshBillAmounts(pin, 'Andhra Pradesh');
        }
      }
    });
  }

  if (submitBtn) {
    submitBtn.onclick = (e) => {
      e.preventDefault();
      window.triggerProceedToUPIPayment();
    };
  }
}