/**
 * CALCULADORA DE PRESUPUESTO - SCRIPT PRINCIPAL (ORQUESTADOR)
 * Versión: 3.1 (Modular Refactored)
 * 
 * Importa y orquesta:
 * - calculadora-config.js (constants)
 * - calculadora-engine.js (DP algorithm)
 * - calculadora-ui.js (UI + handlers)
 * - calculadora-utils.js (utilities)
 * - shorturl.js (URL sharing)
 * - firebase-config.js (persistence)
 */

// ===== IMPORTS =====
import {
  CONSUMOS,
  FACTOR_ESTACIONAL_POR_MES,
  OPCIONES_CONSUMO,
  PENALIZACION_CONFIG,
  getFactorEstacional,
  crearPresupuesto,
  calcularRequirements
} from './calculadora-config.js';

import {
  productApi,
  calcularPresupuestoCompleto,
  getConsumptionWarnings
} from './calculadora-engine.js';

import {
  renderBudgetSliders,
  updateBudgetSplitState,
  getBudgetSplit,
  getBudgetSplitTotal,
  createHandleSliderChange,
  createHandleInputChange,
  createHandleLockChange,
  createRebalanceFromChangedDrink,
  createNormalizeBudgetSplit,
  renderResultsModal
} from './calculadora-ui.js';

import {
  formatCLP,
  getSelectedDrinks,
  getBudgetControls,
  getModeLabel,
  getSelectedMode,
  actualizarTextoDropdownBebidas,
  validateInputs,
  showSuccessMessage,
  showErrorMessage
} from './calculadora-utils.js';

import { crearYCompartirPresupuestoCorto } from './shorturl.js';

// ===== STATE =====
let handlers = {};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
  initializeHandlers();
  attachEventListeners();
  loadProductsAsync();
});

function initializeHandlers() {
  // Crear handlers reutilizables
  const normalize = createNormalizeBudgetSplit();
  const rebalance = createRebalanceFromChangedDrink();

  handlers = {
    normalize,
    rebalance,
    handleSliderChange: createHandleSliderChange(rebalance, updateBudgetSplitState),
    handleInputChange: createHandleInputChange(rebalance, updateBudgetSplitState),
    handleLockChange: createHandleLockChange(normalize)
  };
}

function attachEventListeners() {
  // Cambios en modo y bebidas
  document.getElementById('modo').addEventListener('change', onModoChange);
  
  document.querySelectorAll('.bebida-check').forEach(checkbox => {
    checkbox.addEventListener('change', onBebidasChange);
  });

  // Formulario submit (botón calcular)
  const form = document.getElementById('carreteForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      calcularPresupuesto();
    });
  }

  // Botón compartir (en modal)
  const btnCompartir = document.getElementById('btnCompartirPresupuesto');
  if (btnCompartir) {
    btnCompartir.addEventListener('click', compartirPresupuestoActual);
  }
}

// ===== ASYNC LOADING =====
async function loadProductsAsync() {
  try {
    await productApi._loadData();
    console.log('✅ Productos cargados correctamente');
  } catch (error) {
    console.error('❌ Error cargando productos:', error);
    showErrorMessage('Error cargando catálogo de productos');
  }
}

// ===== EVENT HANDLERS: UI =====
function onModoChange(e) {
  console.log('Modo cambiado a:', e.target.value);
  // Actualizar sliders si es necesario
}

function onBebidasChange(e) {
  console.log('🍻 onBebidasChange triggered');
  actualizarTextoDropdownBebidas(OPCIONES_CONSUMO);
  renderBudgetSliders(
    OPCIONES_CONSUMO,
    handlers.handleSliderChange,
    handlers.handleInputChange,
    handlers.handleLockChange,
    handlers.normalize
  );
}

// ===== CALCULATION FLOW =====
async function calcularPresupuesto() {
  try {
    console.log('🔄 Iniciando calcularPresupuesto...');
    
    // 1. Validar inputs
    const personasInput = parseInt(document.getElementById('personas').value, 10);
    const aporteInput = parseInt(document.getElementById('aporte').value, 10);
    const bebidas = getSelectedDrinks();
    const modo = getSelectedMode();
    
    console.log('📊 Inputs:', { personasInput, aporteInput, bebidas, modo });

    const validation = validateInputs(
      { personas: personasInput, aporte: aporteInput },
      bebidas
    );

    if (!validation.valid) {
      console.warn('❌ Validación fallida:', validation.error);
      showErrorMessage(validation.error);
      return;
    }
    
    console.log('✅ Validación exitosa');

    // 2. Calcular requerimientos
    const budgetSplit = getBudgetSplit();
    console.log('💰 Budget split:', budgetSplit);
    
    const requirements = await calcularRequirements(
      personasInput,
      aporteInput,
      modo,
      bebidas,
      budgetSplit,
      CONSUMOS,
      FACTOR_ESTACIONAL_POR_MES,
      OPCIONES_CONSUMO
    );
    
    console.log('📋 Requirements:', requirements);

    // 3. Mostrar warnings
    const warnings = getConsumptionWarnings(requirements, PENALIZACION_CONFIG);
    if (warnings.length > 0) {
      console.warn('⚠️ Warnings:', warnings);
    }

    console.log('🔄 Calculando presupuesto completo...');
    
    // 4. Calcular presupuesto con ambas estrategias
    const presupuestoData = await calcularPresupuestoCompleto(
      {
        personas: personasInput,
        aporte: aporteInput,
        modo,
        bebidas,
        budgetSplit
      },
      requirements,
      PENALIZACION_CONFIG
    );

    console.log('📊 Presupuesto data:', presupuestoData);
    
    if (presupuestoData.error) {
      console.error('❌ Error en cálculo:', presupuestoData.error);
      showErrorMessage(presupuestoData.error);
      return;
    }

    console.log('✅ Presupuesto calculado exitosamente');
    
    // 5. Crear objeto presupuesto completo
    const presupuesto = crearPresupuesto(
      {
        personas: personasInput,
        aporte: aporteInput,
        modo,
        bebidas
      },
      presupuestoData.multiPlan,
      presupuestoData.singlePlan
    );

    console.log('📦 Presupuesto object:', presupuesto);

    // 6. Guardar en memoria para compartir
    window.presupuestoActual = presupuesto;
    console.log('💾 Presupuesto guardado en window.presupuestoActual');

    // 7. Renderizar resultados
    console.log('🎨 Renderizando modal de resultados...');
    renderResultsModal(presupuesto, OPCIONES_CONSUMO);
    console.log('✅ Modal renderizado exitosamente');

  } catch (error) {
    console.error('❌ CATCH ERROR - Error calculando presupuesto:', error);
    console.error('Stack:', error.stack);
    showErrorMessage('Error en el cálculo. Por favor intenta de nuevo.');
  }
}

// ===== COMPARTIR =====
async function compartirPresupuestoActual() {
  try {
    const presupuesto = window.presupuestoActual;
    if (!presupuesto) {
      showErrorMessage('No hay presupuesto para compartir');
      return;
    }

    // Usar shorturl.js para crear y compartir
    const result = await crearYCompartirPresupuestoCorto(presupuesto);

    if (result.success) {
      showSuccessMessage(`✅ URL copiada al portapapeles: ${result.url}`);
    } else {
      showErrorMessage(`Error al compartir: ${result.error}`);
    }
  } catch (error) {
    console.error('Error compartiendo:', error);
    showErrorMessage('Error al intentar compartir el presupuesto');
  }
}

// ===== EXPOSE GLOBALS (for index.html) =====
window.calcularPresupuesto = calcularPresupuesto;
window.compartirPresupuestoActual = compartirPresupuestoActual;
