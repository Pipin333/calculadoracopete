import urllib.parse
import time
import random
import base64
import json
import traceback
import re
from scrapers.utils import extract_products_from_json
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
from playwright_stealth import stealth_sync

# Standard DOM crawler JS
DOM_CRAWLER_JS = """
() => {
    const cards = [];
    const links = Array.from(document.querySelectorAll(
        'a[href*="/p/"], a[href*="/producto/"], a[href*="/product/"], a[href*="/productos/"], a[href*="/products/"]'
    ));
    const seenHrefs = new Set();
    
    for (const link of links) {
        let href = link.getAttribute('href');
        if (!href) continue;
        
        if (href.startsWith('/')) {
            href = window.location.origin + href;
        }
        
        if (seenHrefs.has(href)) continue;
        seenHrefs.add(href);
        
        let container = link;
        let price = null;
        let name = null;
        
        for (let depth = 0; depth < 10; depth++) {
            if (!container) break;
            
            const text = container.innerText || "";
            const priceMatch = text.match(/\\$\\s*(\\d{1,3}(\\.\\d{3})*)/);
            if (priceMatch) {
                price = parseInt(priceMatch[1].replace(/\\./g, ''));
                
                name = link.innerText || "";
                if (!name || name.trim().length < 5) {
                    const titleEl = container.querySelector(
                        'h1, h2, h3, h4, h5, [class*="title"], [class*="name"], [class*="heading"], [data-testid*="name"]'
                    );
                    if (titleEl) name = titleEl.innerText;
                }
                
                if (name && name.trim().length > 3 && !name.includes('$')) {
                    break;
                }
            }
            container = container.parentElement;
        }
        
        if (name && price) {
            cards.push({
                name: name.replace(/\\n/g, ' ').trim(),
                price: price,
                url: href
            });
        }
    }
    return cards;
}
"""

LD_JSON_CRAWLER_JS = """
() => {
    const cards = [];
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    scripts.forEach(script => {
        try {
            const data = JSON.parse(script.innerText);
            let items = [];
            if (data['@type'] === 'ItemList' && data.itemListElement) {
                items = data.itemListElement.map(e => e.item || e);
            } else if (data['@type'] === 'Product') {
                items = [data];
            } else if (Array.isArray(data)) {
                items = data;
            }
            
            items.forEach(item => {
                if (item && item.name && item.offers) {
                    let price = null;
                    if (item.offers.price) {
                        price = parseInt(item.offers.price);
                    } else if (Array.isArray(item.offers) && item.offers[0].price) {
                        price = parseInt(item.offers[0].price);
                    } else if (item.offers.lowPrice) {
                        price = parseInt(item.offers.lowPrice);
                    }
                    if (price) {
                        cards.push({
                            name: item.name,
                            price: price
                        });
                    }
                }
            });
        } catch(e) {}
    });
    return cards;
}
"""

def get_random_delay(mu=2.0, sigma=0.5):
    return max(0.5, random.gauss(mu, sigma))

def perform_homepage_search(page, keyword):
    inputs = page.query_selector_all("input")
    search_input = None
    for inp in inputs:
        typ = inp.get_attribute("type") or ""
        name = inp.get_attribute("name") or ""
        placeholder = inp.get_attribute("placeholder") or ""
        if "busc" in placeholder.lower() or "search" in name.lower() or typ == "search" or "busc" in name.lower():
            if inp.is_visible():
                search_input = inp
                break
                
    if not search_input and len(inputs) > 0:
        for inp in inputs:
            if inp.is_visible() and (inp.get_attribute("type") == "text" or not inp.get_attribute("type")):
                search_input = inp
                break
                
    if search_input:
        # random delay before typing
        time.sleep(get_random_delay(1.0, 0.3))
        search_input.fill(keyword)
        time.sleep(get_random_delay(0.5, 0.2))
        search_input.press("Enter")
        page.wait_for_timeout(7000) 
        return True
    return False

def scrape_store(store_name, category, keyword):
    print(f"[{store_name}] Starting robust Playwright scraper for '{keyword}'...")
    
    direct_url = None
    need_homepage_search = False
    
    if store_name == "Unimarc":
        direct_url = f"https://www.unimarc.cl/search?q={urllib.parse.quote(keyword)}"
    elif store_name == "Tottus":
        direct_url = f"https://tottus.falabella.com/tottus-cl/search?Ntt={urllib.parse.quote(keyword)}"
    elif store_name == "Booz":
        direct_url = f"https://www.booz.cl/busqueda?search={urllib.parse.quote(keyword)}"
    elif store_name == "La Barra":
        direct_url = f"https://labarra.cl/buscar?q={urllib.parse.quote(keyword)}"
    elif store_name == "Liquidos":
        direct_url = f"https://www.liquidos.cl/resultados?busqueda={urllib.parse.quote(keyword)}"
    elif store_name == "miCocaCola":
        direct_url = "https://andina.micoca-cola.cl/"
        need_homepage_search = True
    else:
        print(f"[{store_name}] Unknown store.")
        return []

    MAX_RETRIES = 3
    for attempt in range(1, MAX_RETRIES + 1):
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                viewport={"width": 1280, "height": 800}
            )
            page = context.new_page()
            stealth_sync(page) # Enable stealth to evade basic bot detections
            
            intercepted_products = []
            
            def handle_response(response):
                try:
                    content_type = response.headers.get("content-type", "")
                    if "json" in content_type:
                        url = response.url.lower()
                        if any(x in url for x in ["search", "catalog", "products", "graphql", "api"]):
                            data = response.json()
                            items = extract_products_from_json(data, "products")
                            # Extract using typical patterns if extract_products_from_json doesn't catch them
                            if not items:
                                items = extract_products_from_json(data, "items")
                            if not items:
                                items = extract_products_from_json(data, "results")
                                
                            for item in items:
                                name = item.get("name") or item.get("displayName") or item.get("title")
                                price = item.get("price")
                                if not price and "priceInfo" in item:
                                    p_info = item["priceInfo"]
                                    if isinstance(p_info, dict) and "currentPrice" in p_info and isinstance(p_info["currentPrice"], dict):
                                        price = p_info["currentPrice"].get("price")
                                    elif isinstance(p_info, dict) and "linePrice" in p_info and p_info["linePrice"]:
                                        digits = re.sub(r"\\D", "", str(p_info["linePrice"]))
                                        if digits:
                                            price = int(digits)
                                            
                                if name and price:
                                    intercepted_products.append({
                                        "name": name,
                                        "price": int(price)
                                    })
                except Exception:
                    pass

            page.on("response", handle_response)
            
            products = []
            try:
                print(f"[{store_name}] Visiting URL: {direct_url} (Attempt {attempt}/{MAX_RETRIES})")
                time.sleep(get_random_delay(1.5, 0.5))
                page.goto(direct_url, timeout=45000, wait_until="domcontentloaded")
                page.wait_for_timeout(5000) # Initial render wait
                
                success = True
                if need_homepage_search:
                    success = perform_homepage_search(page, keyword)
                    
                if success:
                    page.wait_for_timeout(3000) # Give responses a chance to finish
                    
                    if intercepted_products:
                        print(f"[{store_name}] Extracted {len(intercepted_products)} products via network response interception (API/JSON).")
                        raw_products = intercepted_products
                    else:
                        # Fallback 1: LD+JSON
                        ld_products = page.evaluate(LD_JSON_CRAWLER_JS)
                        if ld_products:
                            print(f"[{store_name}] Extracted {len(ld_products)} products via application/ld+json.")
                            raw_products = ld_products
                        else:
                            # Fallback 2: DOM scraping with fallback to semantic selectors inside the JS
                            raw_products = page.evaluate(DOM_CRAWLER_JS)
                            print(f"[{store_name}] Scraped {len(raw_products)} raw items from page DOM.")
                    
                    # Deduplicate and Format to application schema
                    seen_names = set()
                    for item in raw_products:
                        n = item["name"]
                        if n not in seen_names:
                            seen_names.add(n)
                            products.append({
                                "name": n,
                                "price": item["price"],
                                "brand": "", 
                                "store": store_name,
                                "category": category
                            })
                            
                    browser.close()
                    print(f"[{store_name}] Finished. Extracted {len(products)} products.")
                    return products
                else:
                    print(f"[{store_name}] Failed to perform search on homepage.")
                    
            except Exception as e:
                print(f"[{store_name}] Error during scraping attempt {attempt}: {e}")
                if attempt == MAX_RETRIES:
                    # Final failure, capture screenshot
                    try:
                        screenshot_bytes = page.screenshot(full_page=False)
                        b64 = base64.b64encode(screenshot_bytes).decode('utf-8')
                        print(f"[{store_name}] FINAL FAILURE SCREENSHOT (Base64): data:image/png;base64,{b64}")
                    except Exception as ss_e:
                        print(f"[{store_name}] Could not capture screenshot: {ss_e}")
                else:
                    # Exponential backoff
                    backoff = 2 ** attempt + random.uniform(0.5, 1.5)
                    print(f"[{store_name}] Retrying in {backoff:.2f}s...")
                    time.sleep(backoff)
            finally:
                try:
                    browser.close()
                except:
                    pass
                
    return []
