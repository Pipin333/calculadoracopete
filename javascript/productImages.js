/**
 * PRODUCT IMAGES MODULE
 * Catálogo centralizado de imágenes de stock de alta calidad para productos y marcas del retail chileno.
 * Utiliza CDNs de alta velocidad (Google Cloud Storage y VTEX) con fallbacks por categoría.
 */

// Mapeo específico por marca y variante de producto
export const BRAND_IMAGES = {
  // Piscos
  'mistral_nobel': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/2251/image_256-597bc97e6f90c28bca3431d471ac9a5332861b72.png',
  'mistral': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/2052/image_256-1a057f591f1524b05b324420e6cdf1393c669917.png',
  'alto del carmen': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/2052/image_256-1a057f591f1524b05b324420e6cdf1393c669917.png',
  'tres erres': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/24076/image_256-35ad15e06295a6ddfeb816d9b66aa5548045a4da.png',
  'artesanos': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/2052/image_256-1a057f591f1524b05b324420e6cdf1393c669917.png',
  'capel': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/2052/image_256-1a057f591f1524b05b324420e6cdf1393c669917.png',

  // Cervezas
  'corona': 'https://micocacola.vtexassets.com/arquivos/ids/208158-500-auto?v=639199035148200',
  'heineken': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/1235/image_256-feaba94ee5c369dd8e26a5bc16a3cf1f8b97e35c.png',
  'royal guard': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/14262/image_256-6992c84a8c03e4fd24cc7aed8ef049e5f109ef67.png',
  'escudo silver': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/4462/image_256-a47141f93fe573b1386482be3bb18d8af0049a47.png',
  'escudo': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/1184/image_256-fd41ef5613cab91f1c03ed2aaf90c4b77a0799c4.png',
  'cristal': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/1184/image_256-fd41ef5613cab91f1c03ed2aaf90c4b77a0799c4.png',
  'becker': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/4462/image_256-a47141f93fe573b1386482be3bb18d8af0049a47.png',
  'kunstmann': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/2817/image_256-6172ecdfc7a8b78db4f986608751f22b260a24dc.png',
  'austral': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/23815/image_256-8033f247795f09c2e265d3c1c9a27c1a54af8c10.png',
  'kross': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/23815/image_256-8033f247795f09c2e265d3c1c9a27c1a54af8c10.png',
  'budweiser': 'https://micocacola.vtexassets.com/arquivos/ids/201605-500-auto?v=638574584074430',
  'quilmes': 'https://micocacola.vtexassets.com/arquivos/ids/203301-500-auto?v=638654614875770',
  'sol': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/2528/image_256-c97826e7bc36da47c5df629f29538c4e6f61c8ec.png',
  'stella': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/1235/image_256-feaba94ee5c369dd8e26a5bc16a3cf1f8b97e35c.png',
  'stones': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/24076/image_256-35ad15e06295a6ddfeb816d9b66aa5548045a4da.png',
  'michelob': 'https://micocacola.vtexassets.com/arquivos/ids/208158-500-auto?v=639199035148200',
  'modelo': 'https://micocacola.vtexassets.com/arquivos/ids/208158-500-auto?v=639199035148200',
  'peroni': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/1235/image_256-feaba94ee5c369dd8e26a5bc16a3cf1f8b97e35c.png',

  // Rones
  'havana club': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/27203/image_256-35f393f9e349e570c029c2f6d81a172561e9665e.png',
  'bacardi': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/27203/image_256-35f393f9e349e570c029c2f6d81a172561e9665e.png',
  'sierra morena': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/27203/image_256-35f393f9e349e570c029c2f6d81a172561e9665e.png',
  'maddero': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/27203/image_256-35f393f9e349e570c029c2f6d81a172561e9665e.png',

  // Vodkas
  'absolut': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/2294/image_256-5f7add81d60bf8e527ec5e535753fae0ef509b95.png',
  'smirnoff': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/2294/image_256-5f7add81d60bf8e527ec5e535753fae0ef509b95.png',
  'stolichnaya': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/2294/image_256-5f7add81d60bf8e527ec5e535753fae0ef509b95.png',

  // Whiskies
  'ballantine': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/23625/image_256-80bd4a0f73f0c2a9e83f5e1d932bb87289658cd9.png',
  'chivas': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/2812/image_256-bdce59cc25087fecf1ac9367431cc773496b64f8.png',
  'johnnie walker': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/2812/image_256-bdce59cc25087fecf1ac9367431cc773496b64f8.png',
  'jack daniel': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/23625/image_256-80bd4a0f73f0c2a9e83f5e1d932bb87289658cd9.png',

  // Gins
  'beefeater': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/2294/image_256-5f7add81d60bf8e527ec5e535753fae0ef509b95.png',
  'tanqueray': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/2294/image_256-5f7add81d60bf8e527ec5e535753fae0ef509b95.png',
  'gordon': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/2294/image_256-5f7add81d60bf8e527ec5e535753fae0ef509b95.png',
  'brighton': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/2294/image_256-5f7add81d60bf8e527ec5e535753fae0ef509b95.png',

  // Aperitivos
  'ramazzotti': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/2227/image_256-6ce145766a3485e77cca88ffe58ae16780278b96.png',
  'jagermeister': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/2251/image_256-597bc97e6f90c28bca3431d471ac9a5332861b72.png',

  // Bebidas y Mixers
  'coca-cola': 'https://micocacola.vtexassets.com/arquivos/ids/208184-500-auto?v=639207718627030',
  'coca cola': 'https://micocacola.vtexassets.com/arquivos/ids/208184-500-auto?v=639207718627030',
  'fanta': 'https://micocacola.vtexassets.com/arquivos/ids/208176-500-auto?v=639205037858630',
  'sprite': 'https://micocacola.vtexassets.com/arquivos/ids/208409-500-auto',
  'schweppes': 'https://micocacola.vtexassets.com/arquivos/ids/205749-500-auto?v=638836258859370',
  'canada dry': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/1087/image_256-f9c171be7dc7baa09e1c4d5f70341ae3db4d1d55.png',
  'pepsi': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/11097/image_256-29bc4ca2020477a2c412ffae84079dd1940c9d3d.png',
  '7up': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/24025/image_256-b63c66ee6029fe9b577808220f3823805e2af160.png',
  'crush': 'https://micocacola.vtexassets.com/arquivos/ids/208176-500-auto?v=639205037858630',
  'red bull': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/2490/image_256-0d33e8d7bbe4f777770fdf504f53cca24459d5b0.png',
  'redbull': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/2490/image_256-0d33e8d7bbe4f777770fdf504f53cca24459d5b0.png',
  'rockstar': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/2490/image_256-0d33e8d7bbe4f777770fdf504f53cca24459d5b0.png',
  'monster': 'https://micocacola.vtexassets.com/arquivos/ids/205652-500-auto?v=638832731981370',
  'tonica': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/1087/image_256-f9c171be7dc7baa09e1c4d5f70341ae3db4d1d55.png',
  'jugo_watts': 'https://micocacola.vtexassets.com/arquivos/ids/205749-500-auto?v=638836258859370',
  'watts': 'https://micocacola.vtexassets.com/arquivos/ids/205749-500-auto?v=638836258859370',
  'gatorade': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/1087/image_256-f9c171be7dc7baa09e1c4d5f70341ae3db4d1d55.png',

  // Packs & Combos
  'pack_promo': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/24011/image_256-263a6cae61955483a27d5bffc3c90254ea09b7c6.png',
  'combo': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/24011/image_256-263a6cae61955483a27d5bffc3c90254ea09b7c6.png',
  'hielo': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/24076/image_256-35ad15e06295a6ddfeb816d9b66aa5548045a4da.png'
};

// Fallbacks de categoría estilizados
export const CATEGORY_DEFAULT_IMAGES = {
  cerveza: 'https://micocacola.vtexassets.com/arquivos/ids/208158-500-auto?v=639199035148200',
  piscola: 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/2052/image_256-1a057f591f1524b05b324420e6cdf1393c669917.png',
  ron: 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/27203/image_256-35f393f9e349e570c029c2f6d81a172561e9665e.png',
  vodka: 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/2294/image_256-5f7add81d60bf8e527ec5e535753fae0ef509b95.png',
  whiskey: 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/23625/image_256-80bd4a0f73f0c2a9e83f5e1d932bb87289658cd9.png',
  gin: 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/2294/image_256-5f7add81d60bf8e527ec5e535753fae0ef509b95.png',
  jaeger: 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/2251/image_256-597bc97e6f90c28bca3431d471ac9a5332861b72.png',
  cola: 'https://micocacola.vtexassets.com/arquivos/ids/208184-500-auto?v=639207718627030',
  fanta: 'https://micocacola.vtexassets.com/arquivos/ids/208176-500-auto?v=639205037858630',
  sprite: 'https://micocacola.vtexassets.com/arquivos/ids/208409-500-auto',
  ginger: 'https://micocacola.vtexassets.com/arquivos/ids/205749-500-auto?v=638836258859370',
  redbull: 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/2490/image_256-0d33e8d7bbe4f777770fdf504f53cca24459d5b0.png',
  tonica: 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/1087/image_256-f9c171be7dc7baa09e1c4d5f70341ae3db4d1d55.png',
  jugo_watts: 'https://micocacola.vtexassets.com/arquivos/ids/205749-500-auto?v=638836258859370',
  hielo: 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/24076/image_256-35ad15e06295a6ddfeb816d9b66aa5548045a4da.png',
  combos: 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/24011/image_256-263a6cae61955483a27d5bffc3c90254ea09b7c6.png'
};

/**
 * Resuelve la URL de la mejor foto de producto basada en nombre y categoría
 * @param {Object} product - Producto o item agrupado
 * @returns {string} URL de la imagen en alta resolución
 */
export function getProductImageUrl(product) {
  if (!product) return CATEGORY_DEFAULT_IMAGES.cerveza;

  // 1. Si el producto ya trae imagen_url propia
  if (product.imagen_url || product.imagen) {
    return product.imagen_url || product.imagen;
  }

  const nameLower = (product.nombrePrincipal || product.nombre || '').toLowerCase();
  const category = (product.categoria || '').toLowerCase();

  // 2. Buscar por coincidencia de marca específica en BRAND_IMAGES
  for (const [key, url] of Object.entries(BRAND_IMAGES)) {
    if (nameLower.includes(key)) {
      return url;
    }
  }

  // 3. Fallback a imagen de categoría
  if (CATEGORY_DEFAULT_IMAGES[category]) {
    return CATEGORY_DEFAULT_IMAGES[category];
  }

  return CATEGORY_DEFAULT_IMAGES.cerveza;
}
