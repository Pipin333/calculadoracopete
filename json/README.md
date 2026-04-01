# 📦 productos.json - Estructura

## 🚀 Rápido: Cómo Agregar una Bebida

**Ver:** [`docs/MASTER_DOCUMENTATION.md` → "Sistema Modular de Categorías"`](../docs/MASTER_DOCUMENTATION.md)

---

## 📖 Estructura Completa

```
{
  "timestamp": "ISO-8601 date",
  "categorias": {
    "categoria_key": {
      "nombre": "display name",
      "grupo": "cerveza|solo|mix_simple|destilado|mixer|complemento",
      "llevaMixer": boolean,
      "mixerCategoria": "bebida|tonica|redbull|null",
      "mixerFactor": 0|2|2.75,
      "llevaHielo": boolean,
      "displayName": "string (UI)",
      "esSeleccionable": boolean
    }
  },
  "combinaciones_especiales": {
    "sku_key": {
      "nombre": "string",
      "grupo": "mix_simple",
      "categoriaBase": "categoria_key",
      "llevaMixer": boolean,
      "mixerCategoria": "bebida|tonica|redbull",
      "mixerFactor": 2|2.75,
      "llevaHielo": boolean,
      "displayName": "string (UI)"
    }
  },
  "total": number,
  "productos": [
    {
      "id": number,
      "categoria": "categoria_key",
      "nombre": "string",
      "tienda": "string",
      "precio": number,
      "unidades": number,
      "volumenMlUnidad": number
    }
  ]
}
```

---

## 🎯 Uso

1. **Agregar categoría** → Editar sección `"categorias"`
2. **Agregar combinación** → Editar sección `"combinaciones_especiales"`
3. **Agregar productos** → Agregar objetos a `"productos"`

---

## 📚 Documentación

- **Cheat Sheet:** `docs/CHEAT_SHEET_CATEGORIAS.md`
- **Builder Completo:** `docs/BUILDER_CATEGORIAS.md`

---

## ✅ Validación

Asegúrate que:
- JSON es válido (sin comas faltantes)
- Todos los campos requeridos están presentes
- Las categorías tienen al menos 1 producto
- Los `grupo` son valores válidos
