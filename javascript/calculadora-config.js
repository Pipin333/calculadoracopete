/**
 * CALCULADORA - CONFIGURACIÓN
 * Constants, reglas de consumo, heurística y setup global
 * 
 * Versión: 3.1
 * Separación de concerns: Configuración centralizada (sin lógica)
 */

// ===============================
// CONSUMO POR MODO
// ===============================

export const CONSUMOS = {
  previa: {
    cervezaMlPorPersona: 700,
    destiladoMlPorPersona: 120,
    bebidaFactor: 1.5,
    hieloBolsasPorPersona: 1 / 10 
  },
  trabajo: {
    cervezaMlPorPersona: 1200,
    destiladoMlPorPersona: 180,
    bebidaFactor: 2.0,
    hieloBolsasPorPersona: 1 / 8
  },
  pongamosle: {
    cervezaMlPorPersona: 1500,
    destiladoMlPorPersona: 250,
    bebidaFactor: 2.0,
    hieloBolsasPorPersona: 1 / 4
  },
  modo18: {
    cervezaMlPorPersona: 2500,
    destiladoMlPorPersona: 400,
    bebidaFactor: 2.5,
    hieloBolsasPorPersona: 1 / 3
  },
  proyectox: {
    cervezaMlPorPersona: 3750,
    destiladoMlPorPersona: 500,
    bebidaFactor: 2.8,
    hieloBolsasPorPersona: 1 / 3
  }
};

// ===============================
// CONSTANTES DE HEURÍSTICA
// ===============================

export const PENALIZACION_CONFIG = {
  PENALIZACION_ITEM_COMBINACION: 400,
  PENALIZACION_SKU_COMBINACION: 80,
  PENALIZACION_SOBRECOMPRA_POR_LITRO: 100,
  PENALIZACION_TIENDA_EXTRA: 25,
  PENALIZACION_SKU_PLAN: 2,
  PENALIZACION_ITEM_PLAN: 1,
  PENALIZACION_SOBRECOMPRA_PLAN_POR_LITRO: 1.5,
  EXPONENTE_SLIDER_CONSUMO: 0.6,
  UMBRAL_ADVERTENCIA_DESTILADO_ML: 300
};

// ===============================
// FACTOR ESTACIONAL
// ===============================

export const FACTOR_ESTACIONAL_POR_MES = [
  1.10,  // Enero
  1.10,  // Febrero
  1.05,  // Marzo
  0.95,  // Abril
  0.85,  // Mayo
  0.80,  // Junio
  0.80,  // Julio
  0.85,  // Agosto
  1.00,  // Septiembre
  1.05,  // Octubre
  1.10,  // Noviembre
  1.10   // Diciembre
];

/**
 * Obtiene factor estacional del mes actual
 * @returns {number} Factor (ej: 1.0 = septiembre baseline)
 */
export function getFactorEstacional() {
  const mes = new Date().getMonth();
  return FACTOR_ESTACIONAL_POR_MES[mes];
}

// ===============================
// OPCIONES DE BEBIDAS
// ===============================

export const OPCIONES_CONSUMO = {
  cerveza: {
    nombre: "Cerveza",
    grupo: "cerveza",
    categoriaBase: "cerveza",
    llevaMixer: false,
    mixerCategoria: null,
    mixerFactor: 0,
    llevaHielo: false
  },
  piscola: {
    nombre: "Piscola",
    grupo: "mix_simple",
    categoriaBase: "piscola",
    llevaMixer: true,
    mixerCategoria: "bebida",
    mixerFactor: 2,
    llevaHielo: true
  },
  ron: {
    nombre: "Roncola",
    grupo: "mix_simple",
    categoriaBase: "ron",
    llevaMixer: true,
    mixerCategoria: "bebida",
    mixerFactor: 2,
    llevaHielo: true
  },
  vodka: {
    nombre: "Vodka + bebida",
    grupo: "mix_simple",
    categoriaBase: "vodka",
    llevaMixer: true,
    mixerCategoria: "bebida",
    mixerFactor: 2,
    llevaHielo: true
  },
  whiskey: {
    nombre: "Whiskey solo",
    grupo: "solo",
    categoriaBase: "whiskey",
    llevaMixer: false,
    mixerCategoria: null,
    mixerFactor: 0,
    llevaHielo: true
  },
  whiscola: {
    nombre: "Whiscola",
    grupo: "mix_simple",
    categoriaBase: "whiskey",
    llevaMixer: true,
    mixerCategoria: "bebida",
    mixerFactor: 2,
    llevaHielo: true
  },
  gin_tonic: {
    nombre: "Gin tonic",
    grupo: "mix_simple",
    categoriaBase: "gin",
    llevaMixer: true,
    mixerCategoria: "tonica",
    mixerFactor: 2,
    llevaHielo: true
  },
  gin_redbull: {
    nombre: "Gin + energética",
    grupo: "mix_simple",
    categoriaBase: "gin",
    llevaMixer: true,
    mixerCategoria: "redbull",
    mixerFactor: 2.75,
    llevaHielo: true
  },
  jaeger_redbull: {
    nombre: "Jäger + energética",
    grupo: "mix_simple",
    categoriaBase: "jaeger",
    llevaMixer: true,
    mixerCategoria: "redbull",
    mixerFactor: 2.75,
    llevaHielo: true
  }
};

// ===============================
// UTILIDADES DE CONFIGURACIÓN
// ===============================

/**
 * Crea objeto presupuesto completo
 * @param {Object} datos - Datos básicos
 * @param {Object} multiPlan - Plan multi-tienda
 * @param {Object} singlePlan - Plan tienda única
 * @returns {Object} Presupuesto completo
 */
export function crearPresupuesto(datos, multiPlan, singlePlan) {
  return {
    personas: datos.personas || 0,
    aporte: datos.aporte || 0,
    modo: datos.modo || 'N/A',
    bebidas: datos.bebidas || [],
    tiendaSplit: datos.tiendaSplit || false,
    presupuestoTotal: (datos.personas || 0) * (datos.aporte || 0),
    multiPlan: multiPlan || {},
    singlePlan: singlePlan || {},
    timestamp: new Date().toISOString()
  };
}

/**
 * Calcula requerimientos de bebidas basado en consumo
 * @param {number} personas - Cantidad de personas
 * @param {number} presupuesto - Presupuesto total en CLP
 * @param {string} modo - Modo de consumo
 * @param {Array} bebidas - Bebidas seleccionadas
 * @param {Object} budgetSplit - Distribución de presupuesto
 * @param {Object} CONSUMOS_CONFIG - Config de consumos
 * @param {Array} FACTOR_ESTACIONAL - Factores estacionales
 * @param {Object} OPCIONES_CONFIG - Config de opciones
 * @returns {Promise<Array>} Array de requerimientos
 */
export async function calcularRequirements(
  personas,
  presupuesto,
  modo,
  bebidas,
  budgetSplit,
  CONSUMOS_CONFIG,
  FACTOR_ESTACIONAL,
  OPCIONES_CONFIG
) {
  const consumo = CONSUMOS_CONFIG[modo] || CONSUMOS_CONFIG.pongamosle;
  const factorEstacional = FACTOR_ESTACIONAL[new Date().getMonth()];

  const totalCervezaMl = Math.ceil(personas * consumo.cervezaMlPorPersona * factorEstacional);
  const totalDestiladoBaseMl = Math.ceil(personas * consumo.destiladoMlPorPersona * factorEstacional);
  const presupuestoDestilados = (presupuesto * 0.5); // 50% para destilados
  const presupuestoCerveza = (presupuesto * 0.3);   // 30% para cerveza

  const requirements = [];

  // Cerveza
  const splitCerveza = (budgetSplit.cerveza || 0) / 100;
  requirements.push({
    categoria: "cerveza",
    nombre: "Cerveza",
    requiredMl: totalCervezaMl,
    budget: presupuestoCerveza * splitCerveza,
    porcentaje: budgetSplit.cerveza || 0
  });

  // Destilados y mixers
  const mixes = Object.entries(OPCIONES_CONFIG)
    .filter(([key, op]) => bebidas.includes(key) && op.grupo !== "cerveza")
    .map(([key, op]) => ({...op, drinkKey: key}));  // Preservar la key como drinkKey

  let totalAsignado = 0;
  mixes.forEach(op => {
    const split = (budgetSplit[op.drinkKey] || 0) / 100;  // Usar drinkKey en lugar de categoriaBase
    let requiredMl;

    if (mixes.length === 1) {
      requiredMl = totalDestiladoBaseMl;
    } else {
      const proporcion = split || (1 / mixes.length);
      requiredMl = Math.round(totalDestiladoBaseMl * proporcion);
      totalAsignado += requiredMl;
    }

    const subBudget = presupuestoDestilados * split;

    requirements.push({
      categoria: op.categoriaBase,
      nombre: op.nombre,
      requiredMl,
      budget: subBudget,
      porcentaje: budgetSplit[op.drinkKey] || 0,  // Usar drinkKey en lugar de categoriaBase
      opcionKey: op.drinkKey,  // Usar drinkKey en lugar de categoriaBase
      grupo: op.grupo
    });
  });

  // Hielo
  const hieloBolsas = Math.max(
    1,
    Math.ceil((personas / 3) * factorEstacional),
    Math.ceil(totalDestiladoBaseMl / 1500)
  );

  requirements.push({
    categoria: "hielo",
    nombre: "Hielo",
    requiredMl: hieloBolsas * 2000,
    budget: presupuestoDestilados * 0.1
  });

  return requirements;
}
