# 🐛 BUG FIX: Builder Automático - Problemas de Reinicio y Bebidas Omitidas

**Problemas Identificados:**
1. ❌ Página se reinicia al seleccionar bebidas del dropdown
2. ❌ Bebidas seleccionadas se omiten en presupuestos
3. ❌ Event listeners no funcionan correctamente

---

## 🔍 CAUSA RAÍZ

### Problema 1: Reinicio de Página

**Causa:** El dropdown de Bootstrap NO previene el default del evento de forma correcta.

**Localización:** `script.js` línea 1291

```javascript
// ❌ ACTUAL (INCORRECTO)
document.addEventListener("change", function(event) {
  if (event.target.classList.contains("bebida-check")) {
    actualizarTextoDropdownBebidas();
    renderBudgetSliders();
  }
});
```

El `addEventListener` no tiene `e.preventDefault()` en el label del checkbox, así que Bootstrap interpreta como submit.

---

### Problema 2: Bebidas Omitidas en Presupuesto

**Causa:** `getSelectedDrinks()` selecciona valores del checkbox, pero `buildRequirements()` no está mapeando correctamente a `OPCIONES_CONSUMO`.

**Localización:** `script.js` línea 324

```javascript
// ❌ POSIBLE PROBLEMA
function getSelectedDrinks() {
  return Array.from(document.querySelectorAll(".bebida-check:checked"))
    .map(input => input.value);  // ← Devuelve IDs del JSON (ej: "piscola", "aperol")
}
```

Pero `buildRequirements()` espera claves de `OPCIONES_CONSUMO` que pueden no existir si:
- La bebida no se agregó correctamente a `OPCIONES_CONSUMO`
- El JSON no tiene `displayName`
- Los IDs no coinciden

---

## ✅ SOLUCIÓN

### FIX 1: Prevenir Reload del Dropdown (CRÍTICO)

**Ubicación:** `script.js` línea ~1291

**Reemplazar:**

```javascript
// ❌ ANTES
document.addEventListener("change", function(event) {
  if (event.target.classList.contains("bebida-check")) {
    actualizarTextoDropdownBebidas();
    renderBudgetSliders();
  }
});
```

**Con:**

```javascript
// ✅ DESPUÉS
document.addEventListener("change", function(event) {
  if (event.target.classList.contains("bebida-check")) {
    // Prevenir comportamiento default (importante para dropdowns)
    event.preventDefault?.();
    
    console.log(`✅ Bebida ${event.target.value} - ${event.target.checked ? 'seleccionada' : 'deseleccionada'}`);
    
    actualizarTextoDropdownBebidas();
    renderBudgetSliders();
    
    // NO llamar a submit aquí
    return false;
  }
});
```

---

### FIX 2: Validar que Checkboxes se Generan Correctamente

**Ubicación:** `script.js` línea ~208

**Verificar que `generarCheckboxesDinámicos()` tenga los ID correctos:**

```javascript
// ✅ VERIFICAR - Buscar esta función
function generarCheckboxesDinámicos() {
  const dropdownMenu = document.querySelector('.dropdown-menu[aria-labelledby="bebidasDropdown"]');
  
  if (!dropdownMenu) {
    console.error(`❌ Dropdown menu no encontrado`);
    return;
  }

  dropdownMenu.innerHTML = '';

  const bebidas = {
    ...Object.entries(CATEGORIAS_JSON)
      .filter(([_, config]) => config.esSeleccionable !== false)
      .reduce((acc, [key, config]) => ({...acc, [key]: config}), {}),
    ...COMBINACIONES_ESPECIALES_JSON
  };

  console.log(`🔲 Generando ${Object.keys(bebidas).length} checkboxes...`);
  console.log(`📋 Bebidas a generar:`, Object.keys(bebidas)); // ← DEBUG

  for (const [key, config] of Object.entries(bebidas)) {
    const checkId = `chk${key.charAt(0).toUpperCase()}${key.slice(1).replace(/_/g, '')}`;
    
    const checkbox = document.createElement('div');
    checkbox.className = 'form-check mb-2';
    checkbox.innerHTML = `
      <input class="form-check-input bebida-check" type="checkbox" value="${key}" id="${checkId}">
      <label class="form-check-label" for="${checkId}">${config.displayName || config.nombre}</label>
    `;
    dropdownMenu.appendChild(checkbox);
    
    console.log(`  ✓ ${key} → ${config.displayName || config.nombre}`); // ← DEBUG
  }

  console.log(`✅ Checkboxes generados`);
}
```

---

### FIX 3: Validar `getSelectedDrinks()` Retorna Correctamente

**Ubicación:** `script.js` línea ~324

**Reemplazar:**

```javascript
// ❌ ANTES (incompleto)
function getSelectedDrinks() {
  return Array.from(document.querySelectorAll(".bebida-check:checked"))
    .map(input => input.value);
}
```

**Con:**

```javascript
// ✅ DESPUÉS (con validación)
function getSelectedDrinks() {
  const selected = Array.from(document.querySelectorAll(".bebida-check:checked"))
    .map(input => input.value)
    .filter(key => OPCIONES_CONSUMO[key]); // ← Validar que existan en OPCIONES_CONSUMO

  console.log(`📊 Bebidas seleccionadas:`, selected); // ← DEBUG
  console.log(`   Disponibles en OPCIONES_CONSUMO:`, Object.keys(OPCIONES_CONSUMO)); // ← DEBUG

  return selected;
}
```

---

### FIX 4: Validar `buildRequirements()` Procesa Todas las Bebidas

**Ubicación:** Busca `function buildRequirements` (alrededor de línea 800-900)

**Verificar que el bucle procesa TODAS las bebidas:**

```javascript
function buildRequirements(selectedDrinks, people, mode, budget, budgetSplit) {
  if (!OPCIONES_CONSUMO || Object.keys(OPCIONES_CONSUMO).length === 0) {
    console.error(`❌ OPCIONES_CONSUMO vacío o no inicializado`);
    console.log(`OPCIONES_CONSUMO actual:`, OPCIONES_CONSUMO);
    return [];
  }

  const requirements = [];
  
  console.log(`\n🔧 buildRequirements() - Procesando ${selectedDrinks.length} bebidas`);

  for (const drink of selectedDrinks) {
    if (!OPCIONES_CONSUMO[drink]) {
      console.warn(`⚠️ Bebida "${drink}" NO EXISTE en OPCIONES_CONSUMO`);
      console.log(`   Disponibles:`, Object.keys(OPCIONES_CONSUMO));
      continue; // ← SALTAR esta bebida
    }

    const option = OPCIONES_CONSUMO[drink];
    const consume = CONSUMOS[mode];

    console.log(`  ✓ Procesando: ${drink} (grupo: ${option.grupo})`);

    // Aquí va la lógica de calcular requerimientos...
    // (el resto del código que ya existe)
  }

  console.log(`📊 Requirements generados:`, requirements.length, requirements);
  return requirements;
}
```

---

### FIX 5: Agregar DEBUG al Form Submit

**Ubicación:** `script.js` línea ~1309

**Reemplazar el submit handler:**

```javascript
// ✅ MEJORADO CON DEBUG
form.addEventListener("submit", async function (e) {
  e.preventDefault();
  console.log(`\n🚀 Form Submit - Iniciando cálculo de presupuesto`);

  const people = parseInt(document.getElementById("personas").value, 10);
  const aporte = parseInt(document.getElementById("aporte").value, 10);
  const mode = document.getElementById("modo").value;
  const selectedDrinks = getSelectedDrinks();

  console.log(`📊 Parámetros del formulario:`);
  console.log(`   Personas: ${people}`);
  console.log(`   Aporte: ${aporte}`);
  console.log(`   Modo: ${mode}`);
  console.log(`   Bebidas seleccionadas: ${selectedDrinks.length}`);
  console.log(`   Bebidas: [${selectedDrinks.join(', ')}]`);

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

  console.log(`💰 Presupuesto total: ${formatCLP(budget)}`);
  console.log(`   Split: ${budgetSplit}`);
  console.log(`   Split total: ${budgetSplitTotal}%`);

  if (budgetSplitTotal !== 100) {
    alert("El reparto del presupuesto debe sumar 100%.");
    return;
  }

  console.log(`🔄 Generando requirements...`);
  const rawRequirements = buildRequirements(selectedDrinks, people, mode, budget, budgetSplit);
  const requirements = mergeRequirementsByCategoria(rawRequirements);

  console.log(`✅ Requirements finales:`, requirements.length, requirements);

  // ... resto del código
});
```

---

## 📝 PASOS PARA APLICAR LOS FIXES

### Paso 1: Abrir `javascript/script.js`

### Paso 2: Encontrar y Reemplazar Cada Fix

1. **FIX 1** (línea ~1291): Cambiar event listener del change
2. **FIX 2** (línea ~208): Agregar console.logs a `generarCheckboxesDinámicos()`
3. **FIX 3** (línea ~324): Mejorar `getSelectedDrinks()`
4. **FIX 4** (línea ~800-900): Agregar validación a `buildRequirements()`
5. **FIX 5** (línea ~1309): Mejorar form submit con debug

### Paso 3: Probar en Browser

```
1. F12 → Console
2. Seleccionar bebidas del dropdown
3. Ver logs (no debe haber errores)
4. Llenar formulario
5. Click "Calcular"
6. Ver que todas las bebidas aparecen en presupuesto
```

**Expected Console Output:**

```
📥 Configuración cargada desde productos.json
   📊 Categorías: 11
   🔗 Combinaciones: 4
📦 OPCIONES_CONSUMO construidas desde JSON: 15 opciones
🔲 Generando 15 checkboxes...
📋 Bebidas a generar: ['piscola', 'cerveza', 'vino', 'aperol', ...]
  ✓ piscola → Piscola
  ✓ cerveza → Cerveza
  ...
✅ Checkboxes generados

✅ Bebida piscola - seleccionada
📊 Bebidas seleccionadas: ['piscola']
   Disponibles en OPCIONES_CONSUMO: ['piscola', 'cerveza', 'vino', ...]

🚀 Form Submit - Iniciando cálculo de presupuesto
📊 Parámetros del formulario:
   Personas: 10
   Aporte: 5000
   Modo: pongamosle
   Bebidas seleccionadas: 1
   Bebidas: [piscola]
💰 Presupuesto total: $50.000
   Split: {"piscola": 100}
   Split total: 100%
🔄 Generando requirements...
✅ Requirements finales: [...bebidas procesadas]
```

---

## 🔧 SI SEGUIRÁ FALLANDO

Si después de estos fixes aún tienes problemas:

1. **Revisa la consola** (F12) para todos los `console.log` que agregamos
2. **Verifica que `OPCIONES_CONSUMO` esté lleno** después de `inicializarApp()`
3. **Comprueba que `productos.json` tenga todas las bebidas** con `esSeleccionable: true`
4. **Revisa que el JSON no tenga caracteres especiales** en los IDs de categorías

---

## 📋 CHECKLIST DE VALIDACIÓN

- [ ] Selecciono bebida → NO reinicia página ✅
- [ ] Selecciono múltiples bebidas → Sliders se generan correctamente ✅
- [ ] Click en "Calcular" → Procesa todas las bebidas ✅
- [ ] Console NO muestra errores ✅
- [ ] Presupuesto incluye TODAS las bebidas seleccionadas ✅

