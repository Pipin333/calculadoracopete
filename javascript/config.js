/**
 * CONFIGURACIÓN Y CONSTANTES
 * Reglas de consumo por modo, penalizaciones heurísticas y factor estacional.
 */

// ===============================
// CONFIG / REGLAS DE CONSUMO
// ===============================
export const CONSUMOS = {
  previa: {
    cervezaMlPorPersona: 1000,
    destiladoMlPorPersona: 150,
    bebidaFactor: 1.75,
    hieloBolsasPorPersona: 1 / 10 
  },
  trabajo: {
    cervezaMlPorPersona: 1500,
    destiladoMlPorPersona: 200,
    bebidaFactor: 2.0,
    hieloBolsasPorPersona: 1 / 8
  },
  pongamosle: {
    cervezaMlPorPersona: 2000,     // Estilo parcela/patota: +50% vs trabajo
    destiladoMlPorPersona: 300,    // +40% vs trabajo 
    bebidaFactor: 2.0,            // Piscola estándar
    hieloBolsasPorPersona: 1 / 4  // 1 bolsa de 2kg cada 4 personas (crítico en septiembre/calor)
  },
  modo18: {
    cervezaMlPorPersona: 3000,     // Basado en rotación de 200 unidades
    destiladoMlPorPersona: 450,     // +60% vs pongámosle (mayor protagonismo)
    bebidaFactor: 2.5,             // Energética: ideal para latas de 250ml
    hieloBolsasPorPersona: 1 / 3   // 1 bolsa de 2kg cada 3 personas (crítico en jornada larga)
  },
  proyectox: {
    cervezaMlPorPersona: 3750,     // +25% vs Modo 18 (multi-día relajado, no extremo)
    destiladoMlPorPersona: 500,    // +25% vs Modo 18 (misma proporción que cerveza)
    bebidaFactor: 2.8,             // +12% vs Modo 18 (moderado para multi-día)
    hieloBolsasPorPersona: 1 / 3   // Similar a Modo 18 (suficiente para multi-día)
  }
};

export const EXPONENTE_SLIDER_CONSUMO = 0.6;
export const UMBRAL_ADVERTENCIA_DESTILADO_ML = 300;

// ===============================
// HEURÍSTICA
// ===============================

// A nivel de combinación por categoría
export const PENALIZACION_ITEM_COMBINACION = 400; // Penaliza FUERTEMENTE comprar unidades sueltas si hay pack
export const PENALIZACION_SKU_COMBINACION = 80;   // Bajo: priorizar botellas grandes (2.5L, 3L) aunque sobre
export const PENALIZACION_SOBRECOMPRA_POR_LITRO = 100; // Permite excedentes marginales en bebidas

// A nivel de plan total
export const PENALIZACION_TIENDA_EXTRA = 25;     // Moderada: permite que usuario elija (single vs multi-tienda)
export const PENALIZACION_SKU_PLAN = 2;
export const PENALIZACION_ITEM_PLAN = 1;
export const PENALIZACION_SOBRECOMPRA_PLAN_POR_LITRO = 1.5;

// ===============================
// FACTOR ESTACIONAL (ajuste automático por mes)
// ===============================
// Calibración: Septiembre (primavera) = 1.0 (baseline)
// Invierno (junio-julio) = 0.8 (menos hielo, menos cerveza fría)
// Verano (enero-febrero) = 1.1 (más hielo, más cerveza fría)

const FACTOR_ESTACIONAL_POR_MES = [
  1.10,  // Enero (verano pico)
  1.10,  // Febrero (verano pico)
  1.05,  // Marzo (otoño inicial, aún calor)
  0.95,  // Abril (otoño, enfría)
  0.85,  // Mayo (invierno inicial)
  0.80,  // Junio (invierno pico) ⚠️
  0.80,  // Julio (invierno pico) ⚠️
  0.85,  // Agosto (invierno final, empieza mejorar)
  1.00,  // Septiembre (primavera, BASELINE)
  1.05,  // Octubre (primavera, calentando)
  1.10,  // Noviembre (pre-verano)
  1.10   // Diciembre (verano)
];

export function getFactorEstacional() {
  const mes = new Date().getMonth(); // 0-11
  return FACTOR_ESTACIONAL_POR_MES[mes];
}
