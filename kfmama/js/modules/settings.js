import { supabase } from '../supabase.js';

export async function initSettingsModule() {
  bindSettingsEvents();
  await loadStoreSettings();
}

export async function loadStoreSettings() {
  try {
    const { data: settings, error } = await supabase
      .from('store_settings')
      .select('*')
      .eq('id', 'store_config')
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (settings) {
      populateSettingsForm(settings);
    }
  } catch (err) {
    console.error("Store settings load error:", err);
  }
}

function populateSettingsForm(s) {
  setVal('set-store-name', s.store_name);
  setVal('set-support-phone', s.support_phone);
  setVal('set-support-email', s.support_email);
  setVal('set-sender-address', s.sender_address);
  setVal('set-city', s.city);
  setVal('set-state', s.state);
  setVal('set-pincode', s.pincode);
  setVal('set-upi-id', s.upi_id);
  setVal('set-upi-payee', s.upi_payee_name);
  setVal('set-free-delivery', s.free_delivery_above);
  setVal('set-flat-delivery', s.flat_delivery_fee);
  setVal('set-admin-id', s.admin_id || 'admin');
  setVal('set-admin-pin', s.admin_pin || '1234');
  setVal('set-pipeline-pin', s.pipeline_pin || '1234');
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el && val !== undefined && val !== null) {
    el.value = val;
  }
}

function bindSettingsEvents() {
  const form = document.getElementById('store-settings-form');
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const saveBtn = form.querySelector('button[type="submit"]');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerText = 'Saving Settings...';
    }

    const payload = {
      id: 'store_config',
      store_name: document.getElementById('set-store-name')?.value.trim() || 'Kashvi Fashions',
      support_phone: document.getElementById('set-support-phone')?.value.trim(),
      support_email: document.getElementById('set-support-email')?.value.trim(),
      sender_address: document.getElementById('set-sender-address')?.value.trim(),
      city: document.getElementById('set-city')?.value.trim(),
      state: document.getElementById('set-state')?.value.trim(),
      pincode: document.getElementById('set-pincode')?.value.trim(),
      upi_id: document.getElementById('set-upi-id')?.value.trim(),
      upi_payee_name: document.getElementById('set-upi-payee')?.value.trim(),
      free_delivery_above: parseFloat(document.getElementById('set-free-delivery')?.value) || 0,
      flat_delivery_fee: parseFloat(document.getElementById('set-flat-delivery')?.value) || 0,
      admin_id: document.getElementById('set-admin-id')?.value.trim() || 'admin',
      admin_pin: document.getElementById('set-admin-pin')?.value.trim() || '1234',
      pipeline_pin: document.getElementById('set-pipeline-pin')?.value.trim() || '1234',
      updated_at: new Date().toISOString()
    };

    try {
      const { error } = await supabase
        .from('store_settings')
        .upsert(payload, { onConflict: 'id' });

      if (error) throw error;
      alert("✓ Store settings updated successfully!");
    } catch (err) {
      console.error("Save settings error:", err);
      alert("Failed to save settings: " + err.message);
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerText = '💾 Save All Store Settings';
      }
    }
  };
}