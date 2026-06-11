/**
 * SOLVER / MOTOR DE OPTIMIZACIÓN
 * Knapsack DP, requerimientos, planes multi-tienda y tienda única.
 */

import {
  CONSUMOS,
  EXPONENTE_SLIDER_CONSUMO,
  UMBRAL_ADVERTENCIA_DESTILADO_ML,
  PENALIZACION_ITEM_COMBINACION,
  PENALIZACION_SKU_COMBINACION,
  PENALIZACION_SOBRECOMPRA_POR_LITRO,
  PENALIZACION_TIENDA_EXTRA,
  PENALIZACION_SKU_PLAN,
  PENALIZACION_ITEM_PLAN,
  PENALIZACION_SOBRECOMPRA_PLAN_POR_LITRO,
  getFactorEstacional
} from './config.js';
import { getOpcionesConsumo, getCategoriasJSON, productApi } from './productApi.js';
import { getMixerPreference } from './mixerPreferences.js';
import { formatCLP } from './helpers.js';

// ===============================
// REQUERIMIENTOS
// ===============================
export function buildRequirements(selectedDrinks, people, mode, budget, budgetSplit) {
  const rules = CONSUMOS[mode];
  const OPCIONES_CONSUMO = getOpcionesConsumo();
  const CATEGORIAS_JSON = getCategoriasJSON();

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
  const destilados = opciones.filter(op => op.grupo === "destilado");

  console.log(`   Cervezas: ${cervezas.length}, Destilados: ${destilados.length}`);

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

  // Solo destilados (ya no separamos puros vs mixtos)
  const opcionesDestilado = destilados;

  if (opcionesDestilado.length > 0) {
    const factorCantidadDestilados = 0.7 + 0.3 * opcionesDestilado.length;
    // Factor solo: 0.85 si hay destilados que típicamente se toman sin mixer
    const factorSolo = destilados.some(op => op.mixerAlternativas?.includes(null)) ? 0.85 : 1.0;

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

    // 🎯 PROCESAR TODOS LOS DESTILADOS CON MIXER ELEGIDO POR USUARIO
    // El usuario puede elegir mixer o "sin mixer" desde los selectores
    opcionesDestilado.forEach(op => {
      const alternativas = op.mixerAlternativas || [];
      
      // Si tiene múltiples opciones (ej: [null, "bebida"], [null, "sprite"]), procesar mixer
      if (alternativas.length > 1) {
        const req = requirements.find(r => r.opcionKey === op.key);
        if (!req) return;
        
        // USAR PREFERENCIA DE MIXER SI EXISTE
        const mixerKey = getMixerPreference(op.key) || op.mixerCategoria;
        
        // Si el mixer es null, no agregar mixer
        if (mixerKey === null) {
          console.log(`  ℹ️ ${op.nombre}: Sin mixer seleccionado`);
          return;
        }
        
        const mixerFactor = CATEGORIAS_JSON[mixerKey]?.mixerFactor || op.mixerFactor;
        
        // Mapeo de nombres para display
        const mixerNames = {
          "tonica": "Tónica",
          "redbull": "Energética",
          "bebida": "Coca-Cola",
          "sprite": "Sprite",
          "jugo_watts": "Jugo Watts"
        };
        
        const mixerDisplayName = mixerNames[mixerKey] || mixerKey;
        
        // CREA UNA ENTRADA SEPARADA POR CADA BEBIDA CON MIXER
        const mixerReq = {
          categoria: mixerKey,
          nombre: `${mixerDisplayName} (para ${op.nombre})`,
          requiredMl: Math.ceil(req.requiredMl * mixerFactor),
          budget: presupuestoDestilados * 0.15 / opcionesDestilado.length
        };
        
        requirements.push(mixerReq);
      }
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

export function mergeRequirementsByCategoria(requirements) {
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

export function getConsumptionWarnings(requirements) {
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

export function getBudgetWarnings(plan) {
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
// OPTIMIZACIÓN SIMPLE POR CATEGORÍA (Knapsack DP)
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

export function getUniqueStores(items) {
  return [...new Set(items.map(item => item.tienda))];
}

export function getPlanPracticalScore(plan) {
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
export async function buildMultiStorePlan(requirements) {
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
export async function buildSingleStorePlan(requirements) {
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
