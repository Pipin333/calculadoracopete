/**
 * CATALOG / VITRINA DE PRODUCTOS (SOLOTODO STYLE)
 * Catálogo interactivo para vitrinear copete, comparar tiendas en tiempo real,
 * explorar mínimos históricos a 6 meses y ver comparativa "Elige tu tienda".
 */

import { productApi, getProductPriceHistory, getHistorialPrecios } from './productApi.js';
import { formatCLP, escapeHTML } from './helpers.js';
import { getStoreSearchUrl } from './renderer.js';
import { registrarEventoTelemetria } from './firebase-config.js';
import { esMarcaEstablecida } from './config.js';
import { getProductImageUrl } from './productImages.js';

// ===============================
// ESTADO INTERNO DEL CATÁLOGO
// ===============================
let allProducts = [];
let groupedProducts = [];
let chartModalInstance = null;

let filterState = {
  search: '',
  category: 'todos',
  store: 'todas',
  sortBy: 'minimo' // 'minimo' | 'precio_asc' | 'precio_desc' | 'nombre'
};

// Mapeo de categorías a nombres amigables e iconos
const CATEGORY_META = {
  cerveza: { label: 'Cerveza', icon: '🍺', group: 'cerveza' },
  piscola: { label: 'Pisco', icon: '🥃', group: 'destilado' },
  ron: { label: 'Ron', icon: '🥃', group: 'destilado' },
  vodka: { label: 'Vodka', icon: '🍸', group: 'destilado' },
  whiskey: { label: 'Whisky', icon: '🥃', group: 'destilado' },
  gin: { label: 'Gin', icon: '🍸', group: 'destilado' },
  jaeger: { label: 'Jägermeister', icon: '🦌', group: 'destilado' },
  cola: { label: 'Bebida Cola', icon: '🥤', group: 'mixer' },
  sprite: { label: 'Sprite / Blanca', icon: '🥤', group: 'mixer' },
  fanta: { label: 'Fanta / Naranja', icon: '🥤', group: 'mixer' },
  ginger: { label: 'Ginger Ale', icon: '🥤', group: 'mixer' },
  redbull: { label: 'Energética', icon: '⚡', group: 'mixer' },
  tonica: { label: 'Agua Tónica', icon: '🥤', group: 'mixer' },
  jugo_watts: { label: 'Jugo Watts', icon: '🧃', group: 'mixer' },
  combos: { label: 'Packs & Promos', icon: '🎁', group: 'combos' },
  hielo: { label: 'Hielo', icon: '🧊', group: 'otros' }
};

// Tiendas soportadas en retail chileno (100% presencial y supermercados)
const TODAS_LAS_TIENDAS = ['Lider', 'Jumbo', 'Unimarc', 'Líquidos'];

/**
 * Formatea y embellece el nombre del producto eliminando redundancias del scraper y aplicando Title Case.
 */
export function formatProductDisplayName(name) {
  if (!name) return '';
  let str = name.trim();

  // 1. Eliminar corchetes y etiquetas de scraping como [Exp 30 Sep]
  str = str.replace(/\[[^\]]*\]/g, '').trim();
  str = str.replace(/&nbsp;/g, ' ');

  // 2. Normalizar expresiones de volumen
  str = str.replace(/(\d+[\.,]\d+)\s*(?:l|lt|lts|litro|litros)\b/gi, (m, v) => v.replace(',', '.') + 'L');
  str = str.replace(/\b(\d+)\s*(?:l|lt|lts|litro|litros)\b/gi, '$1L');
  str = str.replace(/(\d+)\s*(?:cc|ml)\b/gi, '$1cc');
  str = str.replace(/[º°]\s*alc\.?/gi, '°');

  // 3. Normalizar notación de packs
  str = str.replace(/\b(?:botella|lata)?\s*(\d+)\s*(?:un|unid|unidades)\s*(?:de)?\s*(\d+cc|\d+L)\b/gi, 'Pack $1x $2');
  str = str.replace(/\b(\d+)\s*x\s*(\d+cc|\d+L)\b/gi, 'Pack $1x $2');

  // 4. Eliminar palabras redundantes consecutivas o repetidas por scrapers (ej: "Cristal Cerveza Cerveza cristal...")
  const tokens = str.split(/\s+/).filter(Boolean);
  const cleanedTokens = [];
  const seenRecent = [];

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const low = t.toLowerCase().replace(/[^a-z0-9áéíóúüñ]/g, '');
    if (low.length > 2 && seenRecent.includes(low)) {
      continue;
    }
    cleanedTokens.push(t);
    if (low.length > 2) {
      seenRecent.push(low);
      if (seenRecent.length > 3) seenRecent.shift();
    }
  }

  str = cleanedTokens.join(' ');

  // 5. Smart Title Case con preservación de marcas y acrónimos
  const lowerWords = new Set(['de', 'del', 'la', 'el', 'en', 'con', 'sin', 'y', 'por', 'al', 'un', 'una']);
  const upperMap = {
    'coca-cola': 'Coca-Cola',
    'coca': 'Coca',
    'cola': 'Cola',
    'fanta': 'Fanta',
    'sprite': 'Sprite',
    'jagermeister': 'Jägermeister',
    'jager': 'Jäger',
    'jack': 'Jack',
    'daniels': "Daniel's",
    'johnnie': 'Johnnie',
    'walker': 'Walker',
    'stella': 'Stella',
    'artois': 'Artois',
    'royal': 'Royal',
    'guard': 'Guard',
    'ipa': 'IPA',
    'zero': 'Zero',
    'azucar': 'Azúcar',
    'azúcar': 'Azúcar',
    'light': 'Light',
    'budweiser': 'Budweiser',
    'quilmes': 'Quilmes',
    'heineken': 'Heineken',
    'corona': 'Corona',
    'becker': 'Becker',
    'cristal': 'Cristal',
    'escudo': 'Escudo',
    'kunstmann': 'Kunstmann',
    'austral': 'Austral',
    'kross': 'Kross',
    'mistral': 'Mistral',
    'alto': 'Alto',
    'carmen': 'Carmen',
    'absolut': 'Absolut',
    'smirnoff': 'Smirnoff',
    'ballantine': "Ballantine's",
    'chivas': 'Chivas',
    'beefeater': 'Beefeater',
    'tanqueray': 'Tanqueray',
    'ramazzotti': 'Ramazzotti',
    'redbull': 'Red Bull'
  };

  const words = str.split(' ');
  const titled = words.map((w, idx) => {
    if (/^\d+(?:cc|L|°)$/i.test(w)) return w.toUpperCase().replace('CC', 'cc');
    if (/^pack$/i.test(w)) return 'Pack';
    if (/^\d+x$/i.test(w)) return w.toLowerCase();

    const clean = w.toLowerCase().replace(/[^a-z0-9áéíóúüñ]/g, '');
    if (upperMap[clean]) {
      return upperMap[clean];
    }

    if (idx > 0 && lowerWords.has(w.toLowerCase())) {
      return w.toLowerCase();
    }

    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  });

  return titled.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Genera una llave canónica para agrupar productos idénticos o equivalentes entre distintas tiendas.
 */
export function getCanonicalProductKey(p) {
  const name = (p.nombre || '').toLowerCase();
  const cat = p.categoria || 'otros';

  if (cat === 'combos') {
    const clean = name.replace(/[^a-z0-9]/g, '');
    return 'combos__' + clean;
  }

  // 1. Detección de marca
  const brands = [
    'alto del carmen', 'tres erres', 'artesanos del cochiguaz', 'artesanos', 'horcon quemado', 'mistral nobel', 'mistral', 'capel', 'malpaso', 'campanario',
    'royal guard', 'stella artois', 'corona', 'heineken', 'escudo silver', 'escudo', 'cristal', 'becker', 'kunstmann', 'austral', 'budweiser', 'quilmes', 'sol', 'kross', 'michelob', 'peroni', 'blue moon', 'miller', 'cusquena',
    'coca-cola', 'coca cola', 'fanta', 'sprite', 'schweppes', 'canada dry', 'pepsi', '7up', 'red bull', 'redbull', 'monster', 'watts',
    'havana club', 'bacardi', 'flor de cana', 'barcelo', 'sierra morena', 'captain morgan', 'maddero',
    'absolut', 'smirnoff', 'grey goose', 'skyy', 'stolichnaya', 'serkova',
    'ballantine', 'johnnie walker', 'chivas regal', 'chivas', 'jack daniel', 'grant', 'jameson', 'black & white', 'sandy mac',
    'beefeater', 'tanqueray', 'bombay', 'hendrick', 'brighton', 'gordon',
    'jagermeister', 'jager', 'ramazzotti'
  ];

  let brandKey = '';
  for (const b of brands) {
    if (name.includes(b)) {
      brandKey = b.replace(/[\s-&]+/g, '_');
      break;
    }
  }

  if (!brandKey) {
    const cleanTokens = name.replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !['pack', 'cerveza', 'pisco', 'ron', 'vodka', 'whisky', 'botella', 'lata'].includes(w));
    brandKey = cleanTokens.slice(0, 2).sort().join('_') || 'generico';
  }

  // 2. Variante / Subtipo
  let variant = 'std';
  if (name.includes('zero') || name.includes('sin azucar') || name.includes('sin azúcar')) variant = 'zero';
  else if (name.includes('light')) variant = 'light';
  else if (name.includes('original')) variant = 'original';
  else if (name.includes('transparente')) variant = 'transparente';
  else if (name.includes('silver')) variant = 'silver';
  else if (name.includes('amber') || name.includes('ambar')) variant = 'amber';
  else if (name.includes('golden')) variant = 'golden';
  else if (name.includes('torobayo')) variant = 'torobayo';
  else if (name.includes('valdivia')) variant = 'valdivia';
  else if (name.includes('calafate')) variant = 'calafate';
  else if (name.includes('lager')) variant = 'lager';
  else if (name.includes('ipa')) variant = 'ipa';
  else if (name.includes('black')) variant = 'black';
  else if (name.includes('maracuya') || name.includes('maracuyá')) variant = 'maracuya';
  else if (name.includes('agua tonica') || name.includes('tonica') || name.includes('tónica')) variant = 'tonica';
  else if (name.includes('ginger ale') || name.includes('ginger')) variant = 'ginger';

  let degrees = '';
  const degMatch = name.match(/(\d{2})[°º]/) || name.match(/(\d{2})\s*(?:grados|alc)/);
  if (degMatch) {
    degrees = '_' + degMatch[1] + 'deg';
  }

  // 3. Unidades y rango de volumen por unidad
  const unidades = p.unidades || 1;
  const volUnit = p.volumenMlUnidad || p.volumenTotalMl || 0;

  let unitVolBracket = volUnit;
  if (volUnit >= 300 && volUnit <= 375) unitVolBracket = 350;
  else if (volUnit >= 450 && volUnit <= 520) unitVolBracket = 470;
  else if (volUnit >= 600 && volUnit <= 720 && unidades === 1) unitVolBracket = 650;
  else if (volUnit >= 700 && volUnit <= 750 && unidades === 1) unitVolBracket = 750;
  else if (volUnit >= 950 && volUnit <= 1050) unitVolBracket = 1000;
  else if (volUnit >= 1450 && volUnit <= 1550) unitVolBracket = 1500;
  else if (volUnit >= 1700 && volUnit <= 1800) unitVolBracket = 1750;
  else if (volUnit >= 1950 && volUnit <= 2100) unitVolBracket = 2000;
  else if (volUnit >= 2450 && volUnit <= 2600) unitVolBracket = 2500;
  else if (volUnit >= 2900 && volUnit <= 3100) unitVolBracket = 3000;

  let packBracket = unidades;
  if (unidades >= 5 && unidades <= 6) packBracket = 6;
  else if (unidades >= 10 && unidades <= 12) packBracket = 12;
  else if (unidades >= 18 && unidades <= 18) packBracket = 18;
  else if (unidades >= 20 && unidades <= 24) packBracket = 24;

  return `${cat}__${brandKey}__${variant}${degrees}__${packBracket}x${unitVolBracket}`;
}

/**
 * Inicializa el catálogo: carga datos, arma variantes y setea listeners
 */
export async function initCatalog() {
  const catalogGrid = document.getElementById('catalogoGrid');
  if (!catalogGrid) return;

  try {
    const data = await productApi._loadData();
    const rawProducts = Array.isArray(data?.productos) ? data.productos : [];

    // Preparar lista enriquecida con datos de historial
    allProducts = rawProducts.map(p => {
      const volTotal = (p.unidades || 1) * (p.volumenMlUnidad || 0);
      const hist = getProductPriceHistory(p.tienda, p.nombre);
      const isMin = !!(hist?.isMin && hist?.obsCount > 1 && hist?.max > hist?.min);
      const diff = hist?.diff || 0;

      return {
        ...p,
        volumenTotalMl: volTotal,
        hist,
        isMin,
        diff,
        isEstablished: esMarcaEstablecida(p.nombre)
      };
    });

    // Construir mapa de variantes multi-tienda
    buildGroupedCatalog();

    // Setup listeners de UI
    setupCatalogListeners();

    // Primer render
    renderCatalog();
  } catch (err) {
    console.error('❌ Error inicializando catálogo:', err);
    catalogGrid.innerHTML = `
      <div class="col-12 text-center py-5 text-muted">
        <p class="fs-5">⚠️ No se pudo cargar el catálogo de productos.</p>
        <button class="btn btn-outline-primary btn-sm mt-2" onclick="location.reload()">Reintentar</button>
      </div>
    `;
  }
}

/**
 * Agrupa productos idénticos o equivalentes entre tiendas
 */
/**
 * Agrupa productos idénticos o equivalentes entre tiendas usando llaves canónicas
 */
function buildGroupedCatalog() {
  const groups = new Map();

  allProducts.forEach(p => {
    const groupKey = getCanonicalProductKey(p);

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey).push(p);
  });

  // Cada grupo representa una tarjeta maestra en la vitrina
  groupedProducts = Array.from(groups.values()).map(groupItems => {
    // Ordenar tiendas por precio ascendente
    const sortedStores = [...groupItems].sort((a, b) => a.precio - b.precio);
    const cheapest = sortedStores[0];

    // Mejor historial si alguno tiene
    const bestHist = sortedStores.find(s => s.hist?.isMin) || sortedStores.find(s => s.hist) || cheapest;
    const hasMin = sortedStores.some(s => s.isMin);
    const minDiff = Math.min(...sortedStores.map(s => s.diff || 0));

    // Nombre formateado y foto de stock en alta resolución
    const nombreFormateado = formatProductDisplayName(cheapest.nombre);
    const imagenUrl = getProductImageUrl({
      ...cheapest,
      nombrePrincipal: nombreFormateado
    });

    return {
      groupId: cheapest.id,
      nombrePrincipal: nombreFormateado,
      imagenUrl,
      categoria: cheapest.categoria,
      volumenTotalMl: cheapest.volumenTotalMl,
      unidades: cheapest.unidades,
      volumenMlUnidad: cheapest.volumenMlUnidad,
      gama: cheapest.gama,
      precioMin: cheapest.precio,
      precioMax: sortedStores[sortedStores.length - 1].precio,
      cheapestTienda: cheapest.tienda,
      tiendasCount: sortedStores.length,
      storeVariants: sortedStores,
      hasMin,
      minDiff,
      hist: bestHist.hist || cheapest.hist,
      isEstablished: sortedStores.some(s => s.isEstablished)
    };
  });
}

/**
 * Filtra, ordena y renderiza las tarjetas de productos
 */
export function renderCatalog() {
  const catalogGrid = document.getElementById('catalogoGrid');
  const countBadge = document.getElementById('catalogoCountBadge');
  if (!catalogGrid) return;

  const query = filterState.search.toLowerCase().trim();

  // Filtrado
  let filtered = groupedProducts.filter(item => {
    // Filtro Categoría
    if (filterState.category !== 'todos') {
      if (filterState.category === 'minimos') {
        if (!item.hasMin && item.minDiff > -8) return false;
      } else if (filterState.category === 'destilados') {
        const isDestilado = ['piscola', 'ron', 'vodka', 'whiskey', 'gin', 'jaeger'].includes(item.categoria);
        if (!isDestilado) return false;
      } else if (filterState.category === 'mixers') {
        const isMixer = ['cola', 'sprite', 'fanta', 'ginger', 'redbull', 'tonica', 'jugo_watts'].includes(item.categoria);
        if (!isMixer) return false;
      } else if (item.categoria !== filterState.category) {
        return false;
      }
    }

    // Filtro Tienda
    if (filterState.store !== 'todas') {
      const matchStore = item.storeVariants.some(v => v.tienda.toLowerCase() === filterState.store.toLowerCase());
      if (!matchStore) return false;
    }

    // Filtro Búsqueda de texto
    if (query) {
      const inName = item.nombrePrincipal.toLowerCase().includes(query);
      const inStore = item.storeVariants.some(v => v.tienda.toLowerCase().includes(query));
      const inCat = (CATEGORY_META[item.categoria]?.label || '').toLowerCase().includes(query);
      if (!inName && !inStore && !inCat) return false;
    }

    return true;
  });

  // Ordenamiento
  filtered.sort((a, b) => {
    if (filterState.sortBy === 'minimo') {
      // Priorizar mínimos históricos y mayor porcentaje de descuento
      if (a.hasMin && !b.hasMin) return -1;
      if (!a.hasMin && b.hasMin) return 1;
      return a.minDiff - b.minDiff;
    } else if (filterState.sortBy === 'precio_asc') {
      return a.precioMin - b.precioMin;
    } else if (filterState.sortBy === 'precio_desc') {
      return b.precioMin - a.precioMin;
    } else if (filterState.sortBy === 'nombre') {
      return a.nombrePrincipal.localeCompare(b.nombrePrincipal);
    }
    return 0;
  });

  // Actualizar contador
  const minimosCount = filtered.filter(i => i.hasMin).length;
  if (countBadge) {
    countBadge.innerHTML = `Mostrando <strong>${filtered.length}</strong> productos${minimosCount > 0 ? ` (<span class="text-danger fw-bold">🔥 ${minimosCount}</span> en mínimo histórico)` : ''}`;
  }

  // Si no hay resultados
  if (filtered.length === 0) {
    catalogGrid.innerHTML = `
      <div class="col-12 text-center py-5">
        <div class="p-5 rounded-4 bg-black bg-opacity-20 border border-white border-opacity-10 max-w-500 mx-auto">
          <span class="fs-1 d-block mb-3">🔍</span>
          <h4 class="text-white fw-bold">No se encontraron productos</h4>
          <p class="text-secondary small mb-3">Prueba ajustando los filtros o el término de búsqueda.</p>
          <button class="btn btn-sm btn-primary rounded-pill px-4" id="btnResetFilters">Limpiar filtros</button>
        </div>
      </div>
    `;
    const btnReset = document.getElementById('btnResetFilters');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        resetFilters();
      });
    }
    return;
  }

  // Renderizar Grid SoloTodo
  catalogGrid.innerHTML = filtered.map(item => {
    const meta = CATEGORY_META[item.categoria] || { label: 'Bebida', icon: '🍾' };
    const formatLabel = item.volumenTotalMl >= 1000 
      ? `${(item.volumenTotalMl / 1000).toFixed(item.volumenTotalMl % 1000 === 0 ? 0 : 1)}L` 
      : `${item.volumenTotalMl}cc`;

    // Badges
    let badgeHtml = '';
    if (item.hasMin) {
      badgeHtml = `<span class="badge text-bg-danger shadow-sm"><span class="me-1">🔥</span>Mínimo Histórico</span>`;
    } else if (item.minDiff <= -8) {
      badgeHtml = `<span class="badge text-bg-success shadow-sm">📉 ${Math.abs(item.minDiff)}% vs prom.</span>`;
    }

    // Tienda badge / multi-tienda
    const storeBadge = item.tiendasCount > 1
      ? `<span class="badge bg-secondary bg-opacity-50 text-white border border-white-10">En ${item.tiendasCount} tiendas</span>`
      : `<span class="badge text-white" style="background-color: var(--accent-color);">${item.cheapestTienda}</span>`;

    // Precio display estilo SoloTodo ("Desde $X.XXX")
    const pricePrefix = item.tiendasCount > 1 ? 'Desde ' : '';
    const avgCrossed = (item.hist && item.hist.avg > item.precioMin && item.minDiff <= -5)
      ? `<span class="text-secondary text-decoration-line-through me-2 small">${formatCLP(item.hist.avg)}</span>`
      : '';

    return `
      <div class="col-6 col-md-4 col-lg-3 d-flex align-items-stretch">
        <div class="solotodo-card w-100 p-3 d-flex flex-column justify-content-between" data-group-id="${item.groupId}">
          <div>
            <!-- Header badges -->
            <div class="d-flex justify-content-between align-items-center mb-2 gap-1 flex-wrap" style="min-height: 24px;">
              ${storeBadge}
              ${badgeHtml}
            </div>

            <!-- Thumbnail / Visual con foto de stock -->
            <div class="solotodo-card-img-wrap mb-3 text-center position-relative">
              ${item.imagenUrl ? `
                <img src="${item.imagenUrl}" alt="${escapeHTML(item.nombrePrincipal)}" class="solotodo-product-img" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.classList.remove('d-none');">
                <div class="d-none py-3"><span style="font-size: 2.75rem;" role="img" aria-label="${meta.label}">${meta.icon}</span></div>
              ` : `
                <div class="py-3 d-flex flex-column align-items-center justify-content-center">
                  <span style="font-size: 2.75rem;" role="img" aria-label="${meta.label}">${meta.icon}</span>
                  <span class="badge bg-dark bg-opacity-75 text-secondary border border-white-10 mt-1 small">${meta.label}</span>
                </div>
              `}
              <span class="position-absolute bottom-0 end-0 m-2 badge bg-dark bg-opacity-75 text-secondary border border-white-10" style="font-size: 0.7rem;">
                ${formatLabel}
              </span>
            </div>

            <!-- Titulo y formato -->
            <div class="text-secondary small mb-1" style="font-size: 0.75rem;">
              ${meta.label} • ${item.volumenTotalMl} ml
            </div>
            <h6 class="solotodo-title text-white fw-bold mb-2" title="${escapeHTML(item.nombrePrincipal)}">
              ${escapeHTML(item.nombrePrincipal)}
            </h6>
          </div>

          <!-- Bottom: Precios y CTA -->
          <div class="pt-2 border-top border-white border-opacity-10 mt-2">
            <div class="mb-2">
              ${avgCrossed}
              <div class="solotodo-price text-success fw-bold fs-5">
                <span class="fs-6 text-secondary fw-normal">${pricePrefix}</span>${formatCLP(item.precioMin)}
              </div>
            </div>
            <button type="button" class="btn btn-sm btn-outline-light w-100 rounded-pill solotodo-btn-detail" data-group-id="${item.groupId}">
              Ver Tiendas y Precios ↗
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Abre el modal detallado estilo SoloTodo (Screenshot 2: "Elige tu tienda")
 */
export function openProductDetail(groupId) {
  const item = groupedProducts.find(g => g.groupId === Number(groupId));
  if (!item) return;

  const modalEl = document.getElementById('modalSoloTodoDetalle');
  if (!modalEl) return;

  // Registrar telemetría
  registrarEventoTelemetria('vitrina_ver_producto', {
    nombre: item.nombrePrincipal,
    categoria: item.categoria,
    tiendas: item.tiendasCount
  });

  // 1. Cabecera y datos generales
  const titleEl = document.getElementById('solotodoModalTitle');
  const catEl = document.getElementById('solotodoModalCategory');
  const formatEl = document.getElementById('solotodoModalFormat');
  const imgEl = document.getElementById('solotodoModalImg');
  const meta = CATEGORY_META[item.categoria] || { label: 'Bebida', icon: '🍾' };

  if (titleEl) titleEl.textContent = item.nombrePrincipal;
  if (catEl) catEl.textContent = `${meta.icon} ${meta.label}`;
  if (formatEl) formatEl.textContent = `${item.volumenTotalMl} ml (${item.unidades > 1 ? `${item.unidades} unidades` : '1 unidad'})`;
  if (imgEl) {
    if (item.imagenUrl) {
      imgEl.src = item.imagenUrl;
      imgEl.alt = item.nombrePrincipal;
      imgEl.style.display = 'block';
      imgEl.onerror = () => { imgEl.style.display = 'none'; };
    } else {
      imgEl.style.display = 'none';
    }
  }

  // 2. Métricas de Historial (4 cajas)
  const hist = item.hist;
  const actualEl = document.getElementById('solotodoStatActual');
  const minEl = document.getElementById('solotodoStatMin');
  const avgEl = document.getElementById('solotodoStatAvg');
  const maxEl = document.getElementById('solotodoStatMax');
  const obsEl = document.getElementById('solotodoStatObs');

  if (actualEl) actualEl.textContent = formatCLP(item.precioMin);
  if (minEl) minEl.textContent = hist?.min ? formatCLP(hist.min) : formatCLP(item.precioMin);
  if (avgEl) avgEl.textContent = hist?.avg ? formatCLP(hist.avg) : formatCLP(item.precioMin);
  if (maxEl) maxEl.textContent = hist?.max ? formatCLP(hist.max) : formatCLP(item.precioMax);
  if (obsEl) {
    obsEl.textContent = hist?.obsCount 
      ? `Seguimiento de precios en retail durante los últimos 6 meses (${hist.obsCount} registros)`
      : 'Precio de lista actual monitoreado en retail';
  }

  // 3. Renderizar Gráfico de Línea Chart.js
  renderDetailChart(item);

  // 4. Panel Derecho: "Elige tu tienda" (SoloTodo Screenshot 2)
  renderStoreComparisonList(item);

  // 5. Botón de Cotizar en Calculadora
  const btnCotizar = document.getElementById('btnSolotodoCotizar');
  if (btnCotizar) {
    btnCotizar.onclick = () => {
      cotizarEnCalculadora(item.categoria);
      const bsModal = bootstrap.Modal.getInstance(modalEl);
      if (bsModal) bsModal.hide();
    };
  }

  // Mostrar modal de Bootstrap
  if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
    const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
    bsModal.show();
  }
}

/**
 * Renderiza el gráfico de evolución de precio para el modal
 */
function renderDetailChart(item) {
  const canvas = document.getElementById('chartSolotodoHistorial');
  if (!canvas || typeof Chart === 'undefined') return;

  const ctx = canvas.getContext('2d');
  if (chartModalInstance) {
    chartModalInstance.destroy();
  }

  const hist = item.hist;
  let labels = [];
  let dataPrices = [];

  if (hist?.pts && hist.pts.length > 0) {
    labels = hist.pts.map(p => {
      const d = new Date(p[0] + 'T00:00:00');
      return d.toLocaleDateString('es-CL', { month: 'short', day: 'numeric' });
    });
    dataPrices = hist.pts.map(p => p[1]);
  } else {
    // Fallback: punto único con el precio actual
    labels = ['Hoy'];
    dataPrices = [item.precioMin];
  }

  chartModalInstance = new Chart(ctx, {
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
        pointRadius: labels.length > 15 ? 2 : 4,
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
          ticks: { color: '#9d98b5', maxTicksLimit: 6 },
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

/**
 * Renderiza la lista comparativa "Elige tu tienda" (SoloTodo Screenshot 2)
 */
function renderStoreComparisonList(item) {
  const storeListEl = document.getElementById('solotodoStoreList');
  if (!storeListEl) return;

  const variants = item.storeVariants;
  const bestPrice = item.precioMin;

  // Tiendas que venden este producto confirmado
  const confirmedStores = variants.map(v => v.tienda);

  // Lista de tiendas confirmadas ordenadas de menor a mayor precio
  const rowsHtml = variants.map((v, idx) => {
    const isCheapest = v.precio === bestPrice;
    const diff = v.precio - bestPrice;
    const searchUrl = getStoreSearchUrl(v.tienda, v.nombre);
    const tiendaEscaped = escapeHTML(v.tienda);
    const nombreEscaped = escapeHTML(v.nombre);

    const priceDiffBadge = isCheapest
      ? `<span class="badge text-bg-success py-1 px-2">Mejor precio</span>`
      : `<span class="badge bg-secondary bg-opacity-50 text-white-50 py-1 px-2">+${formatCLP(diff)}</span>`;

    return `
      <div class="store-row p-3 rounded-3 mb-2 bg-black bg-opacity-25 border border-white-10 d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div class="d-flex align-items-center gap-3">
          <div class="store-badge-icon rounded-circle d-flex align-items-center justify-content-center fw-bold text-white shadow-sm" style="width: 36px; height: 36px; background: var(--accent-color); font-size: 0.85rem;">
            ${escapeHTML(v.tienda.substring(0, 2).toUpperCase())}
          </div>
          <div>
            <div class="text-white fw-bold">${tiendaEscaped}</div>
            <div class="text-secondary small" style="font-size: 0.75rem;">${nombreEscaped}</div>
          </div>
        </div>

        <div class="d-flex align-items-center gap-3 ms-auto">
          <div class="text-end">
            <div class="text-white fw-bold fs-6">${formatCLP(v.precio)}</div>
            ${priceDiffBadge}
          </div>
          <a href="${searchUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-primary rounded-pill px-3 store-link" data-tienda="${tiendaEscaped}" data-producto="${nombreEscaped}">
            Comprar ↗
          </a>
        </div>
      </div>
    `;
  }).join('');

  // Sugerencia para buscar en otras tiendas del retail chileno
  const otherStores = TODAS_LAS_TIENDAS.filter(s => !confirmedStores.includes(s)).slice(0, 3);
  let otherStoresHtml = '';
  if (otherStores.length > 0) {
    const storeChips = otherStores.map(s => {
      const url = getStoreSearchUrl(s, item.nombrePrincipal);
      const storeNameEscaped = escapeHTML(s);
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-secondary rounded-pill py-1 px-2" style="font-size: 0.75rem;">Buscar en ${storeNameEscaped} ↗</a>`;
    }).join(' ');

    otherStoresHtml = `
      <div class="mt-3 pt-3 border-top border-white-10">
        <div class="text-secondary small mb-2" style="font-size: 0.75rem;">¿Quieres comparar con otras tiendas?</div>
        <div class="d-flex gap-2 flex-wrap">${storeChips}</div>
      </div>
    `;
  }

  storeListEl.innerHTML = `
    <div class="mb-2 d-flex justify-content-between align-items-center">
      <span class="text-secondary small">Precios ordenados de menor a mayor</span>
      <span class="badge bg-black bg-opacity-40 text-secondary border border-white-10">${variants.length} opción(es)</span>
    </div>
    ${rowsHtml}
    ${otherStoresHtml}
  `;
}

/**
 * Función puente: Cotizar este producto en la Calculadora de Carrete
 */
function cotizarEnCalculadora(categoria) {
  // 1. Cambiar de pestaña
  const tabCalculadora = document.getElementById('tab-calculadora');
  if (tabCalculadora) {
    if (typeof bootstrap !== 'undefined' && bootstrap.Tab) {
      const bsTab = bootstrap.Tab.getOrCreateInstance(tabCalculadora);
      bsTab.show();
    } else {
      tabCalculadora.click();
    }
  }

  // 2. Preseleccionar la bebida en el grid si existe
  setTimeout(() => {
    const chk = document.querySelector(`input[type="checkbox"][value="${categoria}"]`);
    if (chk && !chk.checked) {
      chk.checked = true;
      chk.dispatchEvent(new Event('change'));
    }
    // Scroll al formulario
    const formEl = document.getElementById('carreteForm');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 150);
}

/**
 * Reset de todos los filtros a su estado inicial
 */
function resetFilters() {
  filterState.search = '';
  filterState.category = 'todos';
  filterState.store = 'todas';
  filterState.sortBy = 'minimo';

  const searchInput = document.getElementById('catalogoSearch');
  const clearBtn = document.getElementById('btnLimpiarBusqueda');
  const storeSelect = document.getElementById('catalogoFiltroTienda');
  const sortSelect = document.getElementById('catalogoSortSelect');

  if (searchInput) searchInput.value = '';
  if (clearBtn) clearBtn.classList.add('d-none');
  if (storeSelect) storeSelect.value = 'todas';
  if (sortSelect) sortSelect.value = 'minimo';

  // Actualizar pills activas
  document.querySelectorAll('.solotodo-cat-pill').forEach(pill => {
    if (pill.dataset.cat === 'todos') {
      pill.classList.add('active');
    } else {
      pill.classList.remove('active');
    }
  });

  renderCatalog();
}

/**
 * Configura todos los listeners de eventos para interactividad
 */
function setupCatalogListeners() {
  // 1. Input de Búsqueda con debounce
  const searchInput = document.getElementById('catalogoSearch');
  const clearBtn = document.getElementById('btnLimpiarBusqueda');
  let searchTimer = null;

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const val = e.target.value;
      if (clearBtn) {
        if (val.length > 0) clearBtn.classList.remove('d-none');
        else clearBtn.classList.add('d-none');
      }

      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        filterState.search = val;
        renderCatalog();
        if (val.trim().length > 2) {
          registrarEventoTelemetria('vitrina_busqueda', { query: val.trim() });
        }
      }, 250);
    });
  }

  // 2. Botón limpiar búsqueda
  if (clearBtn && searchInput) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearBtn.classList.add('d-none');
      filterState.search = '';
      renderCatalog();
      searchInput.focus();
    });
  }

  // 3. Category pills
  document.querySelectorAll('.solotodo-cat-pill').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.solotodo-cat-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterState.category = btn.dataset.cat || 'todos';
      renderCatalog();
    });
  });

  // 4. Filtro por Tienda
  const storeSelect = document.getElementById('catalogoFiltroTienda');
  if (storeSelect) {
    storeSelect.addEventListener('change', (e) => {
      filterState.store = e.target.value;
      renderCatalog();
    });
  }

  // 5. Ordenamiento
  const sortSelect = document.getElementById('catalogoSortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      filterState.sortBy = e.target.value;
      renderCatalog();
    });
  }

  // 6. Click en Tarjetas para abrir Modal Detalle (Delegación de eventos)
  const catalogGrid = document.getElementById('catalogoGrid');
  if (catalogGrid) {
    catalogGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.solotodo-card');
      if (card && card.dataset.groupId) {
        openProductDetail(card.dataset.groupId);
      }
    });
  }
}