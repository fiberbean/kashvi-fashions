import { supabase } from './supabase.js';
import { openCheckoutModal } from './checkout.js';
import { getCurrentUser, openAuthModal } from './auth.js';

let cart = JSON.parse(localStorage.getItem('kashvi_customer_cart')) || [];
let storeConfig = { free_delivery_above: 999, flat_delivery_fee: 60 };

export async function initCart() {
  await fetchStoreRules();
  renderCartDrawer();
  bindCartEvents();
}

async function fetchStoreRules() {
  try {
    const { data } = await supabase.from('store_settings').select('*').eq('id', 'store_config').single();
    if (data) {
      storeConfig.free_delivery_above = data.free_delivery_above ?? 999;
      storeConfig.flat_delivery_fee = data.flat_delivery_fee ?? 60;
    }
  } catch (err) {
    console.warn("Store rules fallback:", err);
  }
}

export function addToCart(product, selectedVariant, quantity = 1) {
  const variantId = selectedVariant?.id || `${product.id}-${selectedVariant?.colour || 'std'}-${selectedVariant?.size || 'fs'}`;
  const existingIdx = cart.findIndex(item => item.variantId === variantId);

  const price = parseFloat(selectedVariant?.price ?? product.selling_price ?? product.price ?? 0);
  const image = selectedVariant?.image ?? (Array.isArray(product.images) ? (product.images[0]?.url || product.images[0]) : product.images) ?? 'https://placehold.co/100';
  const color = selectedVariant?.colour || selectedVariant?.color || 'Standard';
  const size = selectedVariant?.size || 'Free Size';

  if (existingIdx > -1) {
    cart[existingIdx].qty += quantity;
  } else {
    cart.push({
      id: product.id,
      variantId,
      name: product.name,
      brand: product.brand || 'Kashvi Fashions',
      price,
      image,
      colour: color,
      size,
      qty: quantity
    });
  }

  saveCart();
  renderCartDrawer();
  openCartDrawer();
}

function saveCart() {
  localStorage.setItem('kashvi_customer_cart', JSON.stringify(cart));
  updateCartBadge();

  // Sync to Cloud if User is Logged In
  const user = getCurrentUser();
  if (user) {
    syncUserCartToCloud(user.id);
  }
}

export async function syncUserCartToCloud(userId) {
  try {
    await supabase.from('user_carts').upsert([{
      user_id: userId,
      cart_items: cart,
      updated_at: new Date().toISOString()
    }]);
  } catch (err) {
    console.warn("Cloud cart sync error:", err);
  }
}

export async function syncCloudCartToLocal(userId) {
  try {
    const { data } = await supabase.from('user_carts').select('cart_items').eq('user_id', userId).single();
    if (data?.cart_items && Array.isArray(data.cart_items) && data.cart_items.length > 0) {
      cart = data.cart_items;
      localStorage.setItem('kashvi_customer_cart', JSON.stringify(cart));
      renderCartDrawer();
      updateCartBadge();
    } else if (cart.length > 0) {
      syncUserCartToCloud(userId);
    }
  } catch (err) {
    console.warn("Cloud cart download error:", err);
  }
}

export function clearLocalCart() {
  cart = [];
  localStorage.removeItem('kashvi_customer_cart');
  renderCartDrawer();
  updateCartBadge();
}

export function updateCartBadge() {
  const badge = document.getElementById('cart-items-count');
  const count = cart.reduce((acc, i) => acc + i.qty, 0);
  if (badge) badge.innerText = count;
}

export function renderCartDrawer() {
  const container = document.getElementById('cart-items-list');
  const totalEl = document.getElementById('cart-total-price');
  const freeShipBar = document.getElementById('cart-free-ship-msg');

  if (!container) return;

  const subtotal = cart.reduce((acc, i) => acc + (i.price * i.qty), 0);

  if (cart.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:30px; color:var(--text-muted); font-size:0.85rem;">
        Your shopping bag is empty.
      </div>
    `;
    if (totalEl) totalEl.innerText = `₹ 0`;
    if (freeShipBar) freeShipBar.innerText = `Add ₹${storeConfig.free_delivery_above} for FREE Delivery!`;
    return;
  }

  const remaining = storeConfig.free_delivery_above - subtotal;
  if (freeShipBar) {
    if (remaining <= 0) {
      freeShipBar.innerHTML = `<span style="color:var(--stat-green);">🎉 You've unlocked FREE Express Shipping!</span>`;
    } else {
      freeShipBar.innerText = `Add ₹${remaining.toLocaleString('en-IN')} more for FREE Express Shipping!`;
    }
  }

  container.innerHTML = cart.map((item, idx) => `
    <div style="display:flex; gap:12px; padding:10px 0; border-bottom:1px solid rgba(0,86,75,0.08);">
      <img src="${item.image}" alt="${item.name}" style="width:50px; height:60px; object-fit:cover; border-radius:6px; background:#fff;">
      <div style="flex:1; display:flex; flex-direction:column; gap:2px;">
        <strong style="font-size:0.82rem; color:var(--brand-emerald-dark); line-height:1.2;">${item.name}</strong>
        <span style="font-size:0.7rem; color:var(--text-muted);">${item.colour} / ${item.size}</span>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
          <strong style="font-size:0.84rem;">₹ ${(item.price * item.qty).toLocaleString('en-IN')}</strong>
          <div style="display:flex; align-items:center; gap:6px;">
            <button class="cart-qty-btn" data-idx="${idx}" data-delta="-1" style="padding:1px 6px; border:1px solid #ddd; background:#fff; border-radius:3px; cursor:pointer;">-</button>
            <span style="font-size:0.78rem; font-weight:700;">${item.qty}</span>
            <button class="cart-qty-btn" data-idx="${idx}" data-delta="1" style="padding:1px 6px; border:1px solid #ddd; background:#fff; border-radius:3px; cursor:pointer;">+</button>
          </div>
        </div>
      </div>
    </div>
  `).join('');

  if (totalEl) totalEl.innerText = `₹ ${subtotal.toLocaleString('en-IN')}`;
}

export function openCartDrawer() {
  document.getElementById('cart-drawer-overlay')?.classList.add('active');
}

export function closeCartDrawer() {
  document.getElementById('cart-drawer-overlay')?.classList.remove('active');
}

function bindCartEvents() {
  const overlay = document.getElementById('cart-drawer-overlay');
  const openBtn = document.getElementById('btn-open-cart');
  const closeBtn = document.getElementById('btn-close-cart');
  const cartList = document.getElementById('cart-items-list');
  const proceedBtn = document.getElementById('btn-proceed-checkout');

  if (openBtn) openBtn.onclick = openCartDrawer;
  if (closeBtn) closeBtn.onclick = closeCartDrawer;
  if (overlay) {
    overlay.onclick = (e) => {
      if (e.target === overlay) closeCartDrawer();
    };
  }

  // Mandatory Login Check on Checkout
  if (proceedBtn) {
    proceedBtn.onclick = () => {
      const user = getCurrentUser();
      if (!user) {
        alert("🔒 Please login or create an account to proceed with checkout!");
        closeCartDrawer();
        openAuthModal();
        return;
      }
      openCheckoutModal(cart);
    };
  }

  if (cartList) {
    cartList.onclick = (e) => {
      const btn = e.target.closest('.cart-qty-btn');
      if (!btn) return;
      const idx = parseInt(btn.dataset.idx);
      const delta = parseInt(btn.dataset.delta);

      if (cart[idx]) {
        cart[idx].qty += delta;
        if (cart[idx].qty <= 0) cart.splice(idx, 1);
        saveCart();
        renderCartDrawer();
      }
    };
  }
}