import sys
import os
import json
import datetime

# Ensure the workers directory is on the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from scrapers import lider, jumbo, labarra, playwright_scrapers
import matcher

import argparse

def load_config():
    config_path = os.path.join(os.path.dirname(__file__), "config.json")
    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)

def scrape_store_products(store, search_queries):
    """Scrapes all categories and keywords for a single store, returning raw results."""
    raw_results = []
    # Translate to correct crawler store name
    store_key = store
    if store == "Booze":
        store_key = "Booz" # Spelling fix
        
    for category, keywords in search_queries.items():
        for keyword in keywords:
            try:
                print(f"Scraping category: {category}, keyword: '{keyword}'...")
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
    return raw_results

def process_raw_results(raw_results):
    """Processes, validates and matches raw results using the matcher."""
    processed_products = []
    for raw_p in raw_results:
        try:
            matched = matcher.process_product(raw_p)
            if matched:
                processed_products.append(matched)
        except Exception as e:
            print(f"Error processing raw product {raw_p.get('name')}: {e}")
    return processed_products

def run():
    parser = argparse.ArgumentParser(description="Cuanto Rinde Scraper & Merger")
    parser.add_argument("--store", type=str, help="Scrape and match only a specific store")
    parser.add_argument("--merge", action="store_true", help="Merge store-specific processed files into the main database")
    args = parser.parse_args()

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

    # Mode 1: Scrape a single store
    if args.store:
        store = args.store
        if store not in stores:
            print(f"ERROR: Store '{store}' is not in the configured stores list: {stores}")
            sys.exit(1)
            
        print(f"\n==========================================")
        print(f"Running in SINGLE STORE mode: {store}")
        print(f"==========================================")
        
        raw_results = scrape_store_products(store, search_queries)
        print(f"Scraping complete. Scraped {len(raw_results)} raw products.")
        
        processed_products = process_raw_results(raw_results)
        print(f"Matched and validated {len(processed_products)} products.")
        
        # Save to store-specific file
        store_clean = store.replace(" ", "_")
        store_output_path = os.path.join(base_dir, "json", f"processed_{store_clean}.json")
        try:
            os.makedirs(os.path.dirname(store_output_path), exist_ok=True)
            with open(store_output_path, "w", encoding="utf-8") as f:
                json.dump(processed_products, f, indent=2, ensure_ascii=False)
            print(f"SUCCESS: Wrote store-specific processed results to {store_output_path}")
        except Exception as e:
            print(f"Error writing store output file: {e}")
            sys.exit(1)
            
        sys.exit(0)

    # Mode 2: Merge store-specific processed files
    elif args.merge:
        print(f"\n==========================================")
        print(f"Running in MERGE mode")
        print(f"==========================================")
        
        all_processed = []
        succeeded_stores = set()
        
        for store in stores:
            store_clean = store.replace(" ", "_")
            store_file_path = os.path.join(base_dir, "json", f"processed_{store_clean}.json")
            if os.path.exists(store_file_path):
                try:
                    with open(store_file_path, "r", encoding="utf-8") as f:
                        store_products = json.load(f)
                    print(f"Found processed file for {store}: {len(store_products)} products.")
                    all_processed.extend(store_products)
                    succeeded_stores.add(store)
                except Exception as e:
                    print(f"Error loading processed file for {store}: {e}")
            else:
                print(f"WARNING: No processed file found for {store} at {store_file_path}. Will use fallback data.")

        # Group and deduplicate to select the cheapest option per unique combination
        cheapest_lookup = {}
        for p in all_processed:
            key = (p["tienda"], p["categoria"], p["volumenMlUnidad"], p["unidades"])
            if key not in cheapest_lookup:
                cheapest_lookup[key] = p
            else:
                # Keep the cheaper one
                if p["precio"] < cheapest_lookup[key]["precio"]:
                    cheapest_lookup[key] = p
                    
        fresh_products = list(cheapest_lookup.values())
        print(f"\nDeduplicated fresh products to {len(fresh_products)} unique options.")
        print(f"Succeeded stores: {list(succeeded_stores)}")
        
        # Merge fresh with fallback data for failed/missing stores
        merged_products = []
        merged_products.extend(fresh_products)
        
        if "productos" in existing_data:
            for old_p in existing_data["productos"]:
                old_store = old_p.get("tienda")
                if old_store not in succeeded_stores:
                    merged_products.append(old_p)
                    
        # Assign unique IDs
        for idx, p in enumerate(merged_products):
            p["id"] = idx + 1
            
        final_data = {
            "timestamp": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "categorias": existing_data.get("categorias", {}),
            "combinaciones_especiales": existing_data.get("combinaciones_especiales", {}),
            "total": len(merged_products),
            "productos": merged_products
        }
        
        try:
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(final_data, f, indent=2, ensure_ascii=False)
            print(f"\nSUCCESS: Consolidated products database written to {output_path} ({len(merged_products)} total products).")
        except Exception as e:
            print(f"Error writing output file: {e}")
            sys.exit(1)
            
        sys.exit(0)

    # Mode 3: Sequential execution (backward compatibility)
    else:
        print(f"\n==========================================")
        print(f"Running in SEQUENTIAL mode (Fallback)")
        print(f"==========================================")
        
        raw_results = []
        for store in stores:
            print(f"\nScraping store: {store}")
            raw_results.extend(scrape_store_products(store, search_queries))
            
        print(f"\nScraping complete. Total raw products scraped: {len(raw_results)}")
        
        processed_products = process_raw_results(raw_results)
        print(f"Total matched and validated products: {len(processed_products)}")
        
        cheapest_lookup = {}
        for p in processed_products:
            key = (p["tienda"], p["categoria"], p["volumenMlUnidad"], p["unidades"])
            if key not in cheapest_lookup:
                cheapest_lookup[key] = p
            else:
                if p["precio"] < cheapest_lookup[key]["precio"]:
                    cheapest_lookup[key] = p
                    
        fresh_products = list(cheapest_lookup.values())
        print(f"Deduplicated to {len(fresh_products)} unique price options.")
        
        succeeded_stores = set(p["tienda"] for p in fresh_products)
        print(f"Successfully scraped stores: {list(succeeded_stores)}")
        
        merged_products = []
        merged_products.extend(fresh_products)
        
        if "productos" in existing_data:
            for old_p in existing_data["productos"]:
                old_store = old_p.get("tienda")
                if old_store not in succeeded_stores:
                    merged_products.append(old_p)
                    
        for idx, p in enumerate(merged_products):
            p["id"] = idx + 1
            
        final_data = {
            "timestamp": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "categorias": existing_data.get("categorias", {}),
            "combinaciones_especiales": existing_data.get("combinaciones_especiales", {}),
            "total": len(merged_products),
            "productos": merged_products
        }
        
        try:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(final_data, f, indent=2, ensure_ascii=False)
            print(f"\nSUCCESS: Updated products database written to {output_path} ({len(merged_products)} total products).")
        except Exception as e:
            print(f"Error writing output file: {e}")

if __name__ == "__main__":
    run()
