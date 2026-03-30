/**
 * CALCULADORA - UI + HANDLERS
 * Rendering de interfaz y manejo de eventos (slider, inputs, etc)
 * 
 * Versión: 3.1
 * Separación de concerns: Presentación + interacción del usuario
 */

import {
  formatCLP,
  clearElement,
  addLi,
  getSelectedDrinks,
  getModeLabel,
  getDrinkLabel,
  getPracticalLevel,
  syncControlValue,
  setElementVisibility,
  actualizarTextoDropdownBebidas
} from './calculadora-utils.js';

// ===============================
// RENDERING: SLIDERS DE PRESUPUESTO
// ===============================

/**
 * Renderiza los sliders de distribución de presupuesto por bebida
 * @param {Object} OPCIONES_CONSUMO - Config de opciones de bebida
 * @param {Function} handleSliderChange - Handler para cambios de slider
 * @param {Function} handleInputChange - Handler para cambios de input
 * @param {Function} handleLockChange - Handler para cambios de lock
 * @param {Function} normalizeBudgetSplit - Function para normalizar
 */
export function renderBudgetSliders(
  OPCIONES_CONSUMO,
  handleSliderChange,
  handleInputChange,
  handleLockChange,
  normalizeBudgetSplit
) {
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

    col.innerHTML = `
      <div class="border rounded p-3 bg-white">
        <div class="d-flex justify-content-between align-items-center mb-2 gap-2">
          <label for="slider_${drink}" class="form-label mb-0">${getDrinkLabel(drink, OPCIONES_CONSUMO)}</label>

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
      </div>
    `;

    container.appendChild(col);
  });

  // Agregar event listeners
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
}

/**
 * Actualiza estado visual de los sliders
 */
export function updateBudgetSplitState() {
  const controls = getBudgetControls();
  const total = getBudgetSplitTotal();
  
  const indicator = document.getElementById("budgetTotalIndicator");
  if (indicator) {
    indicator.textContent = `Total: ${total}%`;
    indicator.className = total === 100 ? 'text-success' : 'text-warning';
  }
}

/**
 * Obtiene controles de budget del DOM
 * @returns {Array} Array de controles
 */
function getBudgetControls() {
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

/**
 * Obtiene distribución de presupuesto
 * @returns {Object} { bebida: porcentaje, ... }
 */
export function getBudgetSplit() {
  const split = {};
  getBudgetControls().forEach(({ drink, slider }) => {
    split[drink] = parseInt(slider.value, 10) || 0;
  });
  return split;
}

/**
 * Obtiene total de distribución
 * @returns {number} Suma de porcentajes
 */
export function getBudgetSplitTotal() {
  return Object.values(getBudgetSplit()).reduce((acc, val) => acc + val, 0);
}

// ===============================
// EVENT HANDLERS: SLIDERS
// ===============================

/**
 * Handler para cambios en slider de presupuesto
 */
export function createHandleSliderChange(rebalance, updateUI) {
  return function handleSliderChange(e) {
    const drink = e.target.dataset.drink;
    const value = parseInt(e.target.value, 10);
    rebalance(drink, value);
    if (updateUI) updateUI();
  };
}

/**
 * Handler para cambios en input de presupuesto
 */
export function createHandleInputChange(rebalance, updateUI) {
  return function handleInputChange(e) {
    const drink = e.target.dataset.drink;
    const value = parseInt(e.target.value, 10);
    rebalance(drink, value);
    if (updateUI) updateUI();
  };
}

/**
 * Handler para cambios de lock
 */
export function createHandleLockChange(normalize) {
  return function handleLockChange(e) {
    const controls = getBudgetControls();
    const lockedControls = controls.filter(c => c.locked);

    if (lockedControls.length === controls.length) {
      e.target.checked = false;
      alert("Debe quedar al menos una opción desbloqueada para ajustar el reparto.");
      return;
    }

    normalize();
  };
}

/**
 * Rebalancea bebidas cuando una cambia
 */
export function createRebalanceFromChangedDrink() {
  return function rebalanceFromChangedDrink(changedDrink, newValue) {
    const controls = getBudgetControls();

    newValue = Math.max(0, Math.min(100, Math.round(newValue)));
    syncControlValue(changedDrink, newValue);

    const adjustableOthers = controls.filter(c => c.drink !== changedDrink && !c.locked);
    const lockedOthers = controls.filter(c => c.drink !== changedDrink && c.locked);

    const lockedTotal = lockedOthers.reduce(
      (sum, c) => sum + (parseInt(c.slider.value, 10) || 0),
      0
    );

    const targetRemaining = 100 - newValue - lockedTotal;

    if (targetRemaining < 0) {
      const correctedValue = Math.max(0, 100 - lockedTotal);
      syncControlValue(changedDrink, correctedValue);
      updateBudgetSplitState();
      return;
    }

    if (adjustableOthers.length === 0) {
      const correctedValue = Math.max(0, 100 - lockedTotal);
      syncControlValue(changedDrink, correctedValue);
      updateBudgetSplitState();
      return;
    }

    const currentAdjustableTotal = adjustableOthers.reduce(
      (sum, c) => sum + (parseInt(c.slider.value, 10) || 0),
      0
    );

    if (currentAdjustableTotal <= 0) {
      const base = Math.floor(targetRemaining / adjustableOthers.length);
      let extra = targetRemaining - base * adjustableOthers.length;

      adjustableOthers.forEach(c => {
        const value = base + (extra > 0 ? 1 : 0);
        if (extra > 0) extra--;
        syncControlValue(c.drink, value);
      });

      updateBudgetSplitState();
      return;
    }

    let assigned = 0;

    adjustableOthers.forEach((c, index) => {
      let value;

      if (index === adjustableOthers.length - 1) {
        value = targetRemaining - assigned;
      } else {
        value = Math.round(
          ((parseInt(c.slider.value, 10) || 0) / currentAdjustableTotal) * targetRemaining
        );
        assigned += value;
      }

      syncControlValue(c.drink, Math.max(0, value));
    });

    updateBudgetSplitState();
  };
}

/**
 * Normaliza distribución de presupuesto
 */
export function createNormalizeBudgetSplit() {
  return function normalizeBudgetSplit() {
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
  };
}

// ===============================
// RENDERING: RESULTADOS
// ===============================

/**
 * Renderiza resultados de presupuesto en modal
 * @param {Object} presupuesto - Datos del presupuesto
 * @param {Object} OPCIONES_CONSUMO - Config de opciones
 */
export function renderResultsModal(presupuesto, OPCIONES_CONSUMO) {
  // Actualizar resumen en header del modal
  const resumenEl = document.getElementById("resumen");
  if (resumenEl) {
    const bebidasLabels = presupuesto.bebidas
      .map(key => getDrinkLabel(key, OPCIONES_CONSUMO))
      .join(", ");
    resumenEl.textContent = `${presupuesto.personas} persona(s) · ${bebidasLabels} · ${getModeLabel(presupuesto.modo)}`;
  }

  // Actualizar presupuesto total
  const presupuestoTotalEl = document.getElementById("presupuestoTotal");
  if (presupuestoTotalEl) {
    presupuestoTotalEl.textContent = formatCLP(presupuesto.presupuestoTotal);
  }

  // Multi-tienda
  renderPlanResults(
    presupuesto.multiPlan,
    "listaMultiTienda",
    "detalleTiendasMulti",
    "totalMulti",
    "saldoMulti",
    "ratioMulti",
    "costoPracticoMulti",
    presupuesto.presupuestoTotal
  );

  // Tienda única
  renderPlanResults(
    presupuesto.singlePlan,
    "listaTiendaUnica",
    "detalleTiendaUnica",
    "totalUnica",
    "saldoUnica",
    "ratioUnica",
    "costoPracticoUnica",
    presupuesto.presupuestoTotal
  );

  // Mostrar modal
  const modal = new bootstrap.Modal(document.getElementById("resultadoModal"));
  modal.show();
}

/**
 * Renderiza resultado de un plan (multi o single)
 */
function renderPlanResults(
  plan,
  listaId,
  detalleId,
  totalId,
  saldoId,
  ratioId,
  costoPracticoId,
  presupuestoTotal
) {
  const listaEl = document.getElementById(listaId);
  const detalleEl = document.getElementById(detalleId);
  const totalEl = document.getElementById(totalId);
  const saldoEl = document.getElementById(saldoId);
  const ratioEl = document.getElementById(ratioId);
  const costoPracticoEl = document.getElementById(costoPracticoId);
  
  if (!plan || !plan.ok) {
    if (listaEl) listaEl.innerHTML = '';
    if (detalleEl) detalleEl.textContent = 'No disponible';
    if (totalEl) totalEl.textContent = 'No disponible';
    if (saldoEl) saldoEl.textContent = '—';
    if (ratioEl) ratioEl.textContent = '—';
    if (costoPracticoEl) costoPracticoEl.textContent = '—';
    return;
  }

  // Renderizar lista de items
  if (listaEl) {
    listaEl.innerHTML = '';
    plan.items.forEach(item => {
      const li = document.createElement('li');
      li.textContent = `${item.nombre} (${item.tienda}) - ${formatCLP(item.precio)}`;
      listaEl.appendChild(li);
    });
  }

  // Actualizar detalles
  if (detalleEl) {
    const stores = [...new Set(plan.items.map(i => i.tienda))].join(", ");
    detalleEl.textContent = `Tienda(s): ${stores}`;
  }

  // Actualizar total y saldo
  if (totalEl) totalEl.textContent = formatCLP(plan.total);
  if (saldoEl) saldoEl.textContent = formatCLP(presupuestoTotal - plan.total);
  if (ratioEl) ratioEl.textContent = getPracticalLevel(plan.total, presupuestoTotal);
  if (costoPracticoEl) costoPracticoEl.textContent = plan.practicalLabel || "Normal";
}
