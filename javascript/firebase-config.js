// ═══════════════════════════════════════════════════════════════════════════
// FIREBASE CONFIGURATION - v3.0 Shared Budget Backend
// ═══════════════════════════════════════════════════════════════════════════
// Este archivo conecta la app a Firebase Realtime Database
// Los presupuestos se guardan GLOBALMENTE en Firebase (no solo en localStorage)
// ═══════════════════════════════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, set, get, remove, query, orderByChild, limitToLast, push } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// Firebase Config - Tu proyecto
const firebaseConfig = {
  apiKey: "AIzaSyAYVQjyCGzka7tdJsqScvFg_UnYfHm9N6U",
  authDomain: "calculadoracopete.firebaseapp.com",
  projectId: "calculadoracopete",
  storageBucket: "calculadoracopete.firebasestorage.app",
  messagingSenderId: "420954510451",
  appId: "1:420954510451:web:b44e20d1cc15e31d988606"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Iniciar sesión anónima automáticamente si no hay usuario (para cumplir la regla auth != null)
try {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      signInAnonymously(auth).catch((err) => {
        console.debug("Autenticación anónima opcional omitida:", err?.message || err);
      });
    }
  });
} catch (e) {
  // Silent fallback
}

// IMPORTANTE: URL de tu Realtime Database
let database;
try {
  database = getDatabase(app, "https://calculadoracopete-default-rtdb.firebaseio.com/");
  console.log("🔥 Firebase Database inicializado");
} catch (error) {
  console.warn("⚠️ No se pudo conectar a Firebase RTDB. Verifica configuración.");
  database = null;
}

// ═══════════════════════════════════════════════════════════════════════════
// FIREBASE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Guardar presupuesto en Firebase Realtime Database
 * @param {string} id - ID corto (ej: "Xm7Kb2")
 * @param {object} data - Datos del presupuesto
 * @returns {Promise<boolean>} true si se guardó, false si error
 */
async function guardarPresupuestoFirebase(id, data) {
  try {
    if (!database) {
      console.warn("⚠️ Firebase no disponible, se guardará en localStorage");
      return false;
    }
    const presupuestoRef = ref(database, `presupuestos/${id}`);
    await set(presupuestoRef, {
      data: data,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 días
      viewCount: 0
    });
    console.log(`✅ Presupuesto guardado en Firebase: ${id}`);
    return true;
  } catch (error) {
    console.error(`❌ Error guardando en Firebase:`, error);
    console.warn("⚠️ Usando localStorage como fallback");
    return false;
  }
}

/**
 * Obtener presupuesto desde Firebase Realtime Database
 * @param {string} id - ID corto (ej: "Xm7Kb2")
 * @returns {Promise<object|null>} Datos del presupuesto o null si no existe
 */
async function obtenerPresupuestoFirebase(id) {
  try {
    if (!database) {
      console.warn("⚠️ Firebase no disponible");
      return null;
    }
    const presupuestoRef = ref(database, `presupuestos/${id}`);
    const snapshot = await get(presupuestoRef);
    
    if (snapshot.exists()) {
      const presupuesto = snapshot.val();
      
      // Verificar si expiró
      if (new Date(presupuesto.expiresAt) < new Date()) {
        console.log(`⚠️ Presupuesto expirado: ${id}`);
        await eliminarPresupuestoFirebase(id);
        return null;
      }
      
      console.log(`✅ Presupuesto cargado desde Firebase: ${id}`);
      return presupuesto.data;
    } else {
      console.log(`⚠️ Presupuesto no encontrado en Firebase: ${id}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error obteniendo de Firebase:`, error);
    return null;
  }
}

/**
 * Eliminar presupuesto de Firebase
 * @param {string} id - ID corto
 * @returns {Promise<boolean>}
 */
async function eliminarPresupuestoFirebase(id) {
  try {
    if (!database) {
      console.warn("⚠️ Firebase no disponible");
      return false;
    }
    const presupuestoRef = ref(database, `presupuestos/${id}`);
    await remove(presupuestoRef);
    console.log(`✅ Presupuesto eliminado de Firebase: ${id}`);
    return true;
  } catch (error) {
    console.error(`❌ Error eliminando de Firebase:`, error);
    return false;
  }
}

/**
 * Contar presupuestos en Firebase (debug)
 * @returns {Promise<number>}
 */
async function contarPresupuestosFirebase() {
  try {
    const presupuestosRef = ref(database, 'presupuestos');
    const snapshot = await get(presupuestosRef);
    const count = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
    console.log(`📊 Total presupuestos en Firebase: ${count}`);
    return count;
  } catch (error) {
    console.error(`❌ Error contando presupuestos:`, error);
    return 0;
  }
}

/**
 * Verificar conexión a Firebase
 * @returns {Promise<boolean>}
 */
async function verificarConexionFirebase() {
  try {
    if (!database) {
      console.warn("⚠️ Firebase Database no inicializado. Verifica tu conexión a internet y configuración de Firebase.");
      return false;
    }
    const testRef = ref(database, '.info/connected');
    const snapshot = await get(testRef);
    const isConnected = snapshot.val() === true;
    console.log(`🔗 Firebase conectado: ${isConnected ? '✅ Sí' : '❌ No'}`);
    return isConnected;
  } catch (error) {
    console.error(`❌ Error verificando conexión:`, error);
    console.warn("⚠️ Firebase no disponible. La app usará localStorage como fallback.");
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TELEMETRÍA & ANALYTICS LEAN (Nodo events)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Registrar un evento de uso en Firebase RTDB de forma no bloqueante
 * Compatible con la regla: newData.hasChildren(['type', 'timestamp'])
 * @param {string} type - Tipo de evento ('calculo_presupuesto', 'compartir_presupuesto', 'click_tienda')
 * @param {object} metadata - Datos asociados al evento
 */
async function registrarEventoTelemetria(type, metadata = {}) {
  try {
    if (!database) return;
    const eventsRef = ref(database, 'events');
    const nuevoEventoRef = push(eventsRef);
    await set(nuevoEventoRef, {
      type: type,
      timestamp: new Date().toISOString(),
      screen: `${window.innerWidth}x${window.innerHeight}`,
      ...metadata
    });
    console.log(`📈 Evento telemetría registrado en events: ${type}`);
  } catch (err) {
    // Falla silenciosa para proteger la UX del usuario
    console.debug("Telemetría no registrada:", err?.message || err);
  }
}

/**
 * Obtener eventos recientes de telemetría (Solo para Administrador autenticado)
 * @param {number} limite - Cantidad de eventos a recuperar
 * @returns {Promise<Array>}
 */
async function obtenerTelemetriaFirebase(limite = 200) {
  try {
    if (!database) throw new Error("Firebase RTDB no está disponible");
    const eventsQuery = query(ref(database, 'events'), limitToLast(limite));
    const snapshot = await get(eventsQuery);
    if (snapshot.exists()) {
      const val = snapshot.val();
      return Object.entries(val).map(([id, item]) => ({ id, ...item }));
    }
    return [];
  } catch (error) {
    console.error("❌ Error obteniendo eventos:", error);
    throw error;
  }
}

/**
 * Verificar si un UID tiene rol de Administrador en el nodo seguro admins/$uid
 * @param {string} uid - Firebase UID del usuario
 * @returns {Promise<boolean>}
 */
async function verificarEsAdmin(uid) {
  if (!database || !uid) return false;
  try {
    const adminSnap = await get(ref(database, `admins/${uid}`));
    if (adminSnap.exists() && adminSnap.val() === true) {
      return true;
    }
    // Fallback de compatibilidad
    const userAdminSnap = await get(ref(database, `users/${uid}/isAdmin`));
    return userAdminSnap.exists() && userAdminSnap.val() === true;
  } catch (err) {
    console.warn("No se pudo verificar rol de admin:", err);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GESTIÓN DE SKUS (sku_status)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Genera una clave segura y determinista para Firebase RTDB a partir de tienda y nombre
 * (Evita caracteres prohibidos: . # $ / [ ])
 * @param {string} tienda
 * @param {string} nombre
 * @returns {string}
 */
function getSafeSkuKey(tienda, nombre) {
  if (!tienda || !nombre) return '';
  const raw = `${tienda.trim()}___${nombre.trim()}`;
  try {
    return btoa(encodeURIComponent(raw).replace(/%([0-9A-F]{2})/g, (match, p1) =>
      String.fromCharCode('0x' + p1)
    )).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (e) {
    return raw.replace(/[^a-zA-Z0-9_-]/g, '_');
  }
}

/**
 * Obtener todos los estados/overrides de SKUs desde Firebase RTDB
 * @returns {Promise<Object>} Diccionario { [safeSkuKey]: { active: boolean, ... } }
 */
async function obtenerSkuStatusFirebase() {
  try {
    if (!database) return {};
    const skuRef = ref(database, 'sku_status');
    const snap = await get(skuRef);
    if (snap.exists()) {
      return snap.val();
    }
    return {};
  } catch (err) {
    console.warn("⚠️ No se pudo obtener sku_status de Firebase:", err);
    return {};
  }
}

/**
 * Actualizar estado (activo/inactivo) de un SKU en Firebase RTDB
 * @param {string} skuKey - Clave generada con getSafeSkuKey
 * @param {boolean} activo - true para activo, false para desactivado
 * @param {object} metadata - Información opcional (nombre, tienda, updatedBy, motivo)
 * @returns {Promise<boolean>}
 */
async function actualizarSkuStatusFirebase(skuKey, activo, metadata = {}) {
  try {
    if (!database || !skuKey) throw new Error("Base de datos o clave de SKU no disponible");
    const skuRef = ref(database, `sku_status/${skuKey}`);
    await set(skuRef, {
      active: !!activo,
      updatedAt: new Date().toISOString(),
      ...metadata
    });
    console.log(`✅ SKU ${skuKey} actualizado en Firebase: active=${activo}`);
    return true;
  } catch (err) {
    console.error(`❌ Error actualizando SKU en Firebase:`, err);
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT FUNCTIONS & AUTH
// ═══════════════════════════════════════════════════════════════════════════

export {
  database,
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInAnonymously,
  verificarEsAdmin,
  guardarPresupuestoFirebase,
  obtenerPresupuestoFirebase,
  eliminarPresupuestoFirebase,
  contarPresupuestosFirebase,
  verificarConexionFirebase,
  registrarEventoTelemetria,
  obtenerTelemetriaFirebase,
  getSafeSkuKey,
  obtenerSkuStatusFirebase,
  actualizarSkuStatusFirebase
};

