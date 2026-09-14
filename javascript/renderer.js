/**
 * RENDERER
 * Renderizado de planes, estado de presupuesto, warnings y compartir.
 */

import { formatCLP, clearElement, addLi, addLiHtml, getRatioBudget, getConvenienceBadge, isDeliveryOnlyStore, getStoreMapsUrl, generarMensajeWhatsApp, escapeHTML } from './helpers.js';
import { summarizeItems } from './solver.js';
import { crearYCompartirPresupuestoCorto, guardarPresupuestoCorto, generarURLCorta, copiarTextoAlPortapapeles } from './shorturl.js';
import { registrarEventoTelemetria } from './firebase-config.js';
import { getProductPriceHistory } from './productApi.js';

// Listener global para registrar clicks a tiendas (afiliados / intención de compra)
if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('.store-link');
    if (link) {
      registrarEventoTelemetria('click_tienda', {
        tienda: link.dataset.tienda || link.textContent.replace('↗', '').trim(),
        producto: link.dataset.producto || '',
        url: link.href
      });
    }
  });
}

// ===============================
// LINKS DE TIENDA
// ===============================
/**
 * Genera el enlace de búsqueda del producto en la tienda correspondiente
 */
export function getStoreSearchUrl(storeName, productName) {
  const query = encodeURIComponent(productName);
  const nameLower = storeName.toLowerCase();
  
  if (nameLower.includes("lider")) {
    return `https://www.lider.cl/supermercado/search?query=${query}`;
  } else if (nameLower.includes("jumbo")) {
    return `https://www.jumbo.cl/busqueda?ft=${query}`;
  } else if (nameLower.includes("unimarc")) {
    return `https://www.unimarc.cl/search/${query}`;
  } else if (nameLower.includes("barra")) {
    return `https://labarra.cl/buscar?q=${query}`;
  } else if (nameLower.includes("liquidos") || nameLower.includes("líquidos")) {
    return `https://www.liquidos.cl/resultados?busqueda=${query}`;
  } else if (nameLower.includes("booz")) {
    return `https://www.booz.cl/buscar?q=${query}`;
  } else if (nameLower.includes("cocacola") || nameLower.includes("coca-cola") || nameLower.includes("coca cola")) {
    return `https://www.micocacola.cl/search?q=${query}`;
  }
  
  return `https://www.google.com/search?q=${encodeURIComponent(storeName + " " + productName)}`;
}

// ===============================
// RENDER DE PLANES
// ===============================
export function renderPlan(listElement, plan) {
  clearElement(listElement);

  if (!plan.ok) {
    addLi(listElement, plan.reason);
    return;
  }

  for (const detail of plan.details) {
    const summarized = summarizeItems(detail.result.items);

    for (const item of summarized) {
      const searchUrl = getStoreSearchUrl(item.tienda, item.nombre);
      const isDelivery = isDeliveryOnlyStore(item.tienda);
      const mapsUrl = getStoreMapsUrl(item.tienda);
      const mapsBadge = isDelivery
        ? `<span class="badge bg-secondary-subtle text-light border border-secondary ms-1" style="font-size: 0.7rem; font-weight: normal;" title="Tienda online / despacho">🚚 Delivery</span>`
        : `<a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="badge text-bg-dark border border-secondary text-decoration-none ms-1" style="font-size: 0.7rem; font-weight: normal;" title="Ver local físico más cercano en Google Maps">📍 Mapa</a>`;
      const storeLink = `<a href="${searchUrl}" target="_blank" rel="noopener noreferrer" class="store-link" data-tienda="${item.tienda}" data-producto="${item.nombre}">${item.tienda} ↗</a>${mapsBadge}`;
      
      // Historial & Badges SoloTodo
      const hist = getProductPriceHistory(item.tienda, item.nombre);
      let badgeHtml = '';
      if (hist) {
        if (hist.isMin && hist.obsCount > 1 && hist.max > hist.min) {
          badgeHtml = ` <button type="button" class="btn btn-link p-0 text-decoration-none price-history-trigger" data-tienda="${item.tienda}" data-producto="${item.nombre}" title="Mínimo histórico en 6 meses. Haz click para ver gráfico."><span class="badge text-bg-danger ms-1" style="font-size: 0.72rem; cursor: pointer;">🔥 Mínimo Histórico</span></button>`;
        } else if (hist.diff <= -8) {
          badgeHtml = ` <button type="button" class="btn btn-link p-0 text-decoration-none price-history-trigger" data-tienda="${item.tienda}" data-producto="${item.nombre}" title="Precio ${Math.abs(hist.diff)}% bajo promedio. Haz click para ver gráfico."><span class="badge text-bg-success ms-1" style="font-size: 0.72rem; cursor: pointer;">📉 ${hist.diff}% vs prom.</span></button>`;
        } else if (hist.obsCount > 1) {
          badgeHtml = ` <button type="button" class="btn btn-link p-0 text-decoration-none text-secondary price-history-trigger ms-1" data-tienda="${item.tienda}" data-producto="${item.nombre}" style="font-size: 0.75rem;" title="Ver historial de precios">📊</button>`;
        }
      }

      addLiHtml(
        listElement,
        `${item.cantidad} x ${item.nombre} (${storeLink})${badgeHtml} — ${formatCLP(item.precio * item.cantidad)}`
      );
    }
  }
}

// ===============================
// ESTADO DE PRESUPUESTO
// ===============================
export function renderBudgetState(budget, multiPlan, singlePlan, sinCuota = false) {
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

  if (sinCuota) {
    estadoEl.innerHTML = `<span class="badge text-bg-info">Lista de Compra</span>`;
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

// ===============================
// WARNINGS
// ===============================
export function ensureWarningsBox() {
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

export function renderWarnings(warnings) {
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
// COMPARTIR PRESUPUESTO
// ===============================
/**
 * Comparte el presupuesto actual usando URL corta
 */
/**
 * Copia el resumen formateado con emojis, cuota y enlace para WhatsApp/chat
 */
export async function compartirPresupuestoActual() {
  try {
    if (!window.currentPresupuesto) {
      alert('❌ No hay presupuesto para compartir');
      return;
    }

    const btnCompartir = document.getElementById('btnCompartirPresupuesto');
    const msgDiv = document.getElementById('msgCompartir');
    
    if (!btnCompartir) return;

    const textOriginal = btnCompartir.innerHTML;
    btnCompartir.disabled = true;
    btnCompartir.innerHTML = '⏳ Copiando resumen...';
    btnCompartir.style.opacity = '0.7';

    // Obtener ID corto (si ya fue pre-generado, se usa de inmediato; si no, se guarda)
    let url = window.currentPresupuesto.shortUrl;
    if (!url) {
      const id = await guardarPresupuestoCorto(window.currentPresupuesto);
      if (id) {
        url = generarURLCorta(id);
        window.currentPresupuesto.shortId = id;
        window.currentPresupuesto.shortUrl = url;
      } else {
        url = window.location.href;
      }
    }

    // Generar el copy con formato completo para WhatsApp o chats
    const textoCompleto = generarMensajeWhatsApp(window.currentPresupuesto, url);

    // Copiar al portapapeles de forma robusta (Clipboard API + fallback textarea)
    const copiado = await copiarTextoAlPortapapeles(textoCompleto);

    if (copiado) {
      console.log('✅ Resumen con formato copiado al portapapeles');
      
      if (msgDiv) {
        msgDiv.innerHTML = `✅ ¡Resumen copiado! Listo para pegar en WhatsApp o chat`;
        msgDiv.style.display = 'block';
        msgDiv.style.opacity = '0';
        msgDiv.style.transition = 'opacity 0.3s ease-in';
        msgDiv.classList.remove('error-msg', 'warning-msg');
        msgDiv.classList.add('success-msg');
        setTimeout(() => { msgDiv.style.opacity = '1'; }, 10);
      }

      btnCompartir.innerHTML = '✅ ¡Copiado con formato!';
      btnCompartir.classList.remove('btn-primary', 'btn-outline-light');
      btnCompartir.classList.add('btn-success');

      setTimeout(() => {
        if (msgDiv) msgDiv.style.opacity = '0';
        btnCompartir.disabled = false;
        btnCompartir.innerHTML = textOriginal;
        btnCompartir.style.opacity = '1';
        btnCompartir.classList.remove('btn-success');
        btnCompartir.classList.add('btn-primary');
        setTimeout(() => {
          if (msgDiv) msgDiv.style.display = 'none';
        }, 300);
      }, 3500);
    } else {
      console.warn('⚠️ No se pudo copiar automáticamente');
      if (msgDiv) {
        msgDiv.innerHTML = `
          <div style="text-align: left; line-height: 1.4; font-size: 0.85rem;">
            ⚠️ <strong>Copia el resumen manualmente:</strong><br/>
            <textarea readonly style="width: 100%; height: 90px; background: rgba(0,0,0,0.4); color: #fff; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; padding: 6px; font-size: 0.78rem; font-family: monospace;">${escapeHTML(textoCompleto)}</textarea>
          </div>
        `;
        msgDiv.style.display = 'block';
        msgDiv.style.opacity = '1';
      }
      btnCompartir.innerHTML = '⚠️ Copiar manualmente';
      setTimeout(() => {
        btnCompartir.disabled = false;
        btnCompartir.innerHTML = textOriginal;
        btnCompartir.style.opacity = '1';
      }, 4000);
    }
  } catch (error) {
    console.error('❌ Error copiando resumen:', error);
    alert('❌ Error al copiar: ' + error.message);
    const btnCompartir = document.getElementById('btnCompartirPresupuesto');
    if (btnCompartir) {
      btnCompartir.disabled = false;
      btnCompartir.innerHTML = '📋 Copiar Resumen y Enlace';
      btnCompartir.style.opacity = '1';
    }
  }
}

// Alias para compatibilidad
export const compartirPresupuestoWhatsApp = compartirPresupuestoActual;

// ===============================
// MODAL HISTORIAL DE PRECIOS (SoloTodo Style)
// ===============================
let chartHistorialInstance = null;

export function abrirModalHistorial(tienda, nombre) {
  const hist = getProductPriceHistory(tienda, nombre);
  if (!hist) return;

  const modalEl = document.getElementById('modalHistorialPrecio');
  if (!modalEl) return;

  const labelEl = document.getElementById('modalHistorialPrecioLabel');
  const badgeTiendaEl = document.getElementById('historialBadgeTienda');
  const actualEl = document.getElementById('historialPrecioActual');
  const minEl = document.getElementById('historialPrecioMin');
  const avgEl = document.getElementById('historialPrecioAvg');
  const maxEl = document.getElementById('historialPrecioMax');
  const obsEl = document.getElementById('historialObservaciones');
  const btnIr = document.getElementById('btnHistorialIrTienda');

  if (labelEl) labelEl.textContent = nombre;
  if (badgeTiendaEl) badgeTiendaEl.textContent = tienda;
  if (actualEl) actualEl.textContent = formatCLP(hist.cur);
  if (minEl) minEl.textContent = formatCLP(hist.min);
  if (avgEl) avgEl.textContent = formatCLP(hist.avg);
  if (maxEl) maxEl.textContent = formatCLP(hist.max);
  if (obsEl) obsEl.textContent = `${hist.obsCount} registros de precio en los últimos 6 meses`;

  if (btnIr) {
    btnIr.href = getStoreSearchUrl(tienda, nombre);
    btnIr.textContent = `Comprar en ${tienda} ↗`;
  }

  // Gráfico Chart.js
  const canvas = document.getElementById('chartHistorialPrecio');
  if (canvas && typeof Chart !== 'undefined') {
    const ctx = canvas.getContext('2d');
    if (chartHistorialInstance) chartHistorialInstance.destroy();

    const labels = (hist.pts || []).map(p => {
      const d = new Date(p[0] + 'T00:00:00');
      return d.toLocaleDateString('es-CL', { month: 'short', day: 'numeric' });
    });
    const dataPrices = (hist.pts || []).map(p => p[1]);

    chartHistorialInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Precio ($CLP)',
          data: dataPrices,
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6, 182, 212, 0.12)',
          fill: true,
          tension: 0.15,
          borderWidth: 2,
          pointRadius: labels.length > 20 ? 2 : 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#06b6d4'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            ticks: {
              color: '#9d98b5',
              callback: v => '$' + Math.round(v).toLocaleString('es-CL')
            },
            grid: { color: 'rgba(255,255,255,0.06)' }
          },
          x: {
            ticks: { color: '#9d98b5', maxTicksLimit: 7 },
            grid: { display: false }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: c => 'Precio: $' + Math.round(c.parsed.y).toLocaleString('es-CL')
            }
          }
        }
      }
    });
  }

  if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
    const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
    bsModal.show();
  }
}

// Listener para abrir el modal de historial al clickear el badge o botón
if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.price-history-trigger');
    if (trigger) {
      e.preventDefault();
      e.stopPropagation();
      const tienda = trigger.dataset.tienda;
      const producto = trigger.dataset.producto;
      abrirModalHistorial(tienda, producto);
    }
  });
}
