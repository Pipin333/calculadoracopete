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
        react_query_state = soup.find("script", id="__REACT_QUERY_STATE__")
        if not react_query_state or not react_query_state.string:
            print(f"[Jumbo] Could not find __REACT_QUERY_STATE__ script tag for keyword '{keyword}'")
            return []
            
        data = json.loads(react_query_state.string)
        lists = find_key_recursive(data, "products")
        
        scraped_products = []
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
                if not items:
                    continue
                    
                item = items[0]
                if not isinstance(item, dict):
                    continue
                    
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
        print(f"[Jumbo] Error parsing JSON for keyword '{keyword}': {e}")
        return []
