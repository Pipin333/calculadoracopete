import urllib.parse
from playwright.sync_api import sync_playwright

DOM_CRAWLER_JS = """
() => {
    const cards = [];
    // Select all links that look like products (Spanish and English variants)
    const links = Array.from(document.querySelectorAll(
        'a[href*="/p/"], a[href*="/producto/"], a[href*="/product/"], a[href*="/productos/"], a[href*="/products/"]'
    ));
    const seenHrefs = new Set();
    
    for (const link of links) {
        let href = link.getAttribute('href');
        if (!href) continue;
        
        // Resolve relative urls
        if (href.startsWith('/')) {
            href = window.location.origin + href;
        }
        
        if (seenHrefs.has(href)) continue;
        seenHrefs.add(href);
        
        let container = link;
        let price = null;
        let name = null;
        
        // Walk up the DOM to find a container containing the price
        for (let depth = 0; depth < 10; depth++) {
            if (!container) break;
            
            const text = container.innerText || "";
            // Regex matches $ followed by digits and optionally dots (e.g. $7.690)
            const priceMatch = text.match(/\\$\\s*(\\d{1,3}(\\.\\d{3})*)/);
            if (priceMatch) {
                // Remove the dots and parse as integer
                price = parseInt(priceMatch[1].replace(/\\./g, ''));
                
                // Get the name: link text or header tags inside container
                name = link.innerText || "";
                if (!name || name.trim().length < 5) {
                    const titleEl = container.querySelector(
                        'h1, h2, h3, h4, h5, [class*="title"], [class*="name"], [class*="heading"]'
                    );
                    if (titleEl) name = titleEl.innerText;
                }
                
                // Validate name: must have letters and must not contain $
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

def perform_homepage_search(page, keyword):
    """Fills the search input on the homepage and submits it."""
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
        # Fallback to the first visible text input
        for inp in inputs:
            if inp.is_visible() and (inp.get_attribute("type") == "text" or not inp.get_attribute("type")):
                search_input = inp
                break
                
    if search_input:
        search_input.fill(keyword)
        search_input.press("Enter")
        page.wait_for_timeout(7000) # Wait for results
        return True
    return False

def scrape_store(store_name, category, keyword):
    print(f"[{store_name}] Starting Playwright scraper for '{keyword}'...")
    
    # Determine the URL and strategy
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
        need_homepage_search = False
    elif store_name == "miCocaCola":
        direct_url = "https://andina.micoca-cola.cl/"
        need_homepage_search = True
    else:
        print(f"[{store_name}] Unknown store.")
        return []
        
    with sync_playwright() as p:
        # Launch Chromium headless
        browser = p.chromium.launch(headless=True)
        # Use a realistic User-Agent
        page = browser.new_page(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800}
        )
        
        products = []
        try:
            print(f"[{store_name}] Visiting URL: {direct_url}")
            page.goto(direct_url, timeout=30000)
            page.wait_for_timeout(5000) # Initial render wait
            
            success = True
            if need_homepage_search:
                success = perform_homepage_search(page, keyword)
                
            if success:
                # Run DOM crawler JS in browser context
                raw_products = page.evaluate(DOM_CRAWLER_JS)
                print(f"[{store_name}] Scraped {len(raw_products)} raw items from page DOM.")
                
                # Format to application schema
                for item in raw_products:
                    products.append({
                        "name": item["name"],
                        "price": item["price"],
                        "brand": "", # Brand will be parsed/matched in matcher.py
                        "store": store_name,
                        "category": category
                    })
            else:
                print(f"[{store_name}] Failed to perform search on homepage.")
                
        except Exception as e:
            print(f"[{store_name}] Error during scraping: {e}")
        finally:
            browser.close()
            
    print(f"[{store_name}] Finished. Extracted {len(products)} products.")
    return products
