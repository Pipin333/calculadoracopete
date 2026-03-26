// ===============================
// CONFIG / REGLAS DE CONSUMO
// ===============================
const CONSUMOS = {

  previa: {
    cervezaMlPorPersona: 500,   // 2 x 330cc
    destiladoMlPorPersona: 100,
    bebidaFactor: 0.75,
    hieloBolsasPorPersona: 1/16
    },
  trabajo: {
    cervezaMlPorPersona: 660,   // 2 x 330cc
    destiladoMlPorPersona: 120,
    bebidaFactor: 1.0,
    hieloBolsasPorPersona: 1/12
  },
  pongamosle: {
    cervezaMlPorPersona: 990,   // 3 x 330cc
    destiladoMlPorPersona: 200,
    bebidaFactor: 1.0,
    hieloBolsasPorPersona: 1/10
  },
  modo18: {
    cervezaMlPorPersona: 1650,  // 5 x 330cc
    destiladoMlPorPersona: 300,
    bebidaFactor: 1.2,
    hieloBolsasPorPersona: 1/8
  }
};

const PENALIZACION_POR_TIENDA_EXTRA = 2000;

// ===============================
// API MOCK
// ===============================
const mockProducts = [
  { id: 1, categoria: "cerveza", nombre: "Cerveza Lager lata 470ml", tienda: "Lider", precio: 1000, unidades: 1, volumenMlUnidad: 470 },
  { id: 2, categoria: "cerveza", nombre: "Cerveza Lager six pack 6x350ml", tienda: "Lider", precio: 6200, unidades: 6, volumenMlUnidad: 350 },
  { id: 3, categoria: "cerveza", nombre: "Cerveza Lager maletín 12x350ml", tienda: "Lider", precio: 9490, unidades: 12, volumenMlUnidad: 350 },

  { id: 4, categoria: "cerveza", nombre: "Cerveza Lager lata 710cc", tienda: "Jumbo", precio: 1500, unidades: 1, volumenMlUnidad: 710 },
  { id: 5, categoria: "cerveza", nombre: "Cerveza Lager six pack 6x470ml", tienda: "Jumbo", precio: 5990, unidades: 6, volumenMlUnidad: 470 },
  { id: 6, categoria: "cerveza", nombre: "Cerveza Lager caja 24x330cc", tienda: "Jumbo", precio: 24990, unidades: 24, volumenMlUnidad: 330 },

  { id: 7, categoria: "cerveza", nombre: "Cerveza Lager botellín 660cc", tienda: "Unimarc", precio: 1000, unidades: 1, volumenMlUnidad: 660 },
  { id: 8, categoria: "cerveza", nombre: "Cerveza Lager maletín 12x330cc", tienda: "Unimarc", precio: 10990, unidades: 12, volumenMlUnidad: 330 },

  { id: 20, categoria: "piscola", nombre: "Pisco 750ml", tienda: "Lider", precio: 5990, unidades: 1, volumenMlUnidad: 750 },
  { id: 21, categoria: "piscola", nombre: "Pisco 1L", tienda: "Lider", precio: 6990, unidades: 1, volumenMlUnidad: 1000 },
  { id: 22, categoria: "piscola", nombre: "Pisco 1.5L", tienda: "Lider", precio: 8490, unidades: 1, volumenMlUnidad: 1500 },

  { id: 23, categoria: "piscola", nombre: "Pisco 750ml", tienda: "Jumbo", precio: 5500, unidades: 1, volumenMlUnidad: 750 },
  { id: 24, categoria: "piscola", nombre: "Pisco 1L", tienda: "Jumbo", precio: 7490, unidades: 1, volumenMlUnidad: 1000 },
  { id: 25, categoria: "piscola", nombre: "Pisco 1.5L", tienda: "Jumbo", precio: 8450, unidades: 1, volumenMlUnidad: 1500 },

  { id: 30, categoria: "vodka", nombre: "Vodka 750ml", tienda: "Lider", precio: 7490, unidades: 1, volumenMlUnidad: 750 },
  { id: 31, categoria: "vodka", nombre: "Vodka 1L", tienda: "Jumbo", precio: 9990, unidades: 1, volumenMlUnidad: 1000 },
  { id: 32, categoria: "vodka", nombre: "Vodka 750ml", tienda: "Unimarc", precio: 7890, unidades: 1, volumenMlUnidad: 750 },

  { id: 40, categoria: "ron", nombre: "Ron 750ml", tienda: "Lider", precio: 7290, unidades: 1, volumenMlUnidad: 750 },
  { id: 41, categoria: "ron", nombre: "Ron 1L", tienda: "Jumbo", precio: 9890, unidades: 1, volumenMlUnidad: 1000 },
  { id: 42, categoria: "ron", nombre: "Ron 750ml", tienda: "Unimarc", precio: 7590, unidades: 1, volumenMlUnidad: 750 },

  { id: 50, categoria: "bebida", nombre: "Bebida cola 1.5L", tienda: "Lider", precio: 1990, unidades: 1, volumenMlUnidad: 1500 },
  { id: 51, categoria: "bebida", nombre: "Bebida cola 2L", tienda: "Lider", precio: 2390, unidades: 1, volumenMlUnidad: 2000 },
  { id: 52, categoria: "bebida", nombre: "Bebida cola 3L", tienda: "Lider", precio: 2890, unidades: 1, volumenMlUnidad: 3000 },

  { id: 53, categoria: "bebida", nombre: "Bebida cola 1.5L", tienda: "Jumbo", precio: 1890, unidades: 1, volumenMlUnidad: 1500 },
  { id: 54, categoria: "bebida", nombre: "Bebida cola 2L", tienda: "Jumbo", precio: 2490, unidades: 1, volumenMlUnidad: 2000 },
  { id: 55, categoria: "bebida", nombre: "Bebida cola 3L", tienda: "Jumbo", precio: 3090, unidades: 1, volumenMlUnidad: 3000 },

  { id: 54, categoria: "bebida", nombre: "Bebida cola 1.5L", tienda: "Unimarc", precio: 2090, unidades: 1, volumenMlUnidad: 1500 },
  { id: 55, categoria: "bebida", nombre: "Bebida cola 3L", tienda: "Unimarc", precio: 2600, unidades: 1, volumenMlUnidad: 3000 },

  { id: 60, categoria: "hielo", nombre: "Hielo 2kg", tienda: "Lider", precio: 1990, unidades: 1, volumenMlUnidad: 2000 },
  { id: 61, categoria: "hielo", nombre: "Hielo 2kg", tienda: "Jumbo", precio: 1790, unidades: 1, volumenMlUnidad: 2000 },
  { id: 62, categoria: "hielo", nombre: "Hielo 2kg", tienda: "Unimarc", precio: 2190, unidades: 1, volumenMlUnidad: 2000 }
];

const productApi = {
  async getProductsByCategory(category) {
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
  return "Modo 18";
}

function getDrinkLabel(drink) {
  if (drink === "cerveza") return "Cerveza";
  if (drink === "piscola") return "Piscola";
  if (drink === "vodka") return "Vodka + bebida";
  if (drink === "ron") return "Ron + bebida";
  return drink;
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
          <div class="d-flex justify-content-between align-items-center mb-2">
            <label for="slider_${drink}" class="form-label mb-0">${getDrinkLabel(drink)}</label>
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
  
    updateBudgetSplitState();
  }

  function getBudgetControls() {
    return Array.from(document.querySelectorAll(".budget-slider")).map(slider => {
      const drink = slider.dataset.drink;
      const input = document.getElementById(`input_${drink}`);
      return { drink, slider, input };
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
  
  function rebalanceFromChangedDrink(changedDrink, newValue) {
    const controls = getBudgetControls();
    const others = controls.filter(c => c.drink !== changedDrink);
  
    newValue = Math.max(0, Math.min(100, Math.round(newValue)));
  
    if (others.length === 0) {
      syncControlValue(changedDrink, 100);
      updateBudgetSplitState();
      return;
    }
  
    const remaining = 100 - newValue;
    const currentOthersTotal = others.reduce((sum, c) => sum + (parseInt(c.slider.value, 10) || 0), 0);
  
    syncControlValue(changedDrink, newValue);
  
    if (currentOthersTotal <= 0) {
      const base = Math.floor(remaining / others.length);
      let extra = remaining - base * others.length;
  
      others.forEach(c => {
        const value = base + (extra > 0 ? 1 : 0);
        if (extra > 0) extra--;
        syncControlValue(c.drink, value);
      });
  
      updateBudgetSplitState();
      return;
    }
  
    let assigned = 0;
  
    others.forEach((c, index) => {
      let value;
  
      if (index === others.length - 1) {
        value = remaining - assigned;
      } else {
        value = Math.round(((parseInt(c.slider.value, 10) || 0) / currentOthersTotal) * remaining);
        assigned += value;
      }
  
      syncControlValue(c.drink, Math.max(0, value));
    });
  
    normalizeBudgetSplit();
  }
  
  function normalizeBudgetSplit() {
    const controls = getBudgetControls();
    let total = controls.reduce((sum, c) => sum + (parseInt(c.slider.value, 10) || 0), 0);
  
    if (controls.length === 0) return;
  
    if (controls.length === 1) {
      syncControlValue(controls[0].drink, 100);
      updateBudgetSplitState();
      return;
    }
  
    if (total === 100) {
      updateBudgetSplitState();
      return;
    }
  
    let diff = 100 - total;
  
    for (let i = controls.length - 1; i >= 0 && diff !== 0; i--) {
      const current = parseInt(controls[i].slider.value, 10) || 0;
      let next = current + diff;
  
      if (next < 0) next = 0;
      if (next > 100) next = 100;
  
      diff -= (next - current);
      syncControlValue(controls[i].drink, next);
    }
  
    total = getBudgetSplitTotal();
  
    if (total !== 100) {
      const first = controls[0];
      syncControlValue(first.drink, (parseInt(first.slider.value, 10) || 0) + (100 - total));
    }
  
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
  const requirements = [];

  for (const drink of selectedDrinks) {
    const porcentaje = budgetSplit[drink] || 0;
    const subBudget = budget * (porcentaje / 100);

    if (drink === "cerveza") {
      requirements.push({
        categoria: "cerveza",
        nombre: "Cerveza",
        requiredMl: Math.ceil(people * rules.cervezaMlPorPersona),
        budget: subBudget
      });
    } else {
      const destiladoMl = Math.ceil(people * rules.destiladoMlPorPersona);
      const bebidaMl = Math.ceil(destiladoMl * 2 * rules.bebidaFactor);
      const hieloBolsas = Math.max(1, Math.ceil(people * rules.hieloBolsasPorPersona));

      requirements.push({
        categoria: drink,
        nombre: drink === "piscola" ? "Pisco" : drink === "vodka" ? "Vodka" : "Ron",
        requiredMl: destiladoMl,
        budget: subBudget * 0.7
      });

      requirements.push({
        categoria: "bebida",
        nombre: "Bebida",
        requiredMl: bebidaMl,
        budget: subBudget * 0.2
      });

      requirements.push({
        categoria: "hielo",
        nombre: "Hielo",
        requiredMl: hieloBolsas * 2000,
        budget: subBudget * 0.1
      });
    }
  }

  return mergeRequirementsByCategory(requirements);
}

function mergeRequirementsByCategory(requirements) {
  const map = new Map();

  for (const item of requirements) {
    if (!map.has(item.categoria)) {
      map.set(item.categoria, { ...item });
    } else {
      const current = map.get(item.categoria);
      current.requiredMl += item.requiredMl;
      current.budget = (current.budget || 0) + (item.budget || 0);
    }
  }

  return Array.from(map.values());
}

// ===============================
// OPTIMIZACIÓN SIMPLE POR CATEGORÍA
// ===============================
function findCheapestCombination(products, requiredMl) {
  if (!products || products.length === 0) return null;

  const maxVolume = Math.max(...products.map(p => p.volumenTotalMl));
  const upperBound = requiredMl + maxVolume * 2;

  const dp = Array(upperBound + 1).fill(null);
  dp[0] = { cost: 0, items: [] };

  for (let volume = 0; volume <= upperBound; volume++) {
    if (!dp[volume]) continue;

    for (const product of products) {
      const nextVolume = Math.min(upperBound, volume + product.volumenTotalMl);
      const nextCost = dp[volume].cost + product.precio;
      const nextItems = [...dp[volume].items, product];

      if (!dp[nextVolume] || nextCost < dp[nextVolume].cost) {
        dp[nextVolume] = {
          cost: nextCost,
          items: nextItems
        };
      }
    }
  }

  let best = null;
  for (let volume = requiredMl; volume <= upperBound; volume++) {
    if (!dp[volume]) continue;
    if (!best || dp[volume].cost < best.cost) {
      best = {
        totalVolume: volume,
        totalCost: dp[volume].cost,
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

// ===============================
// ESTRATEGIA 1: MULTI-TIENDA
// ===============================
async function buildMultiStorePlan(requirements) {
  const details = [];
  let total = 0;
  const allItems = [];

  for (const req of requirements) {
    const products = await productApi.getProductsByCategory(req.categoria);
    const best = findCheapestCombination(products, req.requiredMl);

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

  const stores = getUniqueStores(allItems);
  const adjustedTotal = total + Math.max(0, stores.length - 1) * PENALIZACION_POR_TIENDA_EXTRA;

  return {
    ok: true,
    total,
    adjustedTotal,
    stores,
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

      const best = findCheapestCombination(products, req.requiredMl);

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

  const requirements = buildRequirements(selectedDrinks, people, mode, budget, budgetSplit);

  const multiPlan = await buildMultiStorePlan(requirements);
  const singlePlan = await buildSingleStorePlan(requirements);

  renderPlan(listaMultiTienda, multiPlan);
  renderPlan(listaTiendaUnica, singlePlan);

  if (multiPlan.ok) {
    totalMultiEl.textContent = `${formatCLP(multiPlan.total)} + penalización heurística ${formatCLP(Math.max(0, multiPlan.stores.length - 1) * PENALIZACION_POR_TIENDA_EXTRA)} = ${formatCLP(multiPlan.adjustedTotal)}`;
    detalleTiendasMulti.textContent = `Tiendas involucradas: ${multiPlan.stores.join(", ")}`;
    saldoMultiEl.textContent = formatCLP(budget - multiPlan.total);
  } else {
    totalMultiEl.textContent = "No disponible";
    detalleTiendasMulti.textContent = multiPlan.reason;
    saldoMultiEl.textContent = "—";
  }

  if (singlePlan.ok) {
    totalUnicaEl.textContent = formatCLP(singlePlan.total);
    detalleTiendaUnica.textContent = `Tienda sugerida: ${singlePlan.store}`;
    saldoUnicaEl.textContent = formatCLP(budget - singlePlan.total);
  } else {
    totalUnicaEl.textContent = "No disponible";
    detalleTiendaUnica.textContent = singlePlan.reason;
    saldoUnicaEl.textContent = "—";
  }

  renderBudgetState(budget, multiPlan, singlePlan);

  presupuestoTotalEl.textContent = formatCLP(budget);
  resumen.textContent = `${people} persona(s) · ${selectedDrinks.map(getDrinkLabel).join(", ")} · ${getModeLabel(mode)}`;

  resultado.classList.remove("d-none");
});
