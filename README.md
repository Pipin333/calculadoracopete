# Cuánto Rinde (Calculadora de Copete)

**Cuánto Rinde** es una aplicación web que optimiza la compra de alcohol y bebidas para carretes chilenos. Permite ingresar el número de asistentes, el aporte por persona y el nivel de consumo, y genera una lista de compra optimizada en función de precios y rendimientos. La herramienta compara productos de varias tiendas y busca la combinación más económica dentro del presupuesto.

## 🧰 Tecnologías

* **Frontend**: HTML5, CSS3 personalizado (temas dinámicos de alta gama) y Bootstrap 5.3.3.
* **Lógica**: JavaScript ES6+ para el motor de cálculo y manipulación del DOM.
* **Persistencia de presupuestos**: Integrado con Firebase Realtime Database para guardar listas y compartirlas mediante un código corto de 6 dígitos.
* **Scraping de precios**: Python 3.11 con Playwright y Beautiful Soup 4 para extraer precios reales de supermercados y botillerías.
* **Automatización (CI/CD)**: GitHub Actions para:
  * Despliegue continuo de la aplicación en GitHub Pages.
  * Ejecución automática diaria (cron job) de los scrapers en **paralelo por tienda** para mantener los precios actualizados (~6 minutos totales).

## 🎯 Características principales

* **Optimización tipo Knapsack**: Utiliza un algoritmo de programación dinámica (problema de la mochila) para calcular la combinación óptima de alcohol y mixers que maximice el rendimiento dentro del presupuesto definido.
* **Gamas de Calidad de Destilados**: Clasifica automáticamente los destilados en tres categorías realistas del consumo chileno:
  * `rata` (de combate/universitario: Capel, Eristoff, Blenders Pride, etc.)
  * `normal` (estándar: Mistral 35°, Alto del Carmen 35°, Tres Erres, Absolut, etc.)
  * `sobrado` (premium/alta gama: El Gobernador, Horcón Quemado, Grey Goose, Hendrick's, Jack Daniel's Black, etc.)
* **Scraping Paralelo Diario**: Compara automáticamente precios de 6 tiendas en Chile (*Jumbo, Unimarc, La Barra, Booz, miCocaCola, Líquidos*) con scrapers que corren en paralelo en GitHub Actions, seleccionando siempre la opción más económica.
* **Filtros de Calidad de Productos**: El matcher filtra automáticamente productos no aptos para carrete: retornables, refill, mixers menores a 1L, mercadería (cuadernos, poleras, etc.) y formatos fuera de rango.
* **Presupuestos compartibles**: Guarda presupuestos en la nube y genera códigos cortos de 6 dígitos (ej: `A8F4D2`) para compartir la boleta con amigos a través de WhatsApp.
* **Interfaz reactiva y premium**: Control visual mediante sliders para equilibrar el presupuesto entre alcohol y mixers, adaptado con temas oscuros de alta estética.
* **Huevo de Pascua (Easter Egg)**: Prueba a ingresar exactamente **$418** de cuota individual para ver un error humorístico local (HTTP 418 I'm a teapot).

## 🗂️ Estructura del proyecto

```
calculadoracopete/
├── index.html                    Calculadora principal (formulario, sliders, resultados)
├── presupuesto.html              Boleta compartible (renderizado independiente vía Firebase)
├── css/styles.css                Presentación y diseño responsivo premium (modo oscuro)
├── javascript/
│   ├── script.js                 Orquestador principal + motor matemático (Knapsack DP)
│   ├── firebase-config.js        Configuración e inicialización de Firebase RTDB
│   └── shorturl.js               Lógica de generación/recuperación de presupuestos compartidos
├── json/
│   └── productos.json            Base de datos dinámica (~167 SKUs actualizados diariamente)
├── workers/
│   ├── config.json               Configuración de tiendas activas, categorías y keywords de búsqueda
│   ├── run.py                    Runner principal con soporte de modos --store, --merge y secuencial
│   ├── matcher.py                Normalizador, extractor de volumen/unidades y clasificador de gama
│   ├── requirements.txt          Dependencias Python (requests, beautifulsoup4, playwright, playwright-stealth)
│   └── scrapers/
│       ├── jumbo.py              Scraper de Jumbo (HTTP + __REACT_QUERY_STATE__ JSON)
│       ├── labarra.py            Scraper de La Barra (Playwright + Clarity selectors)
│       ├── playwright_scrapers.py Scraper genérico de Playwright para Unimarc, Booz, Líquidos, miCocaCola
│       └── utils.py              Utilidades compartidas (fetch_html, find_key_recursive, extractors)
└── .github/workflows/
    ├── scrape_prices.yml         Workflow paralelo: matriz de 6 scrapers + combine-and-deploy
    └── static.yml                Workflow de despliegue de GitHub Pages
```

## 🧪 Cómo utilizarlo

### 1. Ejecutar la Web localmente

Como la app es completamente cliente, basta con abrir `index.html` en un navegador moderno para probarla. También puedes clonar el repositorio y servirlo desde un servidor estático:

```bash
git clone https://github.com/Pipin333/calculadoracopete.git
cd calculadoracopete
# Abre index.html en el navegador de tu preferencia o usa un live server
```

### 2. Ejecutar los Scrapers localmente

El runner soporta tres modos de operación:

```bash
cd workers
pip install -r requirements.txt
playwright install chromium

# Modo completo secuencial (todas las tiendas, backward compatible)
python run.py

# Modo por tienda (genera json/processed_<Tienda>.json)
python run.py --store Jumbo
python run.py --store miCocaCola

# Modo consolidación (lee todos los processed_*.json y actualiza productos.json)
python run.py --merge
```

### 3. Agregar una Tienda Nueva

1. Implementar el scraper en `workers/scrapers/`.
2. Agregarlo al registro de `workers/run.py` (sección `scrape_store_products`).
3. Añadir el nombre a la lista `"stores"` en `workers/config.json`.
4. Añadir el nombre a la matriz `store:` en `.github/workflows/scrape_prices.yml`.

### 4. Agregar una Bebida o Categoría Nueva (Sistema Modular)

La app es 100% modular. Edita `json/productos.json` agregando la categoría y el producto:

```json
{
  "categorias": {
    "mi_bebida": {
      "nombre": "Mi Bebida",
      "grupo": "destilado",
      "llevaMixer": true,
      "mixerCategoria": "cola",
      "mixerFactor": 2,
      "mixerAlternativas": ["cola", "sprite"],
      "llevaHielo": true,
      "displayName": "Mi Bebida Display"
    }
  },
  "productos": [
    {
      "id": 999,
      "categoria": "mi_bebida",
      "nombre": "Mi Bebida Premium 750ml",
      "tienda": "Jumbo",
      "precio": 10000,
      "unidades": 1,
      "volumenMlUnidad": 750,
      "gama": "sobrado"
    }
  ]
}
```

## ⚙️ Pipeline de Scraping (GitHub Actions)

El workflow `scrape_prices.yml` corre todos los días a las **04:00 AM UTC** (01:00 AM hora Chile) en dos etapas:

1. **`scrape-store` (Matriz Paralela)**: Lanza 6 runners simultáneos (uno por tienda). Cada runner instala sus dependencias, ejecuta `python workers/run.py --store <Tienda>` y sube el resultado como artefacto de GitHub.
2. **`combine-and-deploy`**: Una vez que todos los runners terminan, descarga los artefactos, ejecuta `python workers/run.py --merge` para consolida los archivos por tienda en `json/productos.json`, limpia los temporales y sube el commit final.

> **Tiempo total de ejecución**: ~6 minutos (vs. 25+ minutos del pipeline secuencial anterior).

## 🗺️ Roadmap (Junio 2026+)

### ✅ Completado (v3.1 - Junio 2026)
- ✅ Scrapers de supermercados con Playwright (robusto, con stealth y reintentos)
- ✅ Pipeline paralelo de GitHub Actions (6 runners simultáneos)
- ✅ Base de datos dinámica con ~167 SKUs validados por tienda
- ✅ Filtros de calidad: sin retornables, sin refill, sin mercadería, sin mixers pequeños
- ✅ Clasificación automática de `gama` (rata/normal/sobrado) para destilados
- ✅ Integración Firebase Realtime Database para presupuestos compartibles

### 🔬 Pendiente / Exploración
- 🔬 Mejorar cobertura de Booz y Líquidos (paginación / "ver más")
- 🔬 Scraper de La Barra con paginación de resultados
- 🔬 v4.0: Admin panel, historial de presupuestos, expansión LatAm

---

**Creador:** [Pipin333](https://github.com/Pipin333)  
**Tech Lead / Colaborador:** Chela  
**QA / Feedback:** Santi  

Cuánto Rinde nació como proyecto personal para resolver un problema cotidiano y se ha convertido en una herramienta útil para planificar carretes de forma eficiente.

¡**Aporta ideas, reporta bugs o colabora** para seguir mejorándola! 🍻
