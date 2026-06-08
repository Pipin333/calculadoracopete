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
    
    # Filter out accessories/glasses/garbage
    accessories = [
        "vaso", "copa", "shoper", "hielera", "dispensador", "polera", "destapador", 
        "cooler", "servicio", "juego de loza", "plancha", "plato", "galleta", "desinfectante",
        "donut", "rosquilla", "dulce", "limpieza", "aerosol", "detergente", "jabón", "jabon"
    ]
    for acc in accessories:
        if acc in name_lower:
            if name_lower.startswith(acc) or f"set {acc}" in name_lower or f"juego {acc}" in name_lower or category in ["cerveza", "piscola", "ron", "vodka", "whiskey", "gin", "jaeger"]:
                return False

    # Filter out Ready-To-Drink (RTD) / pre-mixed cocktails from pure spirits
    if category in ["piscola", "ron", "vodka", "whiskey", "gin"]:
        rtd_keywords = ["coctel", "cóctel", "cocktail", "sour", "ice", "mix", "preparado", "limonada", "cola", "sprite en lata", "lata sprite", "tonic en lata", "cola en lata"]
        if any(x in name_lower for x in rtd_keywords):
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
        return any(x in name_lower for x in ["coca-cola", "coca cola", "pepsi"]) \
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
    if category in ["bebida", "redbull", "tonica", "sprite", "jugo_watts", "hielo"]:
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
        if any(x in name_lower or x in brand_lower for x in ["capel", "tres erres", "mitjans", "control c", "control"]):
            return "rata"
        is_premium_name = any(x in name_lower for x in ["nobel", "reservado", "gran pisco", "40°", "40 grados", "46°", "46 grados", "barrica", "premium"])
        if is_premium_name and ("alto del carmen" in name_lower or "mistral" in name_lower or "bauza" in name_lower or "tres erres" in name_lower):
            return "sobrado"
        if "bauza" in name_lower or "bauza" in brand_lower:
            return "sobrado"
        return "normal"
        
    # Whiskey
    if category == "whiskey":
        if any(x in name_lower or x in brand_lower for x in ["sandy mac", "sandy", "vat 69", "vat69", "mitjans"]):
            return "rata"
        if "black" in name_lower or "chivas" in name_lower or "chivas" in brand_lower or "glenfiddich" in name_lower or "macallan" in name_lower or "double black" in name_lower or "gold label" in name_lower or "blue label" in name_lower:
            return "sobrado"
        return "normal"
        
    # Ron
    if category == "ron":
        if "mitjans" in name_lower or "mitjans" in brand_lower:
            return "rata"
        if "12" in name_lower or "zacapa" in name_lower or "zacapa" in brand_lower or "havana 7" in name_lower or "havana club 7" in name_lower:
            return "sobrado"
        return "normal"
        
    # Vodka
    if category == "vodka":
        if "mitjans" in name_lower or "mitjans" in brand_lower:
            return "rata"
        if any(x in name_lower or x in brand_lower for x in ["grey goose", "ciroc", "belvedere", "ketel"]):
            return "sobrado"
        return "normal"
        
    # Gin
    if category == "gin":
        if "larios" in name_lower or "larios" in brand_lower or "providencia" in name_lower:
            return "rata"
        if any(x in name_lower or x in brand_lower for x in ["hendrick", "tanqueray ten", "tanqueray n", "monkey 47", "monkey"]):
            return "sobrado"
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
        
    brand = raw_product.get("brand") or extract_brand(name)
    vol = extract_volume_ml(name)
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
