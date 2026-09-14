import os
import sys
import json
import subprocess
import datetime

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HISTORY_FILE_PATH = os.path.join(BASE_DIR, "json", "historial_precios.json")
PRODUCTS_FILE_PATH = os.path.join(BASE_DIR, "json", "productos.json")

def make_product_key(tienda, nombre):
    """Genera una clave única normalizada por tienda y nombre de producto"""
    return f"{tienda.strip()}___{nombre.strip()}"

def build_history_from_git():
    """
    Reconstruye el historial completo de precios analizando todos los commits
    de Git que modificaron json/productos.json
    """
    print("⏳ Extrayendo historial de precios desde el historial de Git...")
    cmd = ['git', 'log', '--format=%H|%as', '--', 'json/productos.json']
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, check=True, cwd=BASE_DIR)
    except Exception as e:
        print(f"❌ Error ejecutando git log: {e}")
        return None

    commits = [line.split('|') for line in res.stdout.strip().split('\n') if line]
    commits.reverse() # Orden cronológico: más antiguo a más reciente
    print(f"📦 Encontrados {len(commits)} commits históricos.")

    history_map = {} # key -> list of (date, price)

    for i, (commit_hash, date) in enumerate(commits):
        show_cmd = ['git', 'show', f'{commit_hash}:json/productos.json']
        res = subprocess.run(show_cmd, capture_output=True, text=True, encoding='utf-8', errors='ignore', cwd=BASE_DIR)
        
        try:
            data = json.loads(res.stdout)
            prods = data.get('productos', []) if isinstance(data, dict) else data
            
            for p in prods:
                nombre = p.get('nombre', '').strip()
                tienda = p.get('tienda', '').strip()
                precio = p.get('precio', 0)
                
                if not nombre or not precio:
                    continue
                    
                key = make_product_key(tienda, nombre)
                if key not in history_map:
                    history_map[key] = []
                    
                pts = history_map[key]
                # Solo agregar si es el primer punto o si cambió de precio respecto al último
                if not pts or pts[-1][1] != precio:
                    pts.append([date, precio])
        except Exception:
            continue

    # Compilar resumen estadístico por producto
    items_summary = {}
    all_time_lows = 0

    for key, pts in history_map.items():
        if not pts:
            continue
        prices = [p[1] for p in pts]
        min_p = min(prices)
        max_p = max(prices)
        avg_p = round(sum(prices) / len(prices))
        current_p = prices[-1]
        is_min = (current_p <= min_p)
        
        if is_min and len(prices) > 1 and max_p > min_p:
            all_time_lows += 1
            
        diff_pct = round(((current_p - avg_p) / avg_p) * 100, 1) if avg_p else 0
        
        # Particionar tienda y nombre
        parts = key.split('___')
        tienda = parts[0]
        nombre = parts[1] if len(parts) > 1 else key
        
        items_summary[key] = {
            'tienda': tienda,
            'nombre': nombre,
            'min': min_p,
            'max': max_p,
            'avg': avg_p,
            'cur': current_p,
            'isMin': is_min,
            'diff': diff_pct,
            'obsCount': len(pts),
            'pts': pts
        }

    output_payload = {
        'last_updated': datetime.date.today().isoformat(),
        'total_tracked': len(items_summary),
        'all_time_lows_count': all_time_lows,
        'items': items_summary
    }

    # Guardar a disco
    os.makedirs(os.path.dirname(HISTORY_FILE_PATH), exist_ok=True)
    with open(HISTORY_FILE_PATH, 'w', encoding='utf-8') as f:
        json.dump(output_payload, f, ensure_ascii=False, indent=1)

    print(f"✅ Historial generado exitosamente en {HISTORY_FILE_PATH}")
    print(f"📊 Total SKUs: {len(items_summary)} | 🔥 En Mínimo Histórico: {all_time_lows}")
    return output_payload

def update_history_with_current(productos_data=None):
    """
    Actualiza el historial existente con los productos del día
    (para ser llamado en la ejecución diaria de GitHub Actions)
    """
    if not os.path.exists(HISTORY_FILE_PATH):
        return build_history_from_git()
        
    try:
        with open(HISTORY_FILE_PATH, 'r', encoding='utf-8') as f:
            history_data = json.load(f)
    except Exception as e:
        print(f"⚠️ No se pudo leer historial existente, reconstruyendo: {e}")
        return build_history_from_git()

    if not productos_data and os.path.exists(PRODUCTS_FILE_PATH):
        with open(PRODUCTS_FILE_PATH, 'r', encoding='utf-8') as f:
            productos_data = json.load(f)

    if not productos_data:
        print("⚠️ No hay datos de productos para actualizar historial.")
        return history_data

    today = datetime.date.today().isoformat()
    items = history_data.get('items', {})
    products_list = productos_data.get('productos', [])
    all_time_lows = 0

    for p in products_list:
        nombre = p.get('nombre', '').strip()
        tienda = p.get('tienda', '').strip()
        precio = p.get('precio', 0)
        
        if not nombre or not precio:
            continue
            
        key = make_product_key(tienda, nombre)
        if key not in items:
            items[key] = {
                'tienda': tienda,
                'nombre': nombre,
                'min': precio,
                'max': precio,
                'avg': precio,
                'cur': precio,
                'isMin': True,
                'diff': 0,
                'obsCount': 1,
                'pts': [[today, precio]]
            }
        else:
            item = items[key]
            pts = item.get('pts', [])
            
            # Si el último punto no es de hoy y cambió el precio (o han pasado 7 días sin registrar)
            if not pts or pts[-1][1] != precio or pts[-1][0] != today:
                if pts and pts[-1][0] == today:
                    # Actualizar punto de hoy si ya existía
                    pts[-1][1] = precio
                else:
                    pts.append([today, precio])
                    
            prices = [pt[1] for pt in pts]
            min_p = min(prices)
            max_p = max(prices)
            avg_p = round(sum(prices) / len(prices))
            is_min = (precio <= min_p)
            
            if is_min and len(prices) > 1 and max_p > min_p:
                all_time_lows += 1
                
            diff_pct = round(((precio - avg_p) / avg_p) * 100, 1) if avg_p else 0
            
            item['min'] = min_p
            item['max'] = max_p
            item['avg'] = avg_p
            item['cur'] = precio
            item['isMin'] = is_min
            item['diff'] = diff_pct
            item['obsCount'] = len(pts)
            item['pts'] = pts

    history_data['last_updated'] = today
    history_data['total_tracked'] = len(items)
    history_data['all_time_lows_count'] = all_time_lows
    history_data['items'] = items

    with open(HISTORY_FILE_PATH, 'w', encoding='utf-8') as f:
        json.dump(history_data, f, ensure_ascii=False, indent=1)

    print(f"✅ Historial actualizado: {len(items)} productos registrados.")
    return history_data

if __name__ == '__main__':
    build_history_from_git()
