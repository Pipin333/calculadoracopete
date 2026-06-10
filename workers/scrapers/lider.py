import json
import re
import time
import random
import base64
from bs4 import BeautifulSoup
from scrapers.utils import fetch_html, extract_products_from_json
from playwright.sync_api import sync_playwright
from playwright_stealth import Stealth

def scrape_with_playwright(url):
    print(f"[Lider] Using robust Playwright fallback for URL: {url}")
    
    MAX_RETRIES = 3
    for attempt in range(1, MAX_RETRIES + 1):
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            page = context.new_page()
            Stealth().apply_stealth_sync(page)
            try:
                # Random delay
                time.sleep(max(0.5, random.gauss(1.5, 0.5)))
                page.goto(url, timeout=30000)
                page.wait_for_timeout(5000) # Wait for page load
                # Extract __NEXT_DATA__ text
                result = page.evaluate("() => document.getElementById('__NEXT_DATA__')?.innerText")
                if result:
                    browser.close()
                    return result
            except Exception as e:
                print(f"[Lider Playwright Fallback] Error on attempt {attempt}: {e}")
                if attempt == MAX_RETRIES:
                    try:
                        screenshot_bytes = page.screenshot(full_page=False)
                        b64 = base64.b64encode(screenshot_bytes).decode('utf-8')
                        print(f"[Lider] FINAL FAILURE SCREENSHOT (Base64): data:image/png;base64,{b64}")
                    except Exception as ss_e:
                        print(f"[Lider] Could not capture screenshot: {ss_e}")
                else:
                    backoff = 2 ** attempt + random.uniform(0.5, 1.5)
                    time.sleep(backoff)
            finally:
                try:
                    browser.close()
                except:
                    pass
    return None

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
