import { supabase } from '../supabase.js';
import { initProductsModule } from './products.js';

export let cachedCategories = [];
export let cachedSubCategories = [];
export let cachedBrands = [];
export let cachedColours = [];
export let cachedSizes = [];
export let cachedFabrics = [];

let activeMasterType = 'category';
let isEditingItem = false;
let currentEditingId = null;

const tableConfig = {
  category: { table: 'categories', title: 'Categories', prefix: 'CAT' },
  subcategory: { table: 'sub_categories', title: 'Sub-Categories', prefix: 'SUB' },
  brand: { table: 'brands', title: 'Brands', prefix: 'BRD' },
  colour: { table: 'colours', title: 'Colours', prefix: 'COL' },
  size: { table: 'sizes', title: 'Sizes', prefix: 'SIZ' },
  fabric: { table: 'fabrics', title: 'Fabrics / Materials', prefix: 'FAB' }
};

export async function initCategoriesModule() {
  bindHubCardClicks();
  bindDrawerEvents();
  await loadAllMasterData();
}

export async function loadAllMasterData() {
  try {
    const [catRes, subRes, brandRes, colRes, sizeRes, fabRes] = await Promise.all([
      supabase.from('categories').select('*').order('created_at', { ascending: false }),
      supabase.from('sub_categories').select('*').order('created_at', { ascending: false }),
      supabase.from('brands').select('*').order('created_at', { ascending: false }),
      supabase.from('colours').select('*').order('created_at', { ascending: false }),
      supabase.from('sizes').select('*').order('created_at', { ascending: false }),
      supabase.from('fabrics').select('*').order('created_at', { ascending: false })
    ]);

    cachedCategories = catRes.data || [];
    cachedSubCategories = subRes.data || [];
    cachedBrands = brandRes.data || [];
    cachedColours = colRes.data || [];
    cachedSizes = sizeRes.data || [];
    cachedFabrics = fabRes.data || [];

    // Update Counts on Master Cards
    updateHubCount('count-category', cachedCategories.length);
    updateHubCount('count-subcategory', cachedSubCategories.length);
    updateHubCount('count-brand', cachedBrands.length);
    updateHubCount('count-colour', cachedColours.length);
    updateHubCount('count-size', cachedSizes.length);
    updateHubCount('count-fabric', cachedFabrics.length);

    if (document.getElementById('master-drawer')?.classList.contains('active')) {
      renderActiveDrawerList();
    }

  } catch (err) {
    console.error("Error loading master taxonomies:", err);
  }
}

function updateHubCount(id, count) {
  const el = document.getElementById(id);
  if (el) el.innerText = `${count} Items`;
}

function bindHubCardClicks() {
  const hubGrid = document.querySelector('.masters-hub-grid');
  if (!hubGrid) return;

  hubGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.master-hub-card');
    if (card && card.dataset.master) {
      openMasterDrawer(card.dataset.master);
    }
  });
}

function openMasterDrawer(type) {
  activeMasterType = type;
  isEditingItem = false;
  currentEditingId = null;

  const drawer = document.getElementById('master-drawer');
  const titleEl = document.getElementById('master-drawer-title');
  const parentSelectRow = document.getElementById('drawer-parent-row');
  const parentSelect = document.getElementById('drawer-parent-select');
  const nameInput = document.getElementById('drawer-item-name');
  const submitBtn = document.getElementById('btn-drawer-submit');

  if (titleEl) titleEl.innerText = `Manage ${tableConfig[type].title}`;
  if (nameInput) nameInput.value = '';
  if (submitBtn) submitBtn.innerText = '+ Add';

  if (type === 'subcategory') {
    if (parentSelectRow) parentSelectRow.style.display = 'block';
    if (parentSelect) {
      parentSelect.innerHTML = cachedCategories.map(c => `
        <option value="${c.name || c.id}">${c.name || c.title}</option>
      `).join('');
    }
  } else {
    if (parentSelectRow) parentSelectRow.style.display = 'none';
  }

  renderActiveDrawerList();
  if (drawer) drawer.classList.add('active');
}

function renderActiveDrawerList() {
  const container = document.getElementById('master-items-list');
  if (!container) return;

  const dataMap = {
    category: cachedCategories,
    subcategory: cachedSubCategories,
    brand: cachedBrands,
    colour: cachedColours,
    size: cachedSizes,
    fabric: cachedFabrics
  };

  const list = dataMap[activeMasterType] || [];

  if (list.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted); font-size:0.85rem;">No items in this master yet. Use the form above to add your first item.</div>`;
    return;
  }

  container.innerHTML = list.map(item => {
    const name = item.name || item.title || item.size_name || item.colour_name;
    const subtext = activeMasterType === 'subcategory' 
      ? `Parent: ${item.category_name || item.category_id || 'General'}` 
      : `ID: ${String(item.id).slice(0, 10)}`;

    return `
      <div class="master-row-item">
        <div class="master-row-info">
          <span class="master-row-name">${name}</span>
          <span class="master-row-subtext">${subtext}</span>
        </div>
        <div class="master-row-actions">
          <button type="button" class="btn-card-action btn-card-edit" 
            data-id="${item.id}" 
            data-name="${name}" 
            data-parent="${item.category_name || item.category_id || ''}">✏️ Edit</button>
          
          <button type="button" class="btn-card-action btn-card-delete" 
            data-id="${item.id}" 
            data-name="${name}">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

function bindDrawerEvents() {
  const drawer = document.getElementById('master-drawer');
  const closeBtn = document.getElementById('btn-close-master-drawer');
  const form = document.getElementById('master-drawer-form');
  const nameInput = document.getElementById('drawer-item-name');
  const parentSelect = document.getElementById('drawer-parent-select');
  const submitBtn = document.getElementById('btn-drawer-submit');
  const cancelEditBtn = document.getElementById('btn-cancel-edit');
  const listContainer = document.getElementById('master-items-list');

  if (closeBtn) closeBtn.onclick = () => drawer?.classList.remove('active');
  if (cancelEditBtn) {
    cancelEditBtn.onclick = () => {
      isEditingItem = false;
      currentEditingId = null;
      if (nameInput) nameInput.value = '';
      if (submitBtn) submitBtn.innerText = '+ Add';
      cancelEditBtn.style.display = 'none';
    };
  }

  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const name = nameInput?.value.trim();
      if (!name) return;

      submitBtn.disabled = true;
      submitBtn.innerText = 'Saving...';

      try {
        const targetTable = tableConfig[activeMasterType].table;

        if (activeMasterType === 'subcategory') {
          const category_name = parentSelect?.value || '';
          if (isEditingItem && currentEditingId) {
            const { error } = await supabase.from(targetTable).update({ name, category_name }).eq('id', currentEditingId);
            if (error) throw error;
          } else {
            const id = 'SUB-' + Date.now().toString(36).toUpperCase();
            const { error } = await supabase.from(targetTable).insert([{ id, name, category_name }]);
            if (error) throw error;
          }
        } else {
          if (isEditingItem && currentEditingId) {
            const { error } = await supabase.from(targetTable).update({ name }).eq('id', currentEditingId);
            if (error) throw error;
          } else {
            const id = `${tableConfig[activeMasterType].prefix}-` + Date.now().toString(36).toUpperCase();
            const { error } = await supabase.from(targetTable).insert([{ id, name }]);
            if (error) throw error;
          }
        }

        nameInput.value = '';
        isEditingItem = false;
        currentEditingId = null;
        if (cancelEditBtn) cancelEditBtn.style.display = 'none';
        submitBtn.innerText = '+ Add';

        await loadAllMasterData();
        await initProductsModule();

      } catch (err) {
        console.error("Save error:", err);
        alert("Operation failed: " + err.message);
      } finally {
        submitBtn.disabled = false;
        if (!isEditingItem) submitBtn.innerText = '+ Add';
      }
    };
  }

  if (listContainer) {
    listContainer.onclick = async (e) => {
      const editBtn = e.target.closest('.btn-card-edit');
      const delBtn = e.target.closest('.btn-card-delete');

      if (editBtn) {
        isEditingItem = true;
        currentEditingId = editBtn.dataset.id;
        if (nameInput) nameInput.value = editBtn.dataset.name;
        if (parentSelect && editBtn.dataset.parent) parentSelect.value = editBtn.dataset.parent;
        if (submitBtn) submitBtn.innerText = 'Update';
        if (cancelEditBtn) cancelEditBtn.style.display = 'inline-block';
        nameInput.focus();
        return;
      }

      if (delBtn) {
        const id = delBtn.dataset.id;
        const name = delBtn.dataset.name;
        const targetTable = tableConfig[activeMasterType].table;

        if (confirm(`Delete "${name}" from ${tableConfig[activeMasterType].title}?`)) {
          const { error } = await supabase.from(targetTable).delete().eq('id', id);
          if (error) {
            alert("Delete failed: " + error.message);
          } else {
            await loadAllMasterData();
            await initProductsModule();
          }
        }
        return;
      }
    };
  }
}