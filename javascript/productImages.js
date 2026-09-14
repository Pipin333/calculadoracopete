/**
 * PRODUCT IMAGES MODULE
 * Catálogo centralizado de imágenes de stock de alta calidad para productos y marcas del retail chileno.
 * Utiliza imágenes directas de retail chileno (Unimarc, miCocaCola, CCU/La Barra) con correspondencia 1:1.
 * Si un producto no tiene foto exacta verificada, retorna null para no mostrar marcas falsas.
 */

// Mapeo específico por marca y variante de producto verificado 1:1 en retail chileno
export const BRAND_IMAGES = {
  // Piscos
  'alto del carmen': 'https://unimarc.vtexassets.com/arquivos/ids/243698/000000000000356297-UN-01.jpg?v=638599390592370000',
  'mistral nobel': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/24011/image_256-263a6cae61955483a27d5bffc3c90254ea09b7c6.png',
  'mistral': 'https://unimarc.vtexassets.com/arquivos/ids/242926/000000000000759755-UN-01.jpg?v=638566618136370000',
  'artesanos': 'https://unimarc.vtexassets.com/arquivos/ids/205082/000000000000008563-UN-01.jpg?v=638599390474130000',
  'capel': 'https://unimarc.vtexassets.com/arquivos/ids/205061/000000000000616733-UN-01.jpg?v=638599390612270000',

  // Cervezas — Marcas específicas con packshots reales
  'cristal cero': 'https://unimarc.vtexassets.com/arquivos/ids/259978/000000000000618012-DIS-01.jpg?v=639201614416500000',
  'cristal': 'https://unimarc.vtexassets.com/arquivos/ids/251376/000000000000686452-UN-01.jpg?v=638931079421330000',
  'corelli': 'https://unimarc.vtexassets.com/arquivos/ids/251259/000000000000661982-DIS-01.jpg?v=638929318586700000',
  'trauco': 'https://unimarc.vtexassets.com/arquivos/ids/250131/000000000000673614-UN-01.jpg?v=638884495986030000',
  'leyendas de origen': 'https://unimarc.vtexassets.com/arquivos/ids/250131/000000000000673614-UN-01.jpg?v=638884495986030000',
  'quilmes': 'https://unimarc.vtexassets.com/arquivos/ids/250147/000000000000673438-CJ-01.jpg?v=638884500871130000',
  'becker': 'https://unimarc.vtexassets.com/arquivos/ids/251923/000000000000837427-UN-01.jpg?v=638949502606300000',
  'corona': 'https://unimarc.vtexassets.com/arquivos/ids/260017/000000000000999051-UN-01.png?v=639203511108430000',
  'heineken': 'https://unimarc.vtexassets.com/arquivos/ids/245046/000000000000848536-UN-01.jpg?v=638663280053700000',
  'royal guard': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/14262/image_256-6992c84a8c03e4fd24cc7aed8ef049e5f109ef67.png',
  'escudo silver': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/4462/image_256-a47141f93fe573b1386482be3bb18d8af0049a47.png',
  'escudo': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/1184/image_256-fd41ef5613cab91f1c03ed2aaf90c4b77a0799c4.png',
  'kunstmann': 'https://unimarc.vtexassets.com/arquivos/ids/232815/000000000000664031-UN-01.jpg?v=638176021706270000',
  'austral': 'https://unimarc.vtexassets.com/arquivos/ids/259180/000000000000675565-UN-01.jpg?v=639161905324070000',
  'kross': 'https://unimarc.vtexassets.com/arquivos/ids/245069/000000000000671901-UN-01.jpg?v=638663476364400000',
  'budweiser': 'https://micocacola.vtexassets.com/arquivos/ids/201605-500-auto?v=638574584074430',
  'sol': 'https://storage.googleapis.com/labarra-assets-prd/odoo-images/product_product/2528/image_256-c97826e7bc36da47c5df629f29538c4e6f61c8ec.png',
  'stella': 'https://unimarc.vtexassets.com/arquivos/ids/250159/000000000000661882-UN-01.jpg?v=638884506437770000',

  // Rones
  'havana club': 'https://unimarc.vtexassets.com/arquivos/ids/248613/000000000000675677-UN-01.jpg?v=638816431951670000',
  'bacardi': 'https://unimarc.vtexassets.com/arquivos/ids/245065/000000000000671828-UN-01.jpg?v=638663476330770000',

  // Vodkas
  'absolut': 'https://unimarc.vtexassets.com/arquivos/ids/232151/000000000000565934-UN-01.jpg?v=638296928257300000',
  'smirnoff': 'https://unimarc.vtexassets.com/arquivos/ids/259223/000000000000706643-UN-01.jpg.jpg?v=639165323369170000',

  // Whiskies
  'white horse': 'https://unimarc.vtexassets.com/arquivos/ids/239997/000000000000566845-UN-01.jpg?v=638530431778500000',
  'johnnie walker': 'https://unimarc.vtexassets.com/arquivos/ids/239974/000000000000145343-UN-01.jpg?v=638530414860230000',
  'ballantine': 'https://unimarc.vtexassets.com/arquivos/ids/235412/000000000000008591-UN-01.jpg?v=638321946161100000',
  'chivas': 'https://unimarc.vtexassets.com/arquivos/ids/232147/000000000000164165-UN-01.jpg?v=638296928145970000',
  'jack daniel': 'https://unimarc.vtexassets.com/arquivos/ids/235131/000000000000662877-UN-01.jpg?v=638270411338470000',

  // Gins
  'beefeater': 'https://unimarc.vtexassets.com/arquivos/ids/232152/000000000000636744-UN-01.jpg?v=638296928375400000',
  'tanqueray': 'https://unimarc.vtexassets.com/arquivos/ids/240010/000000000000662011-UN-01.jpg?v=638530442589070000',

  // Aperitivos
  'ramazzotti': 'https://unimarc.vtexassets.com/arquivos/ids/233184/000000000000630124-UN-01.jpg?v=638296928349300000',
  'jagermeister': 'https://unimarc.vtexassets.com/arquivos/ids/161343/Licor-de-hierbas-Jagermeister-700-ml.jpg?v=636486711827200000',

  // Bebidas y Mixers — Botellas directas de retail chileno
  'coca-cola': 'https://unimarc.vtexassets.com/arquivos/ids/234057/000000000000123813-UN-01.jpg?v=638223576292330000',
  'coca cola': 'https://unimarc.vtexassets.com/arquivos/ids/234057/000000000000123813-UN-01.jpg?v=638223576292330000',
  'fanta': 'https://unimarc.vtexassets.com/arquivos/ids/251010/000000000000750075-UN-01.jpg?v=638917373867870000',
  'sprite': 'https://unimarc.vtexassets.com/arquivos/ids/259992/000000000000136424-UN-01.jpg?v=639201629067070000',
  'schweppes': 'https://micocacola.vtexassets.com/arquivos/ids/205749-500-auto?v=638836258859370',
  'canada dry': 'https://unimarc.vtexassets.com/arquivos/ids/180144/000000000000022904-DIS.jpg?v=636764932284400000',
  'pepsi': 'https://unimarc.vtexassets.com/arquivos/ids/251693/000000000000687494-UN-01.jpg?v=638945041787100000',
  'crush': 'https://unimarc.vtexassets.com/arquivos/ids/245023/000000000000143051-UN-01.jpg?v=638663250436230000',
  'red bull': 'https://unimarc.vtexassets.com/arquivos/ids/228136/000000000000155394-UN-01.jpg?v=637935006504130000',
  'redbull': 'https://unimarc.vtexassets.com/arquivos/ids/228136/000000000000155394-UN-01.jpg?v=637935006504130000',
  'monster': 'https://unimarc.vtexassets.com/arquivos/ids/261395/000000000000712440-UN-01.jpg?v=639245599671830000',
  'gatorade': 'https://unimarc.vtexassets.com/arquivos/ids/243646/000000000000710443-UN-01.jpg?v=638599390767600000'
};

/**
 * Resuelve la URL de la mejor foto de producto basada en nombre y categoría.
 * Si no hay coincidencia exacta de marca, retorna null para evitar mostrar marcas falsas.
 * @param {Object} product - Producto o item agrupado
 * @returns {string|null} URL de la imagen en alta resolución o null
 */
export function getProductImageUrl(product) {
  if (!product) return null;

  // 1. Si el producto ya trae imagen_url propia del scraper
  if (product.imagen_url || product.imagen) {
    return product.imagen_url || product.imagen;
  }

  const nameLower = (product.nombrePrincipal || product.nombre || '').toLowerCase();

  // 2. Buscar por coincidencia de marca específica en BRAND_IMAGES
  // Priorizar matches más largos primero (ej: 'cristal cero' antes de 'cristal')
  const sortedKeys = Object.keys(BRAND_IMAGES).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    const words = key.split(' ');
    if (words.every(w => nameLower.includes(w))) {
      return BRAND_IMAGES[key];
    }
  }

  // 3. Si no hay coincidencia de marca, retornamos null para que la UI muestre
  // el icono de la categoría en lugar de inventar una marca equivocada.
  return null;
}
