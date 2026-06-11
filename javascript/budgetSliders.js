/**
 * BUDGET SLIDERS
 * Lógica completa de los sliders de reparto de presupuesto por bebida.
 */

import { getDrinkLabel, getSelectedDrinks } from './helpers.js';
import {
  getMixerAlternativas,
  generarUISelectoresDemixer,
  setMixerPreference,
  updateMixerDropdownLabel
} from './mixerPreferences.js';

// Debounce timer para evitar recálculos durante cambios rápidos
let debounceTimer = null;

// ===============================
// RENDER PRINCIPAL
// ===============================
export function renderBudgetSliders() {
  const selected = getSelectedDrinks();
  const section = document.getElementById("budgetSplitSection");
  const container = document.getElementById("budgetSliders");

  container.innerHTML = "";

  if (selected.length === 0) {
    section.classList.add("d-none");
    return;
  }

  section.classList.remove("d-none");

  const evenValue = Math.floor(100 / selected.length);
  let remainder = 100 - evenValue * selected.length;

  selected.forEach((drink) => {
    const initialValue = evenValue + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;

    const col = document.createElement("div");
    col.className = "col-md-6";

    // Generar selector de mixer si la bebida tiene alternativas
    const alternativas = getMixerAlternativas(drink);
    let mixerHTML = '';
    if (alternativas && alternativas.length > 1) {
      mixerHTML = generarUISelectoresDemixer(drink) || '';
    }

    col.innerHTML = `
      <div class="slider-card p-3">
        <div class="d-flex justify-content-between align-items-center mb-2 gap-2">
          <label for="slider_${drink}" class="form-label mb-0">${getDrinkLabel(drink)}</label>

          <div class="d-flex align-items-center gap-2">
            <div class="form-check form-switch m-0">
              <input
                class="form-check-input budget-lock"
                type="checkbox"
                id="lock_${drink}"
                data-drink="${drink}"
              />
              <label class="form-check-label small" for="lock_${drink}">Fijar %</label>
            </div>

            <input
              type="number"
              class="form-control form-control-sm text-end budget-input"
              id="input_${drink}"
              data-drink="${drink}"
              min="0"
              max="100"
              step="1"
              value="${initialValue}"
              style="width: 90px;"
            />
          </div>
        </div>

        <input
          type="range"
          class="form-range budget-slider"
          id="slider_${drink}"
          data-drink="${drink}"
          min="0"
          max="100"
          step="1"
          value="${initialValue}"
        />

        ${mixerHTML}
      </div>
    `;

    container.appendChild(col);
  });

  document.querySelectorAll(".budget-slider").forEach(slider => {
    slider.addEventListener("input", handleSliderChange);
  });

  document.querySelectorAll(".budget-input").forEach(input => {
    input.addEventListener("input", handleInputChange);
    input.addEventListener("blur", normalizeBudgetSplit);
  });

  document.querySelectorAll(".budget-lock").forEach(lock => {
    lock.addEventListener("change", handleLockChange);
  });

  updateBudgetSplitState();
  
  // 🎯 Adjuntar event listeners a los radio buttons de mixer dentro de las tarjetas
  document.querySelectorAll(".mixer-option").forEach(radio => {
    radio.addEventListener("change", function() {
      const matches = this.name.match(/mixer_(.+)/);
      const bebidaKey = matches ? matches[1] : null;
      if (bebidaKey) {
        const mixerValue = this.dataset.mixerValue || this.value;
        setMixerPreference(bebidaKey, mixerValue);
        // NO reiniciar sliders, solo actualizar los valores
        updateMixerDropdownLabel(bebidaKey);
      }
    });
  });
}

// ===============================
// FUNCIONES HELPER DE CONTROLES
// ===============================
export function getBudgetControls() {
  return Array.from(document.querySelectorAll(".budget-slider")).map(slider => {
    const drink = slider.dataset.drink;
    const input = document.getElementById(`input_${drink}`);
    const lock = document.getElementById(`lock_${drink}`);
    return {
      drink,
      slider,
      input,
      lock,
      locked: lock ? lock.checked : false
    };
  });
}

export function getBudgetSplit() {
  const split = {};
  getBudgetControls().forEach(({ drink, slider }) => {
    split[drink] = parseInt(slider.value, 10) || 0;
  });
  return split;
}

export function getBudgetSplitTotal() {
  return Object.values(getBudgetSplit()).reduce((acc, val) => acc + val, 0);
}

function syncControlValue(drink, value) {
  const slider = document.getElementById(`slider_${drink}`);
  const input = document.getElementById(`input_${drink}`);

  slider.value = value;
  input.value = value;
}

// ===============================
// EVENT HANDLERS
// ===============================
function handleLockChange(e) {
  const controls = getBudgetControls();
  const lockedControls = controls.filter(c => c.locked);

  if (lockedControls.length === controls.length) {
    e.target.checked = false;
    alert("Debe quedar al menos una opción desbloqueada para ajustar el reparto.");
    return;
  }

  normalizeBudgetSplit();
}

function handleSliderChange(e) {
  const drink = e.target.dataset.drink;
  let value = parseInt(e.target.value, 10) || 0;
  
  // 🚨 VALIDACIÓN INMEDIATA: Asegurar que no se pase de 100%
  const controls = getBudgetControls();
  const lockedOthers = controls.filter(c => c.drink !== drink && c.locked);
  const lockedTotal = lockedOthers.reduce((sum, c) => sum + (parseInt(c.slider.value, 10) || 0), 0);
  
  // Si el nuevo valor + locked total > 100, ajustar inmediatamente
  if (value + lockedTotal > 100) {
    value = Math.max(0, 100 - lockedTotal);
    e.target.value = value;
  }
  
  // Cancelar timer anterior
  if (debounceTimer) clearTimeout(debounceTimer);
  
  // Nuevo timer: rebalancea después de 10ms sin cambios
  debounceTimer = setTimeout(() => {
    rebalanceFromChangedDrink(drink, value);
    debounceTimer = null;
  }, 10);
}

function handleInputChange(e) {
  const drink = e.target.dataset.drink;
  let value = parseInt(e.target.value, 10);

  if (Number.isNaN(value)) value = 0;
  value = Math.max(0, Math.min(100, value));
  
  // 🚨 VALIDACIÓN INMEDIATA: Asegurar que no se pase de 100%
  const controls = getBudgetControls();
  const lockedOthers = controls.filter(c => c.drink !== drink && c.locked);
  const lockedTotal = lockedOthers.reduce((sum, c) => sum + (parseInt(c.slider.value, 10) || 0), 0);
  
  // Si el nuevo valor + locked total > 100, ajustar inmediatamente
  if (value + lockedTotal > 100) {
    value = Math.max(0, 100 - lockedTotal);
    e.target.value = value;
  }

  // Cancelar timer anterior
  if (debounceTimer) clearTimeout(debounceTimer);
  
  // Nuevo timer: rebalancea después de 30ms sin cambios
  debounceTimer = setTimeout(() => {
    rebalanceFromChangedDrink(drink, value);
    debounceTimer = null;
  }, 30);
}

// ===============================
// REBALANCEO
// ===============================
/**
 * Rebalancea los sliders cuando uno cambia
 * VERSIÓN MEJORADA: Más robusta contra edge cases
 */
function rebalanceFromChangedDrink(changedDrink, newValue) {
  const controls = getBudgetControls();

  newValue = Math.max(0, Math.min(100, Math.round(newValue)));
  
  const adjustableOthers = controls.filter(c => c.drink !== changedDrink && !c.locked);
  const lockedOthers = controls.filter(c => c.drink !== changedDrink && c.locked);

  const lockedTotal = lockedOthers.reduce(
    (sum, c) => sum + (parseInt(c.slider.value, 10) || 0),
    0
  );

  const targetRemaining = 100 - newValue - lockedTotal;
  
  // Si targetRemaining es negativo, el usuario cambió a un valor muy alto
  if (targetRemaining < 0) {
    const correctedValue = Math.max(0, 100 - lockedTotal);
    syncControlValue(changedDrink, correctedValue);
    updateBudgetSplitState();
    return;
  }

  syncControlValue(changedDrink, newValue);

  // Si no hay otros sliders ajustables, nada que hacer
  if (adjustableOthers.length === 0) {
    updateBudgetSplitState();
    return;
  }

  // 🎯 NUEVA LÓGICA: Rebalancear si hay 2+ sliders desbloqueados (incluyendo el que cambió)
  // Es decir, si adjustableOthers.length >= 1 (más el changedDrink = 2+)
  if (adjustableOthers.length >= 1) {
    // Distribuir equitativamente el restante entre los adjustableOthers
    const valuePerSlider = Math.floor(targetRemaining / adjustableOthers.length);
    let extra = targetRemaining - (valuePerSlider * adjustableOthers.length);

    
    adjustableOthers.forEach((c, index) => {
      const value = valuePerSlider + (extra > 0 ? 1 : 0);
      if (extra > 0) extra--;
      syncControlValue(c.drink, value);
    });

    updateBudgetSplitState();
    return;
  }

  updateBudgetSplitState();
}

function normalizeBudgetSplit() {
  const controls = getBudgetControls();

  if (controls.length === 0) return;

  if (controls.length === 1) {
    syncControlValue(controls[0].drink, 100);
    updateBudgetSplitState();
    return;
  }

  const lockedControls = controls.filter(c => c.locked);
  const unlockedControls = controls.filter(c => !c.locked);

  if (unlockedControls.length === 0) {
    if (controls[controls.length - 1].lock) {
      controls[controls.length - 1].lock.checked = false;
    }
    updateBudgetSplitState();
    return;
  }

  const lockedTotal = lockedControls.reduce(
    (sum, c) => sum + (parseInt(c.slider.value, 10) || 0),
    0
  );

  let available = 100 - lockedTotal;

  if (available < 0) {
    const lastLocked = lockedControls[lockedControls.length - 1];
    const current = parseInt(lastLocked.slider.value, 10) || 0;
    syncControlValue(lastLocked.drink, Math.max(0, current + available));
    updateBudgetSplitState();
    return;
  }

  const unlockedTotal = unlockedControls.reduce(
    (sum, c) => sum + (parseInt(c.slider.value, 10) || 0),
    0
  );

  if (unlockedTotal === available) {
    updateBudgetSplitState();
    return;
  }

  if (unlockedTotal <= 0) {
    const base = Math.floor(available / unlockedControls.length);
    let extra = available - base * unlockedControls.length;

    unlockedControls.forEach(c => {
      const value = base + (extra > 0 ? 1 : 0);
      if (extra > 0) extra--;
      syncControlValue(c.drink, value);
    });

    updateBudgetSplitState();
    return;
  }

  let assigned = 0;

  unlockedControls.forEach((c, index) => {
    let value;

    if (index === unlockedControls.length - 1) {
      value = available - assigned;
    } else {
      value = Math.round(
        ((parseInt(c.slider.value, 10) || 0) / unlockedTotal) * available
      );
      assigned += value;
    }

    syncControlValue(c.drink, Math.max(0, value));
  });

  updateBudgetSplitState();
}

function updateBudgetSplitState() {
  const hint = document.getElementById("budgetSplitHint");
  const total = getBudgetSplitTotal();

  if (total === 100) {
    hint.textContent = "Reparto válido. El presupuesto está distribuido al 100%.";
    hint.className = "form-text mt-2 text-success";
  } else {
    hint.textContent = `El reparto actual suma ${total}%. Debe sumar 100%.`;
    hint.className = "form-text mt-2 text-danger";
  }
}
