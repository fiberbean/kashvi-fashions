import { supabase } from '../supabase.js';

let allBanners = [];
let editingBannerId = null;

export async function initCMSModule() {
  await loadStoreBanners();
  bindCMSEvents();
}

export async function loadStoreBanners() {
  const container = document.getElementById('cms-banners-container');
  if (!container) return;

  container.innerHTML = `
    <div style="grid-column:1/-1; text-align:center; padding:30px; color:var(--text-muted); font-size:0.85rem;">
      Loading live banners...
    </div>
  `;

  try {
    const { data: banners, error } = await supabase
      .from('banners')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    allBanners = banners || [];
    renderBannersGrid(allBanners);
  } catch (err) {
    console.error("CMS Banner load error:", err);
    container.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:30px; color:var(--stat-red); font-size:0.85rem;">
        Failed to load banners: ${err.message}
      </div>
    `;
  }
}

function renderBannersGrid(banners) {
  const container = document.getElementById('cms-banners-container');
  if (!container) return;

  if (banners.length === 0) {
    container.innerHTML = `
      <div style="grid-column:1/-1; border:1px dashed rgba(0,86,75,0.25); border-radius:10px; padding:32px; text-align:center; color:var(--text-muted); font-size:0.85rem;">
        No banners added yet. Click <strong>"+ Add Banner"</strong> above to upload your first storefront slider banner.
      </div>
    `;
    return;
  }

  container.innerHTML = banners.map(b => `
    <div class="cms-banner-card" style="background:#ffffff; border:1px solid var(--glass-border); border-radius:12px; overflow:hidden; box-shadow:0 4px 16px rgba(0,54,47,0.06); display:flex; flex-direction:column;">
      <div style="position:relative; width:100%; height:140px; background:#f4f6f5;">
        <img src="${b.image_url}" alt="${b.title || 'Banner'}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://placehold.co/1200x300/00362f/ffffff?text=Kashvi+Banner'">
        <span style="position:absolute; top:8px; left:8px; background:rgba(0,36,30,0.75); color:#fff; font-size:0.65rem; font-weight:800; padding:2px 6px; border-radius:4px;">
          Order: ${b.display_order || 1}
        </span>
        <span style="position:absolute; top:8px; right:8px; background:${b.active ? 'rgba(0,135,90,0.9)' : 'rgba(222,53,11,0.9)'}; color:#fff; font-size:0.65rem; font-weight:800; padding:2px 6px; border-radius:4px;">
          ${b.active ? 'ACTIVE' : 'INACTIVE'}
        </span>
      </div>

      <div style="padding:12px 14px; display:flex; flex-direction:column; gap:4px; flex:1;">
        <strong style="font-size:0.88rem; color:var(--brand-emerald-dark); line-height:1.2;">${b.title || 'Untitled Banner'}</strong>
        <span style="font-size:0.75rem; color:var(--brand-pink); font-weight:600;">${b.subtitle || b.banner_type || b.placement || 'Hero Main Slider'}</span>
        <span style="font-size:0.72rem; color:var(--text-muted); word-break:break-all;">Target: ${b.link_url || b.redirect_link || 'Storefront Default'}</span>
      </div>

      <div style="padding:8px 14px; border-top:1px solid rgba(0,86,75,0.08); background:rgba(0,86,75,0.02); display:flex; justify-content:space-between; align-items:center;">
        <button type="button" class="btn-toggle-banner-active" data-id="${b.id}" data-active="${b.active}" style="background:none; border:none; color:var(--brand-emerald); font-size:0.75rem; font-weight:700; cursor:pointer;">
          ${b.active ? '⏸️ Deactivate' : '▶️ Activate'}
        </button>
        <div style="display:flex; gap:10px;">
          <button type="button" class="btn-edit-banner" data-id="${b.id}" style="background:none; border:none; color:var(--brand-emerald-dark); font-size:0.75rem; font-weight:700; cursor:pointer;">
            ✏️ Edit
          </button>
          <button type="button" class="btn-delete-banner" data-id="${b.id}" style="background:none; border:none; color:var(--stat-red); font-size:0.75rem; font-weight:700; cursor:pointer;">
            🗑️ Delete
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function bindCMSEvents() {
  const modal = document.getElementById('banner-modal');
  const openModalBtn = document.getElementById('btn-add-banner');
  const closeModalBtn = document.getElementById('btn-close-banner-modal');
  const cancelBtn = document.getElementById('btn-cancel-banner');
  const form = document.getElementById('banner-form');
  const container = document.getElementById('cms-banners-container');
  const fileInput = document.getElementById('banner-file-input');
  const urlInput = document.getElementById('banner-image-url');

  if (openModalBtn) {
    openModalBtn.onclick = () => {
      editingBannerId = null;
      document.getElementById('banner-modal-title').innerText = 'Add New Storefront Banner';
      form?.reset();
      modal?.classList.add('active');
    };
  }

  const closeModal = () => modal?.classList.remove('active');
  if (closeModalBtn) closeModalBtn.onclick = closeModal;
  if (cancelBtn) cancelBtn.onclick = closeModal;
  if (modal) {
    modal.onclick = (e) => {
      if (e.target === modal) closeModal();
    };
  }

  // Handle File Input Change (Upload directly to Supabase Storage)
  if (fileInput) {
    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        if (urlInput) urlInput.value = 'Uploading file...';
        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `banner-${Date.now()}.${fileExt}`;
          const { error: uploadErr } = await supabase.storage.from('banners').upload(fileName, file, { upsert: true });
          if (uploadErr) throw uploadErr;

          const { data: { publicUrl } } = supabase.storage.from('banners').getPublicUrl(fileName);
          if (urlInput) urlInput.value = publicUrl;
        } catch (err) {
          console.warn("Storage upload failed:", err);
          if (urlInput) urlInput.value = '';
          alert("Storage upload error: " + err.message + ". You can paste an image URL directly.");
        }
      }
    };
  }

  // Submit Banner Form
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = 'Saving...';
      }

      const title = document.getElementById('banner-title')?.value.trim();
      const subtitle = document.getElementById('banner-subtitle')?.value.trim();
      const bannerType = document.getElementById('banner-type')?.value || 'hero';
      const displayOrder = parseInt(document.getElementById('banner-order')?.value) || 1;
      let imageUrl = document.getElementById('banner-image-url')?.value.trim();
      const redirectLink = document.getElementById('banner-redirect')?.value.trim();

      // If user selected file but storage wasn't uploaded yet
      const file = fileInput?.files[0];
      if (file && (!imageUrl || imageUrl.startsWith('data:') || imageUrl === 'Uploading file...')) {
        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `banner-${Date.now()}.${fileExt}`;
          await supabase.storage.from('banners').upload(fileName, file, { upsert: true });
          const { data: { publicUrl } } = supabase.storage.from('banners').getPublicUrl(fileName);
          imageUrl = publicUrl;
        } catch (err) {
          console.warn("Direct upload fallback error:", err);
        }
      }

      if (!imageUrl || imageUrl === 'Uploading file...') {
        alert("Please provide a valid image file or URL.");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = 'Save Banner';
        }
        return;
      }

      const payload = {
        title: title || 'Hero Banner',
        subtitle: subtitle || null,
        banner_type: bannerType,
        placement: bannerType,
        image_url: imageUrl,
        link_url: redirectLink || null,
        redirect_link: redirectLink || null,
        display_order: displayOrder,
        active: true,
        updated_at: new Date().toISOString()
      };

      try {
        if (editingBannerId) {
          const { error } = await supabase.from('banners').update(payload).eq('id', editingBannerId);
          if (error) throw error;
        } else {
          payload.created_at = new Date().toISOString();
          const { error } = await supabase.from('banners').insert([payload]);
          if (error) throw error;
        }

        alert("✓ Banner Saved Successfully!");
        closeModal();
        await loadStoreBanners();
      } catch (err) {
        alert("Banner save failed: " + err.message);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = 'Save Banner';
        }
      }
    };
  }

  // Card Actions
  if (container) {
    container.onclick = async (e) => {
      const toggleBtn = e.target.closest('.btn-toggle-banner-active');
      const editBtn = e.target.closest('.btn-edit-banner');
      const deleteBtn = e.target.closest('.btn-delete-banner');

      if (toggleBtn) {
        const id = toggleBtn.dataset.id;
        const currentActive = toggleBtn.dataset.active === 'true';
        await supabase.from('banners').update({ active: !currentActive }).eq('id', id);
        await loadStoreBanners();
        return;
      }

      if (editBtn) {
        const id = editBtn.dataset.id;
        const banner = allBanners.find(b => String(b.id) === String(id));
        if (banner) {
          editingBannerId = banner.id;
          document.getElementById('banner-modal-title').innerText = `Edit: ${banner.title || 'Banner'}`;
          document.getElementById('banner-title').value = banner.title || '';
          document.getElementById('banner-subtitle').value = banner.subtitle || '';
          document.getElementById('banner-type').value = banner.banner_type || banner.placement || 'hero';
          document.getElementById('banner-order').value = banner.display_order || 1;
          document.getElementById('banner-image-url').value = banner.image_url || '';
          document.getElementById('banner-redirect').value = banner.link_url || banner.redirect_link || '';
          modal?.classList.add('active');
        }
        return;
      }

      if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        if (confirm("Are you sure you want to delete this banner?")) {
          await supabase.from('banners').delete().eq('id', id);
          await loadStoreBanners();
        }
        return;
      }
    };
  }
}