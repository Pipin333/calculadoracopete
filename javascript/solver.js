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
  BONUS_MARCA_ESTABLECIDA,
  esMarcaEstablecida,
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

  // BONUS MARCA ESTABLECIDA: favorecer marcas reconocidas y líderes
  const itemsMarcaConocida = items.filter(it => esMarcaEstablecida(it.nombre)).length;
  const bonusMarcasEstablecidas = itemsMarcaConocida * BONUS_MARCA_ESTABLECIDA;

  return (
    totalCost +
    totalItems * PENALIZACION_ITEM_COMBINACION +
    skuDistintos * PENALIZACION_SKU_COMBINACION +
    penalizacionSobrecompra -
    bonusBotellasGrandes -
    bonusMarcasEstablecidas  // RESTAR el bonus de marca (menor score = preferido)
  );
}

// ===============================
// OPTIMIZACIÓN SIMPLE POR CATEGORÍA (Knapsack DP de Alto Rendimiento)
// ===============================

// Popcount rápido para 32-bit integer (hasta 30 SKUs distintos)
function popcount32(x) {
  x = x - ((x >>> 1) & 0x55555555);
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  return (((x + (x >>> 4)) & 0x0F0F0F0F) * 0x01010101) >>> 24;
}

// Popcount para BigInt (en caso de > 30 SKUs)
function popcountBigInt(x) {
  let count = 0;
  while (x > 0n) {
    x &= (x - 1n);
    count++;
  }
  return count;
}

function findCheapestCombination(products, requiredMl, categoria = null) {
  if (!products || products.length === 0) return null;
  if (requiredMl <= 0) return { totalVolume: 0, totalCost: 0, score: 0, items: [] };

  // 1. Precomputar atributos y asignar SKU IDs para seguimiento O(1) con bitmasks
  const skuMap = new Map();
  let nextSkuId = 0;
  const prods = [];

  for (const p of products) {
    if (!p || !p.volumenTotalMl || p.volumenTotalMl <= 0 || !p.precio) continue;
    const key = `${p.tienda}__${p.nombre}`;
    let skuId = skuMap.get(key);
    if (skuId === undefined) {
      skuId = nextSkuId++;
      skuMap.set(key, skuId);
    }
    prods.push({
      raw: p,
      vol: p.volumenTotalMl,
      precio: p.precio,
      isEstablished: esMarcaEstablecida(p.nombre) ? 1 : 0,
      bit32: skuId < 30 ? (1 << skuId) : 0,
      bitBig: 1n << BigInt(skuId)
    });
  }

  if (prods.length === 0) return null;

  const is32Bit = skuMap.size <= 30;
  const maxVolume = Math.max(...prods.map(p => p.vol));
  const upperBound = requiredMl + maxVolume;

  // 2. TypedArrays planos: cero asignaciones de objetos ni arrays durante el loop DP
  const dpScore = new Float64Array(upperBound + 1).fill(Infinity);
  const dpCost = new Int32Array(upperBound + 1).fill(1e9);
  const dpCount = new Int16Array(upperBound + 1).fill(0);
  const dpBrands = new Int16Array(upperBound + 1).fill(0);
  const dpParent = new Int32Array(upperBound + 1).fill(-1);
  const dpProdIdx = new Int16Array(upperBound + 1).fill(-1);
  const dpMask = is32Bit ? new Int32Array(upperBound + 1) : new Array(upperBound + 1).fill(0n);

  dpScore[0] = 0;
  dpCost[0] = 0;

  const esBebida = ["bebida", "redbull", "tonica"].includes(categoria);
  const factorSobrecompra = esBebida 
    ? (PENALIZACION_SOBRECOMPRA_POR_LITRO * 0.4) 
    : PENALIZACION_SOBRECOMPRA_POR_LITRO;

  // 3. Loop DP ultrarrápido (V8 JIT optimizado)
  if (is32Bit) {
    for (let v = 0; v <= upperBound; v++) {
      if (dpScore[v] === Infinity) continue;

      const currCost = dpCost[v];
      const currCount = dpCount[v];
      const currBrands = dpBrands[v];
      const currMask = dpMask[v];

      for (let i = 0; i < prods.length; i++) {
        const p = prods[i];
        const nextVolume = Math.min(upperBound, v + p.vol);
        const nextCost = currCost + p.precio;
        const nextCount = currCount + 1;
        const nextBrands = currBrands + p.isEstablished;
        const nextMask = currMask | p.bit32;
        const skuDistintos = popcount32(nextMask);

        const sobrecompraMl = Math.max(0, nextVolume - requiredMl);
        const penalizacionSobrecompra = (sobrecompraMl / 1000) * factorSobrecompra;

        const volumePromedio = nextVolume / nextCount;
        const bonusBotellasGrandes = Math.max(0, (volumePromedio - 1000) / 100);
        const bonusMarcas = nextBrands * BONUS_MARCA_ESTABLECIDA;

        const nextScore = nextCost +
          nextCount * PENALIZACION_ITEM_COMBINACION +
          skuDistintos * PENALIZACION_SKU_COMBINACION +
          penalizacionSobrecompra -
          bonusBotellasGrandes -
          bonusMarcas;

        if (
          nextScore < dpScore[nextVolume] ||
          (nextScore === dpScore[nextVolume] && nextCost < dpCost[nextVolume])
        ) {
          dpScore[nextVolume] = nextScore;
          dpCost[nextVolume] = nextCost;
          dpCount[nextVolume] = nextCount;
          dpBrands[nextVolume] = nextBrands;
          dpMask[nextVolume] = nextMask;
          dpParent[nextVolume] = v;
          dpProdIdx[nextVolume] = i;
        }
      }
    }
  } else {
    for (let v = 0; v <= upperBound; v++) {
      if (dpScore[v] === Infinity) continue;

      const currCost = dpCost[v];
      const currCount = dpCount[v];
      const currBrands = dpBrands[v];
      const currMask = dpMask[v];

      for (let i = 0; i < prods.length; i++) {
        const p = prods[i];
        const nextVolume = Math.min(upperBound, v + p.vol);
        const nextCost = currCost + p.precio;
        const nextCount = currCount + 1;
        const nextBrands = currBrands + p.isEstablished;
        const nextMask = currMask | p.bitBig;
        const skuDistintos = popcountBigInt(nextMask);

        const sobrecompraMl = Math.max(0, nextVolume - requiredMl);
        const penalizacionSobrecompra = (sobrecompraMl / 1000) * factorSobrecompra;

        const volumePromedio = nextVolume / nextCount;
        const bonusBotellasGrandes = Math.max(0, (volumePromedio - 1000) / 100);
        const bonusMarcas = nextBrands * BONUS_MARCA_ESTABLECIDA;

        const nextScore = nextCost +
          nextCount * PENALIZACION_ITEM_COMBINACION +
          skuDistintos * PENALIZACION_SKU_COMBINACION +
          penalizacionSobrecompra -
          bonusBotellasGrandes -
          bonusMarcas;

        if (
          nextScore < dpScore[nextVolume] ||
          (nextScore === dpScore[nextVolume] && nextCost < dpCost[nextVolume])
        ) {
          dpScore[nextVolume] = nextScore;
          dpCost[nextVolume] = nextCost;
          dpCount[nextVolume] = nextCount;
          dpBrands[nextVolume] = nextBrands;
          dpMask[nextVolume] = nextMask;
          dpParent[nextVolume] = v;
          dpProdIdx[nextVolume] = i;
        }
      }
    }
  }

  // 4. Identificar el volumen óptimo alcanzado (>= requiredMl)
  let bestVolume = -1;
  let bestScore = Infinity;
  let bestCost = Infinity;

  for (let v = requiredMl; v <= upperBound; v++) {
    if (dpScore[v] === Infinity) continue;
    if (
      dpScore[v] < bestScore ||
      (dpScore[v] === bestScore && dpCost[v] < bestCost)
    ) {
      bestScore = dpScore[v];
      bestCost = dpCost[v];
      bestVolume = v;
    }
  }

  if (bestVolume === -1) return null;

  // 5. Backtracking instantáneo: reconstruye los items en O(k) sin haber creado arrays durante el DP
  const items = [];
  let curr = bestVolume;
  while (curr > 0) {
    const pIdx = dpProdIdx[curr];
    if (pIdx === -1) break;
    items.push(prods[pIdx].raw);
    curr = dpParent[curr];
  }
  items.reverse();

  return {
    totalVolume: bestVolume,
    totalCost: bestCost,
    score: bestScore,
    items
  };
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

  // Pre-cargar productos por categoría una sola vez
  const categoryProducts = {};
  for (const req of requirements) {
    if (!categoryProducts[req.categoria]) {
      categoryProducts[req.categoria] = await productApi.getProductsByCategory(req.categoria);
    }
  }

  let bestStorePlan = null;

  for (const store of stores) {
    let total = 0;
    const details = [];
    const allItems = [];
    let valid = true;

    for (const req of requirements) {
      // Filtra de los productos ya cacheados de la categoría los de la tienda actual
      const productsInStore = (categoryProducts[req.categoria] || [])
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
