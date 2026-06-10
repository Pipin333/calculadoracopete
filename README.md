# Cuánto Rinde (Calculadora de Copete)

**Cuánto Rinde** es una aplicación web que optimiza la compra de alcohol y bebidas para carretes chilenos. Permite ingresar el número de asistentes, el aporte por persona y el nivel de consumo, y genera una lista de compra optimizada en función de precios y rendimientos. La herramienta compara productos de varias tiendas y busca la combinación más económica dentro del presupuesto.

## 🧰 Tecnologías

* **Frontend**: HTML5, CSS3 personalizado (temas dinámicos de alta gama) y Bootstrap 5.3.3.
* **Lógica**: JavaScript ES6+ para el motor de cálculo y manipulación del DOM.
* **Persistencia de presupuestos**: Integrado con Firebase Realtime Database para guardar listas y compartirlas mediante un código corto de 6 dígitos.
* **Scraping de precios**: Python 3.11 con Playwright y Beautiful Soup 4 para extraer precios reales de supermercados y botillerías.
* **Automatización (CI/CD)**: GitHub Actions para:
  * Despliegue continuo de la aplicación en GitHub Pages.
  * Ejecución automática diaria (cron job) de los scrapers para mantener los precios actualizados.

## 🎯 Características principales

* **Optimización tipo Knapsack**: Utiliza un algoritmo de programación dinámica (problema de la mochila) para calcular la combinación óptima de alcohol y mixers que maximice el rendimiento dentro del presupuesto definido.
* **Gamas de Calidad de Destilados**: Clasifica automáticamente los destilados en tres categorías realistas del consumo chileno:
  * `rata` (de combate/universitario: Capel, Eristoff, Blenders Pride, etc.)
  * `normal` (estándar: Mistral 35°, Alto del Carmen 35°, Tres Erres, Absolut, etc.)
  * `sobrado` (premium/alta gama: El Gobernador, Horcón Quemado, Grey Goose, Hendrick's, Jack Daniel's Black, etc.)
* **Scraping Diario**: Compara automáticamente precios de grandes cadenas en Chile (*Lider, Jumbo, La Barra, Unimarc, Booz, miCocaCola, Líquidos*), seleccionando siempre la opción más económica de cada tienda.
* **Presupuestos compartibles**: Guarda presupuestos en la nube y genera códigos cortos de 6 dígitos (ej: `A8F4D2`) para compartir la boleta con amigos a través de WhatsApp.
* **Interfaz reactiva y premium**: Control visual mediante sliders para equilibrar el presupuesto entre alcohol y mixers, adaptado con temas oscuros de alta estética.
* **Huevo de Pascua (Easter Egg)**: Prueba a ingresar exactamente **$418** de cuota individual para ver un error humorístico local (HTTP 418 I'm a teapot).

## 🗂️ Estructura del proyecto

El proyecto sigue una arquitectura modular en donde las vistas HTML interactúan con submódulos JavaScript para el cálculo y Firebase, mientras que los precios son automatizados mediante scripts en Python.

| Archivo / Carpeta | Rol |
| --- | --- |
| `index.html` | Vista principal; formulario de entrada, sliders de presupuesto y panel del calculador interactivo. |
| `presupuesto.html` | Vista secundaria; renderizado independiente de presupuestos guardados y compartidos por código. |
| `css/styles.css` | Presentación general y diseño responsivo adaptado con estética premium de modo oscuro. |
| `javascript/script.js` | Controlador y motor matemático del solver (knapsack solver) e ingeniería de requerimientos. |
| `javascript/firebase-config.js` | Configuración e inicialización de Firebase Realtime Database. |
| `javascript/shorturl.js` | Lógica de negocio para persistir presupuestos y recuperar datos por códigos de 6 caracteres. |
| `json/productos.json` | Base de datos dinámica en formato JSON con la parametrización de categorías y productos actualizados. |
| `workers/` | Directorio de automatización en Python (scrapers por tienda y el procesador de emparejamiento de productos). |
| `workers/matcher.py` | Normalizador de nombres, cálculo de volumen total y clasificador de calidad (`gama`). |
| `.github/workflows/` | Workflows de GitHub Actions para despliegue estático y scraping diario automático a las 04:00 AM UTC. |

## 🧪 Cómo utilizarlo

### 1. Ejecutar la Web localmente

Como la app es completamente cliente, basta con abrir `index.html` en un navegador moderno para probarla. También puedes clonar el repositorio y servirlo desde un servidor estático:

```bash
git clone https://github.com/Pipin333/calculadoracopete.git
cd calculadoracopete
# Abre index.html en el navegador de tu preferencia o usa un live server
```

### 2. Ejecutar los Scrapers localmente

Si deseas actualizar la base de datos de precios localmente de forma manual, puedes ejecutar el worker en Python:

```bash
# Entrar a la carpeta y preparar el entorno virtual
cd workers
python -m venv venv
source venv/Scripts/activate  # En Windows

# Instalar dependencias y Playwright
pip install -r requirements.txt
playwright install chromium

# Ejecutar el scraper
python run.py
```

Esto actualizará de inmediato el archivo `json/productos.json` con los precios limpios y normalizados.

### 3. Agregar una Bebida Nueva (Sistema Modular)

La app es 100% modular. Para agregar una nueva bebida o categoría sin editar código JS/HTML, solo necesitas editar `json/productos.json` agregando la categoría y el producto en la lista:

```json
{
  "categorias": {
    "mi_bebida": {
      "nombre": "Mi Bebida",
      "grupo": "mix_simple",
      "llevaMixer": true,
      "mixerCategoria": "bebida",
      "mixerFactor": 2,
      "llevaHielo": true,
      "displayName": "Mi Bebida Display",
      "esSeleccionable": true
    }
  },
  "productos": [
    { 
      "id": 999, 
      "categoria": "mi_bebida", 
      "nombre": "Mi Bebida Premium 750ml", 
      "tienda": "Lider", 
      "precio": 10000, 
      "unidades": 1, 
      "volumenMlUnidad": 750,
      "gama": "sobrado"
    }
  ]
}
```

📖 **Para una guía completa**, ver: [`docs/MASTER_DOCUMENTATION.md` → "Sistema Modular de Categorías"](docs/MASTER_DOCUMENTATION.md)

## 🗺️ Roadmap (Abril-Julio 2026)

**Estrategia dual:** Mantener v3 en producción mientras se explora v4 en paralelo.

### 🎯 Hito 1: Lanzamiento & Recolección de Datos (Marzo)
-   ✅ Aplicación v3 en producción
-   ✅ Google Form de validación (100+ respuestas)
-   ✅ GA4 Analytics integrado
-   ✅ Documentar bugs reportados

### 🔧 Hito 2: Hotfixes v3.1 (Abril-Junio)
-   ✅ Arreglar slider bug detectado
-   ✅ Automatizar scrapers de supermercados (Playwright)
-   ✅ Implementar base de datos dinámica sin recargas en caché
-   ✅ Ajustar reglas de calidad (`gama`) para la realidad chilena
-   ✅ Integrar base de datos y compartición vía Firebase

### 🏗️ Hito 3: Tech Spike v4 (Paralelo)
-   🔬 Evaluación de stacks (Python/Flet, FastAPI, etc.)
-   🛜 Prototipo funcional mínimo

**Para detalles completos, ver:** [`docs/ROADMAP_v4.md`](docs/ROADMAP_v4.md)

---

## 🔬 Participar en la Encuesta

¿Quieres ayudar a mejorar Cuánto Rinde?

**👉 [Responde la encuesta aquí](https://forms.gle/Jo2LfY5Uqam4DWEKA)** (3 minutos)

Tu feedback (anonimato garantizado) nos ayuda a validar los consumos estimados y UX.

---

**Creador:** [Pipin333](https://github.com/Pipin333)  
**Tech Lead / Colaborador:** Chela  
**QA / Feedback:** Santi  

Cuánto Rinde nació como proyecto personal para resolver un problema cotidiano y se ha convertido en una herramienta útil para planificar carretes de forma eficiente. 

¡**Aporta ideas, reporta bugs o colabora** para seguir mejorándola! 🍻
