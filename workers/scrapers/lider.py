import json
import re
from bs4 import BeautifulSoup
from scrapers.utils import fetch_html, extract_products_from_json

def scrape_with_playwright(url):
    from playwright.sync_api import sync_playwright
    print(f"[Lider] Using Playwright fallback for URL: {url}")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        try:
            page.goto(url, timeout=30000)
            page.wait_for_timeout(5000) # Wait for page load
            # Extract __NEXT_DATA__ text
            return page.evaluate("() => document.getElementById('__NEXT_DATA__')?.innerText")
        except Exception as e:
            print(f"[Lider Playwright Fallback] Error: {e}")
            return None
        finally:
            browser.close()

def scrape(category, keyword):
    url = f"https://www.lider.cl/supermercado/search?query={keyword}"
    print(f"[Lider] Scraping keyword '{keyword}' for category '{category}'...")
    
    html = fetch_html(url)
    next_data_str = None
    
    if html:
        try:
            soup = BeautifulSoup(html, "html.parser")
            next_data = soup.find("script", id="__NEXT_DATA__")
            if next_data and next_data.string:
                next_data_str = next_data.string
        except Exception as e:
            print(f"[Lider] Soup parsing failed: {e}")
            
    if not next_data_str:
        print(f"[Lider] Could not find __NEXT_DATA__ via requests. Attempting Playwright fallback...")
        next_data_str = scrape_with_playwright(url)
        
    if not next_data_str:
        print(f"[Lider] Failed to retrieve state for keyword '{keyword}'")
        return []
        
    try:
        data = json.loads(next_data_str)
        raw_products = extract_products_from_json(data, "products")
        print(f"[Lider] Found {len(raw_products)} raw items in state.")
        
        scraped_products = []
        for item in raw_products:
            name = item.get("name") or item.get("displayName") or item.get("skuDisplayName")
            if not name:
                continue
                
            # Try to get price
            price = item.get("price")
            if not price and "priceInfo" in item:
                p_info = item["priceInfo"]
                if isinstance(p_info, dict):
                    if "currentPrice" in p_info and isinstance(p_info["currentPrice"], dict):
                        price = p_info["currentPrice"].get("price")
                    elif "linePrice" in p_info and p_info["linePrice"]:
                        digits = re.sub(r"\D", "", str(p_info["linePrice"]))
                        if digits:
                            price = int(digits)
                            
            if price is None:
                continue
                
            brand = item.get("brand") or ""
            
            scraped_products.append({
                "name": name,
                "price": int(price),
                "brand": brand,
                "store": "Lider",
                "category": category
            })
            
        print(f"[Lider] Successfully parsed {len(scraped_products)} products for keyword '{keyword}'")
        return scraped_products
    except Exception as e:
        print(f"[Lider] Error parsing JSON for keyword '{keyword}': {e}")
        return []
