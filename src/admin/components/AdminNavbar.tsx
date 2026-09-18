<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kashvi Hub — Top Navigation Admin</title>
  <link rel="stylesheet" href="css/theme.css">
</head>
<body>

  <!-- TOP HORIZONTAL NAVIGATION BAR -->
  <nav class="top-navbar">
    <div class="nav-container">
      
      <!-- Brand Logo -->
      <a href="#" class="brand-box">
        <div class="brand-badge">KF</div>
        <div class="brand-text-wrap">
          <span class="brand-title">KASHVI</span>
          <span class="brand-tag">Ceramic OS</span>
        </div>
      </a>

      <!-- Center Nav Links & Dropdowns -->
      <ul class="nav-menu-list">
        
        <!-- 1. Dashboard -->
        <li class="nav-item">
          <button type="button" class="nav-pill-btn active" data-tab="tab-analytics">
            <span>📊</span>
            <span>Analytics</span>
          </button>
        </li>

        <!-- 2. Catalog Dropdown -->
        <li class="nav-item">
          <button type="button" class="nav-pill-btn" data-tab="tab-products">
            <span>👗</span>
            <span>Catalog</span>
            <span class="dropdown-arrow">▼</span>
          </button>
          <div class="dropdown-menu">
            <button type="button" class="dropdown-item" data-tab="tab-products">
              <span>👗</span>
              <div>
                <div>All Products</div>
                <span class="dropdown-desc">Inventory & Vault</span>
              </div>
            </button>
            <button type="button" class="dropdown-item" id="btn-quick-add-prod">
              <span>✨</span>
              <div>
                <div>+ Add Product</div>
                <span class="dropdown-desc">Publish new item</span>
              </div>
            </button>
          </div>
        </li>

        <!-- 3. Store Masters Dropdown -->
        <li class="nav-item">
          <button type="button" class="nav-pill-btn" data-tab="tab-masters">
            <span>🏛️</span>
            <span>Masters</span>
            <span class="dropdown-arrow">▼</span>
          </button>
          <div class="dropdown-menu">
            <button type="button" class="dropdown-item" data-master="category">
              <span>📁</span>
              <div>
                <div>Categories</div>
                <span class="dropdown-desc">Storefront headers</span>
              </div>
            </button>
            <button type="button" class="dropdown-item" data-master="subcategory">
              <span>🏛️</span>
              <div>
                <div>Sub-Categories</div>
                <span class="dropdown-desc">Arch images & filters</span>
              </div>
            </button>
            <button type="button" class="dropdown-item" data-master="brand">
              <span>🏷️</span>
              <div>
                <div>Brands</div>
                <span class="dropdown-desc">Manufacturer tags</span>
              </div>
            </button>
            <button type="button" class="dropdown-item" data-master="colour">
              <span>🎨</span>
              <div>
                <div>Colours</div>
                <span class="dropdown-desc">Hex color shades</span>
              </div>
            </button>
            <button type="button" class="dropdown-item" data-master="size">
              <span>📏</span>
              <div>
                <div>Sizes</div>
                <span class="dropdown-desc">Dimensions & scales</span>
              </div>
            </button>
            <button type="button" class="dropdown-item" data-master="fabric">
              <span>🧵</span>
              <div>
                <div>Fabrics</div>
                <span class="dropdown-desc">Materials & blends</span>
              </div>
            </button>
          </div>
        </li>

        <!-- 4. Orders -->
        <li class="nav-item">
          <button type="button" class="nav-pill-btn" data-tab="tab-orders">
            <span>📦</span>
            <span>Orders</span>
            <span style="font-size:0.7rem; font-weight:800; background:var(--brand-blush); color:#fff; padding:2px 7px; border-radius:20px;" id="badge-orders">0</span>
          </button>
        </li>

        <!-- 5. Settings Dropdown -->
        <li class="nav-item">
          <button type="button" class="nav-pill-btn">
            <span>⚙️</span>
            <span>Store Config</span>
            <span class="dropdown-arrow">▼</span>
          </button>
          <div class="dropdown-menu">
            <button type="button" class="dropdown-item" data-tab="tab-pincodes">
              <span>📍</span>
              <div>
                <div>Pincode Database</div>
                <span class="dropdown-desc">Zones & service areas</span>
              </div>
            </button>
            <button type="button" class="dropdown-item" data-tab="tab-rates">
              <span>🚚</span>
              <div>
                <div>Delivery Rates</div>
                <span class="dropdown-desc">Zone-wise charges</span>
              </div>
            </button>
            <button type="button" class="dropdown-item" data-tab="tab-gateways">
              <span>💳</span>
              <div>
                <div>Gateways</div>
                <span class="dropdown-desc">Cashfree / UPI setup</span>
              </div>
            </button>
          </div>
        </li>

      </ul>

      <!-- Right Controls -->
      <div class="nav-actions">
        <div class="quick-search">
          <input type="text" placeholder="Search orders, SKUs...">
        </div>
        <button type="button" class="btn-lock" id="btn-lock-session">🔒 Lock</button>
      </div>

    </div>
  </nav>

  <!-- MAIN WORKSPACE -->
  <main class="main-workspace">

    <!-- 1. ANALYTICS VIEW -->
    <section id="tab-analytics" class="tab-view active">
      <div class="section-head">
        <h2 class="section-title">Store Pulse & Performance</h2>
      </div>

      <div class="ceramic-bento-grid">
        <div class="ceramic-card">
          <div class="ceramic-card-top">
            <span class="ceramic-card-label">Today's Sales</span>
            <span>💵</span>
          </div>
          <div class="ceramic-card-value" id="kpi-today-sales">₹ 0</div>
          <div class="ceramic-card-badge">Verified Today</div>
        </div>

        <div class="ceramic-card">
          <div class="ceramic-card-top">
            <span class="ceramic-card-label">Orders Received</span>
            <span>📦</span>
          </div>
          <div class="ceramic-card-value" id="kpi-total-orders">0</div>
          <div class="ceramic-card-badge">Live Pipeline</div>
        </div>

        <div class="ceramic-card">
          <div class="ceramic-card-top">
            <span class="ceramic-card-label">Average Basket</span>
            <span>🏷️</span>
          </div>
          <div class="ceramic-card-value" id="kpi-aov">₹ 0</div>
          <div class="ceramic-card-badge">AOV</div>
        </div>
      </div>
    </section>

    <!-- 2. MASTERS VIEW -->
    <section id="tab-masters" class="tab-view" style="display: none;">
      <div class="section-head">
        <h2 class="section-title">Store Masters Hub</h2>
      </div>

      <div class="master-bento-grid">
        <div class="master-tile" data-master="category">
          <div>
            <div class="master-tile-name">Categories</div>
            <div class="master-tile-count" id="count-category">0 Items</div>
          </div>
          <span style="font-size:1.6rem;">📁</span>
        </div>

        <div class="master-tile" data-master="subcategory">
          <div>
            <div class="master-tile-name">Sub-Categories</div>
            <div class="master-tile-count" id="count-subcategory">0 Items</div>
          </div>
          <span style="font-size:1.6rem;">🏛️</span>
        </div>

        <div class="master-tile" data-master="brand">
          <div>
            <div class="master-tile-name">Brands</div>
            <div class="master-tile-count" id="count-brand">0 Items</div>
          </div>
          <span style="font-size:1.6rem;">🏷️</span>
        </div>

        <div class="master-tile" data-master="colour">
          <div>
            <div class="master-tile-name">Colours</div>
            <div class="master-tile-count" id="count-colour">0 Items</div>
          </div>
          <span style="font-size:1.6rem;">🎨</span>
        </div>

        <div class="master-tile" data-master="size">
          <div>
            <div class="master-tile-name">Sizes</div>
            <div class="master-tile-count" id="count-size">0 Items</div>
          </div>
          <span style="font-size:1.6rem;">📏</span>
        </div>

        <div class="master-tile" data-master="fabric">
          <div>
            <div class="master-tile-name">Fabrics</div>
            <div class="master-tile-count" id="count-fabric">0 Items</div>
          </div>
          <span style="font-size:1.6rem;">🧵</span>
        </div>
      </div>
    </section>

    <!-- 3. INVENTORY VIEW -->
    <section id="tab-products" class="tab-view" style="display: none;">
      <div class="section-head">
        <h2 class="section-title">Product Catalog & Vault</h2>
        <button type="button" class="btn-ceramic-primary">+ Add New Product</button>
      </div>
      <div class="ceramic-card" style="text-align: center; padding: 48px; color: var(--text-dim);">
        Loading inventory items...
      </div>
    </section>

    <!-- 4. ORDERS VIEW -->
    <section id="tab-orders" class="tab-view" style="display: none;">
      <div class="section-head">
        <h2 class="section-title">Order Processing Flow</h2>
      </div>
      <div class="ceramic-card" style="text-align: center; padding: 48px; color: var(--text-dim);">
        Order pipeline loading...
      </div>
    </section>

  </main>

  <!-- Nordic Drawer (For Attribute Edits) -->
  <div class="nordic-drawer-overlay" id="nordic-drawer">
    <div class="nordic-drawer">
      <div class="nordic-drawer-head">
        <h3 class="nordic-drawer-title" id="drawer-title">Manage Attribute</h3>
        <button type="button" id="btn-close-drawer" style="background:none; border:none; color:var(--text-dim); font-size:1.4rem; cursor:pointer;">&times;</button>
      </div>
      <div id="drawer-content" style="padding: 24px; flex: 1; overflow-y: auto;"></div>
    </div>
  </div>

  <script type="module">
    import { supabase } from './js/supabase.js';

    // Top Nav Tab Router
    function switchTab(targetId) {
      document.querySelectorAll('.nav-pill-btn').forEach(b => b.classList.remove('active'));
      const activeBtn = document.querySelector(`.nav-pill-btn[data-tab="${targetId}"]`);
      if (activeBtn) activeBtn.classList.add('active');

      document.querySelectorAll('.tab-view').forEach(v => v.style.display = 'none');
      const targetView = document.getElementById(targetId);
      if (targetView) targetView.style.display = 'block';
    }

    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = btn.dataset.tab;
        if (target) switchTab(target);
      });
    });

    // Drawer Closer
    const drawer = document.getElementById('nordic-drawer');
    document.getElementById('btn-close-drawer')?.addEventListener('click', () => {
      drawer.classList.remove('active');
    });

    // Master Click Handler (From Grid and Dropdowns)
    document.querySelectorAll('[data-master]').forEach(el => {
      el.addEventListener('click', () => {
        const mType = el.dataset.master;
        document.getElementById('drawer-title').innerText = `Manage ${mType.toUpperCase()}`;
        drawer.classList.add('active');
      });
    });
  </script>
</body>
</html>