import { supabase } from '../supabase.js';

let cachedProducts = [];
let masterCategories = [];
let masterSubCategories = [];
let masterBrands = [];
let masterColours = [];
let masterSizes = [];
let masterFabrics = [];
let masterUnits = [];

let isEditing = false;
let currentEditId = null;
let currentProductImages = [];
let currentGalleryFilter = 'all';

let selectedColours = new Set();
let selectedSizes = new Set();
let selectedFabrics = new Set();

export async function initProductsModule() {
  bindProductEvents();
  bindLightboxEvents();
  await Promise.all([
    fetchMasterAttributes(),
    loadProducts()
  ]);
}

// 1. Fetch Master Taxonomies
async function fetchMasterAttributes() {
  try {
    const [catRes, subRes, brandRes, colRes, sizeRes, fabRes, unitRes] = await Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('sub_categories').select('*').order('name'),
      supabase.from('brands').select('*').order('name'),
      supabase.from('colours').select('*').order('name'),
      supabase.from('sizes').select('*').order('name'),
      supabase.from('fabrics').select('*').order('name'),
      supabase.from('units').select('*').order('name')
    ]);

    masterCategories = catRes.data || [];
    masterSubCategories = subRes.data || [];
    masterBrands = brandRes.data || [];
    masterColours = colRes.data || [];
    masterSizes = sizeRes.data || [];
    masterFabrics = fabRes.data || [];
    masterUnits = unitRes.data || [];

    populateFormMasterDropdowns();
  } catch (err) {
    console.error("Error loading master taxonomies for products:", err);
  }
}

function populateFormMasterDropdowns() {
  // Category dropdowns
  const formCat = document.getElementById('prod-category');
  const filterCat = document.getElementById('product-category-filter');
  
  if (masterCategories.length > 0) {
    const catOpts = masterCategories.map(c => {
      const name = c.name || c.title || '';
      return `<option value="${name}">${name}</option>`;
    }).join('');

    if (formCat) formCat.innerHTML = `<option value="">Select Category</option>` + catOpts;
    if (filterCat) filterCat.innerHTML = `<option value="all">All Categories</option>` + catOpts;
  }

  // Pre-load Sub-Categories dropdown
  updateSubCategoryOptions('');

  // Brands dropdown (Line 2)
  const formBrand = document.getElementById('prod-brand');
  if (formBrand) {
    const defaultBrands = [
      { name: 'Kashvi Fashions' },
      { name: 'Kashvi Jewellery' }
    ];
    const combinedBrands = masterBrands.length > 0 ? masterBrands : defaultBrands;
    
    formBrand.innerHTML = combinedBrands.map(b => 
      `<option value="${b.name}">${b.name}</option>`
    ).join('');
  }

  // Units dropdown (Line 3)
  const formUnit = document.getElementById('prod-unit');
  if (formUnit) {
    if (masterUnits.length > 0) {
      formUnit.innerHTML = `<option value="">Select Unit</option>` + 
        masterUnits.map(u => `<option value="${u.name}">${u.name}</option>`).join('');
    } else {
      formUnit.innerHTML = `<option value="Pcs">Pcs</option><option value="Meters">Meters</option><option value="Sets">Sets</option><option value="Pairs">Pairs</option>`;
    }
  }

  // Line 4 Multi-Select Tags
  renderMultiPickerTags('picker-colours', masterColours, selectedColours, 'colour');
  renderMultiPickerTags('picker-sizes', masterSizes, selectedSizes, 'size');
  renderMultiPickerTags('picker-materials', masterFabrics, selectedFabrics, 'fabric');
}

// Auto Generate Product Code (KF0001 / KJ0001 series)
function generateNextProductCode(brandName = 'Kashvi Fashions') {
  let prefix = 'KF';
  if ((brandName || '').toLowerCase().includes('jewel')) {
    prefix = 'KJ';
  }

  const matchingCodes = cachedProducts
    .map(p => String(p.id || '').toUpperCase())
    .filter(id => id.startsWith(prefix));

  let maxNum = 0;
  matchingCodes.forEach(code => {
    const numPart = code.replace(prefix, '').replace(/[^0-9]/g, '');
    const num = parseInt(numPart, 10);
    if (!isNaN(num) && num > maxNum) {
      maxNum = num;
    }
  });

  const nextNum = maxNum + 1;
  const paddedNum = String(nextNum).padStart(4, '0');
  return `${prefix}${paddedNum}`;
}

// Dynamic Sub-Category Filter with Universal Matching
function updateSubCategoryOptions(selectedCat = '', preSelectedVal = '') {
  const subCategorySelect = document.getElementById('prod-subcategory');
  if (!subCategorySelect) return;

  if (masterSubCategories.length === 0) {
    subCategorySelect.innerHTML = `<option value="">Select Sub-Category</option>`;
    return;
  }

  const cleanCat = (selectedCat || '').trim().toLowerCase();

  let matchedSubs = masterSubCategories.filter(s => {
    if (!cleanCat) return true;
    const sCatName = String(s.category_name || s.category || s.parent_category || '').toLowerCase();
    const sCatId = String(s.category_id || '').toLowerCase();
    return sCatName === cleanCat || sCatId === cleanCat;
  });

  if (matchedSubs.length === 0) {
    matchedSubs = masterSubCategories;
  }

  subCategorySelect.innerHTML = `<option value="">Select Sub-Category</option>` + 
    matchedSubs.map(s => {
      const name = s.name || s.title || '';
      const isSelected = preSelectedVal && (preSelectedVal.toLowerCase() === name.toLowerCase()) ? 'selected' : '';
      return `<option value="${name}" ${isSelected}>${name}</option>`;
    }).join('');
}

function renderMultiPickerTags(containerId, list, selectedSet, type) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = `<span style="font-size:0.75rem; color:var(--text-muted);">None in Masters.</span>`;
    return;
  }

  container.innerHTML = list.map(item => {
    const name = item.name || item.title || item.size_name || item.colour_name;
    const isSelected = selectedSet.has(name);
    return `<span class="picker-tag ${isSelected ? 'selected' : ''}" data-type="${type}" data-val="${name}">${name}</span>`;
  }).join('');
}

// 2. Load Products Catalog Table
export async function loadProducts() {
  const tableBody = document.getElementById('products-table-body');
  if (!tableBody) return;

  try {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-muted);">Loading live products...</td></tr>`;

    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    cachedProducts = products || [];
    renderProductsTable(cachedProducts);

  } catch (err) {
    console.error("Products load error:", err);
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--stat-red);">Error: ${err.message}</td></tr>`;
  }
}

function renderProductsTable(products) {
  const tableBody = document.getElementById('products-table-body');
  if (!tableBody) return;

  if (products.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-muted);">No products found. Click "+ Add Product" to create one.</td></tr>`;
    return;
  }

  tableBody.innerHTML = products.map(product => {
    const stock = Number(product.stock_quantity || 0);
    const threshold = Number(product.low_stock_threshold || 3);
    const unitText = product.unit ? ` ${product.unit}` : '';
    
    let badge = `<span class="stock-badge stock-in">In Stock (${stock}${unitText})</span>`;
    if (stock === 0) badge = `<span class="stock-badge stock-out">Out of Stock</span>`;
    else if (stock <= threshold) badge = `<span class="stock-badge stock-low">Low Stock (${stock}${unitText})</span>`;

    let imgs = [];
    if (Array.isArray(product.images)) imgs = product.images;
    else if (typeof product.images === 'string') {
      try { imgs = JSON.parse(product.images || '[]'); } catch { imgs = []; }
    }
    const firstImg = imgs.length > 0 ? (typeof imgs[0] === 'string' ? imgs[0] : imgs[0].url) : 'https://placehold.co/80x80/eef2f5/00564b?text=Kashvi';

    const variants = Array.isArray(product.variants) ? product.variants : (typeof product.variants === 'string' ? JSON.parse(product.variants || '[]') : []);
    const variantCountText = variants.length > 0 ? `<span style="color:var(--brand-pink); font-size:0.75rem; font-weight:700;">(${variants.length} Variants)</span>` : '';

    return `
      <tr>
        <td>
          <img src="${firstImg}" alt="${product.name}" class="product-img-thumb enlarge-trigger" data-img="${firstImg}" data-title="${product.name}">
        </td>
        <td>
          <strong style="color:var(--brand-emerald-dark);">${product.name}</strong> ${variantCountText}
          <div style="font-size:0.75rem; color:var(--text-muted);">
            ${product.brand ? `[${product.brand}] ` : ''}<strong>${product.id}</strong> ${product.sub_category ? `• ${product.sub_category}` : ''}
          </div>
        </td>
        <td>${product.category || 'General'}</td>
        <td><strong>₹ ${Number(product.selling_price || 0).toLocaleString('en-IN')}</strong></td>
        <td>${badge}</td>
        <td>
          <span class="${product.active ? 'badge-emerald' : 'badge-pink'}">
            ${product.active ? 'Active' : 'Draft'}
          </span>
        </td>
        <td>
          <div class="action-btn-group">
            <button type="button" class="btn-icon edit-prod-btn" data-id="${product.id}" title="Edit Product">✏️</button>
            <button type="button" class="btn-icon delete-prod-btn" data-id="${product.id}" title="Delete Product">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// 3. Module Scope Helpers
function clearVariantMatrixTable() {
  const tbody = document.getElementById('variant-matrix-tbody');
  if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:16px; color:var(--text-muted); font-size:0.8rem;">Select Colour & Size above, then click "⚡ Generate Variants" to create rows.</td></tr>`;
}

function renderExistingVariantsToMatrix(variants) {
  const tbody = document.getElementById('variant-matrix-tbody');
  if (!tbody) return;

  if (!variants || variants.length === 0) {
    clearVariantMatrixTable();
    return;
  }

  tbody.innerHTML = variants.map(v => `
    <tr class="variant-matrix-row" data-color="${v.colour || 'Default'}" data-size="${v.size || 'Free Size'}" data-fabric="${v.fabric || 'Standard'}">
      <td><strong style="color:var(--brand-emerald-dark); font-size:0.82rem;">${v.title}</strong></td>
      <td><span class="badge-emerald" style="font-size:0.7rem;">${v.colour || 'Default'}</span></td>
      <td><span class="badge-pink" style="font-size:0.7rem;">${v.size || 'Free Size'}</span></td>
      <td><input type="number" class="var-price" value="${v.price || ''}" required></td>
      <td><input type="number" class="var-mrp" value="${v.mrp || ''}"></td>
      <td><input type="number" class="var-stock" value="${v.stock ?? 5}" required></td>
      <td style="text-align:center;">
        <button type="button" class="btn-icon btn-remove-row" style="color:var(--stat-red);">&times;</button>
      </td>
    </tr>
  `).join('');
}

function renderUploadedGallery() {
  const galleryContainer = document.getElementById('uploaded-gallery-container');
  const filterTabsContainer = document.getElementById('gallery-filter-tabs');
  if (!galleryContainer) return;

  const distinctColors = ['all', ...new Set(currentProductImages.map(img => img.color).filter(c => c && c !== 'all'))];
  if (filterTabsContainer) {
    filterTabsContainer.innerHTML = distinctColors.map(c => `
      <button type="button" class="filter-tab-btn ${currentGalleryFilter === c ? 'active' : ''}" data-color="${c}">
        ${c === 'all' ? 'All Images' : c}
      </button>
    `).join('');
  }

  const displayList = currentGalleryFilter === 'all' 
    ? currentProductImages 
    : currentProductImages.filter(img => img.color === currentGalleryFilter || img.color === 'all');

  if (displayList.length === 0) {
    galleryContainer.innerHTML = `<span style="font-size:0.75rem; color:var(--text-muted); grid-column:1/-1; padding:8px 0;">No images for this colour.</span>`;
    return;
  }

  galleryContainer.innerHTML = displayList.map((img) => {
    const actualIndex = currentProductImages.indexOf(img);
    return `
      <div class="gallery-card">
        <button type="button" class="btn-delete-img" data-idx="${actualIndex}" title="Remove image">&times;</button>
        <div class="gallery-card-img-wrap">
          <img src="${img.url}" alt="Dress Image" class="enlarge-trigger" data-img="${img.url}" data-title="Preview (${img.color || 'Common'})">
        </div>
        <div class="gallery-card-select-wrap">
          <select class="card-color-dropdown" data-idx="${actualIndex}">
            <option value="all" ${(!img.color || img.color === 'all') ? 'selected' : ''}>All / Common</option>
            ${masterColours.map(c => `<option value="${c.name}" ${img.color === c.name ? 'selected' : ''}>${c.name}</option>`).join('')}
          </select>
        </div>
      </div>
    `;
  }).join('');
}

// 4. Product UI & Events Binding
function bindProductEvents() {
  const modal = document.getElementById('product-modal');
  const modalTitle = document.getElementById('modal-drawer-title');
  const openBtn = document.getElementById('btn-open-add-product');
  const closeBtn = document.getElementById('btn-close-product-modal');
  const cancelBtn = document.getElementById('btn-cancel-product');
  const form = document.getElementById('product-form');
  const searchInput = document.getElementById('product-search-filter');
  const categoryFilter = document.getElementById('product-category-filter');
  const tableBody = document.getElementById('products-table-body');
  const categorySelect = document.getElementById('prod-category');
  const brandSelect = document.getElementById('prod-brand');
  const codeInput = document.getElementById('prod-code');
  const fileInput = document.getElementById('prod-image-file');
  const btnUploadImg = document.getElementById('btn-add-image-tag');
  const imgUrlInput = document.getElementById('prod-image-url');
  const btnGenerateVariants = document.getElementById('btn-generate-variants');

  // Open Drawer (Add Mode)
  if (openBtn && modal) {
    openBtn.onclick = () => {
      isEditing = false;
      currentEditId = null;
      currentProductImages = [];
      currentGalleryFilter = 'all';
      selectedColours.clear();
      selectedSizes.clear();
      selectedFabrics.clear();

      if (modalTitle) modalTitle.innerText = "Add New Product";
      if (form) form.reset();
      
      populateFormMasterDropdowns();

      // Auto generate initial code based on selected brand (e.g. KF0001)
      const selectedBrand = brandSelect?.value || 'Kashvi Fashions';
      if (codeInput) codeInput.value = generateNextProductCode(selectedBrand);

      clearVariantMatrixTable();
      renderUploadedGallery();
      modal.classList.add('active');
    };
  }

  // Brand change event -> dynamically update Product Code (KF / KJ series)
  if (brandSelect) {
    brandSelect.onchange = (e) => {
      if (!isEditing && codeInput) {
        codeInput.value = generateNextProductCode(e.target.value);
      }
    };
  }

  if (closeBtn && modal) closeBtn.onclick = () => modal.classList.remove('active');
  if (cancelBtn && modal) cancelBtn.onclick = () => modal.classList.remove('active');

  // Category -> Sub-Category dynamic linkage
  if (categorySelect) {
    categorySelect.onchange = (e) => {
      updateSubCategoryOptions(e.target.value);
    };
  }

  // Tag Pickers Clicks
  document.getElementById('product-modal')?.addEventListener('click', (e) => {
    const tag = e.target.closest('.picker-tag');
    if (!tag) return;

    const val = tag.dataset.val;
    const type = tag.dataset.type;

    if (type === 'colour') {
      if (selectedColours.has(val)) selectedColours.delete(val);
      else selectedColours.add(val);
      tag.classList.toggle('selected');
    } else if (type === 'size') {
      if (selectedSizes.has(val)) selectedSizes.delete(val);
      else selectedSizes.add(val);
      tag.classList.toggle('selected');
    } else if (type === 'fabric') {
      if (selectedFabrics.has(val)) selectedFabrics.delete(val);
      else selectedFabrics.add(val);
      tag.classList.toggle('selected');
    }
  });

  // Variant Matrix Generator
  if (btnGenerateVariants) {
    btnGenerateVariants.onclick = () => {
      const tbody = document.getElementById('variant-matrix-tbody');
      if (!tbody) return;

      const colours = selectedColours.size > 0 ? Array.from(selectedColours) : ['Default'];
      const sizes = selectedSizes.size > 0 ? Array.from(selectedSizes) : ['Free Size'];
      const fabrics = selectedFabrics.size > 0 ? Array.from(selectedFabrics) : ['Standard'];

      const basePrice = document.getElementById('prod-price')?.value || '';
      const baseMrp = document.getElementById('prod-mrp')?.value || '';

      let rowsHtml = '';

      colours.forEach(col => {
        sizes.forEach(sz => {
          fabrics.forEach(fab => {
            const title = `${sz !== 'Free Size' ? sz + ' - ' : ''}${col !== 'Default' ? col : ''} ${fab !== 'Standard' ? '(' + fab + ')' : ''}`.trim() || 'Standard Variant';
            rowsHtml += `
              <tr class="variant-matrix-row" data-color="${col}" data-size="${sz}" data-fabric="${fab}">
                <td>
                  <strong style="color:var(--brand-emerald-dark); font-size:0.82rem;">${title}</strong>
                </td>
                <td><span class="badge-emerald" style="font-size:0.7rem;">${col}</span></td>
                <td><span class="badge-pink" style="font-size:0.7rem;">${sz}</span></td>
                <td>
                  <input type="number" class="var-price" placeholder="Price" value="${basePrice}" required>
                </td>
                <td>
                  <input type="number" class="var-mrp" placeholder="MRP" value="${baseMrp}">
                </td>
                <td>
                  <input type="number" class="var-stock" placeholder="Qty" value="5" required>
                </td>
                <td style="text-align:center;">
                  <button type="button" class="btn-icon btn-remove-row" style="color:var(--stat-red);">&times;</button>
                </td>
              </tr>
            `;
          });
        });
      });

      tbody.innerHTML = rowsHtml;
    };
  }

  document.getElementById('variant-matrix-table')?.addEventListener('click', (e) => {
    if (e.target.closest('.btn-remove-row')) {
      e.target.closest('tr').remove();
    }
  });

  if (btnUploadImg) {
    btnUploadImg.onclick = () => {
      const url = imgUrlInput?.value.trim();
      if (!url) {
        alert("Please enter image URL or choose file first.");
        return;
      }
      currentProductImages.push({ url, color: 'all' });
      if (imgUrlInput) imgUrlInput.value = '';
      renderUploadedGallery();
    };
  }

  if (fileInput) {
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          currentProductImages.push({ url: event.target.result, color: 'all' });
          fileInput.value = '';
          renderUploadedGallery();
        };
        reader.readAsDataURL(file);
      }
    };
  }

  const imgSection = document.getElementById('image-uploader-section');
  if (imgSection) {
    imgSection.onchange = (e) => {
      const colSelect = e.target.closest('.card-color-dropdown');
      if (colSelect) {
        const idx = parseInt(colSelect.dataset.idx);
        if (currentProductImages[idx]) {
          currentProductImages[idx].color = colSelect.value;
          renderUploadedGallery();
        }
      }
    };

    imgSection.onclick = (e) => {
      const tabBtn = e.target.closest('.filter-tab-btn');
      if (tabBtn) {
        currentGalleryFilter = tabBtn.dataset.color;
        renderUploadedGallery();
        return;
      }
      const delImgBtn = e.target.closest('.btn-delete-img');
      if (delImgBtn) {
        const idx = parseInt(delImgBtn.dataset.idx);
        currentProductImages.splice(idx, 1);
        renderUploadedGallery();
      }
    };
  }

  if (searchInput) searchInput.oninput = (e) => filterList(e.target.value, categoryFilter?.value);
  if (categoryFilter) categoryFilter.onchange = (e) => filterList(searchInput?.value, e.target.value);

  // Form Submit Handler
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const saveBtn = form.querySelector('button[type="submit"]');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerText = isEditing ? 'Updating...' : 'Saving...';
      }

      const matrixRows = document.querySelectorAll('.variant-matrix-row');
      const collectedVariants = [];
      let totalVariantStock = 0;

      matrixRows.forEach(row => {
        const colour = row.dataset.color || '';
        const size = row.dataset.size || '';
        const fabric = row.dataset.fabric || '';
        const price = parseFloat(row.querySelector('.var-price')?.value) || 0;
        const mrp = parseFloat(row.querySelector('.var-mrp')?.value) || 0;
        const stock = parseInt(row.querySelector('.var-stock')?.value) || 0;

        collectedVariants.push({
          id: 'VAR-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
          title: `${size} - ${colour} (${fabric})`,
          colour,
          size,
          fabric,
          price,
          mrp,
          stock
        });
        totalVariantStock += stock;
      });

      const baseSellingPrice = parseFloat(document.getElementById('prod-price')?.value) || 0;
      const baseMrp = parseFloat(document.getElementById('prod-mrp')?.value) || 0;
      const selectedUnit = document.getElementById('prod-unit')?.value.trim() || 'Pcs';
      const selectedBrand = document.getElementById('prod-brand')?.value.trim() || 'Kashvi Fashions';
      const prodCode = document.getElementById('prod-code')?.value.trim() || generateNextProductCode(selectedBrand);

      const productPayload = {
        id: prodCode,
        name: document.getElementById('prod-name')?.value.trim(),
        brand: selectedBrand,
        category: document.getElementById('prod-category')?.value,
        sub_category: document.getElementById('prod-subcategory')?.value || null,
        colour: Array.from(selectedColours).join(', ') || null,
        fabric: Array.from(selectedFabrics).join(', ') || null,
        unit: selectedUnit,
        selling_price: baseSellingPrice,
        mrp: baseMrp,
        stock_quantity: collectedVariants.length > 0 ? totalVariantStock : 10,
        low_stock_threshold: 3,
        variants: collectedVariants,
        images: currentProductImages,
        description: document.getElementById('prod-desc')?.value.trim(),
        active: true
      };

      try {
        if (isEditing && currentEditId) {
          const { error } = await supabase.from('products').update(productPayload).eq('id', currentEditId);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('products').insert([productPayload]);
          if (error) throw error;
        }

        form.reset();
        currentProductImages = [];
        clearVariantMatrixTable();
        modal.classList.remove('active');
        await loadProducts();
      } catch (err) {
        console.error("Product save error:", err);
        alert("Operation failed: " + err.message);
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerText = 'Save Product';
        }
      }
    };
  }

  // Edit / Delete Catalog Handlers
  if (tableBody) {
    tableBody.onclick = async (e) => {
      const editBtn = e.target.closest('.edit-prod-btn');
      if (editBtn) {
        const id = editBtn.dataset.id;
        const product = cachedProducts.find(p => String(p.id) === String(id));
        if (!product) return;

        isEditing = true;
        currentEditId = product.id;
        if (modalTitle) modalTitle.innerText = `Edit: ${product.name}`;

        if (document.getElementById('prod-code')) document.getElementById('prod-code').value = product.id || '';
        if (document.getElementById('prod-name')) document.getElementById('prod-name').value = product.name || '';
        if (document.getElementById('prod-brand')) document.getElementById('prod-brand').value = product.brand || 'Kashvi Fashions';
        if (document.getElementById('prod-category')) document.getElementById('prod-category').value = product.category || '';
        
        updateSubCategoryOptions(product.category, product.sub_category);
        
        if (document.getElementById('prod-price')) document.getElementById('prod-price').value = product.selling_price || '';
        if (document.getElementById('prod-mrp')) document.getElementById('prod-mrp').value = product.mrp || '';
        if (document.getElementById('prod-unit')) document.getElementById('prod-unit').value = product.unit || 'Pcs';
        if (document.getElementById('prod-desc')) document.getElementById('prod-desc').value = product.description || '';

        // Load Images
        if (Array.isArray(product.images)) {
          currentProductImages = product.images.map(img => typeof img === 'string' ? { url: img, color: 'all' } : img);
        } else if (typeof product.images === 'string') {
          try {
            const parsed = JSON.parse(product.images || '[]');
            currentProductImages = parsed.map(img => typeof img === 'string' ? { url: img, color: 'all' } : img);
          } catch {
            currentProductImages = [];
          }
        }
        renderUploadedGallery();

        // Load Matrix Variants
        const existingVariants = Array.isArray(product.variants) ? product.variants : (typeof product.variants === 'string' ? JSON.parse(product.variants || '[]') : []);
        renderExistingVariantsToMatrix(existingVariants);

        modal.classList.add('active');
        return;
      }

      const delBtn = e.target.closest('.delete-prod-btn');
      if (delBtn) {
        const id = delBtn.dataset.id;
        if (confirm("Are you sure you want to remove this product?")) {
          const { error } = await supabase.from('products').delete().eq('id', id);
          if (error) alert("Error deleting: " + error.message);
          else await loadProducts();
        }
      }
    };
  }
}

function bindLightboxEvents() {
  const lightbox = document.getElementById('image-lightbox');
  const lightboxImg = document.getElementById('lightbox-target-img');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const closeBtn = document.getElementById('btn-close-lightbox');

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.enlarge-trigger');
    if (trigger && lightbox && lightboxImg) {
      const src = trigger.dataset.img || trigger.src;
      const title = trigger.dataset.title || '';
      lightboxImg.src = src;
      if (lightboxCaption) lightboxCaption.innerText = title;
      lightbox.classList.add('active');
    }
  });

  if (closeBtn && lightbox) closeBtn.onclick = () => lightbox.classList.remove('active');
  if (lightbox) {
    lightbox.onclick = (e) => {
      if (e.target === lightbox) lightbox.classList.remove('active');
    };
  }
}

function filterList(query = '', category = 'all') {
  const q = (query || '').toLowerCase();
  const cat = category || 'all';

  const filtered = cachedProducts.filter(p => {
    const matchesName = (p.name || '').toLowerCase().includes(q) || 
                        (p.id || '').toLowerCase().includes(q) ||
                        (p.brand || '').toLowerCase().includes(q);
    const matchesCat = cat === 'all' || (p.category || '').toLowerCase() === cat.toLowerCase();
    return matchesName && matchesCat;
  });

  renderProductsTable(filtered);
}