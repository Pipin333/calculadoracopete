/**
 * RENDERER
 * Renderizado de planes, estado de presupuesto, warnings y compartir.
 */

import { formatCLP, clearElement, addLi, addLiHtml, getRatioBudget, getConvenienceBadge } from './helpers.js';
import { summarizeItems } from './solver.js';
import { crearYCompartirPresupuestoCorto } from './shorturl.js';

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
      const storeLink = `<a href="${searchUrl}" target="_blank" class="store-link">${item.tienda}</a>`;
      addLiHtml(
        listElement,
        `${item.cantidad} x ${item.nombre} (${storeLink}) — ${formatCLP(item.precio * item.cantidad)}`
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
