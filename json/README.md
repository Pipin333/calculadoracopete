# 📦 productos.json - Estructura

Este archivo es la base de datos de productos que la app lee directamente desde el cliente. Se actualiza **automáticamente todos los días** mediante el pipeline de GitHub Actions.

---

## 📖 Estructura Completa

```json
{
  "timestamp": "ISO-8601 date (cuándo se actualizó por última vez)",
  "categorias": {
    "categoria_key": {
      "nombre": "display name completo",
      "grupo": "cerveza | destilado | mixer | complemento",
      "llevaMixer": true | false,
      "mixerCategoria": "cola | sprite | ginger | redbull | tonica | jugo_watts | null",
      "mixerFactor": 0 | 2 | 2.75,
      "mixerAlternativas": ["cola", "sprite"],
      "llevaHielo": true | false,
      "displayName": "nombre que se muestra en la UI",
      "esSeleccionable": true | false
    }
  },
  "combinaciones_especiales": {},
  "total": 167,
  "productos": [
    {
      "id": 1,
      "categoria": "categoria_key",
      "nombre": "Nombre completo del producto como aparece en la tienda",
      "tienda": "Jumbo | Unimarc | La Barra | Booz | miCocaCola | Liquidos",
      "precio": 9990,
      "unidades": 1,
      "volumenMlUnidad": 750,
      "gama": "rata | normal | sobrado | neutral"
    }
  ]
}
```

---

## 🏷️ Valores Válidos

### `grupo`
| Valor | Descripción |
|-------|-------------|
| `cerveza` | Cervezas (sin mixer, sin hielo obligatorio) |
| `destilado` | Destilados que llevan mixer (pisco, ron, vodka, whiskey, gin, jäger) |
| `mixer` | Bebidas no-alcohólicas (cola, fanta, sprite, ginger, red bull, tónica, jugo) |
| `complemento` | Complementos (hielo) |

### `gama`
| Valor | Categorías | Ejemplos |
|-------|-----------|---------|
| `rata` | Destilados y cervezas baratos | Capel, Eristoff, Báltica, Escudo |
| `normal` | Estándar del mercado chileno | Mistral 35°, Absolut, Becker, Heineken |
| `sobrado` | Premium / alta gama | Grey Goose, Hendrick's, JW Black, Kunstmann |
| `neutral` | Mixers y complementos | Cola, Sprite, Hielo, Red Bull |

---

## 🎯 Uso

1. **Agregar categoría** → Editar sección `"categorias"` con los campos requeridos
2. **Agregar producto** → Agregar objeto a `"productos"` con los campos requeridos
3. **Actualizar precios** → Correr `python workers/run.py --merge` o esperar el cron diario

---

## 🔄 Ciclo de Actualización

```
GitHub Actions (04:00 AM UTC)
  ├── 6 scrapers en paralelo → json/processed_<Tienda>.json
  └── combine-and-deploy:
       ├── Deduplica: conserva el más barato por (tienda, categoría, volumen, unidades)
       ├── Fallback: datos anteriores para tiendas que fallaron
       └── Escribe este archivo con el timestamp actualizado
```

---

## ✅ Validaciones del Matcher

Antes de entrar a este archivo, cada producto pasa por `workers/matcher.py` que descarta:

- ❌ Mercadería no-bebida: cuadernos, mochilas, poleras, gorros, etc.
- ❌ Retornables / refill / envases no incluidos
- ❌ Mixers (cola, fanta, sprite, etc.) con volumen menor a 1L
- ❌ Precios fuera de rango (≤$0 o >$200.000)
- ❌ RTD/premix en categorías de destilado puro
- ❌ Productos sin keyword de categoría (ej: "pisco" para categoría piscola)
