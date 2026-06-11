# 📱 CUÁNTO RINDE - Master Documentation

**Versión:** 5.0 (Modular)  
**Estado:** ✅ Activo - Arquitectura Modular y Pipeline Paralelo Operacionales  
**Última Actualización:** Junio 2026  
**Autores:** Pipin333 + Antigravity AI  
**Repositorio:** github.com/Pipin333/calculadoracopete

---

## 📑 Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Arquitectura del Sistema](#arquitectura-del-sistema)
4. [Características Implementadas](#características-implementadas)
5. [Estructura de Archivos](#estructura-de-archivos)
6. [Módulos JavaScript](#módulos-javascript)
7. [Base de Datos Firebase](#base-de-datos-firebase)
8. [Algoritmo & Lógica](#algoritmo--lógica)
9. [Sistema de Scrapers](#sistema-de-scrapers)
10. [Pipeline de GitHub Actions](#pipeline-de-github-actions)
11. [Sistema de Filtros y Matcher](#sistema-de-filtros-y-matcher)
12. [Guía de Deployment](#guía-de-deployment)
13. [Notas de Cambios](#notas-de-cambios)

---

## Resumen Ejecutivo

**Cuánto Rinde v5.0** es una calculadora de presupuestos inteligente para eventos sociales chilenos que optimiza automáticamente la compra de bebidas usando un algoritmo de **Programación Dinámica (Knapsack)**. La lógica del frontend está estructurada en una arquitectura modular de 8 módulos ES6 integrados. Los precios se actualizan automáticamente todos los días mediante scrapers que corren en paralelo en GitHub Actions, extrayendo datos de **6 tiendas reales** en Chile.

### Puntos Fuertes ✅
- Algoritmo sofisticado con 5 modos de consumo + análisis multi-tienda
- Pipeline de scraping paralelo (~6 minutos para 6 tiendas simultáneas)
- Base de datos de ~167 SKUs validados y limpios (sin retornables, sin mercadería)
- Integración global con Firebase Realtime Database
- Sistema modular: agregar tiendas o bebidas sin tocar código JS/HTML
- UI responsive premium con Bootstrap 5.3.3 y modo oscuro
- Autenticación anónima sin fricciones
- Boleta compartible mediante código corto de 6 caracteres

### Áreas en Desarrollo 🔧
- Booz y Líquidos tienen cobertura limitada (solo primera página de catálogo)
- Admin panel no implementado (futuro v4.0)
- Sin historial de presupuestos anteriores (v4.0)

---

## Stack Tecnológico

| Capa | Tecnología | Versión | Propósito |
|------|-----------|---------|----------|
| **Frontend** | Bootstrap | 5.3.3 | UI responsive framework |
| **Frontend** | Vanilla JavaScript | ES6 Modules | Lógica client-side (sin frameworks) |
| **Backend** | Firebase RTDB | v3.0 | Presupuestos globales + auth anónima |
| **SDK** | Firebase SDK | 10.8.1 | Integración completa |
| **Auth** | Anonymous Auth | Firebase | Login sin fricciones |
| **Hosting** | GitHub Pages | - | Despliegue estático |
| **Scraping** | Python 3.11 + Playwright | - | Extracción de precios reales |
| **Scraping** | BeautifulSoup 4 | - | Parsing HTML estático (Jumbo) |
| **Stealth** | playwright-stealth | - | Evasión de detección anti-bot |
| **CI/CD** | GitHub Actions | - | Scraping paralelo diario + deploy |
| **Catálogo** | JSON local | productos.json | ~167 SKUs actualizados diariamente |

---

## Arquitectura del Sistema

```
┌────────────────────────────────────────────────────────────────┐
│                        USUARIO FINAL                           │
├────────────────────────────────────────────────────────────────┤
│  index.html (Calculadora)  ←→  presupuesto.html (Boleta)      │
├────────────────────────────────────────────────────────────────┤
│                     JAVASCRIPT MODULES                         │
├────────────────────────────────────────────────────────────────┤
│  script.js (Orquestador principal)                             │
│  ├── config.js (Constantes y reglas de negocio)                │
│  ├── productApi.js (Carga de JSON y API de productos)          │
│  ├── helpers.js (Formateo CLP, utilidades DOM y etiquetas)     │
│  ├── mixerPreferences.js (Estado y selectores de mixer)        │
│  ├── budgetSliders.js (Sliders de reparto de presupuesto)      │
│  ├── solver.js (Algoritmo Knapsack DP y lógica de planes)      │
│  ├── renderer.js (Renderizado de resultados y UI en modal)    │
│  ├── shorturl.js (URL Shortener)                               │
│  └── firebase-config.js (Operaciones Firebase RTDB)            │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  json/productos.json  (cargado via fetch en el cliente)        │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│                     FIREBASE BACKEND                           │
├────────────────┬──────────────────┬────────────────────────────┤
│  presupuestos/ │  users/          │  (admin_prices - futuro)  │
│  (Public Read) │  (Auth Required) │                            │
└────────────────┴──────────────────┴────────────────────────────┘
                           ↑
                Actualizado diariamente por:
┌────────────────────────────────────────────────────────────────┐
│                  GITHUB ACTIONS PIPELINE                       │
├─────────────────┬──────────────────┬──────────────────────────┤
│  scrape-store   │  scrape-store    │  ... (6 en paralelo)     │
│  (Jumbo)        │  (Unimarc)       │                           │
├─────────────────┴──────────────────┴──────────────────────────┤
│               combine-and-deploy                               │
│  workers/run.py --merge → json/productos.json → git push      │
└────────────────────────────────────────────────────────────────┘
```

### Flujo de Datos del Scraper

```
GitHub Actions (04:00 AM UTC)
  │
  ├─ [6 runners paralelos]
  │    └── python workers/run.py --store <Tienda>
  │         ├── scrape_store_products()  →  raw JSON de la tienda
  │         ├── process_raw_results()   →  matcher.process_product()
  │         └── json/processed_<Tienda>.json  →  upload artifact
  │
  └─ [combine-and-deploy]
       ├── download artifacts → json/processed_*.json
       ├── python workers/run.py --merge
       │    ├── Lee todos los processed_*.json
       │    ├── Deduplication (más barato por tienda+categoria+vol+unidades)
       │    ├── Fallback de DB anterior para tiendas fallidas
       │    └── Escribe json/productos.json
       └── git commit & push
```

---

## Características Implementadas

### ✅ Core Features

#### 1. Cálculo Inteligente (Knapsack DP)
- **Algoritmo:** Programación Dinámica con heurística de penalización
- **Precisión:** ±0 pesos chilenos (cálculo exacto)
- **Modos de Consumo:**
  - 🍺 **Previa:** 3 cervezas por persona
  - 💼 **Trabajo:** 2 cervezas + 1 piscola por persona
  - 🎉 **Pongámosle:** 2 cervezas + 2 piscos por persona
  - 🔞 **Modo 18:** 4 piscos + 2 cervezas por persona
  - 🚀 **Proyectox:** Custom mix de bebidas seleccionadas

#### 2. Multi-Tienda Intelligence
- Análisis simultáneo de Jumbo, Unimarc, La Barra, Booz, miCocaCola, Líquidos
- Comparativa mejor precio: tienda individual vs compra distribuida
- Estrategia automática: recomendación visual (card destacada)

#### 3. Catálogo de Bebidas (~167 SKUs activos)

| Categoría | Aprox. SKUs | Tiendas con datos |
|-----------|:-----------:|:-----------------:|
| Cerveza | 59 | Jumbo, Unimarc, miCocaCola |
| Pisco | 14 | Jumbo, Unimarc, Booz |
| Whiskey | 14 | Jumbo, Unimarc, Booz, miCocaCola |
| Red Bull | 12 | Jumbo, Unimarc, miCocaCola |
| Ron | 10 | Jumbo, Unimarc, Booz |
| Vodka | 10 | Jumbo, Unimarc, Booz |
| Gin | 9 | Jumbo, Unimarc, Booz |
| Fanta | 9 | Jumbo, Unimarc, miCocaCola |
| Sprite | 9 | Jumbo, Unimarc, miCocaCola |
| Cola | 8 | Jumbo, Unimarc, miCocaCola |
| Jugo Watts | 8 | Jumbo, Unimarc, miCocaCola |
| Ginger Ale | 6 | Jumbo, Unimarc, Booz |
| Jäger | 5 | Jumbo, Unimarc, Booz |
| Hielo | 3 | Jumbo, Unimarc |
| Tónica | 2 | Jumbo, Unimarc |

#### 4. Sistema de Compartir
- **URL Corta:** 6-8 caracteres alfanuméricos (ej: ABC123)
- **Persistencia:** 30 días en Firebase + localStorage backup
- **Clipboard:** 3 niveles de fallback garantizados
- **Boleta:** HTML responsivo con print-friendly CSS

---

## Estructura de Archivos

```
calculadoracopete/
├── index.html                        Calculadora principal
├── presupuesto.html                  Boleta compartible
├── css/
│   └── styles.css                    Estilos premium (modo oscuro, Bootstrap custom)
├── javascript/
│   ├── script.js                     Orquestador principal (inicialización y eventos)
│   ├── config.js                     Constantes, penalizaciones y factores de consumo
│   ├── productApi.js                 Manejo de productos.json y API de catálogo
│   ├── helpers.js                    Utilidades DOM, formateo CLP y etiquetas
│   ├── mixerPreferences.js           Preferencias y selectores dinámicos de mixer
│   ├── budgetSliders.js              Renderizado y eventos de los sliders de presupuesto
│   ├── solver.js                     Motor matemático (algoritmo Knapsack DP)
│   ├── renderer.js                   Pintado de resultados, modal, alertas y compartir
│   ├── firebase-config.js            Operaciones Firebase RTDB
│   └── shorturl.js                   Generación y recuperación de códigos cortos
├── json/
│   └── productos.json                Base de datos (~167 SKUs, actualizada diariamente)
├── workers/
│   ├── config.json                   Tiendas activas, categorías, keywords de búsqueda
│   ├── run.py                        Runner: --store, --merge, o secuencial
│   ├── matcher.py                    Validación, normalización y clasificación de productos
│   ├── requirements.txt              Dependencias Python
│   └── scrapers/
│       ├── jumbo.py                  HTTP + __REACT_QUERY_STATE__ JSON (rápido, ~1.5 min)
│       ├── labarra.py                Playwright + Clarity selectors (tarjetas con role=button)
│       ├── playwright_scrapers.py    Playwright genérico para Unimarc, Booz, Líquidos, miCocaCola
│       └── utils.py                 fetch_html, find_key_recursive, extract_products_from_json
├── .github/
│   └── workflows/
│       ├── scrape_prices.yml         Pipeline paralelo diario (04:00 AM UTC)
│       └── static.yml                Deploy a GitHub Pages
├── docs/
│   └── MASTER_DOCUMENTATION.md      ← TÚ ESTÁS AQUÍ
├── legacy/
│   ├── script-v3.0-backup.js        Script monolítico antiguo (referencia)
│   └── script-v4.8-pre-modular.js   Script monolítico de 2103 líneas previo a v5.0 (referencia)
└── README.md                         Documentación de inicio rápido
```

---

## Módulos JavaScript

Con la versión 5.0, la lógica se dividió en módulos especializados para mejorar la mantenibilidad, escalabilidad y legibilidad del código:

```
index.html
    └── script.js (Orquestador principal)
         ├── Imports:
         │    ├── config.js
         │    ├── productApi.js
         │    ├── helpers.js
         │    ├── mixerPreferences.js
         │    ├── budgetSliders.js
         │    ├── solver.js
         │    ├── renderer.js
         │    ├── firebase-config.js
         │    └── shorturl.js
         └── Lógica de inicialización (DOM, Checkboxes, EventListeners)
```

### Detalle de Responsabilidades por Módulo

1. **`script.js` (Orquestador)**: Inicializa la aplicación, genera dinámicamente los checkboxes de bebidas disponibles en el catálogo, asocia listeners a todos los eventos clave (cambios de inputs, submit) y coordina la ejecución entre el solver y el renderer.
2. **`config.js`**: Almacena las constantes globales y reglas de negocio. Define los parámetros de consumo por persona por cada modo, factores de hielo, penalizaciones aplicadas por el solver (penalización por packs, penalización por conveniencia, penalización por tienda única), coeficientes estacionales y endpoints de Firebase.
3. **`productApi.js`**: Encargado de cargar `json/productos.json` y proveer métodos para interactuar con la base de datos de productos (filtrado por categorías seleccionadas, ordenamiento y deduplicación inicial).
4. **`helpers.js`**: Provee utilidades transversales como formateo de moneda (CLP), generación de etiquetas amigables para bebidas y modos de consumo, y helpers DOM básicos.
5. **`mixerPreferences.js`**: Gestiona el estado de selección de mezcladores/bebidas de acompañamiento y genera dinámicamente sus controles y selectores en la interfaz.
6. **`budgetSliders.js`**: Administra la inicialización, eventos de cambio y estados de los sliders que distribuyen el presupuesto entre alcohol, mixers e hielo.
7. **`solver.js`**: Contiene la lógica del negocio principal y el motor matemático (algoritmo Knapsack de programación dinámica). Construye los requerimientos base de litros y mixers y calcula la estrategia óptima de compra tanto para compra distribuida (Multi-Tienda) como para compra en una sola tienda (Single-Store Plan) aplicando penalizaciones de config.js.
8. **`renderer.js`**: Responsable exclusivo de pintar la UI final en base a la estrategia arrojada por el solver: renderiza las tarjetas de resultados, el modal de desglose de compra por tienda, los warnings de consumo e integra la opción de compartir.
9. **`firebase-config.js`** y **`shorturl.js`**: Encargados de la persistencia de boletas en Firebase Realtime Database y del acortamiento de enlaces de presupuestos para compartir en redes sociales.

### Flujo de Carga de Datos

```
1. cargarConfiguracionDesdeJSON()  →  lee productos.json
2. Construye dinámicamente checkboxes de bebidas desde "categorias"
3. Al calcular, filtra "productos" por las categorías seleccionadas
4. Ejecuta DP sobre la lista de productos disponibles
5. Renderiza resultados en modal con desglose por tienda
```

---

## Base de Datos Firebase

### Estructura RTDB

```json
{
  "presupuestos": {
    "ABC123": {
      "data": {
        "personas": 12,
        "aporte": 5000,
        "modo": "pongamosle",
        "bebidas": ["cerveza", "piscola"]
      },
      "createdAt": "2026-06-01T14:25:00Z",
      "expiresAt": "2026-07-01T14:25:00Z",
      "viewCount": 5
    }
  },
  "users": {
    "UID_FIREBASE_USER": {
      "isAdmin": false,
      "createdAt": "2026-01-01T00:00:00Z"
    }
  }
}
```

---

## Algoritmo & Lógica

### Programación Dinámica - Knapsack

**Problema:** Encontrar la combinación de bebidas más rentable dado un presupuesto fijo.

**Proceso:**
1. Calcular consumo esperado según modo (cervezas, piscos, mixers por persona)
2. Para cada tienda, ejecutar DP: evaluar todos los SKUs disponibles
3. Comparar estrategia de compra única vs compra distribuida multi-tienda
4. Devolver la estrategia con mejor rendimiento (ml / $1.000 CLP)

**Deduplicación del catálogo:**  
Antes de alimentar el DP, el catálogo está deduplicado por `(tienda, categoria, volumenMlUnidad, unidades)`, conservando siempre el producto más barato de cada combinación.

### Fórmula de Rendimiento

```
rendimiento = totalVolumenML / (totalCostoCLP / 1000)
ejemplo: 24.800ml / (35.800 / 1000) = 1,04 litros por mil pesos
```

---

## Sistema de Scrapers

### Tiendas Activas

| Tienda | Método | Tiempo típico | Notas |
|--------|--------|:-------------:|-------|
| **Jumbo** | HTTP + __REACT_QUERY_STATE__ JSON | ~1.5 min | El más rápido, sin Playwright |
| **Unimarc** | Playwright + intercepción de red | ~6 min | VTEX platform |
| **La Barra** | Playwright + Clarity selectors | ~6 min | Tarjetas con `role="button"` |
| **Booz** | Playwright + DOM crawler (catálogos por tipo) | ~6 min | Solo primera página visible (~12 por cat.) |
| **miCocaCola** | Playwright + application/ld+json | ~6 min | VTEX platform, muy limpio |
| **Líquidos** | Playwright + DOM crawler | ~6 min | Cobertura limitada |

> **Nota sobre Booz:** El catálogo usa un botón "ver más" de carga dinámica, por lo que actualmente solo se extraen los primeros ~12 productos visibles por categoría. Mejora pendiente.

### Estrategia de extracción (playwright_scrapers.py)

```
1. Intercepción de respuestas API/JSON (si la tienda usa VTEX o GraphQL)
   → Si captura productos, los usa directamente

2. Fallback: application/ld+json script tags en la página
   → Structured data de productos (miCocaCola)

3. Fallback: DOM crawler manual
   → Agrupa por href de producto, extrae nombre y precio del card
   → Compatible con La Barra (Clarity selectors), Booz, Líquidos
```

### Modos del Runner (workers/run.py)

```bash
# Modo tienda única (genera json/processed_<Tienda>.json)
python workers/run.py --store Jumbo

# Modo consolidación (lee processed_*.json → productos.json)
python workers/run.py --merge

# Modo secuencial completo (compatibilidad local)
python workers/run.py
```

---

## Pipeline de GitHub Actions

### Workflow: scrape_prices.yml

**Trigger:** Cron `0 4 * * *` (04:00 AM UTC = ~01:00 AM Chile) + `workflow_dispatch` manual.

```yaml
jobs:
  scrape-store:        # Matriz paralela de 6 runners
    strategy:
      matrix:
        store: [Jumbo, Unimarc, La Barra, Liquidos, Booze, miCocaCola]
    steps:
      - setup Python + instalar deps + playwright install chromium
      - python workers/run.py --store ${{ matrix.store }}
      - upload-artifact: json/processed_*.json

  combine-and-deploy:  # Depende de que todos los scrapers terminen
    needs: scrape-store
    steps:
      - setup Python + instalar deps
      - download-artifact: todos los processed_*.json → json/artifacts/
      - mover a json/
      - python workers/run.py --merge
      - rm json/processed_*.json json/artifacts/
      - git commit & push json/productos.json
```

**Tiempo de ejecución:** ~6 minutos totales (el runner más lento determina el tiempo).

### Manejo de Fallos

Si un runner de tienda falla, la etapa `combine-and-deploy` continúa igual (`fail-fast: false`). El `--merge` detecta la ausencia del archivo `processed_<Tienda>.json` y conserva los datos anteriores de esa tienda como fallback desde la versión previa de `productos.json`.

---

## Sistema de Filtros y Matcher (workers/matcher.py)

### Validaciones aplicadas a cada producto raw

| Filtro | Qué descarta |
|--------|-------------|
| **Lista negra de mercadería** | Cuadernos, mochilas, poleras, gorros, audífonos, etc. (marca promotional) |
| **Lista negra de packaging** | `retornable`, `refill`, `no incluye envase`, `solo envase`, `+envase` |
| **Precio fuera de rango** | `precio <= 0` o `precio > 200.000 CLP` |
| **Mixer demasiado pequeño** | Categorías cola/fanta/ginger/sprite/tonica/jugo_watts con volumen < 1.000 ml |
| **Accesorios** | Vasos, copas, shoper, dispensador, cooler, etc. (excepto si aparecen dentro del nombre de una categoría de alcohol) |
| **RTD / Cocktail premix** | Palabras como "coctel", "ice", "mix", "preparado" para destilados puros |
| **Alcohólicos en categoría mixer** | Palabras clave de alcohol en categorías de bebida no-alcohólica |
| **Validación de categoría** | Cada categoría valida con keywords específicas (ej: "pisco" para `piscola`, "ron" o "rum" para `ron`) |

### Extracción de datos estructurados

```
clean_name()        →  elimina espacios dobles, HTML entities
extract_brand()     →  busca en lista de marcas conocidas (BRANDS)
extract_volume_ml() →  regex sobre ml/cc/L/litros, fallback por categoría
extract_units()     →  regex sobre pack/x6/unidades/latas/botellas
classify_gama()     →  rata/normal/sobrado según marca y características del nombre
```

---

## Guía de Deployment

### Para actualizar precios manualmente

```bash
# Instalar deps una sola vez
pip install -r workers/requirements.txt
playwright install chromium

# Correr por tienda
python workers/run.py --store Jumbo
python workers/run.py --store Unimarc
# ... etc

# Consolidar
python workers/run.py --merge

# Subir
git add json/productos.json
git commit -m "Manual price update"
git push
```

### Para agregar una tienda nueva

1. Crear `workers/scrapers/<tienda>.py`
2. En `workers/run.py`, agregar el `elif store == "<Tienda>": scraped = <modulo>.scrape(...)` en `scrape_store_products()`
3. Agregar `"<Tienda>"` a `workers/config.json` → `"stores"`
4. Agregar `"<Tienda>"` a la lista `store:` en `.github/workflows/scrape_prices.yml`

### Para deshabilitar una tienda temporalmente

1. Quitar el nombre de `"stores"` en `workers/config.json`
2. Quitar el nombre de la matriz en `scrape_prices.yml`
3. Los productos de esa tienda se purgaran automáticamente en el próximo `--merge`

---

## Notas de Cambios

### v5.0 (Junio 2026) - Arquitectura Modular

#### Rediseño Frontend
- ✅ División del archivo monolítico `script.js` (~2100 líneas, 69 KB) en **8 módulos ES6+** especializados y un orquestador liviano.
- ✅ Implementación de un flujo unidireccional de control: Carga -> Selección -> Solver (DP) -> Renderer.
- ✅ Creación de módulos aislados: `config.js`, `productApi.js`, `helpers.js`, `mixerPreferences.js`, `budgetSliders.js`, `solver.js`, `renderer.js` y `script.js`.
- ✅ Sin dependencias circulares entre módulos.
- ✅ Backup de la versión monolítica anterior en `legacy/script-v4.8-pre-modular.js`.
- ✅ Version bump de scripts en `index.html` a v5.0 (`type="module"`).

### v3.1 (Junio 2026) - Robustez y Paralelismo

#### Cambios en Scrapers
- ✅ Agrupación de links por `href` en DOM_CRAWLER_JS para evitar nombres duplicados (badges de descuento)
- ✅ Soporte para tarjetas La Barra con `role="button"` via Clarity selectors
- ✅ Booz: rutas directas a catálogos por tipo (`/catalogo/pisco`, `/catalogo/ron`, etc.)
- ✅ Eliminado Lider del pipeline (10+ minutos para solo 9 productos, ROI negativo)

#### Cambios en el Matcher
- ✅ Filtro de mercadería promocional (cuadernos Red Bull Racing, etc.)
- ✅ Filtro de retornables/refill/envases no incluidos
- ✅ Filtro de mixers menores a 1L (excepto Red Bull/energizantes)
- ✅ Pruning automático de productos huérfanos al deshabilitar tiendas

#### Cambios en el Pipeline
- ✅ GitHub Actions paralelo (Matriz de 6 runners simultáneos + combine-and-deploy)
- ✅ Tiempo de ejecución reducido de ~25 minutos a ~6 minutos
- ✅ `run.py` soporta `--store`, `--merge` y modo secuencial (backward compatible)
- ✅ Manejo de fallos: stores fallidas usan datos de respaldo automáticamente

#### Limpieza de Base de Datos
- ✅ Filtrado de 63 items inválidos del catálogo anterior
- ✅ Base de datos actual: ~167 SKUs limpios en 6 tiendas activas

### v3.0 (Marzo 2026) - Lanzamiento Inicial
- ✅ Firebase Realtime Database integración completa
- ✅ Presupuestos compartibles globales (URL corta)
- ✅ Scrapers Playwright iniciales (Jumbo, Lider, Unimarc)
- ✅ Algoritmo Knapsack DP multi-tienda
- ✅ Clasificación automática de gama (rata/normal/sobrado)
- ✅ Factor estacional por mes
- ✅ Autenticación anónima Firebase
