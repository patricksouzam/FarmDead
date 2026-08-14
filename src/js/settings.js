// Preferências do aplicativo (áudio/gráficos), separadas do progresso salvo
// de jogo (gameState.js/saveGame.js) — sobrevivem entre partidas e saves.
const STORAGE_KEY = 'farmcool_settings';

export const DEFAULT_SETTINGS = {
  audio: { musicVolume: 0.6, sfxVolume: 0.8, muted: false },
  graphics: { quality: 'high', shadows: true, bloom: true, pixelRatioCap: 2, renderScale: 1.0 }
};

function mergeSection(defaults, saved) {
  return { ...defaults, ...(saved && typeof saved === 'object' ? saved : {}) };
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_SETTINGS);
    const parsed = JSON.parse(raw);
    return {
      audio: mergeSection(DEFAULT_SETTINGS.audio, parsed.audio),
      graphics: mergeSection(DEFAULT_SETTINGS.graphics, parsed.graphics)
    };
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}

export function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function resetSettings() {
  const defaults = structuredClone(DEFAULT_SETTINGS);
  saveSettings(defaults);
  return defaults;
}

export const QUALITY_PRESETS = {
  low: { shadows: false, bloom: false, pixelRatioCap: 1, renderScale: 0.75 },
  medium: { shadows: true, bloom: false, pixelRatioCap: 1.5, renderScale: 0.9 },
  high: { shadows: true, bloom: true, pixelRatioCap: 2, renderScale: 1.0 }
};

export function applyQualityPreset(graphics, quality) {
  const preset = QUALITY_PRESETS[quality] || QUALITY_PRESETS.high;
  return { ...graphics, quality, ...preset };
}
