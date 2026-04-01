# Cuánto Rinde (Calculadora de Copete)

**Cuánto Rinde** es una aplicación web que optimiza la compra de alcohol y bebidas para carretes chilenos. Permite ingresar el número de asistentes, el aporte por persona y el nivel de consumo, y genera una lista de compra optimizada en función de precios y rendimientos. La herramienta compara productos de varias tiendas y busca la combinación más económica dentro del presupuesto.

## 🧰 Tecnologías

* **Frontend**: HTML5, CSS3 y Bootstrap 5.3.3.
* **Lógica**: JavaScript ES6+ para el motor de cálculo y manipulación del DOM.
* **Despliegue**: GitHub Pages, automatizado por un flujo de CI/CD en GitHub Actions.
* **Persistencia de presupuestos**: integrado con Firebase para guardar listas y compartirlas mediante un código de 6–8 dígitos.
* **Portabilidad**: aplicación 100 % cliente, sin backend, lo que la hace fácil de desplegar.

## 🎯 Características principales

* **Optimización tipo knapsack**: calcula la mejor combinación de productos en base al presupuesto y las preferencias de consumo.
* **Configuración flexible**: permite definir el tamaño del grupo, el aporte individual y la intensidad del consumo.
* **Comparación entre tiendas**: cruza precios de distintas cadenas o filtra por tienda única.
* **Generación de boleta**: muestra el presupuesto en un formato similar al de una boleta de supermercado, facilitando la revisión y compra.
* **Presupuestos compartibles**: gracias a Firebase, se puede guardar un presupuesto y compartirlo mediante un código corto.
* **Interfaz reactiva**: utiliza sliders para dividir el presupuesto entre alcohol y mixers y una panel de resultados que se actualiza dinámicamente.

## 🗂️ Estructura del proyecto

El proyecto sigue un patrón simplificado MVC donde `script.js` actúa como controlador y modelo, mientras que `index.html` y `styles.css` gestionan la vista.

| Archivo                        | Rol                                                                                                                                                                             | Entidades clave |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `index.html`                   | Vista estática; define el formulario de entrada (`#carreteForm`), los sliders y el panel de resultados.                                                                         |                 |
| `styles.css`                   | Presentación; define estilos de tarjetas, cajas de resultado y elementos de UI.                                                                                                 |                 |
| `script.js`                    | Controlador/Modelo; contiene constantes como `CONSUMOS` y `mockProducts`, las funciones `buildRequirements()` (ingeniería de requerimientos) y el solucionador de optimización. |                 |
| `.github/workflows/static.yml` | Infraestructura de CI/CD; despliega automáticamente en GitHub Pages.                                                                                                            |                 |

`script.js` se organiza en tres capas: **configuración** (reglas de consumo y base de productos), **ingeniería de requerimientos** (traduce los datos del formulario a objetivos de volumen y presupuesto) y **solver de optimización** (algoritmo tipo knapsack que selecciona las mejores SKU).

## 🧪 Cómo utilizarlo

### 1. Ejecutar localmente

Como la app es completamente cliente, basta con abrir `index.html` en un navegador moderno para probarla. También puedes clonar el repositorio y servirlo desde un servidor estático:

```bash
git clone https://github.com/Pipin333/calculadoracopete.git
cd calculadoracopete
# abre index.html en el navegador de tu preferencia
```

### 2. Despliegue en GitHub Pages

El flujo de trabajo `.github/workflows/static.yml` publica automáticamente el sitio cada vez que se hace push a la rama `main`. Para habilitarlo:

1. Crea un repositorio en GitHub.
2. Copia los archivos del proyecto.
3. Habilita GitHub Pages desde la pestaña *Settings* → *Pages*.
4. Realiza un commit en la rama `main` y la acción de GitHub se encargará del despliegue.

### 3. Generar un presupuesto

1. Ingresa el **número de personas** y el **aporte por persona**.
2. Selecciona el **modo de consumo** (moderado, estándar o intenso).
3. Ajusta el **deslizador de presupuesto** entre alcohol y mixers.
4. Pulsa **Calcular**: se mostrará la combinación óptima de productos con precios y cantidades. Si deseas compartir el resultado, guarda el presupuesto y obtén el código corto para enviarlo a tus amigos.

### 4. Agregar una Bebida Nueva (Sistema Modular)

**¿Quieres agregar una bebida nueva sin editar código?**

La app ahora es 100% modular. Para agregar una bebida, solo necesitas editar `json/productos.json`:

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
    { "id": 999, "categoria": "mi_bebida", "nombre": "Mi Bebida 750ml", "tienda": "Lider", "precio": 10000, "unidades": 1, "volumenMlUnidad": 750 }
  ]
}
```

**Listo** ✅ - Recarga la página y tu bebida aparece automáticamente en el dropdown.

📖 **Para guía completa**, ver: [`docs/MASTER_DOCUMENTATION.md` → "Sistema Modular de Categorías"`](docs/MASTER_DOCUMENTATION.md)

## 🗺️ Roadmap (Abril-Julio 2026)

**Estrategia dual:** Mantener v3 en producción mientras se explora v4 en paralelo.

### 🎯 Hito 1: Lanzamiento & Recolección de Datos (Abril)
- ✅ Aplicación v3 en producción
- 📊 Google Form de validación (100+ respuestas)
- 📈 GA4 Analytics integrado
- 🐛 Documentar bugs reportados

### 🔧 Hito 2: Hotfixes v3.1 (Mayo)
- 🔨 Arreglar slider bug detectado
- 📋 Ajustar reglas de consumo (basado en form)
- 🏷️ Mejorar nombres de modos si es necesario
- ✨ Features menores

### 🏗️ Hito 3: Tech Spike v4 (Abril-Junio, paralelo)
- 🔬 Evaluación de stacks (Python/Flet, FastAPI, etc.)
- � Prototipo funcional mínimo
- 📖 Tech analysis document

### 🎬 Hito 4: Decisión (Julio 2026)
- Basada en: adopción v3, feedback del form, viabilidad técnica
- Tres escenarios: **Continue v4**, **Pause v4**, o **Kill v4**

**Para detalles completos, ver:** [`docs/ROADMAP_v4.md`](docs/ROADMAP_v4.md)

---

## 🔬 Participar en la Encuesta

¿Quieres ayudar a mejorar Cuánto Rinde?

**👉 [Responde la encuesta aquí](https://forms.gle/cuantorinde)** (3 minutos)

Tu feedback (anonimato garantizado) nos ayuda a:
- Validar que los consumos estimados sean realistas
- Mejorar la UX y nombres de modos
- Priorizar features nuevas

---

## �🧩 Extensiones y mejoras sugeridas

* **Ampliar la base de datos**: integrar scraping automático para productos de supermercados y botillerías.
* **Soporte multi-moneda**: permitir conversiones entre CLP y otras divisas.
* **Modo sin conexión**: cachear los datos de productos para funcionar sin internet.
* **Refactorizar a framework**: migrar a un framework frontend (React/Vue/Svelte) para separar mejor la lógica y la vista.
* **Mobile app nativa**: Flet (Python) o React Native

---

## 📖 Documentación

| Documento | Contenido |
|-----------|-----------|
| [`docs/MASTER_DOCUMENTATION.md`](docs/MASTER_DOCUMENTATION.md) | Documentación técnica completa |
| [`docs/SCRAPER_IMPLEMENTATION.md`](docs/SCRAPER_IMPLEMENTATION.md) | Guía de implementación de scraper de precios |
| [`SCRAPER_TODO.md`](SCRAPER_TODO.md) | Lista de tareas paso-a-paso para scraper |
| [`docs/ROADMAP_v4.md`](docs/ROADMAP_v4.md) | Plan detallado 6 meses |
| [`docs/BUGS_ANALYSIS.md`](docs/BUGS_ANALYSIS.md) | Análisis de bugs reportados |
| [`docs/GOOGLE_FORM_PREGUNTAS.md`](docs/GOOGLE_FORM_PREGUNTAS.md) | Estructura de encuesta |
| [`docs/SINTESIS_EJECUTIVA.md`](docs/SINTESIS_EJECUTIVA.md) | Resumen para el equipo |



**Creador:** [Pipin333](https://github.com/Pipin333)  
**Tech Lead / Colaborador:** Chela  
**QA / Feedback:** Santi  

Cuánto Rinde nació como proyecto personal para resolver un problema cotidiano y se ha convertido en una herramienta útil para planificar carretes de forma eficiente. 

¡**Aporta ideas, reporta bugs o colabora** para seguir mejorándola! 🍻
