/**
 * shorturl.js - Sistema de URLs cortas para presupuestos - v3.0 Firebase Edition
 * 
 * ✅ AHORA CON FIREBASE REALTIME DATABASE
 * Genera IDs cortos (6-8 caracteres) y los almacena en:
 * - Firebase Realtime DB (principal - accesible desde cualquier dispositivo)
 * - localStorage (fallback - cuando Firebase no esté disponible)
 * 
 * El flujo es: Firebase primero → Si falla, localStorage → Funciona en ambos casos
 */

import {
  guardarPresupuestoFirebase,
  obtenerPresupuestoFirebase,
  eliminarPresupuestoFirebase,
  verificarConexionFirebase
} from './firebase-config.js';

const SHORTURL_CONFIG = {
  LENGTH: 6,                    // Longitud de ID (6-8 caracteres)
  CHARSET: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  STORAGE_PREFIX: 'presupuesto_',
  STORAGE_KEY_INDEX: 'presupuesto_index',
  EXPIRY_DAYS: 30,              // Días antes de expirar
};

/**
 * Genera un ID aleatorio corto
 * @param {number} length - Longitud del ID (default: 6)
 * @returns {string} - ID aleatorio de longitud especificada
 * 
 * Ejemplo: "aBc123", "XyZ987", etc.
 */
function generarIDCorto(length = SHORTURL_CONFIG.LENGTH) {
  let result = '';
  const charset = SHORTURL_CONFIG.CHARSET;
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    result += charset[randomIndex];
  }
  
  return result;
}

/**
 * Genera un ID corto único (verifica que no exista ya en Firebase ni localStorage)
 */
async function generarIDCortoUnico() {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const id = generarIDCorto();
    // Verifica en Firebase primero, luego localStorage
    const existeEnFirebase = await existePresupuestoEnFirebase(id);
    const existeEnLocal = existePresupuesto(id);
    
    if (!existeEnFirebase && !existeEnLocal) {
      return id;
    }
    attempts++;
  }
  
  // Si falla, usar ID más largo (menor probabilidad de colisión)
  return generarIDCorto(8);
}

/**
 * Verifica si un presupuesto existe en Firebase
 */
async function existePresupuestoEnFirebase(id) {
  try {
    const presupuesto = await obtenerPresupuestoFirebase(id);
    return presupuesto !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Guarda presupuesto en Firebase (y copia en localStorage como fallback)
 */
async function guardarPresupuestoCorto(presupuestoData) {
  try {
    const id = await generarIDCortoUnico();
    
    // Intentar guardar en Firebase
    const firebaseOk = await guardarPresupuestoFirebase(id, presupuestoData);
    
    if (firebaseOk) {
      console.log(`✅ Presupuesto guardado en Firebase: ${id}`);
    } else {
      console.warn(`⚠️ Firebase no disponible, usando localStorage para: ${id}`);
    }
    
    // Guardar en localStorage como backup
    try {
      const presupuestoGuardado = {
        id: id,
        data: presupuestoData,
        createdAt: Date.now(),
        expiresAt: Date.now() + (SHORTURL_CONFIG.EXPIRY_DAYS * 24 * 60 * 60 * 1000),
        viewCount: 0
      };
      
      const storageKey = SHORTURL_CONFIG.STORAGE_PREFIX + id;
      localStorage.setItem(storageKey, JSON.stringify(presupuestoGuardado));
      actualizarIndicePresupuestos(id);
    } catch (localError) {
      console.warn(`⚠️ localStorage no disponible:`, localError);
    }
    
    return id;
  } catch (error) {
    console.error('Error guardando presupuesto:', error);
    return null;
  }
}

/**
 * Obtiene presupuesto: intenta Firebase primero, luego localStorage
 */
async function obtenerPresupuestoCorto(id) {
  try {
    // Paso 1: Intentar obtener de Firebase
    const datosFirebase = await obtenerPresupuestoFirebase(id);
    if (datosFirebase) {
      console.log(`✅ Presupuesto cargado desde Firebase: ${id}`);
      return datosFirebase;
    }
    
    // Paso 2: Fallback a localStorage
    const datosLocal = obtenerPresupuestoCortoLocal(id);
    if (datosLocal) {
      console.log(`✅ Presupuesto cargado desde localStorage (fallback): ${id}`);
      return datosLocal;
    }
    
    console.warn(`❌ Presupuesto no encontrado: ${id}`);
    return null;
  } catch (error) {
    console.error('Error obteniendo presupuesto:', error);
    // Última opción: localStorage
    return obtenerPresupuestoCortoLocal(id);
  }
}

/**
 * Obtiene presupuesto SOLO desde localStorage
 */
function obtenerPresupuestoCortoLocal(id) {
  try {
    const storageKey = SHORTURL_CONFIG.STORAGE_PREFIX + id;
    const stored = localStorage.getItem(storageKey);
    
    if (!stored) return null;
    
    const presupuesto = JSON.parse(stored);
    
    // Verificar expiración
    if (presupuesto.expiresAt && Date.now() > presupuesto.expiresAt) {
      localStorage.removeItem(storageKey);
      return null;
    }
    
    // Incrementar view count
    presupuesto.viewCount = (presupuesto.viewCount || 0) + 1;
    localStorage.setItem(storageKey, JSON.stringify(presupuesto));
    
    return presupuesto.data;
  } catch (error) {
    console.error('Error obteniendo de localStorage:', error);
    return null;
  }
}

/**
 * Verifica si un presupuesto existe
 * @param {string} id - ID corto del presupuesto
 * @returns {boolean}
 */
function existePresupuesto(id) {
  try {
    const storageKey = SHORTURL_CONFIG.STORAGE_PREFIX + id;
    return localStorage.getItem(storageKey) !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Elimina un presupuesto de localStorage
 * @param {string} id - ID corto del presupuesto
 * @returns {boolean} - true si se eliminó
 */
function eliminarPresupuestoCorto(id) {
  try {
    const storageKey = SHORTURL_CONFIG.STORAGE_PREFIX + id;
    localStorage.removeItem(storageKey);
    
    // Actualizar índice
    const index = obtenerIndicePresupuestos();
    if (index) {
      index.ids = index.ids.filter(item => item.id !== id);
      localStorage.setItem(SHORTURL_CONFIG.STORAGE_KEY_INDEX, JSON.stringify(index));
    }
    
    console.log(`Presupuesto eliminado: ${id}`);
    return true;
  } catch (error) {
    console.error('Error eliminando presupuesto:', error);
    return false;
  }
}

/**
 * Obtiene el índice de todos los presupuestos guardados
 * @returns {Object|null} - Objeto con lista de IDs y metadata
 */
function obtenerIndicePresupuestos() {
  try {
    const indexJSON = localStorage.getItem(SHORTURL_CONFIG.STORAGE_KEY_INDEX);
    return indexJSON ? JSON.parse(indexJSON) : null;
  } catch (error) {
    console.error('Error obteniendo índice:', error);
    return null;
  }
}

/**
 * Actualiza el índice de presupuestos
 * @param {string} newId - Nuevo ID a agregar
 */
function actualizarIndicePresupuestos(newId) {
  try {
    let index = obtenerIndicePresupuestos() || { ids: [] };
    
    // Agregar si no existe
    if (!index.ids.some(item => item.id === newId)) {
      index.ids.push({
        id: newId,
        createdAt: Date.now()
      });
    }
    
    // Guardar índice actualizado
    localStorage.setItem(SHORTURL_CONFIG.STORAGE_KEY_INDEX, JSON.stringify(index));
  } catch (error) {
    console.error('Error actualizando índice:', error);
  }
}

/**
 * Limpia presupuestos expirados
 * @returns {number} - Cantidad de presupuestos eliminados
 */
function limpiarPresupuestosExpirados() {
  try {
    let eliminados = 0;
    const index = obtenerIndicePresupuestos();
    
    if (!index || !index.ids) return eliminados;
    
    for (const item of index.ids) {
      const presupuesto = obtenerPresupuestoCorto(item.id);
      if (!presupuesto) {
        // Ya está expirado o no existe
        eliminados++;
      }
    }
    
    console.log(`🧹 Limpieza: ${eliminados} presupuestos expirados eliminados`);
    return eliminados;
  } catch (error) {
    console.error('Error limpiando presupuestos:', error);
    return 0;
  }
}

/**
 * Genera URL corta completa
 * @param {string} id - ID corto del presupuesto
 * @returns {string} - URL completa
 * 
 * Ejemplo: https://usuario.github.io/repo/html/presupuesto.html?id=abc123
 * Nota: Compatible con GitHub Pages (no requiere .htaccess)
 */
function generarURLCorta(id) {
  // Obtener la ruta sin el archivo actual
  const currentPath = window.location.pathname;
  const basePath = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
  const baseURL = window.location.origin + basePath;
  
  // Retornar URL con parámetro query (compatible con GitHub Pages)
  return `${baseURL}html/presupuesto.html?id=${id}`;
}

/**
 * Obtiene ID corto desde URL actual
 * @returns {string|null} - ID corto o null
 * 
 * Funciona con:
 * - GitHub Pages: presupuesto.html?id=abc123
 * - Apache (futuro): /p/abc123
 */
function obtenerIDCortoDeURL() {
  try {
    // Método 1: Si es parámetro query (?id=abc123) - GitHub Pages
    const params = new URLSearchParams(window.location.search);
    const idDesdeQuery = params.get('id');
    if (idDesdeQuery) {
      return idDesdeQuery;
    }
    
    // Método 2: Si estamos en /p/(id) - Apache (futuro)
    const pathMatch = window.location.pathname.match(/\/p\/([a-zA-Z0-9]+)/);
    if (pathMatch && pathMatch[1]) {
      return pathMatch[1];
    }
    
    return null;
  } catch (error) {
    console.error('Error obteniendo ID de URL:', error);
    return null;
  }
}

/**
 * Obtiene presupuesto desde URL actual
 * @returns {Object|null} - Datos del presupuesto
 */
function obtenerPresupuestoDeURLCorta() {
  const id = obtenerIDCortoDeURL();
  if (!id) return null;
  
  return obtenerPresupuestoCorto(id);
}

/**
 * Copia URL corta al portapapeles - ROBUSTO
 * @param {string} id - ID corto del presupuesto
 * @returns {Promise<boolean>}
 */
async function copiarURLCortaAlPortapapeles(id) {
  try {
    const url = generarURLCorta(id);
    
    // Método 1: Clipboard API (Chrome, Edge, Firefox, Opera)
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(url);
        console.log('✅ URL copiada con Clipboard API');
        return true;
      } catch (clipError) {
        console.warn('⚠️ Clipboard API falló:', clipError.message);
        // Continuar con fallback
      }
    }
    
    // Método 2: document.execCommand (fallback para navegadores antiguos)
    const textarea = document.createElement('textarea');
    textarea.value = url;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    textarea.style.opacity = '0';
    textarea.setAttribute('readonly', '');
    
    document.body.appendChild(textarea);
    
    // En iOS, necesitamos hacer focus
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      textarea.setSelectionRange(0, url.length);
    } else {
      textarea.select();
    }
    
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    
    if (success) {
      console.log('✅ URL copiada con execCommand');
      return true;
    } else {
      console.warn('⚠️ execCommand retornó false');
      return false;
    }
  } catch (error) {
    console.error('❌ Error copiando URL corta:', error);
    return false;
  }
}

/**
 * Crea todo el flow completo: guardar presupuesto + copiar URL
 * @param {Object} presupuestoData - Datos del presupuesto
 * @returns {Promise<{id: string, url: string, success: boolean, error: string|null}>}
 */
async function crearYCompartirPresupuestoCorto(presupuestoData) {
  try {
    // Guardar presupuesto (Firebase + localStorage)
    const id = await guardarPresupuestoCorto(presupuestoData);
    
    if (!id) {
      console.error('❌ No se pudo generar ID');
      return {
        id: null,
        url: null,
        success: false,
        error: 'No se pudo generar el ID del presupuesto'
      };
    }
    
    // Copiar URL al portapapeles
    const copiado = await copiarURLCortaAlPortapapeles(id);
    const url = generarURLCorta(id);
    
    if (!copiado) {
      console.warn('⚠️ ID generado pero fallo al copiar al portapapeles');
      return {
        id: id,
        url: url,
        success: false,
        error: 'Presupuesto guardado pero no se pudo copiar al portapapeles. Aquí está: ' + url
      };
    }
    
    console.log(`✅ Workflow completo exitoso: ${id}`);
    return {
      id: id,
      url: url,
      success: true,
      error: null
    };
  } catch (error) {
    console.error('❌ Error en workflow de compartir:', error);
    return {
      id: null,
      url: null,
      success: false,
      error: error.message || 'Error desconocido al compartir'
    };
  }
}

/**
 * Obtiene estadísticas de almacenamiento
 * @returns {Object} - Estadísticas de localStorage usage
 */
function obtenerEstadisticasAlmacenamiento() {
  try {
    const index = obtenerIndicePresupuestos() || { ids: [] };
    let totalBytes = 0;
    let presupuestosValidos = 0;
    let presupuestosExpirados = 0;
    
    for (const item of index.ids) {
      const storageKey = SHORTURL_CONFIG.STORAGE_PREFIX + item.id;
      const data = localStorage.getItem(storageKey);
      
      if (data) {
        totalBytes += data.length;
        
        try {
          const obj = JSON.parse(data);
          if (obj.expiresAt && Date.now() > obj.expiresAt) {
            presupuestosExpirados++;
          } else {
            presupuestosValidos++;
          }
        } catch {
          presupuestosValidos++;
        }
      }
    }
    
    return {
      totalPresupuestos: index.ids.length,
      presupuestosValidos,
      presupuestosExpirados,
      totalBytesUsados: totalBytes,
      totalKBUsados: (totalBytes / 1024).toFixed(2),
      availableStorageApprox: '5-10 MB (navegador típico)'
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    return null;
  }
}

/**
 * Exporta todos los presupuestos guardados (para backup)
 * @returns {Object} - Objeto con todos los presupuestos
 */
function exportarTodosPresupuestos() {
  try {
    const index = obtenerIndicePresupuestos() || { ids: [] };
    const presupuestos = {};
    
    for (const item of index.ids) {
      const storageKey = SHORTURL_CONFIG.STORAGE_PREFIX + item.id;
      const data = localStorage.getItem(storageKey);
      if (data) {
        presupuestos[item.id] = JSON.parse(data);
      }
    }
    
    return {
      exportedAt: new Date().toISOString(),
      totalCount: Object.keys(presupuestos).length,
      presupuestos
    };
  } catch (error) {
    console.error('Error exportando presupuestos:', error);
    return null;
  }
}

/**
 * Descarga presupuestos como JSON
 */
function descargarPresupuestosJSON() {
  try {
    const backup = exportarTodosPresupuestos();
    const json = JSON.stringify(backup, null, 2);
    
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `presupuestos-backup-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('Error descargando backup:', error);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DEBUG & STATUS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Muestra estado del sistema (para debugging)
 */
async function mostrarEstadoSistema() {
  console.group('📊 Estado del Sistema - v3.0');
  
  const firebaseOk = await verificarConexionFirebase();
  console.log(`🔗 Firebase: ${firebaseOk ? '✅ Conectado' : '❌ No disponible'}`);
  
  try {
    const index = obtenerIndicePresupuestos() || [];
    console.log(`💾 localStorage: ✅ Disponible (${index.length || 0} presupuestos)`);
  } catch (error) {
    console.log(`💾 localStorage: ❌ No disponible`);
  }
  
  console.log(`🌐 URL actual:`, window.location.href);
  console.log(`📝 ID en URL:`, obtenerIDCortoDeURL());
  
  console.groupEnd();
}

// Ejecutar limpieza cada 1 hora
setInterval(limpiarPresupuestosExpirados, 60 * 60 * 1000);

// Mostrar estado al cargar (debug)
console.log('✅ shorturl.js v3.0 cargado (Firebase + localStorage)');

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export {
  generarIDCorto,
  generarIDCortoUnico,
  guardarPresupuestoCorto,
  obtenerPresupuestoCorto,
  obtenerPresupuestoCortoLocal,
  existePresupuesto,
  existePresupuestoEnFirebase,
  limpiarPresupuestosExpirados,
  generarURLCorta,
  obtenerIDCortoDeURL,
  obtenerPresupuestoDeURLCorta,
  copiarURLCortaAlPortapapeles,
  crearYCompartirPresupuestoCorto,
  exportarTodosPresupuestos,
  descargarPresupuestosJSON,
  obtenerEstadisticasAlmacenamiento,
  mostrarEstadoSistema
};
