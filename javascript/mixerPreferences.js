/**
 * PREFERENCIAS DE MIXER
 * Gestión del estado de mixer seleccionado por el usuario y generación de UI.
 */

import { getOpcionesConsumo } from './productApi.js';

// ===============================
// ESTADO
// ===============================
// Rastrear qué mixer elige el usuario para bebidas con múltiples opciones
// Ej: { ron: "sprite", piscola: "bebida", jaeger: "redbull" }
let MIXER_PREFERENCES = {};

// Getter para acceso desde otros módulos
export function getMixerPreferencesState() { return MIXER_PREFERENCES; }

// ===============================
// FUNCIONES CORE
// ===============================

/**
 * Obtiene qué mixers alternativos tiene una bebida
 */
export function getMixerAlternativas(bebidaKey) {
  const OPCIONES_CONSUMO = getOpcionesConsumo();
  const config = OPCIONES_CONSUMO[bebidaKey];
  return config?.mixerAlternativas || [];
}

/**
 * Establece la preferencia de mixer para una bebida
 */
export function setMixerPreference(bebidaKey, mixerKey) {
  // Convertir string "null" a null real
  const actualValue = mixerKey === "null" || mixerKey === null ? null : mixerKey;
  MIXER_PREFERENCES[bebidaKey] = actualValue;
  console.log(`✓ Preferencia de mixer guardada: ${bebidaKey} → ${actualValue}`);
  // Guardar en localStorage para persistencia
  localStorage.setItem("MIXER_PREFERENCES", JSON.stringify(MIXER_PREFERENCES));
}

/**
 * Obtiene la preferencia de mixer para una bebida
 */
export function getMixerPreference(bebidaKey) {
  const OPCIONES_CONSUMO = getOpcionesConsumo();
  return MIXER_PREFERENCES[bebidaKey] || OPCIONES_CONSUMO[bebidaKey]?.mixerCategoria;
}

/**
 * Carga preferencias de mixer desde localStorage
 */
export function cargarMixerPreferences() {
  try {
    const saved = localStorage.getItem("MIXER_PREFERENCES");
    if (saved) {
      MIXER_PREFERENCES = JSON.parse(saved);
      console.log(`📥 Preferencias de mixer cargadas:`, MIXER_PREFERENCES);
    }
  } catch (error) {
    console.warn(`⚠️ Error cargando preferencias de mixer:`, error);
  }
}

/**
 * Limpia preferencias de mixer de bebidas no seleccionadas
 */
export function limpiarPreferenciasNoSeleccionadas(selectedDrinks) {
  const toDelete = Object.keys(MIXER_PREFERENCES).filter(key => !selectedDrinks.includes(key));
  for (const key of toDelete) {
    delete MIXER_PREFERENCES[key];
  }
  localStorage.setItem("MIXER_PREFERENCES", JSON.stringify(MIXER_PREFERENCES));
}

// ===============================
// UI PARA SELECCIÓN DE MIXERS
// ===============================

/** Mapa de nombres legibles para cada mixer */
const MIXER_NAMES = {
  null: "Sin mixer",
  "tonica": "Tónica",
  "redbull": "Energética",
  "cola": "Cola",
  "sprite": "Sprite",
  "ginger": "Ginger Ale",
  "fanta": "Fanta/Naranja",
  "jugo_watts": "Jugo Watts"
};

/**
 * Actualiza el label del dropdown de mixer sin reiniciar los sliders
 */
export function updateMixerDropdownLabel(bebidaKey) {
  const currentMixer = getMixerPreference(bebidaKey);
  const mixerName = MIXER_NAMES[currentMixer] || "Selecciona mixer";
  
  // Actualizar el label del botón del dropdown
  const dropdownButton = document.getElementById(`mixerDropdown_${bebidaKey}`);
  if (dropdownButton) {
    dropdownButton.textContent = mixerName;
  }
}

/**
 * Genera UI para seleccionar mixer alternativo para una bebida
 */
export function generarUISelectoresDemixer(bebidaKey) {
  const alternativas = getMixerAlternativas(bebidaKey);
  if (!alternativas || alternativas.length <= 1) return null;
  
  const OPCIONES_CONSUMO = getOpcionesConsumo();
  const config = OPCIONES_CONSUMO[bebidaKey];
  const bebidaNombre = config?.displayName || config?.nombre;
  
  // Obtener mixer seleccionado actualmente
  const currentMixer = getMixerPreference(bebidaKey) || config?.mixerCategoria;
  const currentMixerName = MIXER_NAMES[currentMixer] || "Selecciona mixer";
  
  // Generar dropdown con opciones de mixer
  let html = `
    <div class="mt-3 pt-2 border-top">
      <small class="text-muted d-block mb-2"><strong>🥤 Mixer para ${bebidaNombre}</strong></small>
      <div class="dropdown">
        <button class="btn btn-sm btn-outline-secondary dropdown-toggle w-100 text-start" 
                type="button" id="mixerDropdown_${bebidaKey}" data-bs-toggle="dropdown" 
                data-bs-auto-close="outside" aria-expanded="false">
          ${currentMixerName}
        </button>
        <div class="dropdown-menu w-100 p-2" aria-labelledby="mixerDropdown_${bebidaKey}">
  `;
  
  for (const mixerKey of alternativas) {
    const mixerName = MIXER_NAMES[mixerKey] || mixerKey;
    const safeId = mixerKey === null ? "sin_mixer" : mixerKey;
    const checkId = `mixer_${bebidaKey}_${safeId}`;
    const isSelected = getMixerPreference(bebidaKey) === mixerKey;
    const isDefault = config?.mixerCategoria === mixerKey;
    
    html += `
      <div class="form-check mb-2">
        <input class="form-check-input mixer-option" type="radio" name="mixer_${bebidaKey}" 
               value="${safeId}" data-mixer-value="${mixerKey === null ? 'null' : mixerKey}" 
               id="${checkId}" ${isSelected ? 'checked' : ''}>
        <label class="form-check-label" for="${checkId}">
          ${mixerName} ${isDefault ? '<span class="badge bg-secondary ms-1">Recomendado</span>' : ''}
        </label>
      </div>
    `;
  }
  
  html += `
        </div>
      </div>
    </div>
  `;
  
  return html;
}
