# 📋 README CONSOLIDADO - Cuánto Rinde v3.0# 🍺 Calculadora de Presupuesto para Carretes - CHILE



## 🎯 ¿Qué es?**Versión:** 2.4 (Modal Popup + Factor Estacional)  

**Última actualización:** 29 de Marzo de 2026  

**Calculadora inteligente de presupuestos para carretes en Chile** que optimiza la compra de bebidas usando programación dinámica. Calcula:**Estado:** ✅ Producción Ready  

- Cantidad exacta de cerveza, destilados e hielo**Autor:** Anfitrión Pro Algorithm

- Mejores opciones de compra (multi-tienda vs single-tienda)

- URLs cortas para compartir presupuestos entre dispositivos (Firebase)---



---## 📋 Tabla de Contenidos



## ✨ Stack Tecnológico1. [¿Qué es?](#-qué-es)

2. [Características](#-características-principales)

| Layer | Tech |3. [Documentación Complementaria](#-documentación-complementaria-new)

|-------|------|4. [Modos de Consumo](#-5-modos-de-consumo-disponibles)

| Frontend | HTML5 + Bootstrap 5 + Vanilla JavaScript (ES6 modules) |5. [Guía Rápida](#-guía-rápida-seleccionar-modo)

| Storage Primary | Firebase Realtime Database (Global) |6. [Ejemplos Prácticos](#-ejemplos-prácticos)

| Storage Fallback | localStorage (Local, 30 días) |7. [Seleccionar Modo](#-cómo-seleccionar-el-modo-correcto)

| Hosting | GitHub Pages (Free) |8. [Ajustes & Heurística](#-ajustes-realizados-v20)

| URL System | 6-8 caracteres + query params |9. [Perfil Usuario](#-perfil-anfitrión-pro)

10. [Configuración](#-configuración-de-constantes)

---11. [Changelog](#-changelog)

12. [FAQ](#-preguntas-frecuentes)

## 🏗️ Arquitectura v3.0

---

```

index.html (Formulario)## 📋 ¿Qué es?

    ↓

script.js (Algoritmo DP + UI) [importa shorturl.js]Una **calculadora inteligente** que te dice exactamente cuánto alcohol, bebida e hielo necesitas para tu carrete, según el tipo de evento y duración.

    ↓

shorturl.js (v3.0: Firebase primary + localStorage backup)### Características Principales

    ├─ guardarPresupuestoCorto() → Firebase

    └─ obtenerPresupuestoCorto() → Firebase primero, localStorage fallback✅ **5 Modos de Consumo** calibrados para eventos chilenos  

    ↓✅ **Hielo CRÍTICO** (Math.ceil) - Nunca falte  

firebase-config.js (SDK Firebase Realtime DB)✅ **Botellas Grandes Favorecidas** (3L > 1.5L)  

    ↓✅ **Tienda Única Preferida** (menos logística)  

Firebase Realtime DB (Global: presupuestos/{id}/data)✅ **Concho Productivo Permitido** (40% sobrecompra en bebidas)  

    ↓✅ **Soporte Multi-bebida** (Piscola, Roncola, Cerveza, Red Bull, etc)  

presupuesto.html (Boleta compartida) [módulo async]✅ **Presupuesto Flexible** (reparte dinero automáticamente)  

```✅ **Multi-tienda o Tienda Única** (elige la estrategia óptima)  

✅ **Factor Estacional** (v2.3) - App usable 365 días automáticamente  

---✅ **Modal Popup Responsivo** (v2.4) - Fullscreen móvil, popup tablets, modal desktop  



## 📁 Archivos---



```## 📚 Documentación Complementaria (NEW)

index.html              # Página principal + formulario

presupuesto.html        # Boleta compartida (carga async desde Firebase)### 📖 Guías de Inicio

script.js               # Core algorithm + UI (v3.0: importa shorturl)- **[RESUMEN_v24_FINAL.md](RESUMEN_v24_FINAL.md)** - Qué cambió en v2.4 (Modal Popup + Ratio)

shorturl.js             # URLs cortas v3.0 (Firebase + localStorage)- **[INDICE_DOCUMENTACION.md](INDICE_DOCUMENTACION.md)** - Índice completo de documentación

firebase-config.js      # NUEVO: Firebase SDK + funciones

presupuesto.js          # Legacy base64url (compatibilidad)### 🛠️ Documentación Técnica UI (v2.4)

productos.json          # Precios Jumbo/Tottus/Walmart- **[MODAL_CHANGES.md](MODAL_CHANGES.md)** - Cambios técnicos detallados (HTML, JS, CSS)

styles.css              # Bootstrap 5 + custom CSS- **[ANTES_DESPUES_MODAL.md](ANTES_DESPUES_MODAL.md)** - Comparativa visual Scroll vs Modal

_config.yml             # GitHub Pages config- **[VISUAL_GUIDE_MODAL.md](VISUAL_GUIDE_MODAL.md)** - Mockups ASCII por dispositivo (móvil, tablet, desktop)

README_CONSOLIDADO.md   # Este archivo (único archivo .md)

```### ✅ Testing & Validación

- **[TESTING_CHECKLIST_v24.md](TESTING_CHECKLIST_v24.md)** - Checklist exhaustivo para testing

---- **[ESTADO_FINAL_v24.md](ESTADO_FINAL_v24.md)** - Checklist de completitud y estado final



## 🚀 Cómo Usar### 📜 Historial & Changelog

- **[CHANGELOG.md](CHANGELOG.md)** - Evolución completa v1.0 → v2.4 con detalles de cada versión

### 1. Crear Presupuesto

- Abre: https://pipin333.github.io/calculadoracopete/---

- Llena formulario (personas, aporte, bebidas, modo)

- Click "Calcular"## 🚀 Cómo Funciona

- Ver 2 opciones de compra

### Paso 1: Ingresa Datos Básicos

### 2. Compartir Presupuesto (v3.0 Firebase)```

- Click "Compartir presupuesto"Personas: 20

- ✅ URL copiada (ej: presupuesto.html?id=Xm7Kb2)Presupuesto: $10.000/persona ($200.000 total)

- Comparte a otro dispositivo/personaModo: Pongámosle (sábado 4-6h)

- Datos guardados en Firebase (global)```



### 3. Ver Presupuesto Compartido### Paso 2: Elige Bebidas

- Abre URL en otro navegador/dispositivo```

- ✅ Firebase carga datos automáticamente✓ Cerveza

- Funciona sin localStorage (incognito = prueba)✓ Piscola  

✓ Roncola

---```



## 🧮 Algoritmo Core### Paso 3: Reparte Presupuesto

```

### Consumos por ModoCerveza:  50%

Piscola:  30%

| Modo | Cerveza (ml) | Destilado (ml) | Hielo (pers) |Roncola:  20%

|------|---|---|---|```

| Previa | 700 | 120 | 1/10 |

| Trabajo | 1200 | 180 | 1/8 |### Paso 4: Recibe Recomendación

| Pongámosle | 1500 | 250 | 1/4 |```

| Modo 18 | 2500 | 400 | 1/3 |TIENDA ÚNICA (Jumbo):

| Proyecto X | 3750 | 500 | 1/3 |✅ 3 packs cerveza 12×350ml = $24.000

✅ 3 botellas Pisco 1.5L = $25.000

### Penalizaciones (DP Optimization)✅ 3 botellas Coca-Cola 3L = $9.000

```✅ 5 bolsas Hielo 2kg = $10.000

TIENDA_EXTRA: 25         (multi-tienda vs single)────────────────────────

ITEM_COMBINACION: 400    (pack mixto)💰 TOTAL: $68.000 (dentro presupuesto)

SKU_COMBINACION: 80      (SKU mixto)📦 Items: 14 productos

SOBRECOMPRA_LITRO: 100   (si > consumo)🏪 Tienda: 1 sola (máxima praticidad)

```🧊 Concho: 3L bebida + 10kg hielo extra

```

### Factor Estacional (0.80-1.10x)

Ajusta automáticamente según mes/clima.---



---## 📊 5 Modos de Consumo Disponibles



## 🔄 Flujo Compartibilidad (v3.0 Solución)| Modo | Cerveza | Destilado | Bebida | Hielo | Duración | Caso |

|------|---------|-----------|--------|-------|----------|------|

### ❌ ANTES (v2.5 - Problema)| **🎉 Previa** | 700ml | 120ml | 1.5× | 1/10 | 1-2h | Pre-copete social |

```| **📊 Trabajo** | 1200ml | 180ml | 2.0× | 1/8 | 2-3h | Viernes post-oficina |

Usuario A genera presupuesto| **🎊 Pongámosle** | 1700ml | 250ml | 2.0× | 1/4 | 4-6h | Sábado sin compromisos |

  → localStorage['presupuesto_Xm7Kb2']| **🔥 Modo 18** | 3000ml | 400ml | 2.5× | 1/3 | 8-12h | Feriado largo/Jornada épica |

  → Comparte URL| **🌪️ Proyecto X** | **3750ml** | **500ml** | **2.8×** | **1/3** | **20h+/multi-día** | **Parcela sostenida ⭐** |

  → Usuario B en otro dispositivo

  → localStorage VACÍO (dispositivo diferente)---

  → ❌ PANTALLA EN BLANCO

```## 🎯 Guía Rápida: Seleccionar Modo



### ✅ AHORA (v3.0 - Solucionado)### Árbol de Decisión

```

Usuario A genera presupuesto```

  → guardarPresupuestoCorto()┌─ ¿Cuántas HORAS?

  → guardarPresupuestoFirebase() ✅ GLOBAL├─ 1-2h → PREVIA ✅

  → localStorage backup├─ 2-3h → TRABAJO MAÑANA ✅

  → Comparte URL├─ 4-6h → PONGÁMOSLE ✅

  → Usuario B en otro dispositivo├─ 8-12h → MODO 18 ✅

  → obtenerPresupuestoCorto() [ASYNC]└─ 12h+ o 2-3 DÍAS → MODO 18++ ✅

  → obtenerPresupuestoFirebase() ✅ ENCUENTRA

  → ✅ BOLETA RENDERIZADA┌─ ¿Responsabilidades mañana?

```├─ Sí (7-9 AM) → PREVIA o TRABAJO

├─ Sí (después mediodía) → PONGÁMOSLE

---└─ NO → MODO 18 o MODO 18++



## 🔥 Firebase Setup (v3.0)┌─ ¿Qué infraestructura tienes?

├─ Solo heladera → PREVIA

### Credenciales (YA CONFIGURADAS)├─ Heladera + Visicooler pequeño → TRABAJO o PONGÁMOSLE

```javascript├─ Visicooler + Refri secundaria → MODO 18

apiKey: "AIzaSyAYVQjyCGzka7tdJsqScvFg_UnYfHm9N6U"└─ Visicooler comercial + 2 refris → MODO 18++

projectId: "calculadoracopete"```

```

### Descripción Detallada de Cada Modo

### Estructura DB

```#### 1️⃣ PREVIA (1-2 horas)

presupuestos/```

├── Xm7Kb2/¿Cuándo elegir?

│   ├── data: { personas, aporte, bebidas, ... }✅ Son las 10 PM, hay que salir en 30 min a otro lado

│   ├── createdAt: "2026-03-30T18:45:00Z"✅ Vamos al cine después + disco después

│   ├── expiresAt: "2026-04-29T18:45:00Z" (30 días)✅ Queremos "pedir" algunas copas antes de la actividad real

│   └── viewCount: 5✅ Mañana hay que estar fresco (trabajo/universidad)

└── ... más presupuestos

```Consumo:

- Cerveza: 700ml/persona

### Expiración Automática- Destilado: 120ml/persona

- 30 días de inactividad → Firebase elimina- Bebida Factor: 1.5×

- `limpiarPresupuestosExpirados()` ejecuta cada 1 hora- Hielo: 1 bolsa cada 10 personas



---Infraestructura: Nevera normal de casa

Presupuesto: $3-5k CLP/persona

## 🧪 TestingConcho: NULO (todo se bebe)

Perfil: Ejecutivo, estudiante, joven profesional

### Test 1: Firebase Guardando```

```

1. Genera presupuesto#### 2️⃣ TRABAJO MAÑANA (2-3 horas)

2. Click "Compartir"```

3. Ve a: firebase.google.com → calculadoracopete → Realtime DB¿Cuándo elegir?

4. Deberías ver: presupuestos/Xm7Kb2/data✅ Es viernes después del trabajo (6-7 PM)

```✅ Lunes a jueves con colegas después de oficina

✅ Tengo que estar presentable mañana a las 9 AM

### Test 2: Otro Navegador (Incognito = localStorage limpio)✅ No quiero llegar destrozado al trabajo

```

1. Pega URL en navegador INCOGNITOConsumo:

2. ✅ Debería mostrar presupuesto- Cerveza: 1200ml/persona

3. Viene de Firebase (no localStorage)- Destilado: 180ml/persona

4. Console: "Presupuesto cargado desde Firebase"- Bebida Factor: 2.0×

```- Hielo: 1 bolsa cada 8 personas



### Test 3: Verificar FallbackInfraestructura: Heladera normal + hielo congelador

```Presupuesto: $5-8k CLP/persona

1. Modo airplane (desconectar internet)Concho: PEQUEÑO (queda algo para tomar al día siguiente)

2. Abre presupuesto en MISMO dispositivoPerfil: Oficinista, profesional, persona responsable

3. ✅ Funciona con localStorage```

4. Console: "Presupuesto cargado desde localStorage (fallback)"

```#### 3️⃣ PONGÁMOSLE (4-6 horas)

```

### Test 4: Debug¿Cuándo elegir?

```javascript✅ Es sábado, no hay nada importante hasta el domingo mediodía

// Console✅ Almuerzo/tarde con asado en casa/parcela pequeña

await mostrarEstadoSistema()✅ Carrete "de barrio" sin compromisos

✅ Clima cálido, hay sol, ganas de disfrutar

// Output:

📊 Estado del Sistema - v3.0Consumo:

🔗 Firebase: ✅ Conectado- Cerveza: 1700ml/persona

💾 localStorage: ✅ Disponible (3 presupuestos)- Destilado: 250ml/persona

🌐 URL actual: presupuesto.html?id=Xm7Kb2- Bebida Factor: 2.0×

📝 ID en URL: Xm7Kb2- Hielo: 1 bolsa cada 4 personas

```

Infraestructura: Visicooler pequeño O heladera + congelador

---Presupuesto: $10-15k CLP/persona

Concho: ÚTIL (sobra para la noche o el domingo)

## 📊 VersionesPerfil: Anfitrión social, familia en fin de semana

```

| Versión | Fecha | Cambio |

|---------|-------|--------|#### 4️⃣ MODO 18 (8-12 horas)

| **v3.0** | Marzo 2026 | ✅ Firebase Realtime (compartible global) |```

| v2.5 | Marzo 2026 | URLs cortas + GitHub Pages optimized |¿Cuándo elegir?

| v2.4 | Marzo 2026 | Modal responsivo + getRatioBudget() |✅ Feriado largo (3-4 días sin trabajo)

| v2.0 | Marzo 2026 | Factor estacional |✅ Parcela en Septiembre (clima perfecto)

| v1.0 | Marzo 2026 | Core algorithm DP |✅ Evento que empieza al mediodía y termina tarde

✅ Puede haber rotación: algunos se van, otros llegan

---

Consumo:

## 🎨 Responsive Design- Cerveza: 3000ml/persona

- Destilado: 400ml/persona

```- Bebida Factor: 2.5×

≤576px    → Fullscreen modal- Hielo: 1 bolsa cada 3 personas

577-1366px → Popup modal

≥1367px   → Standard modal (side-by-side)Infraestructura: Visicooler GRANDE + refri secundaria + 15-20 bolsas hielo

```Presupuesto: $8-12k CLP/persona

Concho: PRODUCTIVO (para mañana o próximo evento)

---Perfil: Anfitrión Pro, parcela/quinta propia

```

## 🔧 Mantenimiento

#### 5️⃣ PROYECTO X (Multi-día Sostenido) ⭐ NUEVO

### Deploy a GitHub Pages```

```bash¿Cuándo elegir?

git add .✅ Feriado largo (3+ días moderado, no extremo)

git commit -m "v3.0: Firebase"✅ Parcela en Septiembre 25-50 personas

git push origin main✅ Infraestructura normal-buena (visicooler + refri secundaria)

# Auto-deploy ✅✅ Ritmo sostenido, no "sin parar"

```✅ Presupuesto disponible ($10-15k/persona)



### Si Firebase FallaConsumo:

- App sigue funcionando con localStorage- Cerveza: 3750ml/persona (+25% vs Modo 18, NO +50%)

- Fallback elegante a local- Destilado: 500ml/persona (+25% vs Modo 18, NO +50%)

- Usuario no ve errores- Bebida Factor: 2.8× (+12% vs Modo 18)

- Hielo: 1 bolsa cada 3 personas (similar a Modo 18)

### Limpiar Presupuestos Expirados

```javascriptInfraestructura RECOMENDADA:

// Automático cada 1 hora✅ Visicooler mediano-grande (200+ litros)

// O manual en console:✅ 1-2 refris secundarias de apoyo

limpiarPresupuestosExpirados()✅ 15-20 bolsas de hielo (suficiente)

```✅ Opcional: generador si es en parcela remota



### Descargar BackupPresupuesto: $10-15k CLP/persona

```javascriptConcho: BUENO (útil para día siguiente o próximo evento)

descargarPresupuestosJSON()Perfil: Anfitrión Pro, eventos 20-50 personas, multi-día balanceado

// Descarga: presupuestos-backup-2026-03-30.json```

```

---

---

## 🔢 Ejemplos Prácticos

## 🚨 Troubleshooting

### Caso 1: Sábado de Parcela (Modo Pongámosle)

| Problema | Solución |```

|----------|----------|📍 Parcela privada en Maipo

| Presupuesto no encontrado | Verificar URL (6+ caracteres) o ha expirado (>30 días) |👥 20 personas  

| URL no se copia | HTTPS requerido (GitHub Pages = HTTPS ✅) |⏰ 3 PM - 10 PM (7 horas)

| Firebase 403 | Verificar credentials o rules `.read: true` |🌞 Clima: Calor (Septiembre)

| Lento | Internet lento → usa localStorage local |🍖 Con asado incluido



---CONSUMO REQUERIDO:

  Cerveza: 20 × 1700ml = 34L

## 📈 Roadmap  Piscola: 20 × 250ml = 5L

  Bebida: 20 × 250ml × 2.0 = 10L

### v4.0 (2-3 meses)  Hielo: ⌈20/4⌉ = 5 bolsas (10kg)

- Autenticación Google OAuth

- Historial personal de presupuestosRECOMENDACIÓN DE COMPRA (Tienda Única):

- Presupuestos favoritos  ✅ 3 packs cerveza 12×350ml = 36L (~$21,600)

  ✅ 4 botellas Pisco 1.5L = 6L (~$26,800)

### v5.0 (6 meses)  ✅ 3 botellas Coca-Cola 3L = 9L (~$7,650)

- Analytics dashboard  ✅ 5 bolsas Hielo 2kg = 10kg (~$7,950)

- Tendencias de bebidas  ────────────────────────────

- ML recommendations  💰 TOTAL: ~$63,000 CLP

  🧊 Concho: Útil para la noche siguiente

### v6.0 (12 meses)```

- Migración a Supabase PostgreSQL

- SQL queries para análisis### Caso 2: Feriado 3 Días (Proyecto X)

- Backups automáticos```

📍 Parcela mediana

---👥 30 personas

⏰ Viernes tarde → Domingo noche (48-60 horas)

## 📖 Documentación Consolidada🌞 Clima: Calor

✅ Sin compromisos lunes

Todos los archivos `.md` anteriores resumidos aquí:

CONSUMO REQUERIDO:

| Original | Contenido |  Cerveza: 30 × 3750ml = 112.5L ✅

|----------|-----------|  Destilado: 30 × 500ml = 15L ✅

| SHORTURL_DOCS.md | URLs cortas 6 caracteres, localStorage, expiración 30 días |  Bebida: 30 × 1250ml (2.8×) = 37.5L ✅

| FIREBASE_SETUP.md | Arquitectura v3.0, Firebase primary + localStorage fallback |  Hielo: ⌈30/3⌉ = 10 bolsas ✅

| BACKEND_COMPARISON.md | NoSQL vs SQL análisis (decisión: Supabase v4.0+) |

| BACKEND_SETUP_GUIDE.md | Ejemplos implementación Firebase/Supabase/PostgreSQL |RECOMENDACIÓN DE COMPRA (Tienda Única - Jumbo):

| GITHUB_PAGES_SHORTURL.md | Query params compatible con GitHub Pages |  ✅ 9-10 packs cerveza 12×330ml = 120L (~$80,000)

| PRESUPUESTOS_COMPARTIBLES.md | Flujo de compartibilidad entre dispositivos |  ✅ 10 botellas Pisco 1.5L = 15L (~$84,500)

| SHORTURL_QUICK_START.md | Inicio rápido URLs cortas |  ✅ 12-13 botellas Coca-Cola 3L = 38L (~$40,000)

| SHORTURL_CHANGELOG.md | Versiones URLs (v2.4 → v2.5) |  ✅ 10 bolsas Hielo 2kg = 20kg (~$19,900)

  ────────────────────────────

---  💰 TOTAL: ~$224,400 CLP (~$7.5k/persona)

  📦 CONCHO: BUENO (5-10L cerveza + hielo para después)

## 🎓 Conclusión  🏪 TIENDA: 1 sola (máxima practicidad)

```

**v3.0 = MVP Producción**

- ✅ Algoritmo optimizado---

- ✅ UX responsivo (Bootstrap 5)

- ✅ URLs cortas shareable## 🛠️ Ajustes Realizados (v2.0)

- ✅ Presupuestos GLOBALES (Firebase)

- ✅ Fallback elegante (Firebase + localStorage)### Parámetros de Consumo Calibrados

- ✅ Zero-cost infrastructure

Se han optimizado los valores para reflejar hábitos de consumo **reales del chileno promedio** en clima cálido (Septiembre):

**Próximo paso:** Deploy → 🚀 LIVE

| Modo | Cambio | Justificación |

---|------|--------|---------------|

| **Pongámosle** | +50% cerveza vs Trabajo | Evento alto de rotación, parrilla con calor |

**Última actualización:** 30 de Marzo 2026  | **Modo 18** | 3L cerveza, 400ml destilado | Incluye almuerzo + merienda + noche |

**Versión:** 3.0 - Firebase Edition  | **Modo 18++** | 4.5L cerveza, 600ml destilado | Multi-día sin limitaciones |

**Autor:** Pipin333  

**Repo:** https://github.com/Pipin333/calculadoracopete### Heurística de Compra Rebalanceada


| Parámetro | Anterior | Nuevo | Efecto |
|-----------|----------|-------|--------|
| PENALIZACION_ITEM_COMBINACION | 250 | **400** | Penaliza fuertemente comprar sueltas |
| PENALIZACION_SKU_COMBINACION | 100 | **80** | Favorece packs grandes aunque sobre |
| PENALIZACION_TIENDA_EXTRA | 6 | **25** | Permite elegir: single vs multi-tienda |
| PENALIZACION_SOBRECOMPRA_POR_LITRO | 120 | **100** | Permite excedentes marginales |

**Impacto:** Compra inteligente = packs grandes + tienda única + botellas 3L favorecidas

### Factor Energética Optimizado

- **mixerFactor = 2.75** para `gin_redbull` y `jaeger_redbull`
- Refleja proporción real: 100ml destilado + 275ml Red Bull (lata 250ml estándar)

### Hielo: SIEMPRE Math.ceil()

- Nunca redondea hacia abajo (es crítico)
- Mejor tener de más que de menos
- En clima cálido, el hielo se derrite constantemente

### Botellas Grandes Priorizadas

- Botella 3L: +20 puntos bonus vs 1.5L: +5 puntos
- Fórmula: `bonusBotellasGrandes = Math.max(0, (volumePromedio - 1000) / 100)`

### Sobrecompra Suave en Bebidas

- Bebidas/mixers reciben **40% de la penalización** de sobrecompra
- Permite concho útil (1-2L de bebida para el día siguiente)
- Alcohol sigue penalizado al 100%

---

## 👤 Perfil Anfitrión Pro

El usuario "Anfitrión Pro" está optimizado para:

✅ **Usuario con infraestructura:** Visicooler o refri secundaria → prioriza que sobre alcohol frío  
✅ **Mentalidad aprovechada:** Prefiere que sobre para reutilizar al día siguiente  
✅ **Logística simple:** Una sola tienda si es posible (menos viajes, menos estrés)  
✅ **Evento largo:** Clima cálido + parrilla + muchos invitados  
✅ **Mix estratégico:** Favorece packs grandes y botellas de formato 2.5L-3L  

### Heurística de Decisión Automática

**Regla 1: Packs vs Sueltas**
- Siempre elegirá el pack, aunque le sobre 10-15% volumen
- Penalización(24 sueltas) = 9600 puntos vs Penalización(1 pack) = 400 puntos

**Regla 2: Botellas Grandes**
- 3L recibe +20 puntos bonus, 1.5L recibe +5 puntos
- Latas individuales penalizadas fuertemente

**Regla 3: Tienda Única (Flexible)**
- Cada tienda extra = 25 puntos de castigo (penalización moderada)
- Plan multi-tienda es viable si es ~10-15% más barato
- **Permite elegir:** El usuario verá ambas opciones y decide según preferencia (precio vs. practicidad)

**Regla 4: Sobrecompra en Bebidas**
- Bebidas pueden sobrecomprar 20% sin castigo
- Alcohol es penalizado al 100%

---

## 🔧 Configuración de Constantes

### CONSUMOS - Reglas de Consumo por Modo

```javascript
CONSUMOS = {
  previa: {
    cervezaMlPorPersona: 700,
    destiladoMlPorPersona: 120,
    bebidaFactor: 1.5,
    hieloBolsasPorPersona: 1/10
  },
  trabajo: {
    cervezaMlPorPersona: 1200,
    destiladoMlPorPersona: 180,
    bebidaFactor: 2.0,
    hieloBolsasPorPersona: 1/8
  },
  pongamosle: {
    cervezaMlPorPersona: 1700,
    destiladoMlPorPersona: 250,
    bebidaFactor: 2.0,
    hieloBolsasPorPersona: 1/4
  },
  modo18: {
    cervezaMlPorPersona: 3000,
    destiladoMlPorPersona: 400,
    bebidaFactor: 2.5,
    hieloBolsasPorPersona: 1/3
  },
  modo18plus: {
    cervezaMlPorPersona: 4500,
    destiladoMlPorPersona: 600,
    bebidaFactor: 3.0,
    hieloBolsasPorPersona: 1/2
  }
}
```

### Penalizaciones de Combinación

- **PENALIZACION_ITEM_COMBINACION: 400** - Penaliza comprar muchas unidades sueltas
- **PENALIZACION_SKU_COMBINACION: 80** - Penaliza usar muchos productos diferentes
- **PENALIZACION_SOBRECOMPRA_POR_LITRO: 100** - Base para sobrecompra
- **PENALIZACION_TIENDA_EXTRA: 50** - Fuerza tienda única

### Penalizaciones a Nivel de Plan

- **PENALIZACION_TIENDA_EXTRA: 25** - Permite que usuario elija entre single vs multi-tienda
- **PENALIZACION_SKU_PLAN: 2** - SKUs distintos en plan total
- **PENALIZACION_ITEM_PLAN: 1** - Items totales en plan
- **PENALIZACION_SOBRECOMPRA_PLAN_POR_LITRO: 1.5** - Sobrecompra total

### Factor Energética

- **mixerFactor: 2.75** para bebidas energéticas (Red Bull)
- Aplica a: `gin_redbull`, `jaeger_redbull`

---

## 📜 Changelog - Historial de Versiones

### v2.2 (29-Mar-2026) ✅ ACTUAL
**Cambio Mayor:** Proyecto X Calibración Final

- ✅ Rebajados parámetros: 3750ml cerveza (no 4500ml), 500ml destilado (no 600ml)
- ✅ Reducido bebida factor a 2.8× (no 3.0×) - más realista
- ✅ Hielo normalizado a 1/3 bolsas (igual a Modo 18)
- ✅ Actualizado toda documentación y ejemplos prácticos
- ✅ Presupuesto reajustado: $10-15k/persona (no $12-18k)
- ✅ Mejor balance: +25% sobre Modo 18 (no +50%)
- ✅ 100% backward compatible con v2.1

**Justificación:** Proyecto X para ritmo sostenido (48-60h), no extremo. Salto de +50% era matemáticamente incorrecto para la duración propuesta.

**Matriz de Cambios:**
| Parámetro | Modo 18 | Proyecto X | Cambio |
|-----------|---------|-----------|--------|
| Cerveza | 3000ml | 3750ml | +25% |
| Destilado | 400ml | 500ml | +25% |
| Bebida Factor | 2.5× | 2.8× | +12% |
| Hielo/Persona | 1/3 | 1/3 | 0% |

### v2.1 (29-Mar-2026) ✅ ARCHIVADO
**Cambios:** Proyecto X Inicial (valores muy altos)

- Agregado `proyectox` en CONSUMOS (4500ml, 600ml - demasiado)
- Sintaxis validada pero parámetros reajustados en v2.2
- Conceptualmente correcto, pero numéricamente incorrecto

### v2.0 ✅ ARCHIVADO
**Cambios:** Pro Anfitrión Base

- Consumos optimizados para clima cálido
- Penalizaciones rebalanceadas (Tienda única = 50)
- Bonus de botellas grandes (3L favorecido)
- Sobrecompra suave en bebidas (40%)
- Factor energética = 2.75
- Documentación extensiva (3 archivos .md)

### v1.0 (Original) ✅ ARCHIVADO
- Consumos básicos
- Penalizaciones simples
- Sin diferenciación de infraestructura

---

## 📞 Preguntas Frecuentes

### P: ¿Cuánto presupuesto debo asignar?
R: Depende del modo:
- **Previa:** $3-5k/persona
- **Trabajo:** $5-8k/persona
- **Pongámosle:** $10-15k/persona
- **Modo 18:** $8-12k/persona
- **Proyecto X:** $10-15k/persona (multi-día sostenido)

### P: ¿El hielo es realmente tan crítico?
R: **SÍ**. En clima cálido (Septiembre) es lo más importante. Mejor tener de más que de menos. Se derrite constantemente.

### P: ¿Puedo cambiar de modo después de calcular?
R: **Sí**. Solo cambia el dropdown y recalcula todo.

### P: ¿Qué pasa si me faltan tiendas?
R: Se recomienda multi-tienda, pero con penalización (menos óptimo).

### P: ¿El concho es malo?
R: **No**. Para el "Anfitrión Pro" es **BUENO**: guardalo para el día siguiente o próximo carrete.

### P: ¿Proyecto X rompe mis datos v2.0?
R: **No**. Es completamente backward compatible.

### P: ¿Cómo sé si debo usar Modo 18 o Proyecto X?
R: 
- **Modo 18:** 1 día largo (8-12 horas) o feriado con ritmo alto
- **Proyecto X:** Multi-día (24-60 horas) con ritmo sostenido, no extremo

### P: ¿Qué pasa si uso Proyecto X pero es solo 1 día?
R: No hay problema. Vas a tener concho, pero será menos que con Modo 18 (más relajado). Recomendamos Modo 18 si es solo 12 horas.

---

## 🚀 Stack Técnico

- **Frontend:** HTML5 + Bootstrap 5 + JavaScript (Vanilla)
- **Backend:** Mock API (JSON local)
- **Algoritmo:** Dynamic Programming + Heurística de Scoring
- **Datos:** Retailers chilenos (Jumbo, Lider, Unimarc, Líquidos)

---

## 📊 Estadísticas del Proyecto

- **5 Modos** de consumo disponibles
- **10+ Tipos** de bebidas soportadas
- **46 Productos** en catálogo de retailers
- **4 Retailers** integrados (Jumbo, Lider, Unimarc, Líquidos)
- **100% Backward Compatible** (v2.0 → v2.1)
- **0 Breaking Changes** en la API

---

## 🚨 Requisitos

### Para Usar
- ✅ Navegador moderno (Chrome, Firefox, Safari, Edge)
- ✅ JavaScript habilitado
- ✅ Pantalla de 1024px+ (responsive design)

### Para Desarrollar
- ✅ Node.js (para validar sintaxis)
- ✅ Editor de texto
- ✅ Git (opcional, para versionamiento)

---

## 🎯 Roadmap

### v2.1 (Actual) ✅
- ✅ Modo 18++ Multi-día
- ✅ Matriz comparativa de 5 modos
- ✅ Documentación consolidada

### v2.2 (Próximo)
- 🔄 API real con retailers chilenos
- 🗺️ Geolocalización + tiendas cercanas
- 📊 Histórico de carretes del usuario
- ⭐ Rating: "¿Fue exacto?"
- 📱 Optimización móvil

### v3.0 (Futuro)
- 📱 App móvil nativa (iOS/Android)
- 🤖 AI: Predicción automática de modo
- 🔔 Notifications (falta hielo, mejor precio)
- 🎓 Modo "Educativo" (tutorial paso a paso)
- 📊 Analytics: Tracking de carretes históricos

---

## 🎉 ¡Comienza Ahora!

**Pasos rápidos:**

1. Abre `index.html` en tu navegador
2. Ingresa personas y presupuesto
3. Elige modo (✨ Prueba Modo 18++)
4. Selecciona bebidas
5. Reparte presupuesto entre categorías
6. **¡Recibe recomendación de compra optimizada!**
7. Copia la lista y ¡a comprar!

---

---

## 🎯 Roadmap

### v2.4 (Actual) ✅ MODAL POPUP + RATIO
- ✅ Modal popup responsivo (fullscreen móvil, popup tablet, modal desktop)
- ✅ Ratio presupuesto visual (X% utilizado, $restante)
- ✅ Documentación completa (7 archivos .md nuevos)
- ✅ Testing exhaustivo (checklist incluido)
- ✅ Listo para producción

### v2.5 (Próximo - 4 semanas)
- 🔄 API real con retailers chilenos (Jumbo, Lider, Unimarc)
- 🔄 Scraper web + cache automático 24h
- 🔄 Fallback si API down (datos stale)
- � Admin panel para ajustar precios

### v3.0 (Futuro)
- 📱 App móvil nativa (iOS/Android)
- 🤖 Geolocalización + tiendas cercanas
- ⭐ Rating: "¿Fue exacto?"
- 📊 Analytics: Tracking de carretes

---

## 🎉 ¡Comienza Ahora!

**Pasos rápidos:**

1. Abre `index.html` en tu navegador
2. Ingresa personas y presupuesto
3. Elige modo (✨ Prueba Proyecto X para multi-día)
4. Selecciona bebidas
5. Reparte presupuesto entre categorías
6. **¡Recibe recomendación de compra optimizada!**
7. **Modal popup muestra resultados** (sin scroll exterior)
8. Copia la lista y ¡a comprar!

---

## �📁 Estructura de Archivos & Documentación

### Archivos de Código
```
calculadoracopete/
├── index.html               # Interfaz web (224 líneas)
├── script.js                # Algoritmo principal (1276 líneas)
├── styles.css               # Estilos CSS + modal responsive
├── productos.json           # Catálogo de productos (46 SKUs)
```

### Documentación Principal
```
├── README_CONSOLIDADO.md    # Este archivo (CORE)
├── QUICK_REFERENCE.txt      # Referencia rápida
```

### Documentación v2.4 (NEW) - Guías & UI
```
├── RESUMEN_v24_FINAL.md          # ← LEER PRIMERO: Qué cambió en v2.4
├── INDICE_DOCUMENTACION.md       # Índice completo de documentación
├── MODAL_CHANGES.md              # Cambios técnicos (HTML/JS/CSS)
├── ANTES_DESPUES_MODAL.md        # Comparativa visual (Scroll vs Modal)
├── VISUAL_GUIDE_MODAL.md         # Mockups ASCII por dispositivo
├── TESTING_CHECKLIST_v24.md      # Checklist exhaustivo para testing
├── ESTADO_FINAL_v24.md           # Checklist de completitud final
├── CHANGELOG.md                  # Historial completo v1.0 → v2.4
```

### Configuración
```
├── .gitignore               # Archivos ignorados en Git
├── .github/workflows/       # Deploy automático a GitHub Pages
```

---

## 📝 Licencia & Créditos

**Desarrollado para:** Comunidad de Anfitriones Chilenos  
**Versión:** 2.4 (Modal Popup + Factor Estacional)  
**Última actualización:** 29 de Marzo de 2026  
**Mantenedor:** Algoritmo Pro Anfitrión  
**Licencia:** Uso libre para fines educativos y comerciales  

---

**Lema:** *"Frío, eficiente, legendario. Para cada carrete, su modo."* 🍺❄️🔥

**Estado:** 🟢 ACTIVO Y FUNCIONAL (v2.4 - Producción Ready)

---

## 🚀 Próximos Pasos

1. ✅ **Probar:** Abre `index.html` en tu navegador
2. 📖 **Leer:** Consulta `RESUMEN_v24_FINAL.md` para entender v2.4
3. 🧪 **Testear:** Sigue `TESTING_CHECKLIST_v24.md`
4. 📊 **Deploy:** Versión lista para producción en GitHub Pages

¡Que disfrutes tu carrete! 🎉
