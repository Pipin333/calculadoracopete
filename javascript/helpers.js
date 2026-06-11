/**
 * HELPERS UI
 * Funciones utilitarias de formateo, DOM y labels.
 */

import { getOpcionesConsumo } from './productApi.js';
import { getMixerPreferencesState } from './mixerPreferences.js';

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
export function crearPresupuesto(datos, multiPlan, singlePlan) {
  return {
    personas: datos.personas || 0,
    aporte: datos.aporte || 0,
    modo: datos.modo || 'N/A',
    gama: datos.gama || 'normal',
    sinCuota: datos.sinCuota || false,
    bebidas: datos.bebidas || [],
    mixerPreferences: getMixerPreferencesState() || {},
    tiendaSplit: datos.tiendaSplit || false,
    presupuestoTotal: datos.sinCuota ? 0 : ((datos.personas || 0) * (datos.aporte || 0)),
    multiPlan: multiPlan || {},
    singlePlan: singlePlan || {},
    timestamp: new Date().toISOString()
  };
}

// ===============================
// HELPERS UI
// ===============================
export function formatCLP(value) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0
  }).format(value);
}

export function clearElement(element) {
  element.innerHTML = "";
}

export function addLi(element, text) {
  const li = document.createElement("li");
  li.textContent = text;
  element.appendChild(li);
}

export function addLiHtml(element, html) {
  const li = document.createElement("li");
  li.innerHTML = html;
  element.appendChild(li);
}

export function getSelectedDrinks() {
  const OPCIONES_CONSUMO = getOpcionesConsumo();
  const selected = Array.from(document.querySelectorAll(".bebida-check:checked"))
    .map(input => input.value)
    .filter(key => OPCIONES_CONSUMO && OPCIONES_CONSUMO[key]);

  console.log(`📊 Bebidas seleccionadas:`, selected);
  if (OPCIONES_CONSUMO) {
    console.log(`   Disponibles en OPCIONES_CONSUMO:`, Object.keys(OPCIONES_CONSUMO));
  }

  return selected;
}

export function getModeLabel(mode) {
  if (mode === "previa") return "Previa";
  if (mode === "trabajo") return "Trabajo mañana";
  if (mode === "pongamosle") return "Pongámosle";
  if (mode === "modo18") return "Modo 18";
  if (mode === "proyectox") return "Proyecto X";
  return "Modo desconocido";
}

export function getDrinkLabel(drink) {
  const OPCIONES_CONSUMO = getOpcionesConsumo();
  return OPCIONES_CONSUMO[drink]?.displayName || OPCIONES_CONSUMO[drink]?.nombre || drink;
}

export function actualizarTextoDropdownBebidas() {
  const boton = document.getElementById("bebidasDropdown");
  if (!boton) return; // Retornar si el botón de dropdown ya no se usa (grid activo)

  const seleccionadas = Array.from(document.querySelectorAll(".bebida-check:checked"))
    .map(input => {
      const cardName = input.closest(".drink-card")?.querySelector(".drink-card-name");
      return cardName ? cardName.textContent.trim() : (input.nextElementSibling ? input.nextElementSibling.textContent.trim() : "");
    })
    .filter(name => name !== "");

  if (seleccionadas.length === 0) {
    boton.textContent = "Selecciona uno o más tipos de copete";
  } else if (seleccionadas.length === 1) {
    boton.textContent = seleccionadas[0];
  } else {
    boton.textContent = `${seleccionadas.length} opciones seleccionadas`;
  }
}

export function getPracticalLevel(score) {
  if (score <= 12) return "Muy conveniente";
  if (score <= 20) return "Conveniente";
  if (score <= 32) return "Medio pajera";
  return "Solo si estai justo de plata";
}

export function getConvenienceBadge(score, isMulti = false) {
  let badgeClass = "";
  let text = "";
  let icon = "";
  
  if (score <= 12) {
    badgeClass = "level-easy";
    text = "Muy conveniente";
    icon = "⚡";
  } else if (score <= 20) {
    badgeClass = "level-easy";
    text = "Conveniente";
    icon = "🟢";
  } else if (score <= 32) {
    badgeClass = "level-medium";
    text = "Medio pajera";
    icon = "🟡";
  } else {
    badgeClass = "level-hard";
    text = "Solo si estai pato";
    icon = "🔴";
  }
  
  return `<span class="convenience-badge ${badgeClass}">${icon} ${text}</span>`;
}

export function getRatioBudget(spent, total) {
  if (total <= 0) return "—";
  const percentage = Math.round((spent / total) * 100);
  return `${percentage}% utilizado (${formatCLP(spent)} gastado)`;
}
