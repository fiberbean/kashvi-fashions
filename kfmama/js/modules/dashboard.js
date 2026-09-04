import { supabase } from '../supabase.js';

export async function initDashboard() {
  await Promise.all([
    fetchKpis(),
    fetchRecentOrders(),
    fetchLowStockAlerts()
  ]);
  setupRealtimeOrdersListener();
}

// 1. Fetch & Calculate Live 8 KPI Metrics
async function fetchKpis() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfMonthISO = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

    const [ordersRes, customersRes, cartsRes, analyticsRes] = await Promise.all([
      supabase.from('orders').select('id, total, status, is_refunded, created_at'),
      supabase.from('customers').select('id, created_at'),
      supabase.from('customer_carts').select('id, is_abandoned, created_at'),
      supabase.from('website_analytics').select('visitor_count').eq('visit_date', new Date().toISOString().split('T')[0]).maybeSingle()
    ]);

    const orders = ordersRes.data || [];
    const customers = customersRes.data || [];
    const carts = cartsRes.data || [];
    const visitorsToday = analyticsRes.data?.visitor_count || 0;

    const todayOrders = orders.filter(o => new Date(o.created_at) >= today);
    const mtdOrders = orders.filter(o => new Date(o.created_at) >= new Date(startOfMonthISO));

    const todaySales = todayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const revenueMtd = mtdOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const totalOrdersCount = todayOrders.length;
    const avgOrderValue = totalOrdersCount > 0 ? Math.round(todaySales / totalOrdersCount) : 0;

    const newCustomersToday = customers.filter(c => new Date(c.created_at) >= today).length;
    const conversionRate = visitorsToday > 0 ? ((totalOrdersCount / visitorsToday) * 100).toFixed(2) : "0.00";

    const totalCarts = carts.length;
    const abandonedCarts = carts.filter(c => c.is_abandoned === true).length;
    const cartAbandonRate = totalCarts > 0 ? ((abandonedCarts / totalCarts) * 100).toFixed(1) : "0";

    const totalAllOrders = orders.length;
    const refundedOrders = orders.filter(o => o.is_refunded === true || o.status === 'refunded').length;
    const refundRate = totalAllOrders > 0 ? ((refundedOrders / totalAllOrders) * 100).toFixed(1) : "0.0";

    updateKpiText('kpi-today-sales', `₹ ${todaySales.toLocaleString('en-IN')}`);
    updateKpiText('kpi-revenue-mtd', `₹ ${revenueMtd.toLocaleString('en-IN')}`);
    updateKpiText('kpi-total-orders', totalOrdersCount);
    updateKpiText('kpi-aov', `₹ ${avgOrderValue.toLocaleString('en-IN')}`);
    updateKpiText('kpi-new-customers', newCustomersToday);
    updateKpiText('kpi-conversion-rate', `${conversionRate}%`);
    updateKpiText('kpi-cart-abandon', `${cartAbandonRate}%`);
    updateKpiText('kpi-refund-rate', `${refundRate}%`);

  } catch (err) {
    console.error("KPI Fetch Error:", err);
  }
}

// 2. Fetch Recent Orders (ONLY New Orders + 5+ Scroll + Sidebar Badge Sync)
async function fetchRecentOrders() {
  const tableBody = document.getElementById('recent-orders-body');
  const sidebarBadge = document.getElementById('sidebar-order-badge');
  const tablePanel = tableBody ? tableBody.closest('.panel-container') : null;
  if (!tableBody) return;

  try {
    // Query ONLY new orders
    const { data: newOrders, error } = await supabase
      .from('orders')
      .select('id, customer, items, total, status, order_status, created_at')
      .or('order_status.ilike.%new%,status.ilike.%new%')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const count = (newOrders || []).length;

    // Sidebar Badge Sync: Show count only if not viewed in current session
    const isViewed = sessionStorage.getItem('kashvi_orders_viewed') === 'true';
    if (sidebarBadge) {
      if (count > 0 && !isViewed) {
        sidebarBadge.innerText = count;
        sidebarBadge.style.background = '#e11d48';
        sidebarBadge.style.color = '#ffffff';
        sidebarBadge.style.display = 'inline-block';
      } else {
        sidebarBadge.innerText = '0';
        sidebarBadge.style.background = 'rgba(0, 86, 75, 0.4)';
        sidebarBadge.style.color = '#ffffff';
      }
    }

    if (!newOrders || newOrders.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:24px;">✨ No pending new orders available</td></tr>`;
      const oldBar = document.getElementById('recent-orders-more-bar');
      if (oldBar) oldBar.remove();
      return;
    }

    // Render Table Rows
    tableBody.innerHTML = newOrders.map(order => {
      const customerData = typeof order.customer === 'string' ? JSON.parse(order.customer || '{}') : (order.customer || {});
      const customerName = customerData.name || customerData.full_name || 'Customer';
      const customerMobile = customerData.mobile || customerData.phone || '';

      const itemsList = Array.isArray(order.items) ? order.items : (typeof order.items === 'string' ? JSON.parse(order.items || '[]') : []);
      const firstItemTitle = itemsList.length > 0 ? (itemsList[0].name || itemsList[0].title || 'Ethnic Wear') : 'Product Item';
      const itemDisplay = itemsList.length > 1 ? `${firstItemTitle} +${itemsList.length - 1} more` : firstItemTitle;

      const cleanPhone = customerMobile.replace(/\D/g, '');
      const waMsg = encodeURIComponent(`Hello ${customerName}, greetings from Kashvi Fashions regarding your order #${order.id}.`);
      const waUrl = cleanPhone ? `https://wa.me/91${cleanPhone}?text=${waMsg}` : '#';

      return `
        <tr>
          <td><strong>#${String(order.id).slice(0, 8)}</strong></td>
          <td>${customerName}</td>
          <td>${itemDisplay}</td>
          <td>₹ ${Number(order.total || 0).toLocaleString('en-IN')}</td>
          <td><span class="badge-pink">NEW ORDER</span></td>
          <td><a href="${waUrl}" target="_blank" class="btn-wa">WhatsApp</a></td>
        </tr>
      `;
    }).join('');

    // Make table container scrollable if 5+ orders
    const tableWrap = tableBody.closest('table')?.parentElement;
    if (tableWrap) {
      tableWrap.style.maxHeight = '280px';
      tableWrap.style.overflowY = 'auto';
    }

    // Append Bottom Bar with Pipeline Jump Link
    const existingBar = document.getElementById('recent-orders-more-bar');
    if (existingBar) existingBar.remove();

    if (tablePanel) {
      const moreBar = document.createElement('div');
      moreBar.id = 'recent-orders-more-bar';
      moreBar.style.cssText = 'padding: 10px 16px; background: rgba(0, 86, 75, 0.04); border-top: 1px solid rgba(0, 86, 75, 0.08); display: flex; justify-content: space-between; align-items: center; border-radius: 0 0 10px 10px;';
      moreBar.innerHTML = `
        <span style="font-size: 0.76rem; color: var(--text-muted);">Showing <strong>${count}</strong> pending order(s)</span>
        <button type="button" id="btn-jump-orders-pipeline" style="background: none; border: none; color: var(--brand-emerald-dark); font-weight: 700; font-size: 0.78rem; cursor: pointer; display: flex; align-items: center; gap: 4px;">
          <span>Open Orders Pipeline</span> <span>→</span>
        </button>
      `;
      tablePanel.appendChild(moreBar);

      document.getElementById('btn-jump-orders-pipeline')?.addEventListener('click', () => {
        openOrdersPipelineTab();
      });
    }

  } catch (err) {
    console.error("Orders Fetch Error:", err);
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--stat-red); padding:16px;">Error loading orders</td></tr>`;
  }
}

// Helper to Open Orders Pipeline Tab & Reset Badge
function openOrdersPipelineTab() {
  // Mark viewed in session storage
  sessionStorage.setItem('kashvi_orders_viewed', 'true');
  const sidebarBadge = document.getElementById('sidebar-order-badge');
  if (sidebarBadge) {
    sidebarBadge.innerText = '0';
    sidebarBadge.style.background = 'rgba(0, 86, 75, 0.4)';
  }

  // Trigger Sidebar Click
  const ordersNavBtn = document.querySelector('.sidebar-nav [data-tab="tab-orders"]');
  if (ordersNavBtn) {
    ordersNavBtn.click();
  }

  // Select 'New' pill filter automatically
  const newPill = document.querySelector('.status-pill-btn[data-status="new"]');
  if (newPill) {
    newPill.click();
  }
}

// 3. Fetch Low Stock Urgency Alert
async function fetchLowStockAlerts() {
  const stockList = document.getElementById('low-stock-list');
  if (!stockList) return;

  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('name, stock_quantity, low_stock_threshold')
      .order('stock_quantity', { ascending: true })
      .limit(5);

    if (error) throw error;

    const alertItems = (products || []).filter(item => {
      const threshold = item.low_stock_threshold || 3;
      return Number(item.stock_quantity || 0) <= threshold;
    });

    if (alertItems.length === 0) {
      stockList.innerHTML = `<li style="color:var(--text-muted); text-align:center; padding:12px 0;">All stock levels are optimal 👍</li>`;
      return;
    }

    stockList.innerHTML = alertItems.map(item => `
      <li style="display:flex; justify-content:space-between; align-items:center; padding-bottom:10px; border-bottom:1px solid rgba(0, 86, 75, 0.06);">
        <span>${item.name}</span>
        <strong style="color:var(--stat-red); background:var(--stat-red-bg); padding:3px 8px; border-radius:6px; font-size:0.78rem;">${item.stock_quantity || 0} pcs left</strong>
      </li>
    `).join('');

  } catch (err) {
    console.error("Stock Fetch Error:", err);
    stockList.innerHTML = `<li style="color:var(--stat-red); text-align:center; padding:12px 0;">Error loading stock</li>`;
  }
}

function updateKpiText(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerText = value;
}

// Realtime Listener for Instant Order Updates
function setupRealtimeOrdersListener() {
  supabase
    .channel('dashboard-orders-sync')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
      sessionStorage.removeItem('kashvi_orders_viewed'); // Reset viewed state so badge pops up
      fetchRecentOrders();
      fetchKpis();
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
      fetchRecentOrders();
    })
    .subscribe();
}