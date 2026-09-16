import { supabase } from './supabase.js';

let allBanners = [];

export async function initBannersModule() {
  await loadBannersList();
  bindBannerEvents();
}

export async function loadBannersList() {
  const container = document.getElementById('admin-banners-grid');
  if (!container) return;

  container.innerHTML = `
    <div style="grid-column: 1/-1; text-align:center; padding:30px; color:var(--text-muted); font-size:0.85rem;">
      Loading Banners...
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
    console.error("Banner load error:", err);
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align:center; padding:30px; color:var(--stat-red); font-size:0.85rem;">
        Failed to load banners: ${err.message}
      </div>
    `;
  }
}

function renderBannersGrid(banners) {
  const container = document.getElementById('admin-banners-grid');
  if (!container) return;

  if (banners.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align:center; padding:40px; color:var(--text-muted); font-size:0.85rem; background:rgba(0,86,75,0.03); border-radius:12px; border:1px dashed rgba(0,86,75,0.2);">
        No Banners Found. Click "+ Add New Banner" to create your first Hero Slider Banner.
      </div>
    `;
    return;
  }

  container.innerHTML = banners.map(b => `
    <div class="admin-banner-card" style="background:#ffffff; border:1px solid var(--glass-border); border-radius:12px; overflow:hidden; box-shadow:0 4px 16px rgba(0,54,47,0.06); display:flex; flex-direction:column;">
      <div style="position:relative; width:100%; height:140px; background:#f4f6f5;">
        <img src="${b.image_url}" alt="${b.title || 'Banner'}" style="width:100%; height:100%; object-fit:cover;">
        <span style="position:absolute; top:8px; left:8px; background:rgba(0,36,30,0.75); color:#fff; font-size:0.65rem; font-weight:800; padding:2px 6px; border-radius:4px;">
          Order: ${b.display_order || 1}
        </span>
        <span style="position:absolute; top:8px; right:8px; background:${b.active ? 'rgba(0,135,90,0.9)' : 'rgba(222,53,11,0.9)'}; color:#fff; font-size:0.65rem; font-weight:800; padding:2px 6px; border-radius:4px;">
          ${b.active ? 'ACTIVE' : 'INACTIVE'}
        </span>
      </div>

      <div style="padding:12px 14px; display:flex; flex-direction:column; gap:4px; flex:1;">
        <strong style="font-size:0.88rem; color:var(--brand-emerald-dark); line-height:1.2;">${b.title || 'Untitled Banner'}</strong>
        <span style="font-size:0.72rem; color:var(--text-muted); word-break:break-all;">Link: ${b.link_url || 'None'}</span>
      </div>

      <div style="padding:8px 14px; border-top:1px solid rgba(0,86,75,0.08); background:rgba(0,86,75,0.02); display:flex; justify-content:space-between; align-items:center;">
        <button type="button" class="btn-toggle-banner-active" data-id="${b.id}" data-active="${b.active}" style="background:none; border:none; color:var(--brand-emerald); font-size:0.75rem; font-weight:700; cursor:pointer;">
          ${b.active ? '⏸️ Deactivate' : '▶️ Activate'}
        </button>
        <button type="button" class="btn-delete-banner" data-id="${b.id}" style="background:none; border:none; color:var(--stat-red); font-size:0.75rem; font-weight:700; cursor:pointer;">
          🗑️ Delete
        </button>
      </div>
    </div>
  `).join('');
}

function bindBannerEvents() {
  const modal = document.getElementById('banner-modal-overlay');
  const openModalBtn = document.getElementById('btn-open-add-banner');
  const closeModalBtn = document.getElementById('btn-close-banner-modal');
  const form = document.getElementById('form-add-banner');
  const grid = document.getElementById('admin-banners-grid');
  const fileInput = document.getElementById('banner-img-file');
  const previewImg = document.getElementById('banner-img-preview');

  // Open Modal
  if (openModalBtn) {
    openModalBtn.onclick = () => {
      form?.reset();
      if (previewImg) previewImg.style.display = 'none';
      modal?.classList.add('active');
    };
  }

  // Close Modal
  if (closeModalBtn) {
    closeModalBtn.onclick = () => modal?.classList.remove('active');
  }

  if (modal) {
    modal.onclick = (e) => {
      if (e.target === modal) modal.classList.remove('active');
    };
  }

  // Image Live Preview
  if (fileInput && previewImg) {
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        previewImg.src = URL.createObjectURL(file);
        previewImg.style.display = 'block';
      } else {
        previewImg.style.display = 'none';
      }
    };
  }

  // Submit New Banner
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('btn-submit-banner');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = 'Uploading Banner...';
      }

      const title = document.getElementById('banner-title')?.value.trim();
      const linkUrl = document.getElementById('banner-link')?.value.trim();
      const displayOrder = parseInt(document.getElementById('banner-order')?.value) || 1;
      const file = fileInput?.files[0];
      const manualUrl = document.getElementById('banner-manual-url')?.value.trim();

      let finalImageUrl = manualUrl;

      try {
        // Upload to Supabase Storage if file is selected
        if (file) {
          const fileExt = file.name.split('.').pop();
          const fileName = `banner-${Date.now()}.${fileExt}`;
          const { error: uploadErr } = await supabase.storage.from('banners').upload(fileName, file, {
            upsert: true
          });
          if (uploadErr) throw uploadErr;

          const { data: { publicUrl } } = supabase.storage.from('banners').getPublicUrl(fileName);
          finalImageUrl = publicUrl;
        }

        if (!finalImageUrl) {
          throw new Error("Please select an image file or provide an image URL.");
        }

        // Insert into banners table
        const { error: insertErr } = await supabase.from('banners').insert([{
          title: title || 'Hero Banner',
          image_url: finalImageUrl,
          link_url: linkUrl || null,
          display_order: displayOrder,
          active: true,
          created_at: new Date().toISOString()
        }]);

        if (insertErr) throw insertErr;

        alert("✓ Banner Added Successfully!");
        modal?.classList.remove('active');
        await loadBannersList();

      } catch (err) {
        alert("Failed to save banner: " + err.message);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = 'Save & Publish Banner';
        }
      }
    };
  }

  // Grid Action Triggers (Toggle Active & Delete)
  if (grid) {
    grid.onclick = async (e) => {
      const toggleBtn = e.target.closest('.btn-toggle-banner-active');
      const deleteBtn = e.target.closest('.btn-delete-banner');

      if (toggleBtn) {
        const bannerId = toggleBtn.dataset.id;
        const currentActive = toggleBtn.dataset.active === 'true';
        await supabase.from('banners').update({ active: !currentActive }).eq('id', bannerId);
        await loadBannersList();
        return;
      }

      if (deleteBtn) {
        const bannerId = deleteBtn.dataset.id;
        if (confirm("Are you sure you want to delete this banner?")) {
          await supabase.from('banners').delete().eq('id', bannerId);
          await loadBannersList();
        }
        return;
      }
    };
  }
}