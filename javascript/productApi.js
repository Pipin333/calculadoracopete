/**
 * PRODUCT API & CONFIGURACIÓN DESDE JSON
 * Carga productos.json, construye OPCIONES_CONSUMO y provee API de productos.
 * 
 * Estado compartido: CATEGORIAS_JSON, COMBINACIONES_ESPECIALES_JSON, OPCIONES_CONSUMO
 */

// ===============================
// ESTADO COMPARTIDO
// ===============================
let CATEGORIAS_JSON = {};
let COMBINACIONES_ESPECIALES_JSON = {};
let OPCIONES_CONSUMO = {};

// Getters/Setters para acceso desde otros módulos
export function getCategoriasJSON() { return CATEGORIAS_JSON; }
export function getCombinacionesEspecialesJSON() { return COMBINACIONES_ESPECIALES_JSON; }
export function getOpcionesConsumo() { return OPCIONES_CONSUMO; }
export function setOpcionesConsumo(value) { OPCIONES_CONSUMO = value; }

// ===============================
// BUILDER AUTOMÁTICO DESDE productos.json
// ===============================
/**
 * Sistema completamente modular que lee categorías desde productos.json
 * 
 * VENTAJAS:
 * - Agregar bebida = solo agregar a productos.json
 * - Checkboxes se generan automáticamente
 * - OPCIONES_CONSUMO se construye automáticamente
 * - Sin código hardcodeado en script.js
 * 
 * CÓMO AGREGAR UNA BEBIDA:
 * 1. En productos.json → categorias → agregar nueva categoría con metadata
 * 2. O en productos.json → combinaciones_especiales → agregar SKU especial
 * 3. LISTO - Todo se genera automáticamente
 */

/**
 * Carga configuración desde productos.json
 */
export async function cargarConfiguracionDesdeJSON() {
  try {
    const response = await fetch('json/productos.json?t=' + Date.now());
    const data = await response.json();
    
    CATEGORIAS_JSON = data.categorias || {};
    COMBINACIONES_ESPECIALES_JSON = data.combinaciones_especiales || {};
    
    console.log(`📥 Configuración cargada desde productos.json`);
    console.log(`   📊 Categorías: ${Object.keys(CATEGORIAS_JSON).length}`);
    console.log(`   🔗 Combinaciones: ${Object.keys(COMBINACIONES_ESPECIALES_JSON).length}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Error cargando productos.json:`, error);
    return false;
  }
}

/**
 * Construye OPCIONES_CONSUMO desde JSON
 */
export function buildOpcionesConsumoDesdeJSON() {
  const opciones = {};

  // 1. Agregar categorías simples (seleccionables)
  for (const [key, config] of Object.entries(CATEGORIAS_JSON)) {
    if (config.esSeleccionable !== false) {
      opciones[key] = {
        nombre: config.nombre,
        grupo: config.grupo,
        categoriaBase: key,
        llevaMixer: config.llevaMixer,
        mixerCategoria: config.mixerCategoria,
        mixerFactor: config.mixerFactor,
        mixerAlternativas: config.mixerAlternativas || [null],
        llevaHielo: config.llevaHielo,
        displayName: config.displayName || config.nombre
      };
    }
  }

  // 2. Agregar combinaciones especiales
  for (const [key, config] of Object.entries(COMBINACIONES_ESPECIALES_JSON)) {
    opciones[key] = {
      nombre: config.nombre,
      grupo: config.grupo,
      categoriaBase: config.categoriaBase,
      llevaMixer: config.llevaMixer,
      mixerCategoria: config.mixerCategoria,
      mixerFactor: config.mixerFactor,
      mixerAlternativas: config.mixerAlternativas || [null],
      llevaHielo: config.llevaHielo,
      displayName: config.displayName || config.nombre
    };
  }

  console.log(`📦 OPCIONES_CONSUMO construidas desde JSON: ${Object.keys(opciones).length} opciones`);
  console.log(`📋 Contenido de OPCIONES_CONSUMO:`, opciones);
  return opciones;
}

// ===============================
// API DE PRODUCTOS
// ===============================
const mockProducts = []; // Fallback vacío — ahora se usa productos.json

export const productApi = {
  _data: null,
  
  async _loadData() {
    if (this._data) return this._data;
    
    try {
      const response = await fetch('json/productos.json?t=' + Date.now());
      if (!response.ok) throw new Error('No se pudo cargar productos.json');
      this._data = await response.json();
      return this._data;
    } catch (error) {
      console.warn(`Error cargando productos.json: ${error.message}`);
      return { timestamp: new Date().toISOString(), total: mockProducts.length, productos: mockProducts };
    }
  },
  
  async getProductsByCategory(category) {
    const data = await this._loadData();
    
    // Read selected gama from DOM (fall back to 'normal' if element doesn't exist)
    const gamaSelect = document.getElementById("gama");
    const selectedGama = gamaSelect ? gamaSelect.value : "normal";
    
    // Filter by category
    let filtered = data.productos.filter(p => p.categoria === category);
    
    // Filter by gama (mixers and ice are neutral, so they are always included)
    const allowedProducts = filtered.filter(p => {
      const pGama = p.gama || "normal"; // Default if missing
      return pGama === selectedGama || pGama === "neutral";
    });
    
    // Guard: If there are NO products in the selected gama for this category, fall back to 'normal'
    // to prevent the Knapsack solver from failing entirely.
    let finalProducts = allowedProducts;
    if (allowedProducts.length === 0 && selectedGama !== "normal") {
      finalProducts = filtered.filter(p => {
        const pGama = p.gama || "normal";
        return pGama === "normal" || pGama === "neutral";
      });
    }
    
    return finalProducts.map(p => ({
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
