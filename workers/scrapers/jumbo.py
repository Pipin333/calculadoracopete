import json
from bs4 import BeautifulSoup
from scrapers.utils import fetch_html, find_key_recursive

def scrape(category, keyword):
    url = f"https://www.jumbo.cl/busqueda?ft={keyword}"
    print(f"[Jumbo] Scraping keyword '{keyword}' for category '{category}'...")
    
    html = fetch_html(url)
    if not html:
        print(f"[Jumbo] Failed to fetch HTML for keyword '{keyword}'")
        return []
        
    try:
        soup = BeautifulSoup(html, "html.parser")
        scraped_products = []
        seen_names = set()
        
        # 1. Método moderno: Parsear application/ld+json (Schema.org ItemList)
        ld_scripts = soup.find_all("script", type="application/ld+json")
        for s in ld_scripts:
            if not s.string:
                continue
            try:
                data = json.loads(s.string)
                if isinstance(data, dict) and data.get("@type") == "ItemList":
                    items = data.get("itemListElement", [])
                    for entry in items:
                        prod = entry.get("item", {})
                        name = prod.get("name")
                        if not name or name in seen_names:
                            continue
                            
                        # Extraer precio
                        price = None
                        offers = prod.get("offers", {})
                        if isinstance(offers, dict):
                            price = offers.get("price")
                        elif isinstance(offers, list) and offers:
                            price = offers[0].get("price")
                            
                        if price is None:
                            price = prod.get("price")
                            
                        if price is None:
                            continue
                            
                        brand = ""
                        brand_obj = prod.get("brand")
                        if isinstance(brand_obj, dict):
                            brand = brand_obj.get("name", "")
                        elif isinstance(brand_obj, str):
                            brand = brand_obj
                            
                        image = prod.get("image")
                        if isinstance(image, list) and image:
                            image = image[0]
                            
                        seen_names.add(name)
                        scraped_products.append({
                            "name": name,
                            "price": int(float(str(price))),
                            "brand": brand,
                            "store": "Jumbo",
                            "category": category,
                            "imageUrl": image if isinstance(image, str) else None
                        })
            except Exception as e:
                continue
                
        if scraped_products:
            print(f"[Jumbo] Successfully parsed {len(scraped_products)} products via ld+json for keyword '{keyword}'")
            return scraped_products
            
        # 2. Fallback legacy (__REACT_QUERY_STATE__)
        react_query_state = soup.find("script", id="__REACT_QUERY_STATE__")
        if react_query_state and react_query_state.string:
            data = json.loads(react_query_state.string)
            lists = find_key_recursive(data, "products")
            seen_ids = set()
            for lst in lists:
                if not isinstance(lst, list):
                    continue
                for prod in lst:
                    if not isinstance(prod, dict):
                        continue
                    product_id = prod.get("productId")
                    if not product_id or product_id in seen_ids:
                        continue
                    seen_ids.add(product_id)
                    brand = prod.get("brand") or ""
                    items = prod.get("items", [])
                    if not items or not isinstance(items[0], dict):
                        continue
                    item = items[0]
                    name = item.get("name") or prod.get("slug")
                    price = item.get("price")
                    if not name or price is None:
                        continue
                    scraped_products.append({
                        "name": name,
                        "price": int(price),
                        "brand": brand,
                        "store": "Jumbo",
                        "category": category
                    })
                    
        print(f"[Jumbo] Successfully parsed {len(scraped_products)} products for keyword '{keyword}'")
        return scraped_products
    except Exception as e:
        print(f"[Jumbo] Error parsing HTML for keyword '{keyword}': {e}")
        return []
