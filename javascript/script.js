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
 * 
 * ARQUITECTURA MODULAR (v5.0):
 * - config.js         → Constantes, consumos, penalizaciones, factor estacional
 * - productApi.js     → Carga de productos.json, builder de opciones, API
 * - helpers.js        → Formateo CLP, utilidades DOM, labels
 * - mixerPreferences.js → Estado y UI de preferencias de mixer
 * - budgetSliders.js  → Sliders de reparto de presupuesto
 * - solver.js         → Knapsack DP, planes multi/single tienda
 * - renderer.js       → Render de resultados, warnings, compartir
 * - script.js         → (este archivo) Orquestador: init, eventos, checkboxes
 */

// ===============================
// IMPORTS
// ===============================
import {
  cargarConfiguracionDesdeJSON,
  buildOpcionesConsumoDesdeJSON,
  setOpcionesConsumo,
  getCategoriasJSON,
  getCombinacionesEspecialesJSON,
  productApi
} from './productApi.js';

import {
  crearPresupuesto,
  formatCLP,
  getSelectedDrinks,
  getModeLabel,
  getDrinkLabel,
  actualizarTextoDropdownBebidas,
  getPracticalLevel,
  getConvenienceBadge,
  getRatioBudget
} from './helpers.js';

import {
  cargarMixerPreferences,
  limpiarPreferenciasNoSeleccionadas,
  setMixerPreference,
  getMixerAlternativas,
  generarUISelectoresDemixer
} from './mixerPreferences.js';

import { renderBudgetSliders, getBudgetSplit, getBudgetSplitTotal } from './budgetSliders.js';

import {
  buildRequirements,
  mergeRequirementsByCategoria,
  getConsumptionWarnings,
  getBudgetWarnings,
  buildMultiStorePlan,
  buildSingleStorePlan,
  getPlanPracticalScore
} from './solver.js';

import {
  renderPlan,
  renderBudgetState,
  renderWarnings,
  compartirPresupuestoActual
} from './renderer.js';

// ===============================
// GENERACIÓN DINÁMICA DE CHECKBOXES
// ===============================
/**
 * Genera checkboxes dinámicamente en el grid de bebidas
 */
function generarCheckboxesDinámicos() {
  const gridContainer = document.getElementById('bebidasGrid');
  
  if (!gridContainer) {
    console.error(`❌ Contenedor de bebidas (#bebidasGrid) no encontrado`);
    return;
  }

  // Limpiar grid
  gridContainer.innerHTML = '';

  const CATEGORIAS_JSON = getCategoriasJSON();
  const COMBINACIONES_ESPECIALES_JSON = getCombinacionesEspecialesJSON();

  // Generar tarjetas para categorías seleccionables + combinaciones especiales
  const bebidas = {
    ...Object.entries(CATEGORIAS_JSON)
      .filter(([_, config]) => config.esSeleccionable !== false)
      .reduce((acc, [key, config]) => ({...acc, [key]: config}), {}),
    ...COMBINACIONES_ESPECIALES_JSON
  };

  const drinkIcons = {
    cerveza: '🍺',
    piscola: '🥃',
    ron: '🍹',
    vodka: '🍸',
    whiskey: '🥃',
    gin: '🧪',
    jaeger: '🦌'
  };

  console.log(`🔲 Generando ${Object.keys(bebidas).length} tarjetas de bebidas...`);

  for (const [key, config] of Object.entries(bebidas)) {
    const checkId = `chk${key.charAt(0).toUpperCase()}${key.slice(1).replace(/_/g, '')}`;
    const icon = drinkIcons[key] || '🥂';
    const cardName = config.displayName || config.nombre;

    const card = document.createElement('div');
    card.className = 'drink-card';
    card.setAttribute('data-value', key);
    card.innerHTML = `
      <input class="form-check-input bebida-check d-none" type="checkbox" value="${key}" id="${checkId}">
      <div class="drink-card-icon">${icon}</div>
      <div class="drink-card-name">${cardName}</div>
      <div class="drink-card-badge">✓</div>
    `;
    
    // Al hacer clic en la tarjeta, alternamos la selección
    card.addEventListener('click', function(e) {
      const checkbox = this.querySelector('.bebida-check');
      checkbox.checked = !checkbox.checked;
      
      if (checkbox.checked) {
        this.classList.add('selected');
      } else {
        this.classList.remove('selected');
      }
      
      console.log(`🖱️ Tarjeta clickeada: ${key} -> ${checkbox.checked ? 'seleccionada' : 'deseleccionada'}`);
      
      // Lanzar evento change en el checkbox para que el gestor general lo escuche
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    });
    
    gridContainer.appendChild(card);
  }

  console.log(`✅ Tarjetas de bebidas generadas dinámicamente`);
  actualizarTextoDropdownBebidas();
}

/**
 * Renderiza selectores de mixer para todas las bebidas seleccionadas con alternativas
 * (Función "glue" — conecta mixerPreferences con budgetSliders sin crear dependencia circular)
 */
function renderizarSelectoresDeMixers() {
  const selectedDrinks = getSelectedDrinks();
  let mixerHTML = '';
  
  for (const bebidaKey of selectedDrinks) {
    const alternativas = getMixerAlternativas(bebidaKey);
    if (alternativas && alternativas.length > 1) {
      const selectorHTML = generarUISelectoresDemixer(bebidaKey);
      if (selectorHTML) {
        mixerHTML += selectorHTML;
      }
    }
  }
  
  const mixerSection = document.getElementById("mixerSelectorsSection");
  if (mixerHTML && mixerSection) {
    mixerSection.innerHTML = mixerHTML;
    mixerSection.classList.remove("d-none");
    
    // Adjuntar event listeners a los radio buttons
    document.querySelectorAll(".mixer-option").forEach(radio => {
      radio.addEventListener("change", function() {
        const [_, bebidaKey] = this.name.match(/mixer_(.+)/) || [];
        if (bebidaKey) {
          // Obtener valor real del mixer (puede ser "null" como string)
          const mixerValue = this.dataset.mixerValue || this.value;
          setMixerPreference(bebidaKey, mixerValue);
          renderBudgetSliders(); // Actualizar presupuesto
        }
      });
    });
  } else if (mixerSection) {
    mixerSection.classList.add("d-none");
  }
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
  
  // Cargar preferencias de mixer guardadas
  cargarMixerPreferences();
  
  // Cargar JSON
  const cargado = await cargarConfiguracionDesdeJSON();
  if (!cargado) {
    console.error(`❌ No se pudo cargar productos.json`);
    return;
  }
  
  // Construir opciones
  setOpcionesConsumo(buildOpcionesConsumoDesdeJSON());
  
  // Generar checkboxes
  generarCheckboxesDinámicos();
  
  // Conectar checkbox sin cuota
  const sinCuotaCheck = document.getElementById("sinCuota");
  const aporteInput = document.getElementById("aporte");
  if (sinCuotaCheck && aporteInput) {
    sinCuotaCheck.addEventListener("change", function() {
      if (this.checked) {
        aporteInput.disabled = true;
        aporteInput.removeAttribute("required");
        aporteInput.value = "";
      } else {
        aporteInput.disabled = false;
        aporteInput.setAttribute("required", "required");
        aporteInput.value = "5000";
      }
    });
  }
  
  // Conectar botones de Modo de Formulario (Simple vs Pro)
  const btnSimple = document.getElementById("btnModoSimple");
  const btnPro = document.getElementById("btnModoPro");
  const carreteForm = document.getElementById("carreteForm");
  
  if (btnSimple && btnPro && carreteForm) {
    btnSimple.addEventListener("click", () => {
      btnSimple.classList.add("active");
      btnPro.classList.remove("active");
      carreteForm.classList.add("mode-simple");
      carreteForm.classList.remove("mode-pro");
      
      // Resetear a valores por defecto en modo simple (leyendo de los atributos 'selected' del HTML)
      const modoSelect = document.getElementById("modo");
      const gamaSelect = document.getElementById("gama");
      
      if (modoSelect) {
        const defaultModo = Array.from(modoSelect.options).filter(opt => opt.hasAttribute('selected')).pop();
        modoSelect.value = defaultModo ? defaultModo.value : "previa";
      }
      if (gamaSelect) {
        const defaultGama = Array.from(gamaSelect.options).filter(opt => opt.hasAttribute('selected')).pop();
        gamaSelect.value = defaultGama ? defaultGama.value : "normal";
      }
      
      if (sinCuotaCheck && sinCuotaCheck.checked) {
        sinCuotaCheck.checked = false;
        if (aporteInput) {
          aporteInput.disabled = false;
          aporteInput.setAttribute("required", "required");
          aporteInput.value = "5000";
        }
      }
      
      // Re-renderizar sliders para actualizar valores equitativos
      renderBudgetSliders();
    });
    
    btnPro.addEventListener("click", () => {
      btnPro.classList.add("active");
      btnSimple.classList.remove("active");
      carreteForm.classList.remove("mode-simple");
      carreteForm.classList.add("mode-pro");
      
      // Re-renderizar sliders
      renderBudgetSliders();
    });
  }
  
  console.log(`✅ App inicializada`);
}

// ===============================
// REFERENCIAS DOM
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

// ===============================
// INICIALIZAR APP
// ===============================
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
    
    // 🎯 LIMPIAR PREFERENCIAS DE BEBIDAS NO SELECCIONADAS
    const selectedDrinks = getSelectedDrinks();
    limpiarPreferenciasNoSeleccionadas(selectedDrinks);
    
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

// ===============================
// FORM SUBMIT
// ===============================
form.addEventListener("submit", async function (e) {
  e.preventDefault();
  console.log(`\n🚀 Form Submit - Iniciando cálculo de presupuesto`);

  const sinCuota = document.getElementById("sinCuota")?.checked || false;
  const people = parseInt(document.getElementById("personas").value, 10);
  const aporte = sinCuota ? 0 : parseInt(document.getElementById("aporte").value, 10);
  const mode = document.getElementById("modo").value;
  
  if (!sinCuota && aporte === 418) {
    alert("🍵 Error 418: I'm a teapot\n\n¿$418 pesos de cuota? ¿Qué pretendes comprar, un té en bolsa? Acá tomamos copete, rey.");
    return;
  }

  const selectedDrinks = getSelectedDrinks();

  console.log(`📊 Parámetros del formulario:`);
  console.log(`   Personas: ${people}`);
  console.log(`   Aporte: ${sinCuota ? 'Sin cuota' : aporte}`);
  console.log(`   Modo: ${mode}`);
  console.log(`   Bebidas seleccionadas: ${selectedDrinks.length}`);
  console.log(`   Bebidas: [${selectedDrinks.join(', ')}]`);

  if (!people || people < 1 || (!sinCuota && (Number.isNaN(aporte) || aporte < 0))) {
    alert("Ingresa valores válidos.");
    return;
  }

  if (selectedDrinks.length === 0) {
    alert("Selecciona al menos un tipo de copete.");
    return;
  }

  const budget = sinCuota ? 9999999 : (people * aporte);
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
  const budgetWarningsMulti = sinCuota ? [] : getBudgetWarnings(multiPlan);

  const globalWarnings = [];
  const validPlans = [multiPlan, singlePlan].filter(p => p.ok);

  if (!sinCuota && validPlans.length > 0) {
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
    if (sinCuota) {
      saldoMultiEl.textContent = `${formatCLP(Math.ceil(multiPlan.total / people))} / persona`;
      document.getElementById("ratioMulti").textContent = `Costo total: ${formatCLP(multiPlan.total)}`;
    } else {
      saldoMultiEl.textContent = formatCLP(budget - multiPlan.total);
      document.getElementById("ratioMulti").textContent = getRatioBudget(multiPlan.total, budget);
    }
    costoPracticoMultiEl.innerHTML = getConvenienceBadge(multiPlan.practicalScore, true);
  } else {
    totalMultiEl.textContent = "No disponible";
    detalleTiendasMulti.textContent = multiPlan.reason;
    saldoMultiEl.textContent = "—";
    document.getElementById("ratioMulti").textContent = "—";
    costoPracticoMultiEl.innerHTML = "—";
  }

  if (singlePlan.ok) {
    totalUnicaEl.textContent = formatCLP(singlePlan.total);
    detalleTiendaUnica.textContent = `Tienda sugerida: ${singlePlan.store}`;
    if (sinCuota) {
      saldoUnicaEl.textContent = `${formatCLP(Math.ceil(singlePlan.total / people))} / persona`;
      document.getElementById("ratioUnica").textContent = `Costo total: ${formatCLP(singlePlan.total)}`;
    } else {
      saldoUnicaEl.textContent = formatCLP(budget - singlePlan.total);
      document.getElementById("ratioUnica").textContent = getRatioBudget(singlePlan.total, budget);
    }
    costoPracticoUnicaEl.innerHTML = getConvenienceBadge(singlePlan.practicalScore, false);
  } else {
    totalUnicaEl.textContent = "No disponible";
    detalleTiendaUnica.textContent = singlePlan.reason;
    saldoUnicaEl.textContent = "—";
    document.getElementById("ratioUnica").textContent = "—";
    costoPracticoUnicaEl.innerHTML = "—";
  }

  renderBudgetState(budget, multiPlan, singlePlan, sinCuota);

  presupuestoTotalEl.textContent = sinCuota ? "Sin cuota definida" : formatCLP(budget);
  resumen.textContent = `${people} persona(s) · ${selectedDrinks.map(getDrinkLabel).join(", ")} · ${getModeLabel(mode)}`;

  // Abre el modal de resultados (en lugar de mostrar div con scroll)
  const resultadoModal = new bootstrap.Modal(document.getElementById("resultadoModal"));
  resultadoModal.show();
  
  // Muestra el timestamp de actualización de datos
  const timestamp = await productApi.getTimestamp();
  if (timestamp) {
    let date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      date = new Date(timestamp.replace(/-/g, "/").replace("T", " ").split('.')[0]);
    }
    
    if (!isNaN(date.getTime())) {
      const fechaFormato = date.toLocaleDateString('es-CL', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
      });
      document.getElementById('timestamp').textContent = fechaFormato;
    } else {
      const cleanDate = timestamp.split('T')[0].split('-').reverse().join('/');
      document.getElementById('timestamp').textContent = cleanDate || timestamp;
    }
  }

  // ===== INTEGRACIÓN CON PRESUPUESTO COMPARTIBLE =====
  // Guardar datos actuales del presupuesto para compartir
  window.currentPresupuesto = crearPresupuesto(
    {
      personas: people,
      aporte: aporte,
      modo: mode,
      gama: document.getElementById('gama')?.value || 'normal',
      sinCuota: sinCuota,
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
