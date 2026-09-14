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

/**
 * Escapa caracteres especiales para prevenir vulnerabilidades de Cross-Site Scripting (XSS)
 * @param {string|any} str - Cadena o valor a sanitizar
 * @returns {string} - Cadena con entidades HTML codificadas
 */
export function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

if (typeof window !== 'undefined') {
  window.escapeHTML = escapeHTML;
}

/**
 * Determina si una tienda es exclusivamente de despacho/delivery online
 * @param {string} storeName - Nombre de la tienda
 * @returns {boolean}
 */
export function isDeliveryOnlyStore(storeName) {
  if (!storeName) return false;
  const name = storeName.toLowerCase();
  return name.includes("barra") || name.includes("cocacola") || name.includes("coca cola");
}

/**
 * Retorna URL de búsqueda en Google Maps para la tienda física más cercana
 * @param {string} storeName - Nombre de la tienda
 * @returns {string} - URL de Google Maps Universal Search ($0 costo API)
 */
export function getStoreMapsUrl(storeName) {
  if (!storeName) return '#';
  const query = encodeURIComponent(`${storeName} supermercado botilleria`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

/**
 * Construye el mensaje con copy estructurado para grupos de WhatsApp
 * @param {Object} presupuesto - Objeto presupuesto
 * @param {string} url - URL corta de la boleta compartible
 * @returns {string} - Mensaje formateado para WhatsApp
 */
export function generarMensajeWhatsApp(presupuesto, url) {
  if (!presupuesto) return `🍻 Revisa este presupuesto en Cuánto Rinde: ${url}`;

  const personas = presupuesto.personas || 0;
  const cuota = presupuesto.sinCuota 
    ? (presupuesto.multiPlan?.total ? Math.ceil(presupuesto.multiPlan.total / (personas || 1)) : 0)
    : (presupuesto.aporte || 0);

  const total = presupuesto.multiPlan?.total || (personas * cuota);
  
  let ahorroTxt = '';
  if (!presupuesto.sinCuota && presupuesto.presupuestoTotal && presupuesto.multiPlan?.total) {
    const ahorro = presupuesto.presupuestoTotal - presupuesto.multiPlan.total;
    if (ahorro > 0) {
      ahorroTxt = ` (¡Ahorro de ${formatCLP(ahorro)}!)`;
    }
  }

  // Extraer tiendas recomendadas únicas
  const tiendasSet = new Set();
  if (presupuesto.multiPlan?.allItems) {
    presupuesto.multiPlan.allItems.forEach(item => {
      if (item.tienda) tiendasSet.add(item.tienda);
    });
  } else if (presupuesto.singlePlan?.store || presupuesto.singlePlan?.tienda) {
    tiendasSet.add(presupuesto.singlePlan.store || presupuesto.singlePlan.tienda);
  }
  const tiendasStr = tiendasSet.size > 0 ? Array.from(tiendasSet).join(' y ') : 'Supermercados locales';

  return `🍻 *Presupuesto Carrete — Cuánto Rinde*
👥 *Asistentes:* ${personas} personas
💰 *Cuota:* ${formatCLP(cuota)} c/u
🛒 *Total canasta:* ${formatCLP(total)}${ahorroTxt}
🏪 *Comprar en:* ${tiendasStr}

📋 *Revisa la lista completa de compras acá:*
${url}

💳 ¡Transfieran para ir a comprar antes que cierren! 🚀`;
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
