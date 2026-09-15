"""
Feedback Learner - Entrena y extrae reglas negativas del parser basadas
en los productos que el administrador desactiva en Firebase RTDB.
"""

import json
import re
import urllib.request
import os

FIREBASE_RTDB_URL = "https://calculadoracopete-default-rtdb.firebaseio.com/sku_status.json"
OUTPUT_RULES_PATH = os.path.join(os.path.dirname(__file__), "learned_negative_rules.json")

# Palabras legítimas del dominio de bebidas y supermercado que NUNCA deben ser marcadas como negativas
VALID_DRINK_WORDS = {
    "cerveza", "cervezas", "beer", "beers", "lager", "ale", "ipa", "stout", "pilsen", "pilsener", "pilsner",
    "pisco", "piscola", "ron", "rum", "vodka", "whisky", "whiskey", "bourbon", "scotch",
    "gin", "ginebra", "jager", "jäger", "jagermeister", "licor", "destilado",
    "coca", "cola", "sprite", "fanta", "pepsi", "tonic", "tonica", "tónica", "ginger",
    "red", "bull", "redbull", "energetica", "energética", "jugo", "watts", "nectar", "néctar",
    "hielo", "vino", "espumante", "champagne",
    "botella", "botellas", "lata", "latas", "pack", "packs", "sixpack", "twelvepack",
    "unidades", "unidad", "unid", "bolsa", "bolsas", "caja", "cajas", "paquete", "paquetes",
    "kg", "kilo", "kilos", "litro", "litros", "cc", "ml", "lt", "lts",
    "mistral", "capel", "heineken", "corona", "cristal", "escudo", "royal", "stella", "kross",
    "austral", "kunstmann", "budweiser", "baltica", "becker", "alto", "carmen", "havana",
    "bacardi", "smirnoff", "absolut", "johnnie", "walker", "chivas", "jack", "daniels",
    "tanqueray", "bombay", "beefeater", "original", "zero", "light", "sin azucar", "sin azúcar",
    "frio", "frío", "fria", "fría", "helado", "helada", "transparente", "color", "sabor",
    "grande", "grandes", "chico", "chica", "mediano", "mediana", "extra", "doble",
    "retornable", "desechable", "reciclable", "promo", "oferta", "formato"
}

# Stopwords gramaticales comunes
STOPWORDS = {
    "de", "del", "la", "el", "los", "las", "un", "una", "unos", "unas",
    "en", "con", "sin", "por", "para", "y", "o", "a", "al", "e", "u",
    "pack", "packs", "unid", "unidades", "botella", "botellas", "lata", "latas", "cc", "ml", "litro", "litros",
    "1", "2", "3", "4", "5", "6", "10", "12", "24", "grados", "grande", "color", "cm", "mm",
    "hogar", "viaje", "viajes", "carretera", "pesca", "acampada", "forma", "edición", "edicion",
    "deluxe", "vintage", "elegantes", "decorativos", "modelo", "colección", "coleccion", "piezas", "pieza"
}

# Palabras clave explícitas de marketplace y falsos positivos
KNOWN_MARKETPLACE_PATTERNS = [
    "decantador", "decantadores", "cojin", "cojín", "cojines", "almohada", "almohadas",
    "shampoo", "jabon", "jabón", "crema", "peluche", "peluches",
    "figura", "figura de accion", "figura de acción", "muñeco", "hasbro",
    "papel de regalo", "musica", "música", "vinilo", "cd",
    "jarra", "tetera", "taza", "tazon", "tazón", "vaso", "copa", "posavasos",
    "nevera", "mininevera", "cooler", "congelador", "termo",
    "reutilizable", "reutilizables", "gel", "compresa", "compresas", "lesion", "lesiones", "herida", "heridas", "alivio",
    "guarda corchos", "bloques de hielo", "paquete frio", "paquete frío",
    "bolsa termica", "bolsa térmica", "mentos", "masticables", "clamato",
    "cubitera", "hielera", "molde", "moldes", "maquina de hielo", "máquina de hielo",
    "sacacorchos", "descorchador", "coctelera", "shaker", "petaca", "estuche", "funda",
    "letrero", "cuadro", "llavero", "adorno", "transductor", "parabrisas", "patines", "rodillo de hielo"
]

def fetch_deactivated_skus():
    """Descarga los SKUs marcados con active === false desde Firebase Realtime Database."""
    print(f"[Learner] Consultando Firebase RTDB en {FIREBASE_RTDB_URL}...")
    try:
        req = urllib.request.urlopen(FIREBASE_RTDB_URL, timeout=8)
        raw_data = json.loads(req.read().decode('utf-8'))
        if not raw_data:
            print("[Learner] No se encontraron registros de sku_status en Firebase.")
            return []

        deactivated = []
        for key, item in raw_data.items():
            if isinstance(item, dict) and item.get("active") is False:
                deactivated.append({
                    "safeKey": key,
                    "nombre": item.get("nombre", ""),
                    "tienda": item.get("tienda", ""),
                    "updatedAt": item.get("updatedAt", ""),
                    "updatedBy": item.get("updatedBy", "")
                })
        print(f"[Learner] Se obtuvieron {len(deactivated)} SKUs desactivados por el administrador.")
        return deactivated
    except Exception as e:
        print(f"[Learner] Error consultando Firebase: {e}")
        return []

def extract_negative_rules(deactivated_items):
    """
    Analiza los productos desactivados por administradores y aprende:
    1. Lista exacta de safeKeys bloqueados.
    2. Lista exacta de nombres prohibidos.
    3. Palabras clave filtradas que delatan marketplace (excluyendo términos de bebestibles).
    """
    exact_names = set()
    exact_keys = set()
    token_freq = {}

    for item in deactivated_items:
        name = item.get("nombre", "").strip()
        key = item.get("safeKey", "").strip()
        if not name:
            continue

        exact_names.add(name.lower())
        if key:
            exact_keys.add(key)

        # Tokenización y limpieza
        cleaned = re.sub(r"[^\w\s]", " ", name.lower())
        words = [
            w for w in cleaned.split()
            if len(w) >= 4 and w not in STOPWORDS and w not in VALID_DRINK_WORDS
        ]

        # Conteo de tokens sospechosos
        for w in words:
            token_freq[w] = token_freq.get(w, 0) + 1

    learned_keywords = set(KNOWN_MARKETPLACE_PATTERNS)
    # Incluir tokens que aparecen en items desactivados al menos 2 veces y no son bebestibles ni stopwords
    for token, freq in token_freq.items():
        if freq >= 2:
            learned_keywords.add(token)

    return {
        "total_deactivated": len(deactivated_items),
        "exact_keys": sorted(list(exact_keys)),
        "exact_names": sorted(list(exact_names)),
        "learned_keywords": sorted(list(learned_keywords))
    }

OUTPUT_CATEGORY_OVERRIDES_PATH = os.path.join(os.path.dirname(__file__), "learned_category_overrides.json")

def fetch_sku_data():
    """Descarga los SKUs marcados desde Firebase Realtime Database."""
    print(f"[Learner] Consultando Firebase RTDB en {FIREBASE_RTDB_URL}...")
    try:
        req = urllib.request.urlopen(FIREBASE_RTDB_URL, timeout=8)
        raw_data = json.loads(req.read().decode('utf-8'))
        if not raw_data:
            print("[Learner] No se encontraron registros de sku_status en Firebase.")
            return [], {}

        deactivated = []
        category_overrides = {}

        for key, item in raw_data.items():
            if not isinstance(item, dict):
                continue
            if item.get("active") is False:
                deactivated.append({
                    "safeKey": key,
                    "nombre": item.get("nombre", ""),
                    "tienda": item.get("tienda", ""),
                    "updatedAt": item.get("updatedAt", ""),
                    "updatedBy": item.get("updatedBy", "")
                })
            if item.get("categoria"):
                category_overrides[key] = {
                    "categoria": item.get("categoria"),
                    "nombre": item.get("nombre", ""),
                    "tienda": item.get("tienda", ""),
                    "updatedAt": item.get("updatedAt", "")
                }

        print(f"[Learner] Se obtuvieron {len(deactivated)} SKUs desactivados y {len(category_overrides)} categorías reasignadas.")
        return deactivated, category_overrides
    except Exception as e:
        print(f"[Learner] Error consultando Firebase: {e}")
        return [], {}

def sync_and_save_rules():
    """Ejecuta el ciclo de aprendizaje completo y guarda las reglas en JSON."""
    deactivated, category_overrides = fetch_sku_data()

    # 1. Reglas negativas
    if not deactivated:
        if os.path.exists(OUTPUT_RULES_PATH):
            print("[Learner] Conservando reglas negativas previas existentes.")
            with open(OUTPUT_RULES_PATH, "r", encoding="utf-8") as f:
                rules = json.load(f)
        else:
            rules = {
                "total_deactivated": 0,
                "exact_keys": [],
                "exact_names": [],
                "learned_keywords": sorted(KNOWN_MARKETPLACE_PATTERNS)
            }
    else:
        rules = extract_negative_rules(deactivated)

    with open(OUTPUT_RULES_PATH, "w", encoding="utf-8") as f:
        json.dump(rules, f, ensure_ascii=False, indent=2)

    # 2. Reglas de categorías reasignadas por admin
    if category_overrides or not os.path.exists(OUTPUT_CATEGORY_OVERRIDES_PATH):
        with open(OUTPUT_CATEGORY_OVERRIDES_PATH, "w", encoding="utf-8") as f:
            json.dump(category_overrides, f, ensure_ascii=False, indent=2)

    print(f"[Learner] Reglas aprendidas guardadas con éxito en {OUTPUT_RULES_PATH}:")
    print(f"  • {len(rules['exact_keys'])} SKUs exactos bloqueados.")
    print(f"  • {len(rules['exact_names'])} nombres bloqueados.")
    print(f"  • {len(rules['learned_keywords'])} palabras clave de marketplace identificadas.")
    print(f"  • {len(category_overrides)} categorías reasignadas por administradores en {OUTPUT_CATEGORY_OVERRIDES_PATH}.")
    return rules

if __name__ == "__main__":
    sync_and_save_rules()
