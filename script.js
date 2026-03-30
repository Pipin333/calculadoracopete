/**
 * CALCULADORA DE PRESUPUESTO PARA CARRETES - CHILE
 * 
 * Versión: Pro Anfitrión (Septiembre 2026)
 * Optimizado para eventos tipo "Parcela/Patota" con clima cálido
 * 
 * AJUSTES PRINCIPALES:
 * - Consumos calibrados para alta rotación y visicooler/refri secundario
 * - Factor energética: 2.75 (ideal para latas 250ml vs destilados 100ml)
 * - Hielo: SIEMPRE Math.ceil() (crítico en clima caluroso)
 * - Preferencia: Botellas grandes 2.5L/3L con bonus para "concho" del día siguiente
 * - Tienda única: Penalización FUERTE (50) para forzar logística simplificada
 * - Packs vs sueltas: Penalización MUY FUERTE (400) para evitar compras de novato
 */

// ===============================
// CONFIG / REGLAS DE CONSUMO
// ===============================
const CONSUMOS = {
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
    cervezaMlPorPersona: 1700,     // Estilo parcela/patota: +50% vs trabajo
    destiladoMlPorPersona: 250,    // +40% vs trabajo 
    bebidaFactor: 2.0,            // Piscola estándar
    hieloBolsasPorPersona: 1 / 4  // 1 bolsa de 2kg cada 4 personas (crítico en septiembre/calor)
  },
  modo18: {
    cervezaMlPorPersona: 3000,     // Basado en rotación de 200 unidades
    destiladoMlPorPersona: 400,     // +60% vs pongámosle (mayor protagonismo)
    bebidaFactor: 2.5,             // Energética: ideal para latas de 250ml
    hieloBolsasPorPersona: 1 / 3   // 1 bolsa de 2kg cada 3 personas (crítico en jornada larga)
  },
  proyectox: {
    cervezaMlPorPersona: 4500,     // EXTREMO: parcela de 3+ días sin freno
    destiladoMlPorPersona: 600,     // +50% vs modo18 (todo el tiempo destilado disponible)
    bebidaFactor: 3.0,             // MÁXIMO: energética + bebida + vino
    hieloBolsasPorPersona: 1 / 2   // 1 bolsa cada 2 personas (CRÍTICO: se derrite constantemente)
  }
};

const EXPONENTE_SLIDER_CONSUMO = 0.6;
const UMBRAL_ADVERTENCIA_DESTILADO_ML = 300;

// ===============================
// HEURÍSTICA
// ===============================

// A nivel de combinación por categoría
const PENALIZACION_ITEM_COMBINACION = 400; // Penaliza FUERTEMENTE comprar unidades sueltas si hay pack
const PENALIZACION_SKU_COMBINACION = 80;   // Bajo: priorizar botellas grandes (2.5L, 3L) aunque sobre
const PENALIZACION_SOBRECOMPRA_POR_LITRO = 100; // Permite excedentes marginales en bebidas

// A nivel de plan total
const PENALIZACION_TIENDA_EXTRA = 50;     // FUERTE: fuerza tienda única (logística chilena)
const PENALIZACION_SKU_PLAN = 2;
const PENALIZACION_ITEM_PLAN = 1;
const PENALIZACION_SOBRECOMPRA_PLAN_POR_LITRO = 1.5;

// ===============================
// OPCIONES DE CONSUMO
// ===============================
const OPCIONES_CONSUMO = {
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
    mixerFactor: 2.75,  // Factor energética: ideal para latas 250ml vs 100ml destilado
    llevaHielo: true
  },
  jaeger_redbull: {
    nombre: "Jäger + energética",
    grupo: "mix_simple",
    categoriaBase: "jaeger",
    llevaMixer: true,
    mixerCategoria: "redbull",
    mixerFactor: 2.75,  // Factor energética: ideal para latas 250ml vs 100ml destilado
    llevaHielo: true
  }
};

// ===============================
// API MOCK
// ===============================

const productApi = {
  _data: null,
  
  async _loadData() {
    if (this._data) return this._data;
    
    try {
      const response = await fetch('./productos.json');
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
  
  _getMockProducts(category) {
    return mockProducts
      .filter(p => p.categoria === category)
      .map(p => ({
        ...p,
        volumenTotalMl: p.unidades * p.volumenMlUnidad,
        precioPorMl: p.precio / (p.unidades * p.volumenMlUnidad)
      }));
  }
};

// ===============================
// HELPERS UI
// ===============================
function formatCLP(value) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0
  }).format(value);
}

function clearElement(element) {
  element.innerHTML = "";
}

function addLi(element, text) {
  const li = document.createElement("li");
  li.textContent = text;
  element.appendChild(li);
}

function getSelectedDrinks() {
  return Array.from(document.querySelectorAll(".bebida-check:checked"))
    .map(input => input.value);
}

function getModeLabel(mode) {
  if (mode === "previa") return "Previa";
  if (mode === "trabajo") return "Trabajo mañana";
  if (mode === "pongamosle") return "Pongámosle";
  if (mode === "modo18") return "Modo 18";
  if (mode === "modo18plus") return "Modo 18++ (Multi-día)";
  return "Modo desconocido";
}

function getDrinkLabel(drink) {
  return OPCIONES_CONSUMO[drink]?.nombre || drink;
}

function actualizarTextoDropdownBebidas() {
  const seleccionadas = Array.from(document.querySelectorAll(".bebida-check:checked"))
    .map(input => input.nextElementSibling.textContent.trim());

  const boton = document.getElementById("bebidasDropdown");

  if (seleccionadas.length === 0) {
    boton.textContent = "Selecciona uno o más tipos de copete";
  } else if (seleccionadas.length === 1) {
    boton.textContent = seleccionadas[0];
  } else {
    boton.textContent = `${seleccionadas.length} opciones seleccionadas`;
  }
}

function getPracticalLevel(score) {
  if (score <= 8) return "Muy conveniente";
  if (score <= 15) return "Conveniente";
  if (score <= 24) return "Medio pajera";
  return "Solo si quieres exprimir precio";
}

// ===============================
// SLIDERS DE PRESUPUESTO
// ===============================
function renderBudgetSliders() {
  const selected = getSelectedDrinks();
  const section = document.getElementById("budgetSplitSection");
  const container = document.getElementById("budgetSliders");

  container.innerHTML = "";

  if (selected.length === 0) {
    section.classList.add("d-none");
    return;
  }

  section.classList.remove("d-none");

  const evenValue = Math.floor(100 / selected.length);
  let remainder = 100 - evenValue * selected.length;

  selected.forEach((drink) => {
    const initialValue = evenValue + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;

    const col = document.createElement("div");
    col.className = "col-md-6";

    col.innerHTML = `
      <div class="border rounded p-3 bg-white">
        <div class="d-flex justify-content-between align-items-center mb-2 gap-2">
          <label for="slider_${drink}" class="form-label mb-0">${getDrinkLabel(drink)}</label>

          <div class="d-flex align-items-center gap-2">
            <div class="form-check form-switch m-0">
              <input
                class="form-check-input budget-lock"
                type="checkbox"
                id="lock_${drink}"
                data-drink="${drink}"
              />
              <label class="form-check-label small" for="lock_${drink}">Fijar %</label>
            </div>

            <input
              type="number"
              class="form-control form-control-sm text-end budget-input"
              id="input_${drink}"
              data-drink="${drink}"
              min="0"
              max="100"
              step="1"
              value="${initialValue}"
              style="width: 90px;"
            />
          </div>
        </div>

        <input
          type="range"
          class="form-range budget-slider"
          id="slider_${drink}"
          data-drink="${drink}"
          min="0"
          max="100"
          step="1"
          value="${initialValue}"
        />
      </div>
    `;

    container.appendChild(col);
  });

  document.querySelectorAll(".budget-slider").forEach(slider => {
    slider.addEventListener("input", handleSliderChange);
  });

  document.querySelectorAll(".budget-input").forEach(input => {
    input.addEventListener("input", handleInputChange);
    input.addEventListener("blur", normalizeBudgetSplit);
  });

  document.querySelectorAll(".budget-lock").forEach(lock => {
    lock.addEventListener("change", handleLockChange);
  });

  updateBudgetSplitState();
}

function getBudgetControls() {
  return Array.from(document.querySelectorAll(".budget-slider")).map(slider => {
    const drink = slider.dataset.drink;
    const input = document.getElementById(`input_${drink}`);
    const lock = document.getElementById(`lock_${drink}`);
    return {
      drink,
      slider,
      input,
      lock,
      locked: lock ? lock.checked : false
    };
  });
}

function getBudgetSplit() {
  const split = {};
  getBudgetControls().forEach(({ drink, slider }) => {
    split[drink] = parseInt(slider.value, 10) || 0;
  });
  return split;
}

function getBudgetSplitTotal() {
  return Object.values(getBudgetSplit()).reduce((acc, val) => acc + val, 0);
}

function syncControlValue(drink, value) {
  const slider = document.getElementById(`slider_${drink}`);
  const input = document.getElementById(`input_${drink}`);

  slider.value = value;
  input.value = value;
}

function handleLockChange(e) {
  const controls = getBudgetControls();
  const lockedControls = controls.filter(c => c.locked);

  if (lockedControls.length === controls.length) {
    e.target.checked = false;
    alert("Debe quedar al menos una opción desbloqueada para ajustar el reparto.");
    return;
  }

  normalizeBudgetSplit();
}

function rebalanceFromChangedDrink(changedDrink, newValue) {
  const controls = getBudgetControls();

  newValue = Math.max(0, Math.min(100, Math.round(newValue)));
  syncControlValue(changedDrink, newValue);

  const adjustableOthers = controls.filter(c => c.drink !== changedDrink && !c.locked);
  const lockedOthers = controls.filter(c => c.drink !== changedDrink && c.locked);

  const lockedTotal = lockedOthers.reduce(
    (sum, c) => sum + (parseInt(c.slider.value, 10) || 0),
    0
  );

  const targetRemaining = 100 - newValue - lockedTotal;

  if (targetRemaining < 0) {
    const correctedValue = Math.max(0, 100 - lockedTotal);
    syncControlValue(changedDrink, correctedValue);
    updateBudgetSplitState();
    return;
  }

  if (adjustableOthers.length === 0) {
    const correctedValue = Math.max(0, 100 - lockedTotal);
    syncControlValue(changedDrink, correctedValue);
    updateBudgetSplitState();
    return;
  }

  const currentAdjustableTotal = adjustableOthers.reduce(
    (sum, c) => sum + (parseInt(c.slider.value, 10) || 0),
    0
  );

  if (currentAdjustableTotal <= 0) {
    const base = Math.floor(targetRemaining / adjustableOthers.length);
    let extra = targetRemaining - base * adjustableOthers.length;

    adjustableOthers.forEach(c => {
      const value = base + (extra > 0 ? 1 : 0);
      if (extra > 0) extra--;
      syncControlValue(c.drink, value);
    });

    normalizeBudgetSplit();
    return;
  }

  let assigned = 0;

  adjustableOthers.forEach((c, index) => {
    let value;

    if (index === adjustableOthers.length - 1) {
      value = targetRemaining - assigned;
    } else {
      value = Math.round(
        ((parseInt(c.slider.value, 10) || 0) / currentAdjustableTotal) * targetRemaining
      );
      assigned += value;
    }

    syncControlValue(c.drink, Math.max(0, value));
  });

  normalizeBudgetSplit();
}

function normalizeBudgetSplit() {
  const controls = getBudgetControls();

  if (controls.length === 0) return;

  if (controls.length === 1) {
    syncControlValue(controls[0].drink, 100);
    updateBudgetSplitState();
    return;
  }

  const lockedControls = controls.filter(c => c.locked);
  const unlockedControls = controls.filter(c => !c.locked);

  if (unlockedControls.length === 0) {
    if (controls[controls.length - 1].lock) {
      controls[controls.length - 1].lock.checked = false;
    }
    updateBudgetSplitState();
    return;
  }

  const lockedTotal = lockedControls.reduce(
    (sum, c) => sum + (parseInt(c.slider.value, 10) || 0),
    0
  );

  let available = 100 - lockedTotal;

  if (available < 0) {
    const lastLocked = lockedControls[lockedControls.length - 1];
    const current = parseInt(lastLocked.slider.value, 10) || 0;
    syncControlValue(lastLocked.drink, Math.max(0, current + available));
    updateBudgetSplitState();
    return;
  }

  const unlockedTotal = unlockedControls.reduce(
    (sum, c) => sum + (parseInt(c.slider.value, 10) || 0),
    0
  );

  if (unlockedTotal === available) {
    updateBudgetSplitState();
    return;
  }

  if (unlockedTotal <= 0) {
    const base = Math.floor(available / unlockedControls.length);
    let extra = available - base * unlockedControls.length;

    unlockedControls.forEach(c => {
      const value = base + (extra > 0 ? 1 : 0);
      if (extra > 0) extra--;
      syncControlValue(c.drink, value);
    });

    updateBudgetSplitState();
    return;
  }

  let assigned = 0;

  unlockedControls.forEach((c, index) => {
    let value;

    if (index === unlockedControls.length - 1) {
      value = available - assigned;
    } else {
      value = Math.round(
        ((parseInt(c.slider.value, 10) || 0) / unlockedTotal) * available
      );
      assigned += value;
    }

    syncControlValue(c.drink, Math.max(0, value));
  });

  updateBudgetSplitState();
}

function handleSliderChange(e) {
  const drink = e.target.dataset.drink;
  const value = parseInt(e.target.value, 10) || 0;
  rebalanceFromChangedDrink(drink, value);
}

function handleInputChange(e) {
  const drink = e.target.dataset.drink;
  let value = parseInt(e.target.value, 10);

  if (Number.isNaN(value)) value = 0;
  value = Math.max(0, Math.min(100, value));

  rebalanceFromChangedDrink(drink, value);
}

function updateBudgetSplitState() {
  const hint = document.getElementById("budgetSplitHint");
  const total = getBudgetSplitTotal();

  if (total === 100) {
    hint.textContent = "Reparto válido. El presupuesto está distribuido al 100%.";
    hint.className = "form-text mt-2 text-success";
  } else {
    hint.textContent = `El reparto actual suma ${total}%. Debe sumar 100%.`;
    hint.className = "form-text mt-2 text-danger";
  }
}

// ===============================
// REQUERIMIENTOS
// ===============================
function buildRequirements(selectedDrinks, people, mode, budget, budgetSplit) {
  const rules = CONSUMOS[mode];

  if (!rules) {
    throw new Error(`Modo inválido recibido en buildRequirements: ${mode}`);
  }

  const requirements = [];
  const opciones = selectedDrinks
    .map(key => ({ key, ...OPCIONES_CONSUMO[key] }))
    .filter(Boolean);

  const cervezas = opciones.filter(op => op.grupo === "cerveza");
  const solos = opciones.filter(op => op.grupo === "solo");
  const mixes = opciones.filter(op => op.grupo === "mix_simple");

  if (cervezas.length > 0) {
    const beerBudget = budget * ((budgetSplit["cerveza"] || 0) / 100);

    requirements.push({
      categoria: "cerveza",
      nombre: "Cerveza",
      requiredMl: Math.ceil(people * rules.cervezaMlPorPersona),
      budget: beerBudget,
      porcentaje: budgetSplit["cerveza"] || 0
    });
  }

  const opcionesDestilado = [...solos, ...mixes];

  if (opcionesDestilado.length > 0) {
    const factorCantidadDestilados = 0.7 + 0.3 * opcionesDestilado.length;
    const factorSolo = mixes.length === 0 ? 0.85 : 1.0;

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

    const mixerMap = new Map();

    mixes.forEach(op => {
      const req = requirements.find(r => r.opcionKey === op.key);
      if (!req) return;

      const current = mixerMap.get(op.mixerCategoria) || {
        categoria: op.mixerCategoria,
        nombre:
          op.mixerCategoria === "tonica"
            ? "Tónica"
            : op.mixerCategoria === "redbull"
            ? "Energética"
            : "Bebida",
        requiredMl: 0,
        budget: 0
      };

      current.requiredMl += Math.ceil(req.requiredMl * op.mixerFactor);
      current.budget += presupuestoDestilados * 0.2 / mixes.length;

      mixerMap.set(op.mixerCategoria, current);
    });

    mixerMap.forEach(mixerReq => {
      requirements.push({
        categoria: mixerReq.categoria,
        nombre: mixerReq.nombre,
        requiredMl: mixerReq.requiredMl,
        budget: mixerReq.budget
      });
    });

    const hieloBolsas = Math.max(
      1,
      Math.ceil(people / 3),
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

function mergeRequirementsByCategoria(requirements) {
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

function getConsumptionWarnings(requirements) {
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

function getBudgetWarnings(plan) {
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
// OPTIMIZACIÓN SIMPLE POR CATEGORÍA
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

function summarizeItems(items) {
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

function getUniqueStores(items) {
  return [...new Set(items.map(item => item.tienda))];
}

function getPlanPracticalScore(plan) {
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
async function buildMultiStorePlan(requirements) {
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
async function buildSingleStorePlan(requirements) {
  const storeSet = new Set(mockProducts.map(p => p.tienda));
  let bestStorePlan = null;

  for (const store of storeSet) {
    let storeTotal = 0;
    const storeDetails = [];
    const storeItems = [];
    let valid = true;

    for (const req of requirements) {
      const products = (await productApi.getProductsByCategory(req.categoria))
        .filter(p => p.tienda === store);

      const best = findCheapestCombination(products, req.requiredMl, req.categoria);

      if (!best) {
        valid = false;
        break;
      }

      storeTotal += best.totalCost;
      storeDetails.push({
        requirement: req,
        result: best
      });
      storeItems.push(...best.items);
    }

    if (!valid) continue;

    if (!bestStorePlan || storeTotal < bestStorePlan.total) {
      bestStorePlan = {
        ok: true,
        store,
        total: storeTotal,
        details: storeDetails,
        allItems: storeItems
      };
    }
  }

  if (!bestStorePlan) {
    return {
      ok: false,
      reason: "No existe una sola tienda que cubra todo lo requerido."
    };
  }

  return bestStorePlan;
}

// ===============================
// RENDER
// ===============================
function renderPlan(listElement, plan) {
  clearElement(listElement);

  if (!plan.ok) {
    addLi(listElement, plan.reason);
    return;
  }

  for (const detail of plan.details) {
    const summarized = summarizeItems(detail.result.items);

    for (const item of summarized) {
      addLi(
        listElement,
        `${item.cantidad} x ${item.nombre} (${item.tienda}) — ${formatCLP(item.precio * item.cantidad)}`
      );
    }
  }
}

function renderBudgetState(budget, multiPlan, singlePlan) {
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

  if (cheapestValid > budget) {
    estadoEl.innerHTML = `<span class="badge text-bg-warning">Presupuesto insuficiente</span>`;
    alertaEl.textContent = `No alcanza el presupuesto. Faltan ${formatCLP(cheapestValid - budget)} para la opción más barata disponible.`;
    alertaEl.classList.remove("d-none");
    alertaEl.classList.add("alert-warning");
    return;
  }

  estadoEl.innerHTML = `<span class="badge text-bg-success">Dentro de presupuesto</span>`;
}

function ensureWarningsBox() {
  let box = document.getElementById("advertenciasConsumo");

  if (!box) {
    box = document.createElement("div");
    box.id = "advertenciasConsumo";
    box.className = "alert alert-secondary mt-3 d-none";
    resultado.appendChild(box);
  }

  return box;
}

function renderWarnings(warnings) {
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
// MAIN
// ===============================
const form = document.getElementById("carreteForm");
const resultado = document.getElementById("resultado");
const resumen = document.getElementById("resumen");
const presupuestoTotalEl = document.getElementById("presupuestoTotal");
const saldoMultiEl = document.getElementById("saldoMulti");
const saldoUnicaEl = document.getElementById("saldoUnica");
const totalMultiEl = document.getElementById("totalMulti");
const totalUnicaEl = document.getElementById("totalUnica");
const listaMultiTienda = document.getElementById("listaMultiTienda");
const listaTiendaUnica = document.getElementById("listaTiendaUnica");
const detalleTiendasMulti = document.getElementById("detalleTiendasMulti");
const detalleTiendaUnica = document.getElementById("detalleTiendaUnica");
const costoPracticoMultiEl = document.getElementById("costoPracticoMulti");
const costoPracticoUnicaEl = document.getElementById("costoPracticoUnica");

document.querySelectorAll(".bebida-check").forEach(input => {
  input.addEventListener("change", () => {
    actualizarTextoDropdownBebidas();
    renderBudgetSliders();
  });
});

actualizarTextoDropdownBebidas();
renderBudgetSliders();

form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const people = parseInt(document.getElementById("personas").value, 10);
  const aporte = parseInt(document.getElementById("aporte").value, 10);
  const mode = document.getElementById("modo").value;
  const selectedDrinks = getSelectedDrinks();

  if (!people || people < 1 || aporte < 0) {
    alert("Ingresa valores válidos.");
    return;
  }

  if (selectedDrinks.length === 0) {
    alert("Selecciona al menos un tipo de copete.");
    return;
  }

  const budget = people * aporte;
  const budgetSplit = getBudgetSplit();
  const budgetSplitTotal = getBudgetSplitTotal();

  if (budgetSplitTotal !== 100) {
    alert("El reparto del presupuesto debe sumar 100%.");
    return;
  }

  const rawRequirements = buildRequirements(selectedDrinks, people, mode, budget, budgetSplit);
  const requirements = mergeRequirementsByCategoria(rawRequirements);

  const multiPlan = await buildMultiStorePlan(requirements);
  const singlePlan = await buildSingleStorePlan(requirements);

  if (multiPlan.ok) {
    multiPlan.practicalScore = getPlanPracticalScore(multiPlan);
    multiPlan.practicalLabel = getPracticalLevel(multiPlan.practicalScore);
  }

  if (singlePlan.ok) {
    singlePlan.practicalScore = getPlanPracticalScore(singlePlan);
    singlePlan.practicalLabel = getPracticalLevel(singlePlan.practicalScore);
  }

  const consumoWarnings = getConsumptionWarnings(rawRequirements);
  const budgetWarningsMulti = getBudgetWarnings(multiPlan);

  const globalWarnings = [];
  const validPlans = [multiPlan, singlePlan].filter(p => p.ok);

  if (validPlans.length > 0) {
    const cheapestPlan = validPlans.reduce((best, current) =>
      current.total < best.total ? current : best
    );

    if (cheapestPlan.total > budget) {
      globalWarnings.push(
        "No te alcanza cómodo con esta combinación. Considera poner más plata por persona o bajarle un poco al consumo."
      );
    }
  }

  const warnings = [
    ...globalWarnings,
    ...consumoWarnings,
    ...budgetWarningsMulti
  ];

  renderPlan(listaMultiTienda, multiPlan);
  renderPlan(listaTiendaUnica, singlePlan);
  renderWarnings(warnings);

  if (multiPlan.ok) {
    totalMultiEl.textContent = formatCLP(multiPlan.total);
    detalleTiendasMulti.textContent = `Tiendas involucradas: ${multiPlan.stores.join(", ")}`;
    saldoMultiEl.textContent = formatCLP(budget - multiPlan.total);
    costoPracticoMultiEl.textContent = `${multiPlan.practicalLabel} + tu preciado tiempo`;
  } else {
    totalMultiEl.textContent = "No disponible";
    detalleTiendasMulti.textContent = multiPlan.reason;
    saldoMultiEl.textContent = "—";
    costoPracticoMultiEl.textContent = "—";
  }

  if (singlePlan.ok) {
    totalUnicaEl.textContent = formatCLP(singlePlan.total);
    detalleTiendaUnica.textContent = `Tienda sugerida: ${singlePlan.store}`;
    saldoUnicaEl.textContent = formatCLP(budget - singlePlan.total);
    costoPracticoUnicaEl.textContent = `${singlePlan.practicalLabel}`;
  } else {
    totalUnicaEl.textContent = "No disponible";
    detalleTiendaUnica.textContent = singlePlan.reason;
    saldoUnicaEl.textContent = "—";
    costoPracticoUnicaEl.textContent = "—";
  }

  renderBudgetState(budget, multiPlan, singlePlan);

  presupuestoTotalEl.textContent = formatCLP(budget);
  resumen.textContent = `${people} persona(s) · ${selectedDrinks.map(getDrinkLabel).join(", ")} · ${getModeLabel(mode)}`;

  resultado.classList.remove("d-none");
  
  // Muestra el timestamp de actualización de datos
  const timestamp = await productApi.getTimestamp();
  if (timestamp) {
    const date = new Date(timestamp);
    const fechaFormato = date.toLocaleString('es-CL', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    document.getElementById('timestamp').textContent = fechaFormato;
  }
});
