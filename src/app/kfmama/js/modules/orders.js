import { supabase } from '../supabase.js';

let cachedOrders = [];
let currentFilter = 'all';
let selectedOrder = null;
let masterPipelinePin = '1234';

// Pending stage change storage for PIN verification
let pendingRollback = null; // { orderId, targetStatus, selectElement, prevStatus }

const PIPELINE_STAGES = [
  { key: 'new', label: 'New', order: 1 },
  { key: 'payment_check', label: 'Payment Check', order: 2 },
  { key: 'order_check', label: 'Order Check', order: 3 },
  { key: 'processing', label: 'Processing', order: 4 },
  { key: 'packing', label: 'Packing', order: 5 },
  { key: 'ready_to_dispatch', label: 'Ready to Dispatch', order: 6 },
  { key: 'dispatched', label: 'Dispatched', order: 7 },
  { key: 'delivered', label: 'Delivered', order: 8 }
];

export async function initOrdersModule() {
  bindOrderEvents();
  await Promise.all([
    fetchStorePin(),
    loadOrders()
  ]);
}

async function fetchStorePin() {
  try {
    const { data, error } = await supabase.from('store_settings').select('pipeline_pin').eq('id', 'store_config').single();
    if (data && data.pipeline_pin) {
      masterPipelinePin = String(data.pipeline_pin);
    }
  } catch (err) {
    console.warn("Using default pipeline PIN:", masterPipelinePin);
  }
}

export async function loadOrders() {
  const tbody = document.getElementById('orders-table-body');
  if (!tbody) return;

  try {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-muted);">Loading live orders...</td></tr>`;

    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    cachedOrders = orders || [];
    renderOrdersTable(filterOrders(cachedOrders, currentFilter));

  } catch (err) {
    console.error("Orders load error:", err);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--stat-red);">Error: ${err.message}</td></tr>`;
  }
}

function filterOrders(orders, status) {
  if (status === 'all') return orders;
  return orders.filter(o => (o.status || '').toLowerCase() === status.toLowerCase());
}

function renderOrdersTable(orders) {
  const tbody = document.getElementById('orders-table-body');
  if (!tbody) return;

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-muted);">No orders in this stage.</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(order => {
    const cust = typeof order.customer === 'object' && order.customer !== null ? order.customer : {};
    const pay = typeof order.payment === 'object' && order.payment !== null ? order.payment : {};
    const items = Array.isArray(order.items) ? order.items : [];
    
    const custName = cust.name || 'Customer';
    const custPhone = cust.phone || '-';
    const currentStatus = order.status || 'new';
    const statusClass = `status-${currentStatus.toLowerCase()}`;
    const dateStr = new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });

    return `
      <tr>
        <td>
          <strong style="color:var(--brand-emerald-dark);">${order.id}</strong>
          <div style="font-size:0.72rem; color:var(--text-muted);">${dateStr}</div>
        </td>
        <td>
          <strong>${custName}</strong>
          <div style="font-size:0.72rem; color:var(--text-muted);">📱 ${custPhone}</div>
        </td>
        <td>${items.length} Items</td>
        <td>
          <strong>₹ ${Number(order.total || 0).toLocaleString('en-IN')}</strong>
          <div style="font-size:0.72rem; color:var(--text-muted);">${pay.method || 'UPI'} (${pay.status || 'Pending'})</div>
        </td>
        <td>
          <span class="badge-order-status ${statusClass}">${formatStatusName(currentStatus)}</span>
        </td>
        <td>
          <div class="pipeline-action-box">
            <select class="form-select order-status-select" data-id="${order.id}" data-current="${currentStatus}" style="padding:4px 6px; font-size:0.75rem; width:135px;">
              ${PIPELINE_STAGES.map(s => `<option value="${s.key}" ${currentStatus === s.key ? 'selected' : ''}>${s.label}</option>`).join('')}
              <option value="cancelled" ${currentStatus === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
            <button type="button" class="btn-stage-done" data-id="${order.id}" title="Confirm & Apply Stage">Done</button>
          </div>
        </td>
        <td>
          <div class="action-btn-group">
            <button type="button" class="btn-icon view-order-btn" data-id="${order.id}" title="Process Stage / View">⚡ Action</button>
            <button type="button" class="btn-icon print-label-btn" data-id="${order.id}" title="Print Label">🏷️ Label</button>
            <button type="button" class="btn-icon whatsapp-order-btn" data-id="${order.id}" title="WhatsApp">💬 WA</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function formatStatusName(status) {
  const map = {
    new: 'New Order',
    payment_check: 'Payment Check',
    order_check: 'Order Check',
    processing: 'Processing',
    packing: 'Packing',
    ready_to_dispatch: 'Ready to Dispatch',
    dispatched: 'Dispatched (India Post)',
    delivered: 'Delivered',
    cancelled: 'Cancelled / Refunded'
  };
  return map[status] || status;
}

function getStageRank(statusKey) {
  const stage = PIPELINE_STAGES.find(s => s.key === statusKey);
  return stage ? stage.order : 99;
}

function bindOrderEvents() {
  const tbody = document.getElementById('orders-table-body');
  const searchInput = document.getElementById('order-search-input');
  const statusPills = document.querySelectorAll('.status-pill-btn');
  const orderModal = document.getElementById('order-detail-modal');
  const closeOrderModal = document.getElementById('btn-close-order-modal');

  // Dispatch & Refund Modal elements
  const dispatchModal = document.getElementById('dispatch-courier-modal');
  const closeDispatchBtn = document.getElementById('btn-close-dispatch-modal');
  const dispatchForm = document.getElementById('dispatch-form');

  const refundModal = document.getElementById('refund-modal');
  const closeRefundBtn = document.getElementById('btn-close-refund-modal');
  const refundForm = document.getElementById('refund-form');

  // PIN Modal elements
  const pinModal = document.getElementById('pipeline-pin-modal');
  const closePinBtn = document.getElementById('btn-close-pin-modal');
  const pinForm = document.getElementById('pipeline-pin-form');

  if (closeOrderModal && orderModal) closeOrderModal.onclick = () => orderModal.classList.remove('active');
  if (closeDispatchBtn && dispatchModal) closeDispatchBtn.onclick = () => dispatchModal.classList.remove('active');
  if (closeRefundBtn && refundModal) closeRefundBtn.onclick = () => refundModal.classList.remove('active');
  if (closePinBtn && pinModal) {
    closePinBtn.onclick = () => {
      if (pendingRollback && pendingRollback.selectElement) {
        pendingRollback.selectElement.value = pendingRollback.prevStatus;
      }
      pendingRollback = null;
      pinModal.classList.remove('active');
    };
  }

  // Filter Status Tabs
  statusPills.forEach(pill => {
    pill.addEventListener('click', () => {
      statusPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilter = pill.dataset.status;
      renderOrdersTable(filterOrders(cachedOrders, currentFilter));
    });
  });

  // Search Filter
  if (searchInput) {
    searchInput.oninput = (e) => {
      const q = e.target.value.toLowerCase();
      const filtered = cachedOrders.filter(o => {
        const cust = typeof o.customer === 'object' && o.customer !== null ? o.customer : {};
        return (o.id || '').toLowerCase().includes(q) ||
               (cust.name || '').toLowerCase().includes(q) ||
               (cust.phone || '').toLowerCase().includes(q);
      });
      renderOrdersTable(filterOrders(filtered, currentFilter));
    };
  }

  // Table Action Triggers (Select + Done & Rollback PIN check)
  if (tbody) {
    tbody.addEventListener('click', async (e) => {
      // 1. Done Button Click
      const doneBtn = e.target.closest('.btn-stage-done');
      if (doneBtn) {
        const orderId = doneBtn.dataset.id;
        const row = doneBtn.closest('tr');
        const select = row?.querySelector('.order-status-select');
        if (!select) return;

        const currentStatus = select.dataset.current;
        const targetStatus = select.value;

        if (currentStatus === targetStatus) {
          alert(`Order is already in "${formatStatusName(currentStatus)}" stage.`);
          return;
        }

        // Check if user is attempting Rollback to a Previous Step
        const currentRank = getStageRank(currentStatus);
        const targetRank = getStageRank(targetStatus);

        if (targetRank < currentRank) {
          // Backward / Rollback triggered -> Open PIN Modal
          pendingRollback = {
            orderId,
            targetStatus,
            selectElement: select,
            prevStatus: currentStatus
          };

          const pinInput = document.getElementById('rollback-pin-input');
          if (pinInput) pinInput.value = '';
          const pinMsg = document.getElementById('pin-modal-desc');
          if (pinMsg) pinMsg.innerText = `Authorisation required to move Order ${orderId} back from "${formatStatusName(currentStatus)}" to "${formatStatusName(targetStatus)}".`;
          
          if (pinModal) pinModal.classList.add('active');
          return;
        }

        // Forward Progression -> Check for special requirements
        if (targetStatus === 'dispatched') {
          // Trigger India Post Consignment entry modal
          document.getElementById('dispatch-order-id').value = orderId;
          if (dispatchModal) dispatchModal.classList.add('active');
          return;
        }

        if (targetStatus === 'cancelled') {
          // Trigger Refund UTR entry modal
          document.getElementById('refund-order-id').value = orderId;
          if (refundModal) refundModal.classList.add('active');
          return;
        }

        // Regular forward stage update
        await updateOrderStatus(orderId, targetStatus);
        return;
      }

      // 2. Row Action Buttons
      const viewBtn = e.target.closest('.view-order-btn');
      const labelBtn = e.target.closest('.print-label-btn');
      const waBtn = e.target.closest('.whatsapp-order-btn');

      if (viewBtn) {
        const order = cachedOrders.find(o => o.id === viewBtn.dataset.id);
        if (order) openOrderDetailModal(order);
        return;
      }

      if (labelBtn) {
        const order = cachedOrders.find(o => o.id === labelBtn.dataset.id);
        if (order) printShippingLabel(order);
        return;
      }

      if (waBtn) {
        const order = cachedOrders.find(o => o.id === waBtn.dataset.id);
        if (order) sendWhatsAppUpdate(order);
        return;
      }
    });
  }

  // PIN Verification Form Submission
  if (pinForm) {
    pinForm.onsubmit = async (e) => {
      e.preventDefault();
      const enteredPin = document.getElementById('rollback-pin-input')?.value.trim();

      if (enteredPin !== masterPipelinePin) {
        alert("❌ Incorrect Security PIN! Previous step transition denied.");
        return;
      }

      if (pendingRollback) {
        const { orderId, targetStatus } = pendingRollback;
        await updateOrderStatus(orderId, targetStatus);
        if (pinModal) pinModal.classList.remove('active');
        pendingRollback = null;
      }
    };
  }

  // Dispatch Courier Form Submission (India Post)
  if (dispatchForm) {
    dispatchForm.onsubmit = async (e) => {
      e.preventDefault();
      const orderId = document.getElementById('dispatch-order-id')?.value;
      const trackingNo = document.getElementById('dispatch-tracking-no')?.value.trim();

      if (!orderId || !trackingNo) {
        alert("Please enter India Post tracking number.");
        return;
      }

      const order = cachedOrders.find(o => o.id === orderId);
      const updatedShipping = { ...(order?.shipping || {}), courier: 'India Post', tracking_number: trackingNo };

      await updateOrderStatus(orderId, 'dispatched', { shipping: updatedShipping });
      if (dispatchModal) dispatchModal.classList.remove('active');
      dispatchForm.reset();
    };
  }

  // Refund Form Submission (UTR Mandatory)
  if (refundForm) {
    refundForm.onsubmit = async (e) => {
      e.preventDefault();
      const orderId = document.getElementById('refund-order-id')?.value;
      const refundUtr = document.getElementById('refund-utr-input')?.value.trim();

      if (!orderId || !refundUtr) {
        alert("Please enter Bank/UPI Refund UTR number.");
        return;
      }

      const order = cachedOrders.find(o => o.id === orderId);
      const updatedRefund = { ...(order?.refund || {}), utr: refundUtr, date: new Date().toISOString() };

      await updateOrderStatus(orderId, 'cancelled', { is_refunded: true, refund: updatedRefund });
      if (refundModal) refundModal.classList.remove('active');
      refundForm.reset();
    };
  }
}

async function updateOrderStatus(orderId, newStatus, additionalFields = {}) {
  try {
    const payload = { status: newStatus, ...additionalFields };
    const { error } = await supabase.from('orders').update(payload).eq('id', orderId);
    if (error) throw error;
    await loadOrders();
  } catch (err) {
    alert("Failed to update status: " + err.message);
  }
}

function openOrderDetailModal(order) {
  selectedOrder = order;
  const modal = document.getElementById('order-detail-modal');
  const titleEl = document.getElementById('order-modal-title');
  const itemsContainer = document.getElementById('order-modal-items-tbody');

  const cust = typeof order.customer === 'object' && order.customer !== null ? order.customer : {};
  const ship = typeof order.shipping === 'object' && order.shipping !== null ? order.shipping : {};
  const pay = typeof order.payment === 'object' && order.payment !== null ? order.payment : {};

  if (titleEl) titleEl.innerText = `Order: ${order.id}`;

  document.getElementById('modal-cust-name').innerText = cust.name || 'Customer';
  document.getElementById('modal-cust-phone').innerText = cust.phone || '-';
  document.getElementById('modal-cust-address').innerText = `${ship.address || '-'}, ${ship.city || ''} - ${ship.pincode || ''}`;
  
  document.getElementById('modal-subtotal').innerText = `₹ ${order.total}`;
  document.getElementById('modal-delivery').innerText = `₹ ${pay.delivery_charge || 0}`;
  document.getElementById('modal-total').innerText = `₹ ${order.total}`;
  document.getElementById('modal-payment').innerText = `${pay.method || 'UPI'} (${pay.status || 'Pending'})`;

  const items = Array.isArray(order.items) ? order.items : [];
  if (itemsContainer) {
    itemsContainer.innerHTML = items.map(item => `
      <tr>
        <td><strong>${item.name}</strong><br><small style="color:var(--text-muted);">${item.variant_title || ''}</small></td>
        <td>${item.quantity || 1}</td>
        <td>₹ ${item.price}</td>
        <td><strong>₹ ${(item.quantity || 1) * item.price}</strong></td>
      </tr>
    `).join('');
  }

  // Render Visual Stepper
  const stepperContainer = document.getElementById('order-stepper-container');
  if (stepperContainer) {
    const currentIndex = PIPELINE_STAGES.findIndex(s => s.key === (order.status || 'new'));
    stepperContainer.innerHTML = PIPELINE_STAGES.map((st, idx) => {
      let stateClass = '';
      if (currentIndex > idx) stateClass = 'completed';
      else if (currentIndex === idx) stateClass = 'active';

      return `
        <div class="step-node ${stateClass}">
          <div class="step-circle">${idx + 1}</div>
          <span class="step-label">${st.label}</span>
        </div>
      `;
    }).join('');
  }

  if (modal) modal.classList.add('active');
}

function printShippingLabel(order) {
  const cust = typeof order.customer === 'object' && order.customer !== null ? order.customer : {};
  const ship = typeof order.shipping === 'object' && order.shipping !== null ? order.shipping : {};
  const pay = typeof order.payment === 'object' && order.payment !== null ? order.payment : {};
  const items = Array.isArray(order.items) ? order.items : [];
  const itemsSummary = items.map(i => `${i.name} (${i.variant_title || ''}) x${i.quantity || 1}`).join(', ');

  const printWindow = window.open('', '_blank', 'width=600,height=800');
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Shipping Label - ${order.id}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .shipping-label-card { width: 380px; border: 2px solid #000; padding: 16px; margin: 0 auto; }
        .label-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 8px; }
        .label-brand-group { display: flex; align-items: center; gap: 8px; font-weight: bold; }
        .label-logo { width: 36px; height: 36px; object-fit: cover; border-radius: 4px; border: 1px solid #000; }
        .label-section { border-bottom: 1px solid #000; padding: 8px 0; font-size: 0.85rem; }
        .label-barcode { text-align: center; font-family: monospace; font-size: 1.3rem; font-weight: bold; letter-spacing: 4px; padding: 8px 0; background: #eee; margin: 6px 0; }
      </style>
    </head>
    <body onload="window.print(); window.close();">
      <div class="shipping-label-card">
        <div class="label-header">
          <div class="label-brand-group">
            <img src="assets/logo.png" class="label-logo" onerror="this.style.display='none'">
            <span>KASHVI FASHIONS</span>
          </div>
          <span>INDIA POST SPEED POST</span>
        </div>
        <div class="label-barcode">||| ${ship.tracking_number || order.id} |||</div>
        <div class="label-section">
          <strong>SHIP TO:</strong><br>
          ${cust.name || 'Customer'}<br>
          ${ship.address || ''}<br>
          ${ship.city || ''} - ${ship.pincode || ''}<br>
          Phone: ${cust.phone || '-'}
        </div>
        <div class="label-section">
          <strong>ORDER DETAILS:</strong><br>
          Items: ${itemsSummary}<br>
          Payment: <strong>${pay.method || 'UPI'}</strong> | Total: <strong>₹ ${order.total}</strong>
        </div>
        <div class="label-section" style="border-bottom:none; font-size:0.75rem;">
          <strong>RETURN / SENDER:</strong><br>
          Kashvi Fashions, Main Road, Kakinada, AP - 533001
        </div>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

function sendWhatsAppUpdate(order) {
  const cust = typeof order.customer === 'object' && order.customer !== null ? order.customer : {};
  const ship = typeof order.shipping === 'object' && order.shipping !== null ? order.shipping : {};
  const phone = (cust.phone || '').replace(/[^0-9]/g, '');
  const cleanPhone = phone.startsWith('91') ? phone : `91${phone}`;

  let trackingMsg = '';
  if (order.status === 'dispatched' && ship.tracking_number) {
    trackingMsg = `\n🚀 *Courier:* India Post\n📦 *Tracking Number:* ${ship.tracking_number}\n🔗 *Track Here:* https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx`;
  }

  const text = encodeURIComponent(
    `Hello ${cust.name || 'Customer'},\n\n*Kashvi Fashions* Order Update:\n\n📦 *Order ID:* ${order.id}\n📊 *Status:* ${formatStatusName(order.status)}\n💰 *Total:* ₹ ${order.total}${trackingMsg}\n\nThank you for shopping with us!`
  );
  window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
}