/**
 * RENDERER
 * Renderizado de planes, estado de presupuesto, warnings y compartir.
 */

import { formatCLP, clearElement, addLi, addLiHtml, getRatioBudget, getConvenienceBadge, isDeliveryOnlyStore, getStoreMapsUrl, generarMensajeWhatsApp } from './helpers.js';
import { summarizeItems } from './solver.js';
import { crearYCompartirPresupuestoCorto, guardarPresupuestoCorto, generarURLCorta } from './shorturl.js';
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
export async function compartirPresupuestoActual() {
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
          <div style="text-align: left; line-height: 1.4; font-size: 0.85rem;">
            ⚠️ <strong>Guardado en la base de datos</strong> (pero el navegador bloqueó la copia automática).<br/>
            <span class="text-secondary small">Copia el enlace manualmente:</span><br/>
            <code style="background: rgba(0, 0, 0, 0.3); color: #fff; padding: 0.4rem 0.6rem; border-radius: 6px; display: block; margin-top: 0.5rem; word-break: break-all; border: 1px solid rgba(255, 255, 255, 0.15); font-family: monospace;">
              ${resultado.url}
            </code>
          </div>
        `;
        msgDiv.style.display = 'block';
        msgDiv.style.opacity = '0';
        msgDiv.style.transition = 'opacity 0.3s ease-in';
        msgDiv.classList.add('warning-msg');
        msgDiv.classList.remove('success-msg');
        msgDiv.classList.remove('error-msg');
        
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

/**
 * Comparte el presupuesto actual por WhatsApp con copy formateado y URL corta
 */
export async function compartirPresupuestoWhatsApp() {
  try {
    if (!window.currentPresupuesto) {
      alert('❌ No hay presupuesto para compartir');
      return;
    }

    const btnWhatsApp = document.getElementById('btnWhatsAppPresupuesto');
    const origHtml = btnWhatsApp ? btnWhatsApp.innerHTML : '';
    if (btnWhatsApp) {
      btnWhatsApp.disabled = true;
      btnWhatsApp.innerHTML = '⏳ Preparando WhatsApp...';
      btnWhatsApp.style.opacity = '0.8';
    }

    // Intentar obtener o generar URL corta
    let url = window.location.href;
    try {
      const id = await guardarPresupuestoCorto(window.currentPresupuesto);
      if (id) {
        url = generarURLCorta(id);
      }
    } catch (e) {
      console.warn('⚠️ No se pudo generar URL corta para WhatsApp, usando URL actual:', e);
    }

    // Generar mensaje estructurado para WhatsApp
    const mensaje = generarMensajeWhatsApp(window.currentPresupuesto, url);
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(mensaje)}`;

    // Registrar evento en telemetría
    try {
      registrarEventoTelemetria('compartir_whatsapp', {
        personas: window.currentPresupuesto.personas || 0,
        total: window.currentPresupuesto.total || 0,
        modo: window.currentPresupuesto.modo || ''
      });
    } catch (_) {}

    // Abrir WhatsApp en nueva pestaña
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    if (btnWhatsApp) {
      btnWhatsApp.innerHTML = '✅ ¡Abriendo WhatsApp!';
      setTimeout(() => {
        btnWhatsApp.disabled = false;
        btnWhatsApp.innerHTML = origHtml;
        btnWhatsApp.style.opacity = '1';
      }, 2500);
    }
  } catch (error) {
    console.error('❌ Error al compartir por WhatsApp:', error);
    alert('❌ Error al preparar mensaje de WhatsApp: ' + error.message);
    const btnWhatsApp = document.getElementById('btnWhatsAppPresupuesto');
    if (btnWhatsApp) {
      btnWhatsApp.disabled = false;
      btnWhatsApp.innerHTML = '💬 Compartir en WhatsApp';
      btnWhatsApp.style.opacity = '1';
    }
  }
}

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
