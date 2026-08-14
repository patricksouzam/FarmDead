// Áudio sintetizado via Web Audio API — sem assets externos. Música fica como
// hook pronto (audio element) para o usuário plugar arquivos depois; SFX são
// osciladores curtos para dar feedback imediato de ação.
let audioCtx = null;
let sfxGain = null;
let musicGain = null;
let musicEl = null;
let currentSettings = { musicVolume: 0.6, sfxVolume: 0.8, muted: false };

function ensureContext() {
  if (audioCtx) return audioCtx;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  sfxGain = audioCtx.createGain();
  sfxGain.connect(audioCtx.destination);
  musicGain = audioCtx.createGain();
  musicGain.connect(audioCtx.destination);
  applyAudioSettings(currentSettings);
  return audioCtx;
}

export function initAudio() {
  ensureContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

export function applyAudioSettings(audio) {
  currentSettings = audio;
  if (!sfxGain || !musicGain) return;
  sfxGain.gain.value = audio.muted ? 0 : audio.sfxVolume;
  musicGain.gain.value = audio.muted ? 0 : audio.musicVolume;
  if (musicEl) musicEl.volume = audio.muted ? 0 : audio.musicVolume;
}

const SFX_PRESETS = {
  plant: { freqStart: 320, freqEnd: 520, duration: 0.14, type: 'sine' },
  water: { freqStart: 260, freqEnd: 180, duration: 0.18, type: 'sine' },
  harvest: { freqStart: 440, freqEnd: 660, duration: 0.16, type: 'triangle' },
  weed: { freqStart: 200, freqEnd: 140, duration: 0.12, type: 'square' },
  sell: { freqStart: 500, freqEnd: 900, duration: 0.2, type: 'triangle' },
  error: { freqStart: 240, freqEnd: 140, duration: 0.18, type: 'square' },
  notification: { freqStart: 700, freqEnd: 700, duration: 0.1, type: 'sine' },
  click: { freqStart: 500, freqEnd: 500, duration: 0.06, type: 'sine' },
  bell: { freqStart: 920, freqEnd: 620, duration: 0.35, type: 'sine', hits: 3, hitGap: 0.22 }
};

export function playSfx(name) {
  if (!audioCtx) return;
  const preset = SFX_PRESETS[name];
  if (!preset) return;

  const hits = preset.hits || 1;
  const hitGap = preset.hitGap || 0;
  const now = audioCtx.currentTime;

  for (let h = 0; h < hits; h++) {
    const start = now + h * hitGap;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = preset.type;
    const freqBias = h * 18;
    osc.frequency.setValueAtTime(preset.freqStart - freqBias, start);
    osc.frequency.linearRampToValueAtTime(preset.freqEnd - freqBias * 0.5, start + preset.duration);
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(0.28, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + preset.duration);
    osc.connect(gain);
    gain.connect(sfxGain);
    osc.start(start);
    osc.stop(start + preset.duration + 0.02);
  }
}

// Hook pronto para trilha sonora: sem assets no repo, url pode ser null/vazio
// e a função simplesmente não faz nada.
export function playMusicTrack(url) {
  if (!url) return;
  if (!musicEl) musicEl = new Audio();
  musicEl.src = url;
  musicEl.loop = true;
  musicEl.volume = currentSettings.muted ? 0 : currentSettings.musicVolume;
  musicEl.play().catch(() => {});
}

export function stopMusic() {
  if (musicEl) musicEl.pause();
}
