/**
 * CALCULADORA - UTILIDADES & HELPERS
 * Funciones auxiliares para formateo, DOM y etiquetas
 * 
 * Versión: 3.1
 * Separación de concerns: Utilidades puras
 */

// ===============================
// FORMATEO
// ===============================

/**
 * Formatea número a CLP (moneda chilena)
 * @param {number} value - Valor a formatear
 * @returns {string} Valor formateado como CLP
 */
export function formatCLP(value) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * Formatea ratio presupuesto utilizado vs disponible
 * @param {number} spent - Monto gastado
 * @param {number} total - Presupuesto total
 * @returns {string} Descripción del ratio
 */
export function getRatioBudget(spent, total) {
  if (total <= 0) return "—";
  const percentage = Math.round((spent / total) * 100);
  const remaining = total - spent;
  return `${percentage}% utilizado (${formatCLP(remaining)} restante)`;
}

// ===============================
// DOM UTILITIES
// ===============================

/**
 * Limpia el contenido HTML de un elemento
 * @param {HTMLElement} element - Elemento a limpiar
 */
export function clearElement(element) {
  element.innerHTML = "";
}

/**
 * Agrega un item <li> a un elemento
 * @param {HTMLElement} element - Contenedor (usualmente <ul>)
 * @param {string} text - Texto del item
 */
export function addLi(element, text) {
  const li = document.createElement("li");
  li.textContent = text;
  element.appendChild(li);
}

// ===============================
// SELECTORES & GETTERS
// ===============================

/**
 * Obtiene array de bebidas seleccionadas desde checkboxes
 * @returns {string[]} Array de valores de bebidas
 */
export function getSelectedDrinks() {
  return Array.from(document.querySelectorAll(".bebida-check:checked"))
    .map(input => input.value);
}

/**
 * Obtiene controles del presupuesto (personas, aporte)
 * @returns {Object} { personas, aporte }
 */
export function getBudgetControls() {
  const personasInput = document.getElementById("personas");
  const aporteInput = document.getElementById("aporte");

  return {
    personas: parseInt(personasInput.value, 10) || 0,
    aporte: parseInt(aporteInput.value, 10) || 0
  };
}

/**
 * Obtiene distribución de presupuesto por bebida
 * @returns {Object} { cerveza, destilado, bebida, energetica, ... }
 */
export function getBudgetSplit() {
  const split = {};
  // Usar data-drink attribute como en v3.0, NO el ID
  document.querySelectorAll(".budget-slider").forEach(slider => {
    const drink = slider.dataset.drink;
    split[drink] = parseInt(slider.value, 10);
  });
  return split;
}

/**
 * Calcula total de distribución de presupuesto
 * @returns {number} Suma total de porcentajes
 */
export function getBudgetSplitTotal() {
  return Object.values(getBudgetSplit()).reduce((a, b) => a + b, 0);
}

/**
 * Obtiene modo de consumo seleccionado
 * @returns {string} Modo (previa, trabajo, pongamosle, modo18, proyectox)
 */
export function getSelectedMode() {
  return document.getElementById("modo").value || "pongamosle";
}

/**
 * Obtiene estado de los locks de bebida
 * @returns {Object} { cerveza: boolean, destilado: boolean, ... }
 */
export function getLockStates() {
  const locks = {};
  document.querySelectorAll(".budget-lock-checkbox").forEach(checkbox => {
    const drinkType = checkbox.id.replace("lock-", "");
    locks[drinkType] = checkbox.checked;
  });
  return locks;
}

// ===============================
// ETIQUETAS & LABELS
// ===============================

/**
 * Obtiene etiqueta legible para modo de consumo
 * @param {string} mode - Identificador del modo
 * @returns {string} Etiqueta legible
 */
export function getModeLabel(mode) {
  if (mode === "previa") return "Previa";
  if (mode === "trabajo") return "Trabajo mañana";
  if (mode === "pongamosle") return "Pongámosle";
  if (mode === "modo18") return "Modo 18";
  if (mode === "proyectox") return "Proyecto X";
  return "Modo desconocido";
}

/**
 * Obtiene etiqueta legible para tipo de bebida
 * @param {string} drink - Identificador bebida
 * @param {Object} OPCIONES_CONSUMO - Config de opciones
 * @returns {string} Etiqueta legible
 */
export function getDrinkLabel(drink, OPCIONES_CONSUMO) {
  return OPCIONES_CONSUMO[drink]?.nombre || drink;
}

/**
 * Obtiene descripción "practica" basada en score
 * @param {number} score - Score de complejidad
 * @returns {string} Descripción del nivel
 */
export function getPracticalLevel(score) {
  if (score <= 8) return "Muy conveniente";
  if (score <= 15) return "Conveniente";
  if (score <= 24) return "Medio pajera";
  return "Solo si quieres exprimir precio";
}

// ===============================
// UI UPDATES
// ===============================

/**
 * Actualiza texto del botón dropdown de bebidas seleccionadas
 * @param {Object} OPCIONES_CONSUMO - Config de opciones
 */
export function actualizarTextoDropdownBebidas(OPCIONES_CONSUMO) {
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

/**
 * Sincroniza valor de slider con input asociado
 * @param {string} drink - Tipo de bebida
 * @param {number} value - Nuevo valor
 */
export function syncControlValue(drink, value) {
  const slider = document.getElementById(drink);
  const input = document.getElementById(`${drink}-input`);

  if (slider) slider.value = value;
  if (input) input.value = value;
}

/**
 * Muestra/oculta un elemento
 * @param {string} elementId - ID del elemento
 * @param {boolean} visible - true para mostrar, false para ocultar
 */
export function setElementVisibility(elementId, visible) {
  const element = document.getElementById(elementId);
  if (element) {
    if (visible) {
      element.classList.remove('hidden');
    } else {
      element.classList.add('hidden');
    }
  }
}

/**
 * Muestra mensaje de éxito temporal
 * @param {string} message - Mensaje a mostrar
 * @param {number} durationMs - Duración en ms (default 3000)
 */
export function showSuccessMessage(message, durationMs = 3000) {
  const msgDiv = document.getElementById("msgCompartir");
  if (!msgDiv) return;

  msgDiv.textContent = message;
  msgDiv.classList.remove('error-msg');
  msgDiv.classList.add('success-msg');
  msgDiv.classList.remove('hidden');

  setTimeout(() => {
    msgDiv.classList.add('hidden');
  }, durationMs);
}

/**
 * Muestra mensaje de error temporal
 * @param {string} message - Mensaje a mostrar
 * @param {number} durationMs - Duración en ms (default 5000)
 */
export function showErrorMessage(message, durationMs = 5000) {
  const msgDiv = document.getElementById("msgCompartir");
  if (!msgDiv) return;

  msgDiv.textContent = message;
  msgDiv.classList.remove('success-msg');
  msgDiv.classList.add('error-msg');
  msgDiv.classList.remove('hidden');

  setTimeout(() => {
    msgDiv.classList.add('hidden');
  }, durationMs);
}

// ===============================
// VALIDACIONES
// ===============================

/**
 * Valida que los datos de entrada sean válidos
 * @param {Object} controls - { personas, aporte }
 * @param {string[]} bebidas - Array de bebidas
 * @returns {Object} { valid: boolean, error?: string }
 */
export function validateInputs(controls, bebidas) {
  if (!controls.personas || controls.personas < 1) {
    return { valid: false, error: "Personas debe ser al menos 1" };
  }

  if (!controls.aporte || controls.aporte < 1000) {
    return { valid: false, error: "Aporte mínimo es $1.000" };
  }

  if (!bebidas || bebidas.length === 0) {
    return { valid: false, error: "Selecciona al menos una bebida" };
  }

  if (controls.personas > 1000) {
    return { valid: false, error: "Máximo 1000 personas permitidas" };
  }

  if (controls.aporte > 10000000) {
    return { valid: false, error: "Aporte máximo es $10.000.000" };
  }

  return { valid: true };
}
