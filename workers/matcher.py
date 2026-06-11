import re

# List of common alcohol brands to extract if missing
BRANDS = [
    "Alto del Carmen", "Mistral", "Capel", "Tres Erres", "Control C", "Bauza", # Pisco
    "Stella Artois", "Heineken", "Corona", "Budweiser", "Royal Guard", "Escudo", "Cristal", "Becker", "Kross", "Kunstmann", "Baltica", "Patagonia", "Austral", # Cerveza
    "Bacardi", "Havana Club", "Flor de Caña", "Pampero", "Appleton", "Mitjans", # Ron
    "Smirnoff", "Absolut", "Grey Goose", "Stolichnaya", "Wyborowa", # Vodka
    "Johnnie Walker", "Jack Daniel", "Chivas Regal", "Ballantine", "Sandy Mac", "Jim Beam", "Vat 69", # Whisky
    "Beefeater", "Tanqueray", "Bombay Sapphire", "Hendrick", "Larios", # Gin
    "Jägermeister", "Jaeger", "Jagermeister", # Jäger
    "Coca-Cola", "Coca Cola", "Sprite", "Fanta", "Nordic", "Canada Dry", "Kem", "Quatro" # Bebidas
]

def clean_name(name):
    """Cleans up product name strings."""
    if not name:
        return ""
    # Remove excessive spaces
    name = re.sub(r"\s+", " ", name)
    # Remove HTML entities
    name = name.replace("&nbsp;", " ")
    return name.strip()

def extract_brand(name):
    """Attempts to match a brand name from the product title."""
    name_lower = name.lower()
    for brand in BRANDS:
        if brand.lower() in name_lower:
            return brand
    return ""

def extract_volume_ml(name):
    """Extracts volume per unit in milliliters (ml) from product name."""
    name_lower = name.lower()
    
    # 1. Look for milliliters or cc (e.g. 750ml, 750 ml, 750cc, 750 cc)
    ml_match = re.search(r"(\d+)\s*(?:ml|cc|cm3|mililitros)\b", name_lower)
    if ml_match:
        val = int(ml_match.group(1))
        # Guard against absurd values (e.g. a pack of 24x350ml might match 350, which is correct)
        if 50 <= val <= 5000:
            return val
            
    # 2. Look for float liters (e.g. 1.5L, 1.5 L, 1,5L, 2.5 litros)
    liters_float = re.search(r"(\d+[\.,]\d+)\s*(?:l|lt|lts|litro|litros|ltr|ltrs)\b", name_lower)
    if liters_float:
        val_str = liters_float.group(1).replace(",", ".")
        try:
            return int(float(val_str) * 1000)
        except ValueError:
            pass
            
    # 3. Look for integer liters (e.g. 1L, 2 L, 1 Litro)
    liters_int = re.search(r"\b(\d+)\s*(?:l|lt|lts|litro|litros|ltr|ltrs)\b", name_lower)
    if liters_int:
        val = int(liters_int.group(1))
        # Ensure we aren't matching large numbers like $5990 or a year
        if 1 <= val <= 10:
            return val * 1000
            
    # Default fallbacks based on category keywords in name
    if "pisco" in name_lower or "ron" in name_lower or "vodka" in name_lower or "whisky" in name_lower or "whiskey" in name_lower or "gin" in name_lower or "jager" in name_lower:
        return 750
    if "coca" in name_lower or "sprite" in name_lower or "fanta" in name_lower or "bebida" in name_lower:
        if "3L" in name or "3 L" in name or "3litros" in name_lower:
            return 3000
        elif "2.5" in name or "2,5" in name:
            return 2500
        elif "1.5" in name or "1,5" in name:
            return 1500
        return 1500 # Default mixer volume
    if "hielo" in name_lower:
        return 2000 # Default 2kg
        
    return 330 # Default beer or generic can volume

def extract_units(name):
    """Extracts pack size (number of units) from the product name."""
    name_lower = name.lower()
    
    # Check word numbers
    if "six pack" in name_lower or "sixpack" in name_lower:
        return 6
    if "twelve pack" in name_lower or "twelvepack" in name_lower:
        return 12
    if "twenty four pack" in name_lower or "24 pack" in name_lower or "24pack" in name_lower:
        return 24
        
    # Match patterns like "pack de 6", "pack 6", "pack 24"
    pack_match = re.search(r"pack\s+(?:de\s+)?(\d+)", name_lower)
    if pack_match:
        return int(pack_match.group(1))
        
    # Match patterns like "6 pack", "12 pack", "24 pack"
    pack_match2 = re.search(r"(\d+)\s*pack", name_lower)
    if pack_match2:
        return int(pack_match2.group(1))
        
    # Match patterns like "x6", "x12", "x24" at boundaries
    x_match = re.search(r"\bx(\d+)\b", name_lower)
    if x_match:
        val = int(x_match.group(1))
        if 2 <= val <= 40:
            return val
            
    # Match patterns like "6 un", "12 un", "24 un", "6 unidades"
    un_match = re.search(r"(\d+)\s*(?:un|unid|unidades|latas|botellas)\b", name_lower)
    if un_match:
        val = int(un_match.group(1))
        if 2 <= val <= 50:
            return val
            
    return 1

def validate_category(name, category):
    """Validates that a product fits the target category (filters out glasses, false search hits, etc.)."""
    name_lower = name.lower()
    
    # Filter out non-drink merchandise, school supplies, clothing, and toys
    merchandise = [
        "cuaderno", "libreta", "mochila", "bolso", "cartera", "polerón", "poleron", "polera",
        "gorro", "jockey", "juguete", "auto", "miniatura", "tazón", "taza", "tazon",
        "parca", "chaqueta", "estuche", "lápiz", "lapiz", "goma", "regla", "agenda",
        "termo", "llavero", "sticker", "adhesivo", "juego de mesa", "paraguas", 
        "audífonos", "audifonos", "parlante", "gorra", "lentes", "anteojos"
    ]
    if any(m in name_lower for m in merchandise):
        return False
        
    # Filter out accessories/glasses/garbage/chocolates
    accessories = [
        "vaso", "copa", "shoper", "hielera", "dispensador", "polera", "destapador", 
        "cooler", "servicio", "juego de loza", "plancha", "plato", "galleta", "desinfectante",
        "donut", "rosquilla", "dulce", "limpieza", "aerosol", "detergente", "jabón", "jabon",
        "bombón", "bombon", "bombones", "chocolate", "chocolates", "trufa", "trufas"
    ]
    for acc in accessories:
        if acc in name_lower:
            if name_lower.startswith(acc) or f"set {acc}" in name_lower or f"juego {acc}" in name_lower or category in ["cerveza", "piscola", "ron", "vodka", "whiskey", "gin", "jaeger"]:
                return False

    # Filter out Ready-To-Drink (RTD) / pre-mixed cocktails from pure spirits
    if category in ["piscola", "ron", "vodka", "whiskey", "gin", "jaeger"]:
        rtd_keywords = ["coctel", "cóctel", "cocktail", "sour", "ice", "mix", "preparado", "limonada", "cola", "sprite en lata", "lata sprite", "tonic en lata", "cola en lata", "lata", "latas"]
        if any(x in name_lower for x in rtd_keywords):
            return False

    # Filter out alcohol/cocktails from mixer categories (mixers must be non-alcoholic)
    if category in ["cola", "fanta", "ginger", "redbull", "tonica", "sprite", "jugo_watts"]:
        has_alcohol_word = re.search(r"\b(pisco|ron|rum|vodka|gin|gintonic|whisky|whiskey|jager|jagermeister|coctel|cóctel|cocktail|sour|licor)\b", name_lower) is not None
        has_degrees = any(x in name_lower for x in ["5°", "5 grados", "40°", "35°", "grados"])
        if has_alcohol_word or has_degrees:
            return False

    if category == "cerveza":
        # Do NOT allow "pack" or "lata" by themselves as they match cookies, soda, donuts, etc.
        beer_keywords = ["cerveza", "beer", "pilsen", "lager", "ale", "stout", "ipa", "escudo", "cristal", "becker", "royal", "heineken", "stella", "corona", "kross", "kunstmann", "austral", "budweiser", "coors", "sol", "baltica", "patagonia"]
        return any(x in name_lower for x in beer_keywords)
    elif category == "piscola":
        return "pisco" in name_lower
    elif category == "ron":
        return "ron" in name_lower or "rum" in name_lower
    elif category == "vodka":
        return "vodka" in name_lower
    elif category == "whiskey":
        return "whisky" in name_lower or "whiskey" in name_lower
    elif category == "gin":
        # Avoid matching "original" or "ginger ale" as "gin".
        has_gin = re.search(r"\bgin\b|\bginebra\b", name_lower) is not None
        return has_gin and "ginger" not in name_lower
    elif category == "jaeger":
        return "jager" in name_lower or "jäger" in name_lower
    elif category == "cola":
        # Colas: Coca-Cola, Pepsi y variantes
        return any(x in name_lower for x in ["coca-cola", "coca cola", "pepsi", "sabor original", "bebida original"]) \
            and not any(y in name_lower for y in ["sprite", "canada dry", "7up", "tonica", "tónica", "jugo", "red bull", "redbull"])
    elif category == "fanta":
        # Bebidas de naranja/sabor: Fanta, Crush
        return any(x in name_lower for x in ["fanta", "crush"]) \
            and "naranja" not in name_lower or "fanta" in name_lower
    elif category == "ginger":
        # Ginger ales: Canada Dry, Nordic Ginger, Schweppes Ginger
        return any(x in name_lower for x in ["canada dry", "nordic ginger", "schweppes ginger"])
    elif category == "redbull":
        return "red bull" in name_lower or "redbull" in name_lower or "energ" in name_lower
    elif category == "tonica":
        return "tonica" in name_lower or "tónica" in name_lower
    elif category == "sprite":
        # Lima-limón: Sprite, 7Up
        return "sprite" in name_lower or "7up" in name_lower
    elif category == "jugo_watts":
        # Exclude powdered juice (polvo, sobre, livean, zuko, tang, yupi)
        is_juice = "jugo" in name_lower or "watts" in name_lower
        is_powder = any(x in name_lower for x in ["polvo", "sobre", "livean", "zuko", "tang", "yupi"])
        return is_juice and not is_powder
    elif category == "hielo":
        return "hielo" in name_lower
        
    return True

def classify_gama(name, brand, category):
    """Classifies a product into: 'rata', 'normal', 'sobrado' or 'neutral'."""
    name_lower = name.lower()
    brand_lower = (brand or "").lower()
    
    # Non-alcoholic mixers and ice are always neutral to avoid breaking solver paths
    if category in ["cola", "fanta", "ginger", "redbull", "tonica", "sprite", "jugo_watts", "hielo"]:
        return "neutral"
        
    # Beer (cerveza)
    if category == "cerveza":
        if any(x in name_lower or x in brand_lower for x in ["baltica", "cristal", "becker", "escudo", "dorada", "pilsen"]):
            return "rata"
        if any(x in name_lower or x in brand_lower for x in ["patagonia", "austral", "kunstmann", "kross", "blue moon", "leffe", "erdinger", "artesanal", "craft"]):
            return "sobrado"
        return "normal"
        
    # Pisco (piscola)
    if category == "piscola":
        if any(x in name_lower or x in brand_lower for x in ["capel", "mitjans", "control c", "control", "la serena"]):
            return "rata"
        is_basic_35 = "35°" in name_lower or "35 grados" in name_lower or "especial" in name_lower
        if is_basic_35 and ("mistral" in name_lower or "alto del carmen" in name_lower):
            return "normal"
        is_sobrado_brand = any(x in name_lower or x in brand_lower for x in ["gobernador", "horcón quemado", "horcon quemado", "waqar", "bauzá", "bauza", "diablo"])
        is_premium_version = any(x in name_lower for x in ["nobel", "reservado", "reservada", "gran pisco", "40°", "40 grados", "46°", "46 grados", "barrica", "premium", "envejecido", "añejado", "edición limitada", "edicion limitada"])
        if is_sobrado_brand or is_premium_version:
            return "sobrado"
        return "normal"
        
    # Ron
    if category == "ron":
        is_sobrado_brand = any(x in name_lower or x in brand_lower for x in ["zacapa", "appleton"])
        is_sobrado_version = ("havana" in name_lower and "7" in name_lower) or \
                             ("flor de caña" in name_lower and any(y in name_lower for y in ["12", "15", "18", "25"])) or \
                             ("flor de cana" in name_lower and any(y in name_lower for y in ["12", "15", "18", "25"]))
        if is_sobrado_brand or is_sobrado_version:
            return "sobrado"
        is_basic_pampero = "pampero" in name_lower and not any(y in name_lower for y in ["aniversario", "oro", "seleccion", "selección"])
        if any(x in name_lower or x in brand_lower for x in ["cabo viejo", "maddero", "sierra morena", "mitjans"]) or is_basic_pampero:
            return "rata"
        return "normal"
        
    # Vodka
    if category == "vodka":
        if any(x in name_lower or x in brand_lower for x in ["grey goose", "ciroc", "cîroc", "belvedere", "ketel one", "ketel"]):
            return "sobrado"
        if any(x in name_lower or x in brand_lower for x in ["ustinov", "puklaro", "eristoff", "kova", "gator", "mitjans"]):
            return "rata"
        return "normal"
        
    # Whiskey
    if category == "whiskey":
        is_sobrado_brand = any(x in name_lower or x in brand_lower for x in ["chivas", "glenfiddich", "macallan", "glenlivet", "glenmorangie", "singleton", "talisker", "cardhu"])
        is_sobrado_version = ("johnnie walker" in name_lower and not any(y in name_lower for y in ["red label", "red", "white"])) or \
                             ("jack daniel" in name_lower and any(y in name_lower for y in ["single barrel", "gentleman", "gold", "sinatra"]))
        if is_sobrado_brand or is_sobrado_version:
            return "sobrado"
        if any(x in name_lower or x in brand_lower for x in ["blenders pride", "blender's pride", "white horse", "passport", "100 pipers", "sandy mac", "sandy", "vat 69", "vat69", "mitjans"]):
            return "rata"
        return "normal"
        
    # Gin
    if category == "gin":
        is_sobrado_brand = any(x in name_lower or x in brand_lower for x in ["hendrick", "monkey 47", "monkey47"])
        is_sobrado_version = "tanqueray" in name_lower and "ten" in name_lower
        if is_sobrado_brand or is_sobrado_version:
            return "sobrado"
        is_basic_larios = "larios" in name_lower and not any(y in name_lower for y in ["12", "rose", "rosé"])
        is_basic_providencia = "providencia" in name_lower and not any(y in name_lower for y in ["premium", "robusto", "botanico", "botánico"])
        if any(x in name_lower or x in brand_lower for x in ["lordson", "brighton"]) or is_basic_larios or is_basic_providencia:
            return "rata"
        return "normal"
        
    # Jaeger
    if category == "jaeger":
        return "normal"
        
    return "normal"

def process_product(raw_product):
    """Processes, cleans and formats a raw scraped product into the application schema."""
    name = clean_name(raw_product["name"])
    category = raw_product["category"]
    
    if not validate_category(name, category):
        return None
        
    price = raw_product["price"]
    # Guard against zero or negative prices, or extreme outliers
    if price <= 0 or price > 200000:
        return None
        
    # Exclude returnable / refill / empty container products across all categories
    name_lower = name.lower()
    exclude_keywords = ["retornable", "refill", "no incluye envase", "no incluye envases", "sólo envase", "solo envase", "mas envase", "más envase", "+ envase", "+envase"]
    if any(x in name_lower for x in exclude_keywords):
        return None
        
    brand = raw_product.get("brand") or extract_brand(name)
    vol = extract_volume_ml(name)
    
    # Exclude mixer sizes smaller than 1L (1000ml) except for Red Bull/energy drinks
    mixer_categories = ["cola", "fanta", "ginger", "sprite", "tonica", "jugo_watts"]
    if category in mixer_categories and vol < 1000:
        return None
        
    units = extract_units(name)
    gama = classify_gama(name, brand, category)
    
    return {
        "categoria": category,
        "nombre": name,
        "tienda": raw_product["store"],
        "precio": price,
        "unidades": units,
        "volumenMlUnidad": vol,
        "gama": gama
    }
