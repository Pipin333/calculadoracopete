import sys
import os
import json
import datetime

# Ensure the workers directory is on the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from scrapers import lider, jumbo, labarra, playwright_scrapers
import matcher

def load_config():
    config_path = os.path.join(os.path.dirname(__file__), "config.json")
    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)

def run():
    config = load_config()
    search_queries = config["search_queries"]
    stores = config["stores"]
    output_file_relative = config["settings"]["output_file"]
    
    # Path to original productos.json
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    output_path = os.path.join(base_dir, output_file_relative)
    
    print(f"Starting Cuánto Rinde Price Scraper at {datetime.datetime.now()}")
    print(f"Output path: {output_path}")
    
    # Load existing productos.json to preserve categories and fallback products
    existing_data = {}
    if os.path.exists(output_path):
        try:
            with open(output_path, "r", encoding="utf-8") as f:
                existing_data = json.load(f)
            print(f"Loaded existing products file. Found {len(existing_data.get('productos', []))} products.")
        except Exception as e:
            print(f"Error loading existing products file: {e}")
            
    # Initialize empty containers for fresh results
    raw_results = []
    
    # Run scrapers for each store, category, and keyword
    # To avoid rate limiting or timeouts, we loop sequentially
    for store in stores:
        print(f"\n==========================================")
        print(f"Scraping store: {store}")
        print(f"==========================================")
        
        # Translate to correct crawler store name
        store_key = store
        if store == "Booze":
            store_key = "Booz" # Spelling fix
            
        for category, keywords in search_queries.items():
            for keyword in keywords:
                try:
                    scraped = []
                    if store == "Lider":
                        scraped = lider.scrape(category, keyword)
                    elif store == "Jumbo":
                        scraped = jumbo.scrape(category, keyword)
                    elif store == "La Barra":
                        scraped = labarra.scrape(category, keyword)
                    else:
                        # Unimarc, Booz, miCocaCola, Liquidos
                        scraped = playwright_scrapers.scrape_store(store_key, category, keyword)
                        
                    if scraped:
                        raw_results.extend(scraped)
                except Exception as e:
                    print(f"Error scraping {store} for category {category}, keyword '{keyword}': {e}")
                    
    print(f"\nScraping complete. Total raw products scraped: {len(raw_results)}")
    
    # Process and match products
    processed_products = []
    for raw_p in raw_results:
        try:
            matched = matcher.process_product(raw_p)
            if matched:
                processed_products.append(matched)
        except Exception as e:
            print(f"Error processing raw product {raw_p.get('name')}: {e}")
            
    print(f"Total matched and validated products: {len(processed_products)}")
    
    # Group and deduplicate to select the cheapest option per unique combination
    # Unique combo = (tienda, categoria, volumenMlUnidad, unidades)
    # We want to keep the cheapest brand/product for each size
    cheapest_lookup = {}
    for p in processed_products:
        key = (p["tienda"], p["categoria"], p["volumenMlUnidad"], p["unidades"])
        if key not in cheapest_lookup:
            cheapest_lookup[key] = p
        else:
            # Keep the cheaper one
            if p["precio"] < cheapest_lookup[key]["precio"]:
                cheapest_lookup[key] = p
                
    fresh_products = list(cheapest_lookup.values())
    print(f"Deduplicated to {len(fresh_products)} unique price options.")
    
    # Identify which stores succeeded
    succeeded_stores = set(p["tienda"] for p in fresh_products)
    print(f"Successfully scraped stores: {list(succeeded_stores)}")
    
    # Merge strategy: Replace products for succeeded stores, keep old products for failed stores
    merged_products = []
    
    # 1. Add fresh products
    merged_products.extend(fresh_products)
    
    # 2. Add fallback old products for stores that failed to scrape
    if "productos" in existing_data:
        for old_p in existing_data["productos"]:
            # Normalise store name
            old_store = old_p.get("tienda")
            if old_store not in succeeded_stores:
                merged_products.append(old_p)
                
    # Assign unique IDs
    for idx, p in enumerate(merged_products):
        p["id"] = idx + 1
        
    # Build final JSON payload
    final_data = {
        "timestamp": datetime.datetime.now().isoformat(),
        "categorias": existing_data.get("categorias", {}),
        "combinaciones_especiales": existing_data.get("combinaciones_especiales", {}),
        "total": len(merged_products),
        "productos": merged_products
    }
    
    # Write to file
    try:
        # Create output directories if they don't exist
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(final_data, f, indent=2, ensure_ascii=False)
        print(f"\nSUCCESS: Updated products database written to {output_path} ({len(merged_products)} total products).")
    except Exception as e:
        print(f"Error writing output file: {e}")

if __name__ == "__main__":
    run()
