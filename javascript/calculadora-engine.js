/**
 * CALCULADORA - ENGINE (ALGORITMO DP)
 * Core del cálculo de presupuestos usando Programación Dinámica
 * 
 * Versión: 3.1
 * Separación de concerns: Lógica de negocio pura (sin UI)
 */

import { formatCLP } from './calculadora-utils.js';

// ===============================
// PRODUCTO API
// ===============================

export const productApi = {
  _data: null,
  
  async _loadData() {
    if (this._data) return this._data;
    
    try {
      console.log('📦 Cargando productos.json desde ../json/productos.json...');
      const response = await fetch('../json/productos.json');
      if (!response.ok) throw new Error('No se pudo cargar productos.json');
      this._data = await response.json();
      console.log('✅ Productos cargados:', this._data);
      return this._data;
    } catch (error) {
      console.error('❌ Error cargando productos.json:', error);
      return { timestamp: new Date().toISOString(), total: 0, productos: [] };
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
// UTILIDADES INTERNAS
// ===============================

/**
 * Resumen de items agrupados por producto
 * @param {Array} items - Items a resumir
 * @returns {Array} Items únicos con cantidad
 */
export function summarizeItems(items) {
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

/**
 * Obtiene tiendas únicas de items
 * @param {Array} items - Items
 * @returns {Array} Array de tiendas
 */
export function getUniqueStores(items) {
  return [...new Set(items.map(item => item.tienda))];
}

// ===============================
// HEURÍSTICA DE SCORING
// ===============================

/**
 * Calcula score de una combinación de productos
 * @param {number} cost - Costo total
 * @param {Array} items - Items en la combinación
 * @param {number} volume - Volumen total
 * @param {number} required - Volumen requerido
 * @param {string} categoria - Categoría
 * @returns {number} Score (menor es mejor)
 */
function getCombinationScore(cost, items, volume, required, categoria) {
  const sobrecompra = Math.max(0, volume - required);
  const combinacionesSKU = items.length;

  let score = 0;

  // Si no alcanzamos el mínimo requerido, penalización grande
  if (volume < required) {
    score += (required - volume) * 100;
  }

  // Penalizar sobrecompra marginal
  score += sobrecompra * 0.1;

  // Penalizar si hay muchas combinaciones de SKU
  if (categoria !== "hielo") {
    score += combinacionesSKU * 0.5;
  }

  return score;
}

/**
 * Score de practicidad de un plan completo
 * @param {Object} plan - Plan a evaluar
 * @param {Object} config - Config con penalizaciones
 * @returns {number} Score (menor es mejor)
 */
export function getPlanPracticalScore(plan, config) {
  if (!plan || !plan.ok) return Infinity;

  const {
    PENALIZACION_TIENDA_EXTRA = 25,
    PENALIZACION_SKU_PLAN = 2,
    PENALIZACION_ITEM_PLAN = 1,
    PENALIZACION_SOBRECOMPRA_PLAN_POR_LITRO = 1.5
  } = config || {};

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
// PROGRAMACIÓN DINÁMICA (DP)
// ===============================

/**
 * Encuentra la combinación más barata para un requerimiento usando DP
 * @param {Array} products - Productos disponibles
 * @param {number} requiredMl - ML requeridos
 * @param {string} categoria - Categoría
 * @returns {Object} { totalVolume, totalCost, score, items }
 */
export function findCheapestCombination(products, requiredMl, categoria) {
  if (!products || products.length === 0) return null;

  const upperBound = Math.ceil(requiredMl * 1.3); // Permitir 30% de sobrecompra
  console.log(`🔄 findCheapestCombination - ${categoria}: requiredMl=${requiredMl}, upperBound=${upperBound}`);
  console.log(`📦 Productos disponibles (${products.length}):`, products.map(p => ({ 
    nombre: p.nombre, 
    unidades: p.unidades,
    volumenMlUnidad: p.volumenMlUnidad,
    volumenTotalMl: p.volumenTotalMl,
    precio: p.precio 
  })));
  
  const dp = {};

  dp[0] = {
    cost: 0,
    score: 0,
    items: []
  };

  for (const product of products) {
    console.log(`🔄 Procesando producto: ${product.nombre}, volumen=${product.volumenTotalMl}`);
    
    // Iterar de atrás para adelante para evitar usar el mismo producto múltiples veces
    for (let volume = upperBound; volume >= product.volumenTotalMl; volume--) {
      if (!dp[volume - product.volumenTotalMl]) continue;

      const nextVolume = volume;
      const nextCost = dp[volume - product.volumenTotalMl].cost + product.precio;
      const nextItems = [...dp[volume - product.volumenTotalMl].items, product];
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

  console.log(`💾 DP table keys después de procesar:`, Object.keys(dp).map(k => parseInt(k)).sort((a, b) => a - b));
  
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

  console.log(`🎯 Best para ${categoria}:`, best);
  return best;
}

// ===============================
// ESTRATEGIAS DE COMPRA
// ===============================

/**
 * Construye plan de compra multi-tienda (óptimo)
 * @param {Array} requirements - Requerimientos de bebidas
 * @param {Object} config - Config con penalizaciones
 * @returns {Object} Plan con { ok, reason?, total, allItems, details }
 */
export async function buildMultiStorePlan(requirements, config) {
  console.log('🏪 buildMultiStorePlan - requirements:', requirements);
  const details = [];
  let total = 0;
  const allItems = [];

  for (const req of requirements) {
    console.log(`🔍 Buscando productos para ${req.categoria}...`);
    const products = await productApi.getProductsByCategory(req.categoria);
    console.log(`📊 Productos encontrados para ${req.categoria}:`, products);
    
    const best = findCheapestCombination(products, req.requiredMl, req.categoria);
    console.log(`✨ Best combination para ${req.categoria}:`, best);

    if (!best) {
      console.error(`❌ No hay productos disponibles para ${req.nombre}.`);
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

  console.log('✅ buildMultiStorePlan completado con éxito');
  return {
    ok: true,
    total,
    allItems,
    details
  };
}

/**
 * Construye plan de compra tienda única (simplificado)
 * @param {Array} requirements - Requerimientos de bebidas
 * @param {Object} config - Config con penalizaciones
 * @returns {Object} Plan con mejor tienda única
 */
export async function buildSingleStorePlan(requirements, config) {
  const tiendas = ['jumbo', 'lider', 'unimarc'];
  let bestPlan = null;
  let bestScore = Infinity;

  for (const tienda of tiendas) {
    const details = [];
    let total = 0;
    const allItems = [];
    let possible = true;

    for (const req of requirements) {
      const products = await productApi.getProductsByCategory(req.categoria);
      const productsEnTienda = products.filter(p => p.tienda === tienda);

      if (productsEnTienda.length === 0) {
        possible = false;
        break;
      }

      const best = findCheapestCombination(productsEnTienda, req.requiredMl, req.categoria);

      if (!best) {
        possible = false;
        break;
      }

      details.push({
        requirement: req,
        result: best
      });

      total += best.totalCost;
      allItems.push(...best.items);
    }

    if (!possible) continue;

    const plan = {
      ok: true,
      tienda,
      total,
      allItems,
      details
    };

    const score = getPlanPracticalScore(plan, config);
    if (score < bestScore) {
      bestScore = score;
      bestPlan = plan;
    }
  }

  if (!bestPlan) {
    return {
      ok: false,
      reason: 'No hay tienda con productos suficientes.'
    };
  }

  return bestPlan;
}

// ===============================
// FLUJO PRINCIPAL
// ===============================

/**
 * Calcula presupuesto completo con ambas estrategias
 * @param {Object} datos - { personas, aporte, modo, bebidas, budgetSplit }
 * @param {Object} requirements - Requerimientos calculados
 * @param {Object} config - Config con constantes y penalizaciones
 * @returns {Object} { multiPlan, singlePlan, recomendacion }
 */
export async function calcularPresupuestoCompleto(datos, requirements, config) {
  // Calcular ambos planes en paralelo
  const [multiPlan, singlePlan] = await Promise.all([
    buildMultiStorePlan(requirements, config),
    buildSingleStorePlan(requirements, config)
  ]);

  // Determinar recomendación
  let recomendacion = 'multi'; // por defecto
  if (multiPlan.ok && singlePlan.ok) {
    const multiScore = getPlanPracticalScore(multiPlan, config);
    const singleScore = getPlanPracticalScore(singlePlan, config);
    recomendacion = multiScore <= singleScore ? 'multi' : 'single';
  } else if (!multiPlan.ok) {
    recomendacion = 'single';
  } else if (!singlePlan.ok) {
    recomendacion = 'multi';
  }

  return {
    multiPlan,
    singlePlan,
    recomendacion,
    error: !multiPlan.ok && !singlePlan.ok ? 'No se pudo calcular presupuesto' : null
  };
}

/**
 * Obtiene warnings sobre el consumo calculado
 * @param {Array} requirements - Requerimientos
 * @param {Object} config - Config con umbrales
 * @returns {Array} Array de warning messages
 */
export function getConsumptionWarnings(requirements, config) {
  const {
    UMBRAL_ADVERTENCIA_DESTILADO_ML = 300
  } = config || {};

  const warnings = [];

  requirements.forEach(req => {
    if (
      req.categoria === 'destilado' &&
      req.requiredMl > UMBRAL_ADVERTENCIA_DESTILADO_ML
    ) {
      warnings.push(
        `⚠️ Destilado alto: ${Math.round(req.requiredMl / 1000)}L - Cuidado con los tragos fuerte`
      );
    }
  });

  return warnings;
}
