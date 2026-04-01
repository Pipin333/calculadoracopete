/**
 * CALCULADORA DE PRESUPUESTO PARA CARRETES - CHILE
 * 
 * Versión: Pro Anfitrión (Septiembre 2026)
 * Optimizado para eventos tipo "Parcela/Patota" con clima cálido
 * 
 * AJUSTES PRINCIPALES:
 * - Consumos calibrados para alta rotación y visicooler/refri secundario
 * - Factor energética: 2.75 (ideal para latas 250ml vs destilados 100ml)
 * - Hielo: SIEMPRE Math.ceil() (crítico en clima caluroso)
 * - Preferencia: Botellas grandes 2.5L/3L con bonus para "concho" del día siguiente
 * - Tienda única: Penalización FUERTE (50) para forzar logística simplificada
 * - Packs vs sueltas: Penalización MUY FUERTE (400) para evitar compras de novato
 */

// ✅ v3.0 FIREBASE IMPORTS
import { crearYCompartirPresupuestoCorto } from './shorturl.js';

// ===============================
// UTILIDADES
// ===============================
/**
 * Crea un objeto presupuesto con los datos calculados
 * @param {Object} datos - Datos básicos (personas, aporte, modo, bebidas, tiendaSplit)
 * @param {Object} multiPlan - Plan de compra multi-tienda
 * @param {Object} singlePlan - Plan de compra tienda única
 * @returns {Object} Presupuesto completo
 */
function crearPresupuesto(datos, multiPlan, singlePlan) {
  return {
    personas: datos.personas || 0,
    aporte: datos.aporte || 0,
    modo: datos.modo || 'N/A',
    bebidas: datos.bebidas || [],
    tiendaSplit: datos.tiendaSplit || false,
    presupuestoTotal: (datos.personas || 0) * (datos.aporte || 0),
    multiPlan: multiPlan || {},
    singlePlan: singlePlan || {},
    timestamp: new Date().toISOString()
  };
}

// ===============================
// CONFIG / REGLAS DE CONSUMO
// ===============================
const CONSUMOS = {
  previa: {
    cervezaMlPorPersona: 700,
    destiladoMlPorPersona: 120,
    bebidaFactor: 1.5,
    hieloBolsasPorPersona: 1 / 10 
  },
  trabajo: {
    cervezaMlPorPersona: 1200,
    destiladoMlPorPersona: 180,
    bebidaFactor: 2.0,
    hieloBolsasPorPersona: 1 / 8
  },
  pongamosle: {
    cervezaMlPorPersona: 1500,     // Estilo parcela/patota: +50% vs trabajo
    destiladoMlPorPersona: 250,    // +40% vs trabajo 
    bebidaFactor: 2.0,            // Piscola estándar
    hieloBolsasPorPersona: 1 / 4  // 1 bolsa de 2kg cada 4 personas (crítico en septiembre/calor)
  },
  modo18: {
    cervezaMlPorPersona: 2500,     // Basado en rotación de 200 unidades
    destiladoMlPorPersona: 400,     // +60% vs pongámosle (mayor protagonismo)
    bebidaFactor: 2.5,             // Energética: ideal para latas de 250ml
    hieloBolsasPorPersona: 1 / 3   // 1 bolsa de 2kg cada 3 personas (crítico en jornada larga)
  },
  proyectox: {
    cervezaMlPorPersona: 3750,     // +25% vs Modo 18 (multi-día relajado, no extremo)
    destiladoMlPorPersona: 500,    // +25% vs Modo 18 (misma proporción que cerveza)
    bebidaFactor: 2.8,             // +12% vs Modo 18 (moderado para multi-día)
    hieloBolsasPorPersona: 1 / 3   // Similar a Modo 18 (suficiente para multi-día)
  }
};

const EXPONENTE_SLIDER_CONSUMO = 0.6;
const UMBRAL_ADVERTENCIA_DESTILADO_ML = 300;

// ===============================
// HEURÍSTICA
// ===============================

// A nivel de combinación por categoría
const PENALIZACION_ITEM_COMBINACION = 400; // Penaliza FUERTEMENTE comprar unidades sueltas si hay pack
const PENALIZACION_SKU_COMBINACION = 80;   // Bajo: priorizar botellas grandes (2.5L, 3L) aunque sobre
const PENALIZACION_SOBRECOMPRA_POR_LITRO = 100; // Permite excedentes marginales en bebidas

// A nivel de plan total
const PENALIZACION_TIENDA_EXTRA = 25;     // Moderada: permite que usuario elija (single vs multi-tienda)
const PENALIZACION_SKU_PLAN = 2;
const PENALIZACION_ITEM_PLAN = 1;
const PENALIZACION_SOBRECOMPRA_PLAN_POR_LITRO = 1.5;

// ===============================
// FACTOR ESTACIONAL (ajuste automático por mes)
// ===============================
// Calibración: Septiembre (primavera) = 1.0 (baseline)
// Invierno (junio-julio) = 0.8 (menos hielo, menos cerveza fría)
// Verano (enero-febrero) = 1.1 (más hielo, más cerveza fría)

const FACTOR_ESTACIONAL_POR_MES = [
  1.10,  // Enero (verano pico)
  1.10,  // Febrero (verano pico)
  1.05,  // Marzo (otoño inicial, aún calor)
  0.95,  // Abril (otoño, enfría)
  0.85,  // Mayo (invierno inicial)
  0.80,  // Junio (invierno pico) ⚠️
  0.80,  // Julio (invierno pico) ⚠️
  0.85,  // Agosto (invierno final, empieza mejorar)
  1.00,  // Septiembre (primavera, BASELINE)
  1.05,  // Octubre (primavera, calentando)
  1.10,  // Noviembre (pre-verano)
  1.10   // Diciembre (verano)
];

function getFactorEstacional() {
  const mes = new Date().getMonth(); // 0-11
  return FACTOR_ESTACIONAL_POR_MES[mes];
}

// ===============================
// BUILDER AUTOMÁTICO DESDE productos.json
// ===============================
/**
 * Sistema completamente modular que lee categorías desde productos.json
 * 
 * VENTAJAS:
 * - Agregar bebida = solo agregar a productos.json
 * - Checkboxes se generan automáticamente
 * - OPCIONES_CONSUMO se construye automáticamente
 * - Sin código hardcodeado en script.js
 * 
 * CÓMO AGREGAR UNA BEBIDA:
 * 1. En productos.json → categorias → agregar nueva categoría con metadata
 * 2. O en productos.json → combinaciones_especiales → agregar SKU especial
 * 3. LISTO - Todo se genera automáticamente
 */

let CATEGORIAS_JSON = {};
let COMBINACIONES_ESPECIALES_JSON = {};

/**
 * Carga configuración desde productos.json
 */
async function cargarConfiguracionDesdeJSON() {
  try {
    const response = await fetch('../json/productos.json');
    const data = await response.json();
    
    CATEGORIAS_JSON = data.categorias || {};
    COMBINACIONES_ESPECIALES_JSON = data.combinaciones_especiales || {};
    
    console.log(`📥 Configuración cargada desde productos.json`);
    console.log(`   📊 Categorías: ${Object.keys(CATEGORIAS_JSON).length}`);
    console.log(`   🔗 Combinaciones: ${Object.keys(COMBINACIONES_ESPECIALES_JSON).length}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Error cargando productos.json:`, error);
    return false;
  }
}

/**
 * Construye OPCIONES_CONSUMO desde JSON
 */
function buildOpcionesConsumoDesdeJSON() {
  const opciones = {};

  // 1. Agregar categorías simples (seleccionables)
  for (const [key, config] of Object.entries(CATEGORIAS_JSON)) {
    if (config.esSeleccionable !== false) {
      opciones[key] = {
        nombre: config.nombre,
        grupo: config.grupo,
        categoriaBase: key,
        llevaMixer: config.llevaMixer,
        mixerCategoria: config.mixerCategoria,
        mixerFactor: config.mixerFactor,
        llevaHielo: config.llevaHielo
      };
    }
  }

  // 2. Agregar combinaciones especiales
  for (const [key, config] of Object.entries(COMBINACIONES_ESPECIALES_JSON)) {
    opciones[key] = {
      nombre: config.nombre,
      grupo: config.grupo,
      categoriaBase: config.categoriaBase,
      llevaMixer: config.llevaMixer,
      mixerCategoria: config.mixerCategoria,
      mixerFactor: config.mixerFactor,
      llevaHielo: config.llevaHielo
    };
  }

  console.log(`📦 OPCIONES_CONSUMO construidas desde JSON: ${Object.keys(opciones).length} opciones`);
  return opciones;
}

/**
 * Genera checkboxes dinámicamente en el dropdown
 */
function generarCheckboxesDinámicos() {
  const dropdownMenu = document.querySelector('.dropdown-menu[aria-labelledby="bebidasDropdown"]');
  
  if (!dropdownMenu) {
    console.error(`❌ Dropdown menu no encontrado`);
    return;
  }

  // Limpiar checkboxes existentes (excepto el primero si es un divider)
  dropdownMenu.innerHTML = '';

  // Generar checkboxes para categorías seleccionables + combinaciones especiales
  const bebidas = {
    ...Object.entries(CATEGORIAS_JSON)
      .filter(([_, config]) => config.esSeleccionable !== false)
      .reduce((acc, [key, config]) => ({...acc, [key]: config}), {}),
    ...COMBINACIONES_ESPECIALES_JSON
  };

  console.log(`🔲 Generando ${Object.keys(bebidas).length} checkboxes...`);
  console.log(`📋 Bebidas a generar:`, Object.keys(bebidas));

  for (const [key, config] of Object.entries(bebidas)) {
    const checkId = `chk${key.charAt(0).toUpperCase()}${key.slice(1).replace(/_/g, '')}`;
    const checkbox = document.createElement('div');
    checkbox.className = 'form-check mb-2';
    checkbox.innerHTML = `
      <input class="form-check-input bebida-check" type="checkbox" value="${key}" id="${checkId}">
      <label class="form-check-label" for="${checkId}">${config.displayName || config.nombre}</label>
    `;
    dropdownMenu.appendChild(checkbox);
    
    console.log(`  ✓ ${key} → ${config.displayName || config.nombre}`);
  }

  console.log(`✅ Checkboxes generados dinámicamente`);

  // Re-adjuntar event listeners al dropdown actualizado
  adjuntarEventListeners();
}

/**
 * Re-adjunta event listeners después de generar checkboxes
 */
function adjuntarEventListeners() {
  // El event delegation ya está configurado en handleSliderChange
  // pero podemos forzar una actualización visual
  actualizarTextoDropdownBebidas();
}

const mockProducts = []; // Remove or leave empty as we are now relying on productos.json

// ===============================
// OPCIONES_CONSUMO GLOBAL
// ===============================
// Se construirá dinámicamente al cargar productos.json
let OPCIONES_CONSUMO = {};

// ===============================
// API MOCK
// ===============================

const productApi = {
  _data: null,
  
  async _loadData() {
    if (this._data) return this._data;
    
    try {
      const response = await fetch('../json/productos.json');
      if (!response.ok) throw new Error('No se pudo cargar productos.json');
      this._data = await response.json();
      return this._data;
    } catch (error) {
      console.warn(`Error cargando productos.json: ${error.message}`);
      return { timestamp: new Date().toISOString(), total: mockProducts.length, productos: mockProducts };
    }
  },
  
  async getProductsByCategory(category) {
    const data = await this._loadData();
    
    return data.productos
      .filter(p => p.categoria === category)
      .map(p => ({
        ...p,
        volumenTotalMl: p.unidades * p.volumenMlUnidad,
        precioPorMl: p.precio / (p.unidades * p.volumenMlUnidad)
      }));
  },
  
  async getTimestamp() {
    const data = await this._loadData();
    return data.timestamp;
  },
  
};

// ===============================
// HELPERS UI
// ===============================
function formatCLP(value) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0
  }).format(value);
}

function clearElement(element) {
  element.innerHTML = "";
}

function addLi(element, text) {
  const li = document.createElement("li");
  li.textContent = text;
  element.appendChild(li);
}

function getSelectedDrinks() {
  const selected = Array.from(document.querySelectorAll(".bebida-check:checked"))
    .map(input => input.value)
    .filter(key => OPCIONES_CONSUMO && OPCIONES_CONSUMO[key]);

  console.log(`📊 Bebidas seleccionadas:`, selected);
  if (OPCIONES_CONSUMO) {
    console.log(`   Disponibles en OPCIONES_CONSUMO:`, Object.keys(OPCIONES_CONSUMO));
  }

  return selected;
}

function getModeLabel(mode) {
  if (mode === "previa") return "Previa";
  if (mode === "trabajo") return "Trabajo mañana";
  if (mode === "pongamosle") return "Pongámosle";
  if (mode === "modo18") return "Modo 18";
  if (mode === "proyectox") return "Proyecto X";
  return "Modo desconocido";
}

function getDrinkLabel(drink) {
  return OPCIONES_CONSUMO[drink]?.nombre || drink;
}

function actualizarTextoDropdownBebidas() {
  const seleccionadas = Array.from(document.querySelectorAll(".bebida-check:checked"))
    .map(input => input.nextElementSibling.textContent.trim());

  const boton = document.getElementById("bebidasDropdown");

  if (seleccionadas.length === 0) {
    boton.textContent = "Selecciona uno o más tipos de copete";
  } else if (seleccionadas.length === 1) {
    boton.textContent = seleccionadas[0];
  } else {
    boton.textContent = `${seleccionadas.length} opciones seleccionadas`;
  }
}

function getPracticalLevel(score) {
  if (score <= 8) return "Muy conveniente";
  if (score <= 15) return "Conveniente";
  if (score <= 24) return "Medio pajera";
  return "Solo si quieres exprimir precio";
}

function getRatioBudget(spent, total) {
  if (total <= 0) return "—";
  const percentage = Math.round((spent / total) * 100);
  const remaining = total - spent;
  return `${percentage}% utilizado (${formatCLP(remaining)} restante)`;
}

// ===============================
// SLIDERS DE PRESUPUESTO
// ===============================
function renderBudgetSliders() {
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
}

// Funciones helper para acceder a los controles
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

function getBudgetSplit() {
  const split = {};
  getBudgetControls().forEach(({ drink, slider }) => {
    split[drink] = parseInt(slider.value, 10) || 0;
  });
  return split;
}

function getBudgetSplitTotal() {
  return Object.values(getBudgetSplit()).reduce((acc, val) => acc + val, 0);
}

function syncControlValue(drink, value) {
  const slider = document.getElementById(`slider_${drink}`);
  const input = document.getElementById(`input_${drink}`);

  slider.value = value;
  input.value = value;
}

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

// Debounce timer para evitar recálculos durante cambios rápidos
let debounceTimer = null;

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
  
  // Nuevo timer: rebalancea después de 30ms sin cambios
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

// ===============================
// REQUERIMIENTOS
// ===============================
function buildRequirements(selectedDrinks, people, mode, budget, budgetSplit) {
  const rules = CONSUMOS[mode];

  if (!rules) {
    throw new Error(`Modo inválido recibido en buildRequirements: ${mode}`);
  }

  // ✅ VALIDACIÓN: Verificar OPCIONES_CONSUMO
  if (!OPCIONES_CONSUMO || Object.keys(OPCIONES_CONSUMO).length === 0) {
    console.error(`❌ OPCIONES_CONSUMO vacío o no inicializado`);
    console.log(`OPCIONES_CONSUMO actual:`, OPCIONES_CONSUMO);
    return [];
  }

  const requirements = [];
  
  console.log(`\n🔧 buildRequirements() - Procesando ${selectedDrinks.length} bebidas`);
  
  const opciones = selectedDrinks
    .map(key => {
      const opcion = OPCIONES_CONSUMO[key];
      if (!opcion) {
        console.warn(`⚠️ Bebida "${key}" NO EXISTE en OPCIONES_CONSUMO`);
        console.log(`   Disponibles:`, Object.keys(OPCIONES_CONSUMO));
        return null;
      }
      console.log(`  ✓ Procesando: ${key} (grupo: ${opcion.grupo}, nombre: ${opcion.nombre})`);
      return { key, ...opcion };
    })
    .filter(Boolean);

  console.log(`📊 Opciones válidas después de filtro: ${opciones.length}`);

  const cervezas = opciones.filter(op => op.grupo === "cerveza");
  const solos = opciones.filter(op => op.grupo === "solo");
  const mixes = opciones.filter(op => op.grupo === "mix_simple");
  const destilados = opciones.filter(op => op.grupo === "destilado");

  console.log(`   Cervezas: ${cervezas.length}, Solos: ${solos.length}, Mixes: ${mixes.length}, Destilados: ${destilados.length}`);

  if (cervezas.length > 0) {
    const beerBudget = budget * ((budgetSplit["cerveza"] || 0) / 100);
    const factorEstacional = getFactorEstacional();

    requirements.push({
      categoria: "cerveza",
      nombre: "Cerveza",
      requiredMl: Math.ceil(people * rules.cervezaMlPorPersona * factorEstacional),
      budget: beerBudget,
      porcentaje: budgetSplit["cerveza"] || 0
    });
  }

  const opcionesDestilado = [...solos, ...mixes, ...destilados];

  if (opcionesDestilado.length > 0) {
    const factorCantidadDestilados = 0.7 + 0.3 * opcionesDestilado.length;
    const factorSolo = mixes.length === 0 ? 0.85 : 1.0;

    const totalDestiladoBaseMl = Math.ceil(
      people * rules.destiladoMlPorPersona * factorCantidadDestilados * factorSolo
    );

    const presupuestoDestilados = opcionesDestilado.reduce(
      (sum, op) => sum + budget * ((budgetSplit[op.key] || 0) / 100),
      0
    );

    const pesos = {};
    let sumaPesos = 0;

    opcionesDestilado.forEach(op => {
      const porcentaje = (budgetSplit[op.key] || 0) / 100;
      const peso = Math.pow(Math.max(porcentaje, 0.01), EXPONENTE_SLIDER_CONSUMO);
      pesos[op.key] = peso;
      sumaPesos += peso;
    });

    let totalAsignado = 0;

    opcionesDestilado.forEach((op, index) => {
      const proporcion = pesos[op.key] / sumaPesos;

      let requiredMl;
      if (index === opcionesDestilado.length - 1) {
        requiredMl = totalDestiladoBaseMl - totalAsignado;
      } else {
        requiredMl = Math.round(totalDestiladoBaseMl * proporcion);
        totalAsignado += requiredMl;
      }

      const subBudget = budget * ((budgetSplit[op.key] || 0) / 100);

      requirements.push({
        categoria: op.categoriaBase,
        nombre: op.nombre,
        requiredMl,
        budget: subBudget,
        porcentaje: budgetSplit[op.key] || 0,
        opcionKey: op.key,
        grupo: op.grupo
      });
    });

    const mixerMap = new Map();

    mixes.forEach(op => {
      const req = requirements.find(r => r.opcionKey === op.key);
      if (!req) return;

      const current = mixerMap.get(op.mixerCategoria) || {
        categoria: op.mixerCategoria,
        nombre:
          op.mixerCategoria === "tonica"
            ? "Tónica"
            : op.mixerCategoria === "redbull"
            ? "Energética"
            : "Bebida",
        requiredMl: 0,
        budget: 0
      };

      current.requiredMl += Math.ceil(req.requiredMl * op.mixerFactor);
      current.budget += presupuestoDestilados * 0.2 / mixes.length;

      mixerMap.set(op.mixerCategoria, current);
    });

    mixerMap.forEach(mixerReq => {
      requirements.push({
        categoria: mixerReq.categoria,
        nombre: mixerReq.nombre,
        requiredMl: mixerReq.requiredMl,
        budget: mixerReq.budget
      });
    });

    const factorEstacional = getFactorEstacional();
    const hieloBolsas = Math.max(
      1,
      Math.ceil((people / 3) * factorEstacional),
      Math.ceil(totalDestiladoBaseMl / 1500)
    );

    requirements.push({
      categoria: "hielo",
      nombre: "Hielo",
      requiredMl: hieloBolsas * 2000,
      budget: presupuestoDestilados * 0.1
    });
  }

  return requirements;
}

function mergeRequirementsByCategoria(requirements) {
  const merged = new Map();

  for (const req of requirements) {
    const key = req.categoria;

    if (!merged.has(key)) {
      merged.set(key, {
        ...req,
        nombresOriginales: [req.nombre]
      });
    } else {
      const current = merged.get(key);
      current.requiredMl += req.requiredMl;
      current.budget = (current.budget || 0) + (req.budget || 0);

      if (!current.nombresOriginales.includes(req.nombre)) {
        current.nombresOriginales.push(req.nombre);
      }

      current.nombre = current.nombresOriginales.join(" + ");
    }
  }

  return Array.from(merged.values());
}

function getConsumptionWarnings(requirements) {
  const warnings = [];

  requirements.forEach(req => {
    if (
      ["piscola", "vodka", "ron", "whiskey", "gin", "jaeger"].includes(req.categoria) &&
      req.requiredMl < UMBRAL_ADVERTENCIA_DESTILADO_ML
    ) {
      warnings.push(
        `${req.nombre}: el reparto actual lo deja con muy poco protagonismo (${req.requiredMl} ml aprox.). Puede que no valga la pena incluirlo.`
      );
    }
  });

  return warnings;
}

function getBudgetWarnings(plan) {
  const warnings = [];

  if (!plan || !plan.ok) return warnings;

  for (const detail of plan.details) {
    const req = detail.requirement;
    const realCost = detail.result.totalCost;
    const expectedBudget = req.budget ?? 0;

    if (expectedBudget <= 0) continue;

    if (realCost > expectedBudget) {
      const porcentajeSobre = (realCost / expectedBudget) - 1;

      if (req.nombre === "Hielo") continue;

      if (porcentajeSobre > 0.25) {
        warnings.push(
          `${req.nombre}: esta recomendación se pasa bastante del presupuesto sugerido para esa categoría (${formatCLP(realCost)} vs ${formatCLP(expectedBudget)}).`
        );
      } else {
        warnings.push(
          `${req.nombre}: se pasa un poco del presupuesto sugerido (${formatCLP(realCost)} vs ${formatCLP(expectedBudget)}).`
        );
      }
    }
  }

  return warnings;
}

// ===============================
// HEURÍSTICA DE COMBINACIÓN
// ===============================
function getCombinationStats(items) {
  const skuSet = new Set(items.map(item => `${item.tienda}__${item.nombre}`));
  return {
    totalItems: items.length,
    skuDistintos: skuSet.size
  };
}

function getCombinationScore(totalCost, items, totalVolume, requiredMl, categoria = null) {
  const { totalItems, skuDistintos } = getCombinationStats(items);
  const sobrecompraMl = Math.max(0, totalVolume - requiredMl);

  // BONUS: favorecer productos con mayor volumen por unidad (botellas grandes 2.5L, 3L)
  // Calcula el volumen promedio por item
  const volumePromedioPorItem = items.length > 0 ? totalVolume / items.length : 0;
  const bonusBotellasGrandes = Math.max(0, (volumePromedioPorItem - 1000) / 100); // Bonus por cada 100ml extra/item

  // PENALIZACIÓN DE SOBRECOMPRA AJUSTADA POR CATEGORÍA
  // Bebidas/mixers: menor penalización (permitir "concho" para el día siguiente)
  // Alcohol: penalización normal
  const esBebenida = ["bebida", "redbull", "tonica"].includes(categoria);
  const penalizacionSobrecompra = esBebenida 
    ? (sobrecompraMl / 1000) * (PENALIZACION_SOBRECOMPRA_POR_LITRO * 0.4)  // 40% de la penalización
    : (sobrecompraMl / 1000) * PENALIZACION_SOBRECOMPRA_POR_LITRO;

  return (
    totalCost +
    totalItems * PENALIZACION_ITEM_COMBINACION +
    skuDistintos * PENALIZACION_SKU_COMBINACION +
    penalizacionSobrecompra -
    bonusBotellasGrandes  // RESTAR el bonus (menor score = mejor)
  );
}

// ===============================
// OPTIMIZACIÓN SIMPLE POR CATEGORÍA
// ===============================
function findCheapestCombination(products, requiredMl, categoria = null) {
  if (!products || products.length === 0) return null;

  const maxVolume = Math.max(...products.map(p => p.volumenTotalMl));
  const upperBound = requiredMl + maxVolume * 2;

  const dp = Array(upperBound + 1).fill(null);
  dp[0] = { cost: 0, score: 0, items: [] };

  for (let volume = 0; volume <= upperBound; volume++) {
    if (!dp[volume]) continue;

    for (const product of products) {
      const nextVolume = Math.min(upperBound, volume + product.volumenTotalMl);
      const nextCost = dp[volume].cost + product.precio;
      const nextItems = [...dp[volume].items, product];
      const nextScore = getCombinationScore(nextCost, nextItems, nextVolume, requiredMl, categoria);

      if (
        !dp[nextVolume] ||
        nextScore < dp[nextVolume].score ||
        (nextScore === dp[nextVolume].score && nextCost < dp[nextVolume].cost)
      ) {
        dp[nextVolume] = {
          cost: nextCost,
          score: nextScore,
          items: nextItems
        };
      }
    }
  }

  let best = null;
  for (let volume = requiredMl; volume <= upperBound; volume++) {
    if (!dp[volume]) continue;

    if (
      !best ||
      dp[volume].score < best.score ||
      (dp[volume].score === best.score && dp[volume].cost < best.totalCost)
    ) {
      best = {
        totalVolume: volume,
        totalCost: dp[volume].cost,
        score: dp[volume].score,
        items: dp[volume].items
      };
    }
  }

  return best;
}

function summarizeItems(items) {
  const map = new Map();

  for (const item of items) {
    const key = `${item.tienda}__${item.nombre}__${item.precio}`;
    if (!map.has(key)) {
      map.set(key, { ...item, cantidad: 1 });
    } else {
      map.get(key).cantidad += 1;
    }
  }

  return Array.from(map.values());
}

function getUniqueStores(items) {
  return [...new Set(items.map(item => item.tienda))];
}

function getPlanPracticalScore(plan) {
  if (!plan || !plan.ok) return Infinity;

  const stores = getUniqueStores(plan.allItems);
  const summarized = summarizeItems(plan.allItems);
  const totalItems = plan.allItems.length;
  const skuDistintos = summarized.length;
  const totalSobrecompraMl = plan.details.reduce((sum, detail) => {
    const sobre = Math.max(0, detail.result.totalVolume - detail.requirement.requiredMl);
    return sum + sobre;
  }, 0);

  const tiendasExtra = Math.max(0, stores.length - 1);

  return (
    tiendasExtra * PENALIZACION_TIENDA_EXTRA +
    skuDistintos * PENALIZACION_SKU_PLAN +
    totalItems * PENALIZACION_ITEM_PLAN +
    (totalSobrecompraMl / 1000) * PENALIZACION_SOBRECOMPRA_PLAN_POR_LITRO
  );
}

// ===============================
// ESTRATEGIA 1: MULTI-TIENDA
// ===============================
async function buildMultiStorePlan(requirements) {
  const details = [];
  let total = 0;
  const allItems = [];

  for (const req of requirements) {
    const products = await productApi.getProductsByCategory(req.categoria);
    const best = findCheapestCombination(products, req.requiredMl, req.categoria);

    if (!best) {
      return {
        ok: false,
        reason: `No hay productos disponibles para ${req.nombre}.`
      };
    }

    details.push({
      requirement: req,
      result: best
    });

    total += best.totalCost;
    allItems.push(...best.items);
  }

  return {
    ok: true,
    total,
    practicalScore: 0,
    practicalLabel: "",
    stores: getUniqueStores(allItems),
    details,
    allItems
  };
}

// ===============================
// ESTRATEGIA 2: TIENDA ÚNICA
// ===============================
async function buildSingleStorePlan(requirements) {
  const data = await productApi._loadData();
  const productos = Array.isArray(data?.productos) ? data.productos : [];

  const stores = [...new Set(productos.map(p => p.tienda).filter(Boolean))];

  let bestStorePlan = null;

  for (const store of stores) {
    let total = 0;
    const details = [];
    const allItems = [];
    let valid = true;

    for (const req of requirements) {
      // Trae productos de la categoría y deja solo los de la tienda actual
      const productsInStore = (await productApi.getProductsByCategory(req.categoria))
        .filter(p => p.tienda === store);

      // Ojo: findCheapestCombination debe existir y devolver { totalCost, items, ... }
      const best = findCheapestCombination(productsInStore, req.requiredMl, req.categoria);

      if (!best) {
        valid = false;
        break;
      }

      total += best.totalCost;
      details.push({ requirement: req, result: best });
      allItems.push(...best.items);
    }

    if (!valid) continue;

    if (!bestStorePlan || total < bestStorePlan.total) {
      bestStorePlan = { ok: true, store, total, details, allItems };
    }
  }

  return bestStorePlan ?? {
    ok: false,
    reason: "No existe una sola tienda que cubra todo lo requerido."
  };
}

// ===============================
// RENDER
// ===============================
function renderPlan(listElement, plan) {
  clearElement(listElement);

  if (!plan.ok) {
    addLi(listElement, plan.reason);
    return;
  }

  for (const detail of plan.details) {
    const summarized = summarizeItems(detail.result.items);

    for (const item of summarized) {
      addLi(
        listElement,
        `${item.cantidad} x ${item.nombre} (${item.tienda}) — ${formatCLP(item.precio * item.cantidad)}`
      );
    }
  }
}

function renderBudgetState(budget, multiPlan, singlePlan) {
  const estadoEl = document.getElementById("estadoPresupuesto");
  const alertaEl = document.getElementById("alertaPresupuesto");

  alertaEl.classList.add("d-none");
  alertaEl.className = "alert mt-4 d-none";

  const validPlans = [multiPlan, singlePlan].filter(p => p.ok);
  const cheapestValid = validPlans.length
    ? Math.min(...validPlans.map(p => p.total))
    : null;

  if (cheapestValid === null) {
    estadoEl.innerHTML = `<span class="badge text-bg-danger">Sin solución</span>`;
    alertaEl.textContent = "No se pudo armar una recomendación con los productos disponibles.";
    alertaEl.classList.remove("d-none");
    alertaEl.classList.add("alert-danger");
    return;
  }

  if (cheapestValid > budget) {
    estadoEl.innerHTML = `<span class="badge text-bg-warning">Presupuesto insuficiente</span>`;
    alertaEl.textContent = `No alcanza el presupuesto. Faltan ${formatCLP(cheapestValid - budget)} para la opción más barata disponible.`;
    alertaEl.classList.remove("d-none");
    alertaEl.classList.add("alert-warning");
    return;
  }

  estadoEl.innerHTML = `<span class="badge text-bg-success">Dentro de presupuesto</span>`;
}

function ensureWarningsBox() {
  let box = document.getElementById("advertenciasConsumo");

  if (!box) {
    box = document.createElement("div");
    box.id = "advertenciasConsumo";
    box.className = "alert alert-secondary mt-3 d-none";
    // Append to modal body
    const modalBody = document.querySelector("#resultadoModal .modal-body");
    if (modalBody) {
      modalBody.appendChild(box);
    }
  }

  return box;
}

function renderWarnings(warnings) {
  const box = ensureWarningsBox();

  if (!warnings || warnings.length === 0) {
    box.classList.add("d-none");
    box.innerHTML = "";
    return;
  }

  box.classList.remove("d-none");
  box.innerHTML = `
    <strong>Ojo:</strong>
    <ul class="mb-0 mt-2">
      ${warnings.map(w => `<li>${w}</li>`).join("")}
    </ul>
  `;
}

// ===============================
// INICIALIZACIÓN
// ===============================
/**
 * Inicializa la app:
 * 1. Carga configuración desde productos.json
 * 2. Construye OPCIONES_CONSUMO
 * 3. Genera checkboxes dinámicamente
 * 4. Inicia listeners
 */
async function inicializarApp() {
  console.log(`🚀 Iniciando app...`);
  
  // Cargar JSON
  const cargado = await cargarConfiguracionDesdeJSON();
  if (!cargado) {
    console.error(`❌ No se pudo cargar productos.json`);
    return;
  }
  
  // Construir opciones
  OPCIONES_CONSUMO = buildOpcionesConsumoDesdeJSON();
  
  // Generar checkboxes
  generarCheckboxesDinámicos();
  
  console.log(`✅ App inicializada`);
}

// ===============================
// MAIN
// ===============================
const form = document.getElementById("carreteForm");
const resumen = document.getElementById("resumen");
const presupuestoTotalEl = document.getElementById("presupuestoTotal");
const saldoMultiEl = document.getElementById("saldoMulti");
const saldoUnicaEl = document.getElementById("saldoUnica");
const totalMultiEl = document.getElementById("totalMulti");
const totalUnicaEl = document.getElementById("totalUnica");
const listaMultiTienda = document.getElementById("listaMultiTienda");
const listaTiendaUnica = document.getElementById("listaTiendaUnica");
const detalleTiendasMulti = document.getElementById("detalleTiendasMulti");
const detalleTiendaUnica = document.getElementById("detalleTiendaUnica");
const costoPracticoMultiEl = document.getElementById("costoPracticoMulti");
const costoPracticoUnicaEl = document.getElementById("costoPracticoUnica");

// Inicializar app cuando DOM esté listo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", inicializarApp);
} else {
  inicializarApp();
}

// Event delegation para checkboxes de bebidas (funciona con Bootstrap dropdown)
document.addEventListener("change", function(event) {
  if (event.target.classList.contains("bebida-check")) {
    // Prevenir comportamiento default (importante para evitar reinicios en dropdowns)
    event.preventDefault?.();
    
    console.log(`✅ Bebida: ${event.target.value} - ${event.target.checked ? 'seleccionada' : 'deseleccionada'}`);
    
    actualizarTextoDropdownBebidas();
    renderBudgetSliders();
    
    return false;
  }
}, true);

// Inicializar estado visual
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function() {
    actualizarTextoDropdownBebidas();
    renderBudgetSliders();
  });
} else {
  actualizarTextoDropdownBebidas();
  renderBudgetSliders();
}

form.addEventListener("submit", async function (e) {
  e.preventDefault();
  console.log(`\n🚀 Form Submit - Iniciando cálculo de presupuesto`);

  const people = parseInt(document.getElementById("personas").value, 10);
  const aporte = parseInt(document.getElementById("aporte").value, 10);
  const mode = document.getElementById("modo").value;
  const selectedDrinks = getSelectedDrinks();

  console.log(`📊 Parámetros del formulario:`);
  console.log(`   Personas: ${people}`);
  console.log(`   Aporte: ${aporte}`);
  console.log(`   Modo: ${mode}`);
  console.log(`   Bebidas seleccionadas: ${selectedDrinks.length}`);
  console.log(`   Bebidas: [${selectedDrinks.join(', ')}]`);

  if (!people || people < 1 || aporte < 0) {
    alert("Ingresa valores válidos.");
    return;
  }

  if (selectedDrinks.length === 0) {
    alert("Selecciona al menos un tipo de copete.");
    return;
  }

  const budget = people * aporte;
  const budgetSplit = getBudgetSplit();
  const budgetSplitTotal = getBudgetSplitTotal();

  if (budgetSplitTotal !== 100) {
    alert("El reparto del presupuesto debe sumar 100%.");
    return;
  }

  const rawRequirements = buildRequirements(selectedDrinks, people, mode, budget, budgetSplit);
  const requirements = mergeRequirementsByCategoria(rawRequirements);

  const multiPlan = await buildMultiStorePlan(requirements);
  const singlePlan = await buildSingleStorePlan(requirements);

  if (multiPlan.ok) {
    multiPlan.practicalScore = getPlanPracticalScore(multiPlan);
    multiPlan.practicalLabel = getPracticalLevel(multiPlan.practicalScore);
  }

  if (singlePlan.ok) {
    singlePlan.practicalScore = getPlanPracticalScore(singlePlan);
    singlePlan.practicalLabel = getPracticalLevel(singlePlan.practicalScore);
  }

  const consumoWarnings = getConsumptionWarnings(rawRequirements);
  const budgetWarningsMulti = getBudgetWarnings(multiPlan);

  const globalWarnings = [];
  const validPlans = [multiPlan, singlePlan].filter(p => p.ok);

  if (validPlans.length > 0) {
    const cheapestPlan = validPlans.reduce((best, current) =>
      current.total < best.total ? current : best
    );

    if (cheapestPlan.total > budget) {
      globalWarnings.push(
        "No te alcanza cómodo con esta combinación. Considera poner más plata por persona o bajarle un poco al consumo."
      );
    }
  }

  const warnings = [
    ...globalWarnings,
    ...consumoWarnings,
    ...budgetWarningsMulti
  ];

  renderPlan(listaMultiTienda, multiPlan);
  renderPlan(listaTiendaUnica, singlePlan);
  renderWarnings(warnings);

  if (multiPlan.ok) {
    totalMultiEl.textContent = formatCLP(multiPlan.total);
    detalleTiendasMulti.textContent = `Tiendas involucradas: ${multiPlan.stores.join(", ")}`;
    saldoMultiEl.textContent = formatCLP(budget - multiPlan.total);
    document.getElementById("ratioMulti").textContent = getRatioBudget(multiPlan.total, budget);
    costoPracticoMultiEl.textContent = `${multiPlan.practicalLabel} + tu preciado tiempo`;
  } else {
    totalMultiEl.textContent = "No disponible";
    detalleTiendasMulti.textContent = multiPlan.reason;
    saldoMultiEl.textContent = "—";
    document.getElementById("ratioMulti").textContent = "—";
    costoPracticoMultiEl.textContent = "—";
  }

  if (singlePlan.ok) {
    totalUnicaEl.textContent = formatCLP(singlePlan.total);
    detalleTiendaUnica.textContent = `Tienda sugerida: ${singlePlan.store}`;
    saldoUnicaEl.textContent = formatCLP(budget - singlePlan.total);
    document.getElementById("ratioUnica").textContent = getRatioBudget(singlePlan.total, budget);
    costoPracticoUnicaEl.textContent = `${singlePlan.practicalLabel}`;
  } else {
    totalUnicaEl.textContent = "No disponible";
    detalleTiendaUnica.textContent = singlePlan.reason;
    saldoUnicaEl.textContent = "—";
    document.getElementById("ratioUnica").textContent = "—";
    costoPracticoUnicaEl.textContent = "—";
  }

  renderBudgetState(budget, multiPlan, singlePlan);

  presupuestoTotalEl.textContent = formatCLP(budget);
  resumen.textContent = `${people} persona(s) · ${selectedDrinks.map(getDrinkLabel).join(", ")} · ${getModeLabel(mode)}`;

  // Abre el modal de resultados (en lugar de mostrar div con scroll)
  const resultadoModal = new bootstrap.Modal(document.getElementById("resultadoModal"));
  resultadoModal.show();
  
  // Muestra el timestamp de actualización de datos
  const timestamp = await productApi.getTimestamp();
  if (timestamp) {
    const date = new Date(timestamp);
    const fechaFormato = date.toLocaleString('es-CL', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    document.getElementById('timestamp').textContent = fechaFormato;
  }

  // ===== INTEGRACIÓN CON PRESUPUESTO COMPARTIBLE =====
  // Guardar datos actuales del presupuesto para compartir
  window.currentPresupuesto = crearPresupuesto(
    {
      personas: people,
      aporte: parseFloat(document.getElementById('aporte').value),
      modo: mode,
      bebidas: selectedDrinks.map(getDrinkLabel),
      tiendaSplit: selectedDrinks.some(d => d.split)
    },
    multiPlan,
    singlePlan
  );

  // Conectar botón de compartir
  const btnCompartir = document.getElementById('btnCompartirPresupuesto');
  if (btnCompartir && !btnCompartir.__listener_attached) {
    btnCompartir.__listener_attached = true;
    btnCompartir.addEventListener('click', async function() {
      await compartirPresupuestoActual();
    });
  }
});

/**
 * Comparte el presupuesto actual usando URL corta
 */
async function compartirPresupuestoActual() {
  try {
    if (!window.currentPresupuesto) {
      alert('❌ No hay presupuesto para compartir');
      return;
    }

    const btnCompartir = document.getElementById('btnCompartirPresupuesto');
    const msgDiv = document.getElementById('msgCompartir');
    
    if (!btnCompartir) {
      console.warn('⚠️ Botón compartir no encontrado');
      return;
    }

    // Animación: cambiar botón a "cargando"
    const textOriginal = btnCompartir.innerHTML;
    btnCompartir.disabled = true;
    btnCompartir.innerHTML = '⏳ Compartiendo...';
    btnCompartir.style.opacity = '0.7';

    // Usar sistema de URL corta mejorado
    const resultado = await crearYCompartirPresupuestoCorto(window.currentPresupuesto);

    if (resultado.success) {
      // ✅ TODO BIEN - Copiar exitosa
      console.log(`✅ Compartir exitoso: ${resultado.id}`);
      
      // Mostrar mensaje elegante
      if (msgDiv) {
        msgDiv.innerHTML = `✅ ¡Compartido! Enlace copiado`;
        msgDiv.style.display = 'block';
        msgDiv.style.opacity = '0';
        msgDiv.style.transition = 'opacity 0.3s ease-in';
        msgDiv.classList.remove('error-msg');
        msgDiv.classList.add('success-msg');
        
        // Trigger animación fade-in
        setTimeout(() => {
          msgDiv.style.opacity = '1';
        }, 10);
      }
      
      // Cambiar botón a estado exitoso
      btnCompartir.innerHTML = '✅ ¡Compartido!';
      btnCompartir.classList.add('btn-success');
      
      // Auto-reset del botón después de 3 segundos
      setTimeout(() => {
        if (msgDiv) msgDiv.style.opacity = '0';
        btnCompartir.disabled = false;
        btnCompartir.innerHTML = textOriginal;
        btnCompartir.style.opacity = '1';
        btnCompartir.classList.remove('btn-success');
        
        setTimeout(() => {
          if (msgDiv) msgDiv.style.display = 'none';
        }, 300);
      }, 3000);
    } else if (resultado.id && !resultado.success) {
      // ⚠️ PARCIAL - Se guardó pero no se copió
      console.warn(`⚠️ Presupuesto guardado (${resultado.id}) pero copy falló`);
      
      // Mostrar URL manualmente
      if (msgDiv) {
        msgDiv.innerHTML = `
          <div style="text-align: left; line-height: 1.5;">
            ✅ Presupuesto guardado (pero copy falló)<br/>
            <small>Copia manualmente:</small><br/>
            <code style="background: #f0f0f0; padding: 0.25rem 0.5rem; border-radius: 3px; display: inline-block; margin-top: 0.5rem;">
              ${resultado.url}
            </code>
          </div>
        `;
        msgDiv.style.display = 'block';
        msgDiv.style.opacity = '0';
        msgDiv.style.transition = 'opacity 0.3s ease-in';
        msgDiv.classList.add('error-msg');
        msgDiv.classList.remove('success-msg');
        
        setTimeout(() => {
          msgDiv.style.opacity = '1';
        }, 10);
      }
      
      btnCompartir.innerHTML = '⚠️ Copiar manualmente';
      btnCompartir.classList.add('btn-warning');
      
      setTimeout(() => {
        if (msgDiv) msgDiv.style.opacity = '0';
        btnCompartir.disabled = false;
        btnCompartir.innerHTML = textOriginal;
        btnCompartir.style.opacity = '1';
        btnCompartir.classList.remove('btn-warning');
        
        setTimeout(() => {
          if (msgDiv) msgDiv.style.display = 'none';
        }, 300);
      }, 5000);
    } else {
      // ❌ ERROR TOTAL
      console.error(`❌ Error compartiendo: ${resultado.error}`);
      
      if (msgDiv) {
        msgDiv.innerHTML = `❌ Error: ${resultado.error}`;
        msgDiv.style.display = 'block';
        msgDiv.style.opacity = '0';
        msgDiv.style.transition = 'opacity 0.3s ease-in';
        msgDiv.classList.add('error-msg');
        msgDiv.classList.remove('success-msg');
        
        setTimeout(() => {
          msgDiv.style.opacity = '1';
        }, 10);
      }
      
      btnCompartir.innerHTML = '❌ Error - Intenta de nuevo';
      btnCompartir.classList.add('btn-danger');
      
      setTimeout(() => {
        if (msgDiv) msgDiv.style.opacity = '0';
        btnCompartir.disabled = false;
        btnCompartir.innerHTML = textOriginal;
        btnCompartir.style.opacity = '1';
        btnCompartir.classList.remove('btn-danger');
        
        setTimeout(() => {
          if (msgDiv) msgDiv.style.display = 'none';
        }, 300);
      }, 5000);
    }
  } catch (error) {
    // Error no manejado
    const btnCompartir = document.getElementById('btnCompartirPresupuesto');
    const textOriginal = btnCompartir.getAttribute('data-original-text') || '📋 Compartir';
    btnCompartir.disabled = false;
    btnCompartir.innerHTML = textOriginal;
    btnCompartir.style.opacity = '1';
    
    console.error('❌ Error durante compartir:', error);
    alert('❌ Error al compartir: ' + error.message);
  }
}
