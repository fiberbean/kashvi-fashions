import { supabase } from '../supabase.js';

let cachedRateCards = [];
let isEditMode = false;

export async function initDeliveryRatesModule() {
  bindDeliveryRatesEvents();
  await loadDeliveryRates();
}

export async function loadDeliveryRates() {
  const tbody = document.getElementById('delivery-rates-tbody');
  if (!tbody) return;

  try {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--text-muted);">Loading live India Post tariff rates...</td></tr>`;

    const { data: rates, error } = await supabase
      .from('delivery_rate_cards')
      .select('*')
      .order('weight_from', { ascending: true });

    if (error) throw error;
    cachedRateCards = rates || [];
    renderDeliveryRatesTable(cachedRateCards);

  } catch (err) {
    console.error("Delivery rates load error:", err);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--stat-red);">Error: ${err.message}</td></tr>`;
  }
}

function renderDeliveryRatesTable(rates) {
  const tbody = document.getElementById('delivery-rates-tbody');
  if (!tbody) return;

  if (rates.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--text-muted);">No rate cards found in database.</td></tr>`;
    return;
  }

  tbody.innerHTML = rates.map(rate => {
    const minW = rate.weight_from ?? 0;
    const maxW = rate.weight_to ?? '';
    const slabLabel = maxW ? `${minW}–${maxW} g` : `Above ${minW} g`;

    if (isEditMode) {
      // Edit Mode: Active Input Boxes
      return `
        <tr data-id="${rate.id}">
          <td><strong style="color:var(--brand-emerald-dark);">${slabLabel}</strong></td>
          <td><input type="number" class="rate-cell-input rate-local" value="${rate.local_rate ?? 0}" min="0"></td>
          <td><input type="number" class="rate-cell-input rate-state" value="${rate.within_state_rate ?? 0}" min="0"></td>
          <td><input type="number" class="rate-cell-input rate-metro" value="${rate.zone_metro_rate ?? 0}" min="0"></td>
          <td><input type="number" class="rate-cell-input rate-other" value="${rate.other_states_rate ?? 0}" min="0"></td>
        </tr>
      `;
    } else {
      // Default View Mode: Safe Read-Only Display
      return `
        <tr data-id="${rate.id}">
          <td><strong style="color:var(--brand-emerald-dark);">${slabLabel}</strong></td>
          <td><span class="rate-val-display">₹ ${rate.local_rate ?? 0}</span></td>
          <td><span class="rate-val-display">₹ ${rate.within_state_rate ?? 0}</span></td>
          <td><span class="rate-val-display">₹ ${rate.zone_metro_rate ?? 0}</span></td>
          <td><span class="rate-val-display">₹ ${rate.other_states_rate ?? 0}</span></td>
        </tr>
      `;
    }
  }).join('');
}

function bindDeliveryRatesEvents() {
  const toggleEditBtn = document.getElementById('btn-toggle-edit-rates');
  const saveBtn = document.getElementById('btn-save-delivery-rates');
  const cancelBtn = document.getElementById('btn-cancel-edit-rates');

  // Toggle into Edit Mode
  if (toggleEditBtn) {
    toggleEditBtn.onclick = () => {
      isEditMode = true;
      toggleEditBtn.style.display = 'none';
      if (saveBtn) saveBtn.style.display = 'inline-block';
      if (cancelBtn) cancelBtn.style.display = 'inline-block';
      renderDeliveryRatesTable(cachedRateCards);
    };
  }

  // Cancel Edit Mode
  if (cancelBtn) {
    cancelBtn.onclick = () => {
      isEditMode = false;
      if (toggleEditBtn) toggleEditBtn.style.display = 'inline-block';
      saveBtn.style.display = 'none';
      cancelBtn.style.display = 'none';
      renderDeliveryRatesTable(cachedRateCards);
    };
  }

  // Save Changes to Supabase
  if (saveBtn) {
    saveBtn.onclick = async () => {
      const rows = document.querySelectorAll('#delivery-rates-tbody tr');
      if (rows.length === 0) return;

      saveBtn.disabled = true;
      saveBtn.innerText = 'Saving...';

      try {
        const updatePromises = [];

        rows.forEach(row => {
          const id = row.dataset.id;
          if (!id) return;

          const local_rate = parseFloat(row.querySelector('.rate-local')?.value) || 0;
          const within_state_rate = parseFloat(row.querySelector('.rate-state')?.value) || 0;
          const zone_metro_rate = parseFloat(row.querySelector('.rate-metro')?.value) || 0;
          const other_states_rate = parseFloat(row.querySelector('.rate-other')?.value) || 0;

          updatePromises.push(
            supabase.from('delivery_rate_cards').update({
              local_rate,
              within_state_rate,
              zone_metro_rate,
              other_states_rate
            }).eq('id', id)
          );
        });

        await Promise.all(updatePromises);
        alert("✓ Delivery rates updated successfully!");

        // Switch back to view mode
        isEditMode = false;
        if (toggleEditBtn) toggleEditBtn.style.display = 'inline-block';
        saveBtn.style.display = 'none';
        cancelBtn.style.display = 'none';

        await loadDeliveryRates();
      } catch (err) {
        console.error("Save rates error:", err);
        alert("Failed to update rates: " + err.message);
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerText = '💾 Save Changes';
      }
    };
  }
}