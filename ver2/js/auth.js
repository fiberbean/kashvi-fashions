import { supabase } from './supabase.js';
import { syncUserCartToCloud, syncCloudCartToLocal, clearLocalCart } from './cart.js';

let currentUser = null;
let currentCustomer = null;
let customerAddresses = [];
let tempEmailForOtp = '';
let currentAuthMode = 'password';
let customerCachedOrders = [];

export async function initAuth() {
  // 1. Process Google OAuth Hash Token if redirected
  if (window.location.hash && window.location.hash.includes('access_token')) {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (!error && data?.session?.user) {
        currentUser = data.session.user;
        await fetchCustomerProfile(currentUser.id, currentUser.email);
        await syncCloudCartToLocal(currentUser.id);
        window.history.replaceState(null, null, window.location.pathname + window.location.search);
      }
    } catch (err) {
      console.warn("OAuth redirect session parse fallback:", err);
    }
  }

  // 2. Standard Session Check
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      currentUser = session.user;
      await fetchCustomerProfile(currentUser.id, currentUser.email);
      await syncCloudCartToLocal(currentUser.id);
    }
  } catch (err) {
    console.warn("Auth session init fallback:", err);
  }

  // 3. Realtime Auth State Listener
  supabase.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session?.user || null;
    if (currentUser) {
      await fetchCustomerProfile(currentUser.id, currentUser.email);
      await syncCloudCartToLocal(currentUser.id);
    } else {
      currentCustomer = null;
      customerAddresses = [];
      clearLocalCart();
    }
    updateUserNavUI(currentUser, currentCustomer);
  });

  bindAuthEvents();
}

export function getCurrentUser() {
  return currentUser;
}

export function getCurrentCustomer() {
  return currentCustomer;
}

async function fetchCustomerProfile(authUserId, email) {
  try {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .or(`auth_user_id.eq.${authUserId},email.eq.${email}`)
      .maybeSingle();

    if (data) {
      currentCustomer = data;
    } else if (currentUser) {
      // Auto create entry in customers table for new Google users
      const custId = 'CUST-' + authUserId.substring(0, 8).toUpperCase();
      const newCustomer = {
        id: custId,
        auth_user_id: authUserId,
        name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || email.split('@')[0],
        email: email,
        mobile: currentUser.user_metadata?.mobile || '',
        created_at: new Date().toISOString()
      };

      const { data: createdCust, error: insErr } = await supabase
        .from('customers')
        .insert([newCustomer])
        .select()
        .single();

      if (!insErr && createdCust) {
        currentCustomer = createdCust;
      }
    }
  } catch (err) {
    console.warn("Customer profile fetch fallback:", err);
  }
}

function updateUserNavUI(user, customer) {
  const authNavBtn = document.getElementById('btn-header-auth');
  const dropdown = document.getElementById('account-dropdown-menu');
  if (!authNavBtn) return;

  if (user) {
    const name = customer?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Customer';
    const initial = name.charAt(0).toUpperCase();

    authNavBtn.innerHTML = `
      <div style="width:26px; height:26px; border-radius:50%; background:var(--brand-emerald); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.75rem; border:1.5px solid var(--brand-pink);">${initial}</div>
      <span>${name.split(' ')[0]} ▾</span>
    `;

    const elName = document.getElementById('acc-menu-name');
    const elEmail = document.getElementById('acc-menu-email');
    const elAvatar = document.getElementById('acc-menu-avatar');

    if (elName) elName.innerText = name;
    if (elEmail) elEmail.innerText = user.email;
    if (elAvatar) elAvatar.innerText = initial;

    authNavBtn.onclick = (e) => {
      e.stopPropagation();
      dropdown?.classList.toggle('active');
    };

    closeAuthModal();
  } else {
    authNavBtn.innerHTML = `<span>👤</span> <span>Login / Sign Up</span>`;
    authNavBtn.onclick = () => openAuthModal();
  }
}

export function openAuthModal() {
  document.getElementById('auth-modal-overlay')?.classList.add('active');
}

export function closeAuthModal() {
  document.getElementById('auth-modal-overlay')?.classList.remove('active');
}

function openOrdersModal() {
  const modal = document.getElementById('modal-my-orders');
  if (!modal) return;
  loadCustomerOrders(currentUser?.id, currentUser?.email);
  modal.classList.add('active');
}

function openAddressesModal() {
  const modal = document.getElementById('modal-saved-addresses');
  if (!modal) return;
  loadCustomerAddresses(currentUser?.id);
  modal.classList.add('active');
}

function openSettingsModal() {
  const modal = document.getElementById('modal-profile-settings');
  if (!modal) return;
  const nameInp = document.getElementById('prof-settings-name');
  const mobInp = document.getElementById('prof-settings-mobile');
  const mailInp = document.getElementById('prof-settings-email');

  if (nameInp) nameInp.value = currentCustomer?.name || '';
  if (mobInp) mobInp.value = currentCustomer?.mobile || '';
  if (mailInp) mailInp.value = currentUser?.email || '';
  modal.classList.add('active');
}

// Compact Pipeline Classifier for Horizontal Layout
function resolveHorizontalPipeline(order) {
  const candidates = [
    order.order_status,
    order.status,
    order.current_stage,
    order.stage,
    order.shipping?.status,
    order.shipping?.stage
  ];

  if (Array.isArray(order.history) && order.history.length > 0) {
    const last = order.history[order.history.length - 1];
    if (typeof last === 'string') candidates.push(last);
    else if (last?.stage) candidates.push(last.stage);
    else if (last?.status) candidates.push(last.status);
  }

  const raw = candidates.filter(Boolean).join(' ').toLowerCase().trim();

  let activeStep = 0;
  let statusBadge = 'ORDER CONFIRMED';
  let badgeColor = '#00875a';
  let badgeBg = '#eaf8f1';
  let badgeBorder = '#a3e6c5';

  if (raw.includes('delivered') || raw.includes('completed')) {
    activeStep = 3;
    statusBadge = 'DELIVERED';
    badgeColor = '#10b981'; badgeBg = '#ecfdf5'; badgeBorder = '#6ee7b7';
  } else if ((raw.includes('dispatched') || raw.includes('shipped')) && !raw.includes('ready')) {
    activeStep = 2;
    statusBadge = 'DISPATCHED';
    badgeColor = '#0d6efd'; badgeBg = '#e8f0fe'; badgeBorder = '#b6d4fe';
  } else if (raw.includes('ready to dispatch') || raw.includes('ready_to_dispatch')) {
    activeStep = 1;
    statusBadge = 'READY TO DISPATCH';
    badgeColor = '#d97706'; badgeBg = '#fef3c7'; badgeBorder = '#fde68a';
  } else if (raw.includes('packing')) {
    activeStep = 1;
    statusBadge = 'PACKING';
    badgeColor = '#d97706'; badgeBg = '#fef3c7'; badgeBorder = '#fde68a';
  } else if (raw.includes('processing')) {
    activeStep = 1;
    statusBadge = 'PROCESSING';
    badgeColor = '#d97706'; badgeBg = '#fef3c7'; badgeBorder = '#fde68a';
  } else if (raw.includes('order check') || raw.includes('order_check')) {
    activeStep = 0;
    statusBadge = 'ORDER CHECK';
    badgeColor = '#0284c7'; badgeBg = '#e0f2fe'; badgeBorder = '#bae6fd';
  } else if (raw.includes('payment check') || raw.includes('payment_check')) {
    activeStep = 0;
    statusBadge = 'PAYMENT CHECK';
    badgeColor = '#0284c7'; badgeBg = '#e0f2fe'; badgeBorder = '#bae6fd';
  }

  const tracking = order.tracking_number || order.shipping?.tracking_number || '';
  const courier = order.courier_name || order.shipping?.courier_name || 'India Post';

  return { activeStep, statusBadge, badgeColor, badgeBg, badgeBorder, courier, tracking };
}

function renderOrderDetailView(order) {
  const list = document.getElementById('popup-orders-list');
  if (!list || !order) return;

  const amountVal = Number(order.total_amount ?? order.total ?? 0);
  const items = Array.isArray(order.items) ? order.items : [];
  
  const { activeStep, statusBadge, badgeColor, badgeBg, badgeBorder, courier: courierName, tracking: trackingNumber } = resolveHorizontalPipeline(order);

  const stages = [
    { label: 'Confirmed', icon: '✓', sub: 'Verified' },
    { label: 'Processing', icon: '⚙', sub: 'Packaging' },
    { label: 'Dispatched', icon: '🚚', sub: 'On the way' },
    { label: 'Delivered', icon: '🎁', sub: 'Completed' }
  ];

  list.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:16px; font-family:inherit; text-align:left;">
      
      <!-- Top Nav -->
      <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:8px; border-bottom:1px solid #edf2f0;">
        <button type="button" id="btn-back-to-orders-list" style="background:#f4f7f6; border:1px solid #e1ebe7; color:var(--brand-emerald-dark); font-weight:700; font-size:0.75rem; cursor:pointer; padding:6px 14px; border-radius:20px; display:inline-flex; align-items:center; gap:6px;">
          <span>←</span> <span>All Orders</span>
        </button>
        <span style="font-size:0.72rem; font-weight:700; color:#5c7169;">Order ID: <span style="color:#111; font-family:monospace; font-size:0.8rem;">#${order.id}</span></span>
      </div>

      <!-- Horizontal Live Stepper -->
      <div style="background:#ffffff; border:1px solid #e5ede9; border-radius:12px; padding:18px 14px; box-shadow:0 2px 8px rgba(0,0,0,0.03);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
          <div>
            <div style="font-size:0.82rem; font-weight:800; color:var(--brand-emerald-dark);">Live Tracking</div>
            <div style="font-size:0.68rem; color:#859a91;">Placed on ${new Date(order.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
          </div>
          <span style="background:${badgeBg}; color:${badgeColor}; font-size:0.7rem; font-weight:800; padding:4px 10px; border-radius:30px; border:1px solid ${badgeBorder}; text-transform:uppercase;">
            ● ${statusBadge}
          </span>
        </div>

        <div style="position:relative; display:flex; justify-content:space-between; margin:10px 8px 6px 8px;">
          <div style="position:absolute; top:15px; left:8%; right:8%; height:3px; background:#e8eeea; z-index:1;"></div>
          <div style="position:absolute; top:15px; left:8%; width:${(activeStep / 3) * 84}%; height:3px; background:linear-gradient(90deg, var(--brand-emerald), #00a870); z-index:2; transition:width 0.4s ease;"></div>

          ${stages.map((st, i) => {
            const isCompleted = i <= activeStep;
            const isCurrent = i === activeStep;
            return `
              <div style="display:flex; flex-direction:column; align-items:center; z-index:3; width:64px; text-align:center;">
                <div style="width:30px; height:30px; border-radius:50%; background:${isCompleted ? 'var(--brand-emerald)' : '#ffffff'}; color:${isCompleted ? '#fff' : '#8fa299'}; border:2px solid ${isCompleted ? 'var(--brand-emerald)' : '#dce6e1'}; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:800; box-shadow:${isCurrent ? '0 0 0 4px rgba(0,135,90,0.18)' : 'none'};">
                  ${st.icon}
                </div>
                <div style="font-size:0.7rem; font-weight:${isCurrent ? '800' : '600'}; color:${isCompleted ? 'var(--brand-emerald-dark)' : '#9eafa6'}; margin-top:6px; line-height:1.1;">
                  ${st.label}
                </div>
                <div style="font-size:0.6rem; color:#8fa299; margin-top:2px;">${st.sub}</div>
              </div>
            `;
          }).join('')}
        </div>

        ${activeStep >= 2 ? `
          <div style="margin-top:18px; background:#f4f9f7; border:1px dashed #aee3cc; border-radius:8px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center; font-size:0.74rem;">
            <div>
              <div style="color:#6b8277; font-size:0.68rem;">Courier Partner</div>
              <strong style="color:var(--brand-emerald-dark);">${courierName}</strong>
            </div>
            <div style="text-align:right;">
              <div style="color:#6b8277; font-size:0.68rem;">Tracking No</div>
              <span style="font-family:monospace; font-weight:800; color:#1a2e26; background:#fff; padding:3px 8px; border-radius:4px; border:1px solid #cce5db;">
                ${trackingNumber || 'In Transit'}
              </span>
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Items Ordered -->
      <div style="background:#ffffff; border:1px solid #e5ede9; border-radius:12px; padding:14px; box-shadow:0 2px 8px rgba(0,0,0,0.03);">
        <div style="font-size:0.8rem; font-weight:800; color:var(--brand-emerald-dark); margin-bottom:12px; display:flex; justify-content:space-between;">
          <span>Items Ordered (${items.length})</span>
          ${order.invoice_id ? `<span style="font-weight:700; font-size:0.7rem; color:var(--brand-pink-dark);">Invoice: #${order.invoice_id}</span>` : ''}
        </div>

        <div style="display:flex; flex-direction:column; gap:10px;">
          ${items.map(it => `
            <div style="display:flex; gap:12px; align-items:center; padding:10px; background:#fafcfb; border-radius:8px; border:1px solid #edf4f1;">
              <img src="${it.image || 'https://placehold.co/80'}" style="width:48px; height:58px; object-fit:cover; border-radius:6px; border:1px solid #e2ece7;">
              <div style="flex:1; min-width:0;">
                <div style="font-size:0.78rem; font-weight:700; color:#1a2b25; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${it.name}</div>
                <div style="display:flex; gap:6px; margin-top:4px;">
                  ${it.colour ? `<span style="font-size:0.65rem; background:#fff; border:1px solid #dbe6e1; padding:1px 6px; border-radius:4px; color:#496156;">${it.colour}</span>` : ''}
                  ${it.size ? `<span style="font-size:0.65rem; background:#fff; border:1px solid #dbe6e1; padding:1px 6px; border-radius:4px; color:#496156;">Size: ${it.size}</span>` : ''}
                </div>
                <div style="font-size:0.7rem; color:#6b8277; margin-top:4px;">Qty: <strong>${it.qty || 1}</strong> &times; ₹${Number(it.price || 0).toLocaleString('en-IN')}</div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:0.82rem; font-weight:800; color:var(--brand-emerald-dark);">₹${((it.price || 0) * (it.qty || 1)).toLocaleString('en-IN')}</div>
              </div>
            </div>
          `).join('')}
        </div>

        <div style="margin-top:14px; padding-top:12px; border-top:1px dashed #e1ece6; display:flex; flex-direction:column; gap:6px; font-size:0.74rem;">
          <div style="display:flex; justify-content:space-between; color:#62796e;">
            <span>Subtotal</span>
            <span>₹${Number(order.subtotal || (amountVal - Number(order.delivery_fee || 0))).toLocaleString('en-IN')}</span>
          </div>
          <div style="display:flex; justify-content:space-between; color:#62796e;">
            <span>Shipping & Packaging</span>
            <span>${Number(order.delivery_fee) === 0 ? '<strong style="color:#00875a;">FREE</strong>' : '₹' + order.delivery_fee}</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-weight:800; color:#112019; font-size:0.86rem; padding-top:6px; border-top:1px solid #edf4f1;">
            <span>Total Paid</span>
            <span style="color:var(--brand-emerald-dark);">₹${amountVal.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div style="margin-top:10px; background:#f4f9f7; border-radius:6px; padding:6px 10px; display:flex; justify-content:space-between; align-items:center; font-size:0.68rem; color:#4d665b;">
          <span>Payment: <strong>${order.payment_method || 'Online'}</strong></span>
          <span style="font-family:monospace; color:#789286;">Ref: ${(order.payment_ref || order.payment_reference || '').slice(-12)}</span>
        </div>
      </div>

      <!-- Address Box -->
      <div style="background:#ffffff; border:1px solid #e5ede9; border-radius:12px; padding:14px; box-shadow:0 2px 8px rgba(0,0,0,0.03);">
        <div style="font-size:0.75rem; font-weight:800; color:var(--brand-emerald-dark); margin-bottom:6px; display:flex; align-items:center; gap:6px;">
          <span>📍</span> <span>Delivery Address</span>
        </div>
        <div style="font-size:0.74rem; color:#33483f; line-height:1.4;">
          ${order.shipping_address || 'Address provided during order'} ${order.pincode ? ' - ' + order.pincode : ''}
        </div>
        <div style="font-size:0.7rem; color:#6c8278; margin-top:4px;">
          📞 Contact: <strong>${order.customer_phone || ''}</strong>
        </div>
      </div>

    </div>
  `;

  document.getElementById('btn-back-to-orders-list')?.addEventListener('click', () => {
    renderCustomerOrdersList(customerCachedOrders);
  });
}

function renderCustomerOrdersList(orders) {
  const list = document.getElementById('popup-orders-list');
  if (!list) return;

  if (!orders || orders.length === 0) {
    list.innerHTML = `
      <div style="text-align:center; padding:40px 10px; color:var(--text-muted);">
        <div style="font-size:2.2rem; margin-bottom:8px;">🛍️</div>
        <div style="font-weight:700; font-size:0.86rem; color:#2c3e37;">No Orders Found</div>
        <div style="font-size:0.74rem; color:#799187; margin-top:4px;">Your order history will show up here once placed.</div>
      </div>
    `;
    return;
  }

  list.innerHTML = orders.map(ord => {
    const { statusBadge, badgeColor, badgeBg, badgeBorder } = resolveHorizontalPipeline(ord);
    const amountVal = Number(ord.total_amount ?? ord.total ?? 0);
    const dateStr = new Date(ord.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });

    return `
      <div class="customer-order-card" data-order-id="${ord.id}" style="border:1px solid #e1ece7; border-radius:10px; padding:14px; margin-bottom:12px; background:#fff; cursor:pointer; box-shadow:0 1px 4px rgba(0,0,0,0.03);">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong style="font-size:0.88rem; color:var(--brand-emerald-dark);">Order #${ord.id}</strong>
            <div style="font-size:0.68rem; color:#7b9187; margin-top:1px;">Placed on ${dateStr}</div>
          </div>
          <span style="background:${badgeBg}; color:${badgeColor}; font-size:0.68rem; font-weight:800; padding:3px 9px; border-radius:20px; border:1px solid ${badgeBorder}; text-transform:uppercase;">
            ${statusBadge}
          </span>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:12px; padding-top:10px; border-top:1px solid #f1f6f3;">
          <div>
            <span style="font-size:0.7rem; color:#73887f;">Total Amount:</span>
            <div style="font-size:0.9rem; font-weight:800; color:#172a22;">₹ ${amountVal.toLocaleString('en-IN')}</div>
          </div>
          <div style="font-size:0.72rem; color:var(--brand-emerald); font-weight:800; display:flex; align-items:center; gap:3px;">
            <span>Track & Details</span> <span>→</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function loadCustomerOrders(authUserId, email) {
  const list = document.getElementById('popup-orders-list');
  if (!list) return;

  list.innerHTML = `<div style="text-align:center; padding:30px; font-size:0.82rem; color:var(--text-muted);">Fetching latest orders...</div>`;

  try {
    let query = supabase.from('orders').select('*');
    
    const phone = currentCustomer?.mobile || currentUser?.user_metadata?.mobile;
    const filterClauses = [];

    if (authUserId) filterClauses.push(`customer_id.eq.${authUserId}`);
    if (phone) filterClauses.push(`customer_phone.eq.${String(phone).replace(/[^0-9]/g, '').slice(-10)}`);
    if (email) filterClauses.push(`customer_email.eq.${email}`);

    if (filterClauses.length > 0) {
      query = query.or(filterClauses.join(','));
    }

    const { data: orders, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    customerCachedOrders = orders || [];
    renderCustomerOrdersList(customerCachedOrders);

  } catch (err) {
    console.error("Orders fetch fallback:", err);
    list.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.8rem;">No past orders found.</div>`;
  }
}

async function loadCustomerAddresses(authUserId) {
  const container = document.getElementById('popup-addresses-list');
  if (!container) return;

  try {
    const { data, error } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('auth_user_id', authUserId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    customerAddresses = data || [];

    if (customerAddresses.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; font-size:0.78rem; color:var(--text-muted); padding:16px; background:#f9fbfa; border-radius:8px;">
          No saved addresses found. Add one below.
        </div>
      `;
      return;
    }

    container.innerHTML = customerAddresses.map(a => `
      <div class="saved-addr-card ${a.is_default ? 'is-default' : ''}">
        <div style="display:flex; flex-direction:column; gap:2px; flex:1;">
          <div style="display:flex; align-items:center; gap:6px;">
            <strong style="font-size:0.84rem; color:var(--brand-emerald-dark);">${a.full_name}</strong>
            <span class="address-tag-badge">${a.address_type}</span>
            ${a.is_default ? `<span style="font-size:0.6rem; background:rgba(0,135,90,0.1); color:var(--stat-green); padding:1px 4px; border-radius:3px; font-weight:700;">DEFAULT</span>` : ''}
          </div>
          <span style="font-size:0.76rem; color:var(--text-main);">${a.door_address}, ${a.city} - ${a.pincode}</span>
          <span style="font-size:0.72rem; color:var(--text-muted);">📱 ${a.mobile}</span>
        </div>
        <button type="button" class="btn-delete-addr-icon" data-id="${a.id}" title="Delete Address">&times;</button>
      </div>
    `).join('');

  } catch (err) {
    container.innerHTML = `<div style="color:var(--stat-red); font-size:0.75rem;">Failed to load addresses.</div>`;
  }
}

function bindAuthEvents() {
  const overlay = document.getElementById('auth-modal-overlay');
  const closeBtn = document.getElementById('btn-close-auth');
  const tabLogin = document.getElementById('tab-btn-login');
  const tabRegister = document.getElementById('tab-btn-register');
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');
  const formOtpVerify = document.getElementById('form-otp-verify');
  const dropdown = document.getElementById('account-dropdown-menu');
  const ordersListContainer = document.getElementById('popup-orders-list');
  const googleBtn = document.getElementById('btn-google-login');

  // Bind Google OAuth Trigger
  if (googleBtn) {
    googleBtn.onclick = async (e) => {
      e.preventDefault();
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin
          }
        });
        if (error) throw error;
      } catch (err) {
        console.error("Google Sign-In Trigger Error:", err);
        alert("Google Sign-In Error: " + (err.message || err));
      }
    };
  }

  window.addEventListener('click', () => {
    dropdown?.classList.remove('active');
  });

  if (ordersListContainer) {
    ordersListContainer.addEventListener('click', async (e) => {
      const card = e.target.closest('.customer-order-card');
      if (!card) return;
      const orderId = card.dataset.orderId;

      const { data: freshOrder } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (freshOrder) {
        renderOrderDetailView(freshOrder);
      } else {
        const cached = customerCachedOrders.find(o => String(o.id) === String(orderId));
        if (cached) renderOrderDetailView(cached);
      }
    });
  }

  document.getElementById('menu-item-orders')?.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown?.classList.remove('active');
    openOrdersModal();
  });

  document.getElementById('menu-item-addresses')?.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown?.classList.remove('active');
    openAddressesModal();
  });

  document.getElementById('menu-item-settings')?.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown?.classList.remove('active');
    openSettingsModal();
  });

  document.getElementById('menu-item-logout')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to sign out?")) {
      await supabase.auth.signOut();
      window.location.reload();
    }
  });

  document.querySelectorAll('.btn-close-acc-modal').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.account-modal-overlay').forEach(m => m.classList.remove('active'));
    };
  });

  document.querySelectorAll('.account-modal-overlay').forEach(modal => {
    modal.onclick = (e) => {
      if (e.target === modal) modal.classList.remove('active');
    };
  });

  if (closeBtn) closeBtn.onclick = closeAuthModal;
  if (overlay) {
    overlay.onclick = (e) => {
      if (e.target === overlay) closeAuthModal();
    };
  }

  const toggleAddAddrBtn = document.getElementById('btn-toggle-popup-add-addr');
  const addAddrBox = document.getElementById('form-popup-add-address');
  if (toggleAddAddrBtn && addAddrBox) {
    toggleAddAddrBtn.onclick = () => {
      const isHidden = addAddrBox.style.display === 'none' || !addAddrBox.style.display;
      addAddrBox.style.display = isHidden ? 'flex' : 'none';
      toggleAddAddrBtn.innerText = isHidden ? '✕ Cancel' : '+ Add New Address';
    };
  }

  document.getElementById('form-popup-add-address')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const custId = currentCustomer?.id || ('CUST-' + currentUser.id.substring(0, 8).toUpperCase());
    const isDefault = document.getElementById('popup-addr-default')?.checked || customerAddresses.length === 0;

    const newAddr = {
      customer_id: custId,
      auth_user_id: currentUser.id,
      address_type: document.getElementById('popup-addr-type').value,
      full_name: document.getElementById('popup-addr-name').value.trim(),
      mobile: document.getElementById('popup-addr-phone').value.trim(),
      door_address: document.getElementById('popup-addr-door').value.trim(),
      pincode: document.getElementById('popup-addr-pin').value.trim(),
      city: document.getElementById('popup-addr-city').value.trim(),
      state: 'Andhra Pradesh',
      is_default: isDefault
    };

    try {
      if (isDefault && customerAddresses.length > 0) {
        await supabase.from('customer_addresses').update({ is_default: false }).eq('auth_user_id', currentUser.id);
      }
      const { error } = await supabase.from('customer_addresses').insert([newAddr]);
      if (error) throw error;

      alert("✓ Address Saved!");
      e.target.reset();
      addAddrBox.style.display = 'none';
      toggleAddAddrBtn.innerText = '+ Add New Address';
      await loadCustomerAddresses(currentUser.id);
    } catch (err) {
      alert("Error saving address: " + err.message);
    }
  });

  document.getElementById('popup-addresses-list')?.addEventListener('click', async (e) => {
    const delBtn = e.target.closest('.btn-delete-addr-icon');
    if (!delBtn) return;
    const addrId = delBtn.dataset.id;

    if (confirm("Delete this saved address?")) {
      await supabase.from('customer_addresses').delete().eq('id', addrId);
      await loadCustomerAddresses(currentUser.id);
    }
  });

  document.getElementById('form-profile-settings-popup')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const updatedName = document.getElementById('prof-settings-name').value.trim();
    const updatedMobile = document.getElementById('prof-settings-mobile').value.trim();

    try {
      const custId = currentCustomer?.id || ('CUST-' + currentUser.id.substring(0, 8).toUpperCase());
      await supabase.from('customers').upsert([{
        id: custId,
        auth_user_id: currentUser.id,
        name: updatedName,
        mobile: updatedMobile,
        email: currentUser.email
      }], { onConflict: 'auth_user_id' });

      await supabase.auth.updateUser({
        data: { full_name: updatedName, mobile: updatedMobile }
      });

      alert("✓ Profile updated successfully!");
      await fetchCustomerProfile(currentUser.id, currentUser.email);
      updateUserNavUI(currentUser, currentCustomer);
      document.getElementById('modal-profile-settings')?.classList.remove('active');
    } catch (err) {
      alert("Error updating profile: " + err.message);
    }
  });

  document.getElementById('btn-change-email-popup')?.addEventListener('click', async () => {
    if (!currentUser) return;
    const newEmail = prompt("Enter your new email address:");
    if (!newEmail || !newEmail.includes('@')) return;

    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) {
      alert("Error: " + error.message);
    } else {
      alert("✓ Verification link/OTP sent to your new email. Please verify to confirm.");
    }
  });

  tabLogin?.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    formLogin.style.display = 'flex';
    formRegister.style.display = 'none';
    formOtpVerify.style.display = 'none';
  });

  tabRegister?.addEventListener('click', () => {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    formRegister.style.display = 'flex';
    formLogin.style.display = 'none';
    formOtpVerify.style.display = 'none';
  });

  document.getElementById('link-login-with-otp')?.addEventListener('click', () => {
    const email = document.getElementById('login-email').value.trim();
    if (!email) {
      alert("Please enter your email above first.");
      return;
    }
    sendOtpToEmail(email, 'magiclink');
  });

  document.getElementById('link-forgot-password')?.addEventListener('click', () => {
    const email = document.getElementById('login-email').value.trim();
    if (!email) {
      alert("Please enter your registered email first.");
      return;
    }
    sendOtpToEmail(email, 'recovery');
  });

  formLogin?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = formLogin.querySelector('button[type="submit"]');
    btn.innerText = 'Signing in...';
    btn.disabled = true;

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    btn.innerText = 'Sign In';
    btn.disabled = false;

    if (error) {
      alert("Login Error: " + error.message);
    } else {
      if (data?.user) {
        await fetchCustomerProfile(data.user.id, email);
      }
      closeAuthModal();
      window.location.reload();
    }
  });

  formRegister?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const mobile = document.getElementById('reg-whatsapp').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;

    const btn = formRegister.querySelector('button[type="submit"]');
    btn.innerText = 'Sending Verification OTP...';
    btn.disabled = true;

    currentAuthMode = 'signup';
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, mobile: mobile } }
    });

    btn.innerText = 'Send Email OTP & Register';
    btn.disabled = false;

    if (error) {
      alert("Registration Error: " + error.message);
    } else {
      tempEmailForOtp = email;
      formRegister.style.display = 'none';
      formLogin.style.display = 'none';
      formOtpVerify.style.display = 'flex';
      document.getElementById('otp-target-email').innerText = email;
    }
  });

  formOtpVerify?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = document.getElementById('auth-otp-token').value.trim();
    const btn = formOtpVerify.querySelector('button[type="submit"]');
    btn.innerText = 'Verifying OTP...';
    btn.disabled = true;

    const verifyType = currentAuthMode === 'recovery' ? 'recovery' : (currentAuthMode === 'magiclink' ? 'magiclink' : 'signup');

    const { data, error } = await supabase.auth.verifyOtp({
      email: tempEmailForOtp,
      token,
      type: verifyType
    });

    btn.innerText = 'Verify OTP & Continue';
    btn.disabled = false;

    if (error) {
      alert("OTP Error: " + error.message);
    } else {
      if (data?.user) {
        const custId = 'CUST-' + data.user.id.substring(0, 8).toUpperCase();
        await supabase.from('customers').upsert([{
          id: custId,
          auth_user_id: data.user.id,
          name: data.user.user_metadata?.full_name || '',
          mobile: data.user.user_metadata?.mobile || '',
          email: tempEmailForOtp,
          created_at: new Date().toISOString()
        }], { onConflict: 'auth_user_id' });
      }
      alert("✓ Verification Successful!");
      closeAuthModal();
      window.location.reload();
    }
  });
}

async function sendOtpToEmail(email, mode) {
  currentAuthMode = mode;
  tempEmailForOtp = email;

  try {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) throw error;

    document.getElementById('form-login').style.display = 'none';
    document.getElementById('form-register').style.display = 'none';
    const formOtpVerify = document.getElementById('form-otp-verify');
    formOtpVerify.style.display = 'flex';
    document.getElementById('otp-target-email').innerText = email;
  } catch (err) {
    alert("Error sending OTP: " + err.message);
  }
}