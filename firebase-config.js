// ═══════════════════════════════════════════════════════════════════════════
// FIREBASE CONFIGURATION - v3.0 Shared Budget Backend
// ═══════════════════════════════════════════════════════════════════════════
// Este archivo conecta la app a Firebase Realtime Database
// Los presupuestos se guardan GLOBALMENTE en Firebase (no solo en localStorage)
// ═══════════════════════════════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, set, get, remove, query, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

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
const database = getDatabase(app);

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
    const testRef = ref(database, '.info/connected');
    const snapshot = await get(testRef);
    const isConnected = snapshot.val() === true;
    console.log(`🔗 Firebase conectado: ${isConnected}`);
    return isConnected;
  } catch (error) {
    console.error(`❌ Error verificando conexión:`, error);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

export {
  database,
  guardarPresupuestoFirebase,
  obtenerPresupuestoFirebase,
  eliminarPresupuestoFirebase,
  contarPresupuestosFirebase,
  verificarConexionFirebase
};
