import requests
import random
import time

# Standard Chrome browser header profile that successfully bypasses retail WAF checks
DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "es-ES,es;q=0.9",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1"
}

def get_headers(extra_headers=None):
    headers = DEFAULT_HEADERS.copy()
    if extra_headers:
        headers.update(extra_headers)
    return headers

def fetch_html(url, headers=None, retries=3):
    if not headers:
        headers = get_headers()
        
    for attempt in range(1, retries + 1):
        try:
            # Gaussian delay to evade detection
            time.sleep(max(0.5, random.gauss(1.5, 0.5)))
            
            response = requests.get(url, headers=headers, timeout=15)
            if response.status_code == 200:
                return response.text
            elif response.status_code == 403:
                print(f"Access Denied (403) for URL: {url} on attempt {attempt}/{retries}")
            else:
                print(f"Error {response.status_code} for URL: {url} on attempt {attempt}/{retries}")
        except Exception as e:
            print(f"Request failed for URL {url}: {e} (attempt {attempt}/{retries})")
            
        if attempt < retries:
            backoff = 2 ** attempt + random.uniform(0.5, 1.5)
            print(f"Retrying in {backoff:.2f}s...")
            time.sleep(backoff)
            
    return None

def find_key_recursive(data, target_key):
    results = []
    if isinstance(data, dict):
        for k, v in data.items():
            if k == target_key:
                results.append(v)
            else:
                results.extend(find_key_recursive(v, target_key))
    elif isinstance(data, list):
        for item in data:
            results.extend(find_key_recursive(item, target_key))
    return results

def extract_products_from_json(data, target_key="products"):
    lists = find_key_recursive(data, target_key)
    products = []
    seen_ids = set()
    
    for lst in lists:
        if isinstance(lst, list):
            for item in lst:
                if isinstance(item, dict):
                    # Check if it looks like a product (has name or productName)
                    name = item.get("name") or item.get("productName") or item.get("displayName")
                    if name:
                        # Deduplicate by a unique key like ID or name
                        p_id = str(item.get("id") or item.get("productId") or item.get("skuId") or name)
                        if p_id not in seen_ids:
                            seen_ids.add(p_id)
                            products.append(item)
    return products
