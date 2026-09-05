import { supabase } from './supabase.js';
import { initCart, addToCart, updateCartBadge, openCartDrawer } from './cart.js';
import { initAuth } from './auth.js';

let allProducts = [];
let allCategories = [];
let allSubCategories = [];
let activeProduct = null;
let activeColour = null;
let activeSize = null;
let activeQty = 1;
let comboList = [];

let heroSlideTimer = null;
let currentHeroIndex = 0;
let activeHeroBanners = [];

document.addEventListener('DOMContentLoaded', async () => {
  await initAuth(); // Initialize User Session & Profile Listener
  await initCart();
  updateCartBadge();
  await loadStoreBanners();
  await loadCategoriesAndSubCategories();
  await loadStoreProducts();
  bindEvents();
});

function getSellingPrice(p) {
  return parseFloat(p.selling_price ?? p.price ?? 0) || 0;
}

function getMrp(p) {
  return parseFloat(p.mrp ?? 0) || 0;
}

function parseArrayField(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === 'string') {
    return val.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

async function loadStoreBanners() {
  const container = document.getElementById('hero-slider-container');
  if (!container) return;

  try {
    const { data: banners } = await supabase
      .from('banners')
      .select('*')
      .eq('active', true)
      .order('display_order', { ascending: true });

    activeHeroBanners = banners || [];

    if (activeHeroBanners.length === 0) {
      container.innerHTML = `<img src="https://placehold.co/1200x400/00362f/ffffff?text=Kashvi+Luxury+Collection" class="hero-slide" alt="Hero Banner">`;
      return;
    }

    renderHeroSlideshow(container);

    // Auto-scroll loop every 4 seconds if more than 1 banner
    if (activeHeroBanners.length > 1) {
      if (heroSlideTimer) clearInterval(heroSlideTimer);
      heroSlideTimer = setInterval(() => {
        currentHeroIndex = (currentHeroIndex + 1) % activeHeroBanners.length;
        updateHeroSlideView(container);
      }, 4000);

      // Pause auto-slide on mouse enter
      container.onmouseenter = () => clearInterval(heroSlideTimer);
      container.onmouseleave = () => {
        clearInterval(heroSlideTimer);
        heroSlideTimer = setInterval(() => {
          currentHeroIndex = (currentHeroIndex + 1) % activeHeroBanners.length;
          updateHeroSlideView(container);
        }, 4000);
      };
    }

  } catch (err) {
    console.warn("Banner load fallback:", err);
  }
}

function renderHeroSlideshow(container) {
  currentHeroIndex = 0;
  
  container.style.position = 'relative';
  container.style.overflow = 'hidden';

  container.innerHTML = `
    <div id="hero-track" style="display: flex; transition: transform 0.5s ease-in-out; width: ${activeHeroBanners.length * 100}%; height: 100%;">
      ${activeHeroBanners.map(b => `
        <div style="flex: 0 0 ${100 / activeHeroBanners.length}%; width: ${100 / activeHeroBanners.length}%; position: relative; cursor: pointer;" onclick="window.location.href='${b.redirect_url || '#'}'">
          <img src="${b.image_url}" class="hero-slide" alt="${b.title || 'Banner'}" style="width: 100%; height: 100%; object-fit: cover; display: block;">
          ${b.title ? `
            <div style="position: absolute; bottom: 16px; left: 16px; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); padding: 8px 14px; border-radius: 8px; color: #fff;">
              <h3 style="font-size: 0.95rem; font-weight: 700; margin: 0;">${b.title}</h3>
              ${b.subtitle ? `<p style="font-size: 0.72rem; margin: 2px 0 0 0; opacity: 0.9;">${b.subtitle}</p>` : ''}
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
    ${activeHeroBanners.length > 1 ? `
      <div id="hero-dots" style="position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); display: flex; gap: 5px; z-index: 5;">
        ${activeHeroBanners.map((_, i) => `
          <span class="hero-dot ${i === 0 ? 'active' : ''}" data-idx="${i}" style="width: ${i === 0 ? '18px' : '6px'}; height: 6px; border-radius: 3px; background: ${i === 0 ? 'var(--brand-emerald, #00564b)' : '#ffffffaa'}; display: inline-block; cursor: pointer; transition: all 0.25s ease;"></span>
        `).join('')}
      </div>
    ` : ''}
  `;

  const dotsContainer = container.querySelector('#hero-dots');
  if (dotsContainer) {
    dotsContainer.querySelectorAll('.hero-dot').forEach(dot => {
      dot.onclick = (e) => {
        currentHeroIndex = parseInt(e.target.dataset.idx, 10);
        updateHeroSlideView(container);
      };
    });
  }
}

function updateHeroSlideView(container) {
  const track = container.querySelector('#hero-track');
  if (!track) return;

  const shiftPercent = -(currentHeroIndex * (100 / activeHeroBanners.length));
  track.style.transform = `translateX(${shiftPercent}%)`;

  const dotsContainer = container.querySelector('#hero-dots');
  if (dotsContainer) {
    dotsContainer.querySelectorAll('.hero-dot').forEach((d, i) => {
      const isActive = i === currentHeroIndex;
      d.style.width = isActive ? '18px' : '6px';
      d.style.background = isActive ? 'var(--brand-emerald, #00564b)' : '#ffffffaa';
    });
  }
}

// Load Categories and Sub-Categories for Navigation Menu & Sub-Menu
async function loadCategoriesAndSubCategories() {
  const container = document.getElementById('category-nav-container');
  if (!container) return;

  try {
    const [{ data: cats }, { data: subCats }] = await Promise.all([
      supabase.from('categories').select('*').order('name', { ascending: true }),
      supabase.from('sub_categories').select('*').order('name', { ascending: true })
    ]);

    allCategories = cats || [];
    allSubCategories = subCats || [];

    renderCategoryNavbar(allCategories, allSubCategories);
  } catch (err) {
    console.warn("Category navbar fallback:", err);
  }
}

function renderCategoryNavbar(cats, subCats) {
  const container = document.getElementById('category-nav-container');
  if (!container) return;

  const catHtml = cats.map(c => {
    const matchedSubs = subCats.filter(sc => 
      sc.category_id === c.id || 
      sc.parent_id === c.id || 
      sc.category_name?.toLowerCase() === c.name?.toLowerCase() ||
      sc.parent_category?.toLowerCase() === c.name?.toLowerCase()
    );

    return `
      <div class="cat-nav-item">
        <button type="button" class="cat-nav-btn" data-cat="${c.name}">
          <span>${c.name}</span>
          ${matchedSubs.length > 0 ? `<span class="caret">▾</span>` : ''}
        </button>
        ${matchedSubs.length > 0 ? `
          <div class="cat-submenu-dropdown">
            <a href="#" class="submenu-link" data-cat="${c.name}" data-sub="all">All ${c.name}</a>
            ${matchedSubs.map(s => `
              <a href="#" class="submenu-link" data-cat="${c.name}" data-sub="${s.name}">${s.name}</a>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="cat-nav-item">
      <button type="button" class="cat-nav-btn active" data-cat="all">All Collections</button>
    </div>
    ${catHtml}
  `;
}

async function loadStoreProducts() {
  const grid = document.getElementById('store-products-grid');
  if (!grid) return;

  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    allProducts = products || [];
    renderProductGrid(allProducts);

  } catch (err) {
    console.error("Products error:", err);
    grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--stat-red);">Error loading collections: ${err.message}</div>`;
  }
}

function renderProductGrid(products) {
  const grid = document.getElementById('store-products-grid');
  if (!grid) return;

  if (products.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-muted);">No products found in this category.</div>`;
    return;
  }

  grid.innerHTML = products.map(prod => {
    let primaryImg = 'https://placehold.co/400x500/eaf1ee/00564b?text=Kashvi';
    if (Array.isArray(prod.images) && prod.images.length > 0) {
      primaryImg = typeof prod.images[0] === 'string' ? prod.images[0] : (prod.images[0].url || primaryImg);
    }

    const price = getSellingPrice(prod);
    const mrp = getMrp(prod);
    const discPct = mrp > price && price > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;

    return `
      <div class="product-card" data-id="${prod.id}">
        <div class="product-img-wrap">
          <img src="${primaryImg}" alt="${prod.name}" class="product-thumb-img" loading="lazy">
          ${discPct > 0 ? `<span class="product-badge-disc">${discPct}% OFF</span>` : ''}
        </div>
        <div class="product-card-body">
          <span class="product-card-brand">${prod.brand || 'Kashvi Fashions'}</span>
          <div class="product-card-title">${prod.name}</div>
          <div class="product-card-price-row">
            <span class="price-selling">₹ ${price.toLocaleString('en-IN')}</span>
            ${mrp > 0 ? `<span class="price-mrp">₹ ${mrp.toLocaleString('en-IN')}</span>` : ''}
          </div>
          <button type="button" class="btn-add-cart-card btn-open-pdp" data-id="${prod.id}">Select Options & Cart</button>
        </div>
      </div>
    `;
  }).join('');
}

// Open Centered Product Popup Modal
function openProductModal(product) {
  activeProduct = product;
  activeQty = 1;
  comboList = [];

  const modal = document.getElementById('product-detail-modal');
  if (!modal) return;

  document.getElementById('pdp-brand').innerText = product.brand || 'Kashvi Fashions';
  document.getElementById('pdp-title').innerText = product.name;
  document.getElementById('pdp-category-tag').innerText = product.category || 'Apparel';
  document.getElementById('pdp-weight-tag').innerText = `Weight: ${product.weight || 80} ${product.weight_unit || 'grams'}`;
  document.getElementById('pdp-description').innerText = product.description || product.features || 'Crafted with premium authentic fabric materials.';
  document.getElementById('pdp-qty-val').innerText = '1';

  let colours = parseArrayField(product.colour);
  let sizes = parseArrayField(product.size);

  if (colours.length === 0 && product.variants && typeof product.variants === 'object') {
    colours = Object.values(product.variants).map(v => v.colour || v.color).filter(Boolean);
  }
  if (sizes.length === 0 && product.variants && typeof product.variants === 'object') {
    sizes = Object.values(product.variants).map(v => v.size).filter(Boolean);
  }

  colours = [...new Set(colours)];
  sizes = [...new Set(sizes)];

  activeColour = colours[0] || null;
  activeSize = sizes[0] || null;

  renderColours(colours);
  renderSizes(sizes);

  const fabricGroup = document.getElementById('pdp-group-fabric');
  if (fabricGroup) {
    document.getElementById('pdp-fabric-val').innerText = product.fabric || 'Premium Handloom';
  }

  renderComboList();
  updatePdpPricing();
  renderPdpGallery();

  modal.classList.add('active');
}

function closeProductModal() {
  const modal = document.getElementById('product-detail-modal');
  if (modal) modal.classList.remove('active');
}

function renderColours(colours) {
  const container = document.getElementById('pdp-colour-pills');
  const group = document.getElementById('pdp-group-colours');
  const labelText = document.getElementById('pdp-selected-colour-text');

  if (colours.length === 0) {
    if (group) group.style.display = 'none';
    return;
  }
  if (group) group.style.display = 'flex';
  if (labelText) labelText.innerText = activeColour || 'Standard';

  container.innerHTML = colours.map(c => `
    <button type="button" class="pdp-pill pdp-colour-btn ${c === activeColour ? 'active' : ''}" data-val="${c}">${c}</button>
  `).join('');
}

function renderSizes(sizes) {
  const container = document.getElementById('pdp-size-pills');
  const group = document.getElementById('pdp-group-sizes');
  const labelText = document.getElementById('pdp-selected-size-text');

  if (sizes.length === 0) {
    if (group) group.style.display = 'none';
    return;
  }
  if (group) group.style.display = 'flex';
  if (labelText) labelText.innerText = activeSize || 'Free Size';

  container.innerHTML = sizes.map(s => `
    <button type="button" class="pdp-pill pdp-size-btn ${s === activeSize ? 'active' : ''}" data-val="${s}">${s}</button>
  `).join('');
}

function updatePdpPricing() {
  if (!activeProduct) return;

  let price = getSellingPrice(activeProduct);
  let mrp = getMrp(activeProduct);
  let stock = activeProduct.stock_quantity ?? 10;

  if (activeProduct.variants && typeof activeProduct.variants === 'object') {
    const key = `${activeColour}_${activeSize}`.toLowerCase();
    if (activeProduct.variants[key]) {
      price = parseFloat(activeProduct.variants[key].selling_price ?? price);
      mrp = parseFloat(activeProduct.variants[key].mrp ?? mrp);
      stock = activeProduct.variants[key].stock_quantity ?? stock;
    }
  }

  document.getElementById('pdp-price').innerText = `₹ ${price.toLocaleString('en-IN')}`;
  
  const mrpEl = document.getElementById('pdp-mrp');
  const discEl = document.getElementById('pdp-discount');
  if (mrp > price && price > 0) {
    mrpEl.innerText = `₹ ${mrp.toLocaleString('en-IN')}`;
    mrpEl.style.display = 'inline';
    discEl.innerText = `${Math.round(((mrp - price) / mrp) * 100)}% OFF`;
    discEl.style.display = 'inline-block';
  } else {
    mrpEl.style.display = 'none';
    discEl.style.display = 'none';
  }

  const stockEl = document.getElementById('pdp-stock');
  if (stock > 0) {
    stockEl.className = 'pdp-stock-status badge-in-stock';
    stockEl.innerText = `In Stock (${stock} units left)`;
  } else {
    stockEl.className = 'pdp-stock-status badge-out-stock';
    stockEl.innerText = 'Out of Stock';
  }
}

function renderPdpGallery() {
  const mainImg = document.getElementById('pdp-main-img');
  const strip = document.getElementById('pdp-thumb-strip');
  if (!activeProduct || !mainImg) return;

  let imgs = [];
  if (Array.isArray(activeProduct.images)) {
    imgs = activeProduct.images.map(img => typeof img === 'string' ? { url: img, colour_tag: 'All' } : img);
  }

  let filtered = imgs.filter(i => !activeColour || !i.colour_tag || i.colour_tag === activeColour || i.colour_tag === 'All');
  if (filtered.length === 0) filtered = imgs;

  const defaultUrl = filtered[0]?.url || 'https://placehold.co/400x500/eaf1ee/00564b?text=Kashvi';
  mainImg.src = defaultUrl;

  if (strip) {
    strip.innerHTML = filtered.map((item, idx) => `
      <img src="${item.url}" class="pdp-thumb-item ${idx === 0 ? 'active' : ''}" data-url="${item.url}">
    `).join('');
  }
}

function renderComboList() {
  const container = document.getElementById('pdp-combo-items-list');
  if (!container) return;

  if (comboList.length === 0) {
    container.innerHTML = `
      <div style="font-size:0.74rem; color:var(--text-muted); text-align:center; padding:4px 0;">
        Select Colour & Size, then click "+ Add Current Combo" to order multiple variants at once.
      </div>
    `;
    return;
  }

  container.innerHTML = comboList.map((item, idx) => `
    <div class="combo-chip">
      <div>
        <strong>${item.colour || 'Standard'} / ${item.size || 'Free Size'}</strong>
        <div style="font-size:0.72rem; color:var(--text-muted);">Qty: ${item.qty} &times; ₹${item.price.toLocaleString('en-IN')} = ₹${(item.qty * item.price).toLocaleString('en-IN')}</div>
      </div>
      <button type="button" class="btn-delete-combo" data-idx="${idx}">&times;</button>
    </div>
  `).join('');
}

function bindEvents() {
  const grid = document.getElementById('store-products-grid');
  const modal = document.getElementById('product-detail-modal');
  const closeBtn = document.getElementById('btn-close-prod-modal');
  const searchInput = document.getElementById('store-search-input');
  const catNavbar = document.getElementById('category-nav-container');

  const lightboxModal = document.getElementById('pdp-lightbox-modal');
  const lightboxImg = document.getElementById('lightbox-enlarged-img');
  const closeLightboxBtn = document.getElementById('btn-close-lightbox');
  const mainImageWrap = document.getElementById('btn-open-lightbox');

  if (closeBtn) closeBtn.onclick = closeProductModal;
  if (modal) {
    modal.onclick = (e) => {
      if (e.target === modal) closeProductModal();
    };
  }

  if (mainImageWrap) {
    mainImageWrap.onclick = () => {
      const currentSrc = document.getElementById('pdp-main-img')?.src;
      if (currentSrc && lightboxImg && lightboxModal) {
        lightboxImg.src = currentSrc;
        lightboxModal.classList.add('active');
      }
    };
  }

  if (closeLightboxBtn && lightboxModal) {
    closeLightboxBtn.onclick = () => lightboxModal.classList.remove('active');
    lightboxModal.onclick = (e) => {
      if (e.target === lightboxModal) lightboxModal.classList.remove('active');
    };
  }

  if (grid) {
    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-open-pdp');
      if (!btn) return;
      const prod = allProducts.find(p => String(p.id) === String(btn.dataset.id));
      if (prod) openProductModal(prod);
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      const colourBtn = e.target.closest('.pdp-colour-btn');
      const sizeBtn = e.target.closest('.pdp-size-btn');
      const thumb = e.target.closest('.pdp-thumb-item');
      const delComboBtn = e.target.closest('.btn-delete-combo');

      if (colourBtn) {
        modal.querySelectorAll('.pdp-colour-btn').forEach(b => b.classList.remove('active'));
        colourBtn.classList.add('active');
        activeColour = colourBtn.dataset.val;
        document.getElementById('pdp-selected-colour-text').innerText = activeColour;
        updatePdpPricing();
        renderPdpGallery();
        return;
      }

      if (sizeBtn) {
        modal.querySelectorAll('.pdp-size-btn').forEach(b => b.classList.remove('active'));
        sizeBtn.classList.add('active');
        activeSize = sizeBtn.dataset.val;
        document.getElementById('pdp-selected-size-text').innerText = activeSize;
        updatePdpPricing();
        return;
      }

      if (thumb) {
        modal.querySelectorAll('.pdp-thumb-item').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
        const mainImg = document.getElementById('pdp-main-img');
        if (mainImg) mainImg.src = thumb.dataset.url;
        return;
      }

      if (delComboBtn) {
        const idx = parseInt(delComboBtn.dataset.idx);
        comboList.splice(idx, 1);
        renderComboList();
        return;
      }
    });

    const qtyMinus = document.getElementById('btn-qty-minus');
    const qtyPlus = document.getElementById('btn-qty-plus');
    const qtyVal = document.getElementById('pdp-qty-val');

    if (qtyMinus) {
      qtyMinus.onclick = () => {
        activeQty = Math.max(1, activeQty - 1);
        if (qtyVal) qtyVal.innerText = activeQty;
      };
    }
    if (qtyPlus) {
      qtyPlus.onclick = () => {
        activeQty += 1;
        if (qtyVal) qtyVal.innerText = activeQty;
      };
    }

    const addComboBtn = document.getElementById('btn-add-combo-row');
    if (addComboBtn) {
      addComboBtn.onclick = () => {
        if (!activeProduct) return;
        const price = getSellingPrice(activeProduct);

        let itemImg = 'https://placehold.co/100';
        if (Array.isArray(activeProduct.images)) {
          const matched = activeProduct.images.find(img => img.colour_tag === activeColour);
          itemImg = matched?.url || (typeof activeProduct.images[0] === 'string' ? activeProduct.images[0] : activeProduct.images[0]?.url);
        }

        comboList.push({
          colour: activeColour || 'Standard',
          size: activeSize || 'Free Size',
          price,
          qty: activeQty,
          image: itemImg
        });

        renderComboList();
        activeQty = 1;
        if (qtyVal) qtyVal.innerText = '1';
      };
    }

    const addToBagBtn = document.getElementById('btn-pdp-add-to-bag');
    if (addToBagBtn) {
      addToBagBtn.onclick = () => {
        if (!activeProduct) return;

        if (comboList.length > 0) {
          comboList.forEach(item => {
            addToCart(activeProduct, {
              id: `${activeProduct.id}-${item.colour}-${item.size}`,
              colour: item.colour,
              size: item.size,
              price: item.price,
              image: item.image
            }, item.qty);
          });
        } else {
          let itemImg = 'https://placehold.co/100';
          if (Array.isArray(activeProduct.images)) {
            const matched = activeProduct.images.find(img => img.colour_tag === activeColour);
            itemImg = matched?.url || (typeof activeProduct.images[0] === 'string' ? activeProduct.images[0] : activeProduct.images[0]?.url);
          }

          addToCart(activeProduct, {
            id: `${activeProduct.id}-${activeColour || 'std'}-${activeSize || 'fs'}`,
            colour: activeColour || 'Standard',
            size: activeSize || 'Free Size',
            price: getSellingPrice(activeProduct),
            image: itemImg
          }, activeQty);
        }

        comboList = [];
        closeProductModal();
        openCartDrawer();
      };
    }
  }

  if (catNavbar) {
    catNavbar.addEventListener('click', (e) => {
      const btn = e.target.closest('.cat-nav-btn');
      const subLink = e.target.closest('.submenu-link');

      if (btn) {
        catNavbar.querySelectorAll('.cat-nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const cat = btn.dataset.cat;
        if (cat === 'all') {
          renderProductGrid(allProducts);
        } else {
          const filtered = allProducts.filter(p => (p.category || '').toLowerCase().includes(cat.toLowerCase()));
          renderProductGrid(filtered);
        }
        return;
      }

      if (subLink) {
        e.preventDefault();
        const cat = subLink.dataset.cat;
        const sub = subLink.dataset.sub;

        catNavbar.querySelectorAll('.cat-nav-btn').forEach(b => b.classList.remove('active'));
        const parentBtn = catNavbar.querySelector(`.cat-nav-btn[data-cat="${cat}"]`);
        if (parentBtn) parentBtn.classList.add('active');

        if (sub === 'all') {
          const filtered = allProducts.filter(p => (p.category || '').toLowerCase().includes(cat.toLowerCase()));
          renderProductGrid(filtered);
        } else {
          const filtered = allProducts.filter(p => 
            (p.category || '').toLowerCase().includes(cat.toLowerCase()) && 
            (p.sub_category || '').toLowerCase().includes(sub.toLowerCase())
          );
          renderProductGrid(filtered);
        }
      }
    });
  }

  if (searchInput) {
    searchInput.oninput = (e) => {
      const q = e.target.value.toLowerCase();
      const filtered = allProducts.filter(p => 
        (p.name || '').toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.sub_category || '').toLowerCase().includes(q)
      );
      renderProductGrid(filtered);
    };
  }
}

// Supabase క్లయింట్ క్రియేట్ చేసిన తర్వాత (ఉదా: const supabase = createClient(...))
// దాన్ని గ్లోబల్ window ఆబ్జెక్ట్‌కు అటాచ్ చేయండి:
window.supabase = supabase;

// Google OAuth Trigger inside app.js
document.getElementById('btn-google-login')?.addEventListener('click', async () => {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
  } catch (err) {
    console.error("Google Sign-In Error:", err);
    alert("Google Sign-In Error: " + (err.message || err));
  }
});