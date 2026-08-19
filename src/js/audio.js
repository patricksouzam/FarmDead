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
  flashlight_click: { freqStart: 180, freqEnd: 90, duration: 0.08, type: 'square' },
  bell: { freqStart: 920, freqEnd: 620, duration: 0.35, type: 'sine', hits: 3, hitGap: 0.22 }
};

export function playSfx(name, opts = {}) {
  if (!audioCtx) return;
  if (name === 'zombie_idle' || name === 'zombie_agro' || name === 'zombie_attack'
    || name === 'zombie_hurt' || name === 'zombie_die' || name === 'melee_swing'
    || name === 'gunshot' || name === 'flesh_hit' || name === 'reload'
    || name === 'heartbeat' || name === 'alert_stinger' || name === 'player_die') {
    playComplexSfx(name, opts);
    return;
  }
  const preset = SFX_PRESETS[name];
  if (!preset) return;

  const hits = preset.hits || 1;
  const hitGap = preset.hitGap || 0;
  const now = audioCtx.currentTime;
  const vol = opts.volume ?? 0.28;

  for (let h = 0; h < hits; h++) {
    const start = now + h * hitGap;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = preset.type;
    const freqBias = h * 18;
    osc.frequency.setValueAtTime(preset.freqStart - freqBias, start);
    osc.frequency.linearRampToValueAtTime(preset.freqEnd - freqBias * 0.5, start + preset.duration);
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(vol, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + preset.duration);
    osc.connect(gain);
    gain.connect(sfxGain);
    osc.start(start);
    osc.stop(start + preset.duration + 0.02);
  }
}

function noiseBuffer(duration) {
  const len = Math.max(1, Math.floor(audioCtx.sampleRate * duration));
  const buffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function playComplexSfx(name, opts) {
  const now = audioCtx.currentTime;
  const volMul = opts.volume ?? 1;

  if (name === 'heartbeat') {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(52 + (opts.pitch || 0) * 18, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.22 * volMul, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(sfxGain);
    osc.start(now);
    osc.stop(now + 0.18);
    const osc2 = audioCtx.createOscillator();
    const g2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(46 + (opts.pitch || 0) * 14, now + 0.14);
    g2.gain.setValueAtTime(0.001, now + 0.14);
    g2.gain.linearRampToValueAtTime(0.16 * volMul, now + 0.16);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc2.connect(g2);
    g2.connect(sfxGain);
    osc2.start(now + 0.14);
    osc2.stop(now + 0.32);
    return;
  }

  if (name === 'alert_stinger') {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.22);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.2 * volMul, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(sfxGain);
    osc.start(now);
    osc.stop(now + 0.3);
    return;
  }

  if (name === 'reload') {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.setValueAtTime(160, now + 0.08);
    osc.frequency.setValueAtTime(280, now + 0.16);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.16 * volMul, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(sfxGain);
    osc.start(now);
    osc.stop(now + 0.3);
    return;
  }

  if (name === 'melee_swing') {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.16);
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.22 * volMul, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(sfxGain);
    osc.start(now);
    osc.stop(now + 0.22);
    return;
  }

  if (name === 'gunshot') {
    const src = audioCtx.createBufferSource();
    src.buffer = noiseBuffer(0.18);
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.frequency.exponentialRampToValueAtTime(280, now + 0.14);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.45 * volMul, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(sfxGain);
    src.start(now);
    src.stop(now + 0.2);
    return;
  }

  if (name === 'player_die') {
    const src = audioCtx.createBufferSource();
    src.buffer = noiseBuffer(0.9);
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, now);
    filter.frequency.exponentialRampToValueAtTime(70, now + 0.85);
    const ng = audioCtx.createGain();
    ng.gain.setValueAtTime(0.001, now);
    ng.gain.linearRampToValueAtTime(0.38 * volMul, now + 0.04);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    src.connect(filter);
    filter.connect(ng);
    ng.connect(sfxGain);
    src.start(now);
    src.stop(now + 0.95);

    const osc = audioCtx.createOscillator();
    const og = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(96, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.8);
    og.gain.setValueAtTime(0.001, now);
    og.gain.linearRampToValueAtTime(0.22 * volMul, now + 0.05);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    osc.connect(og);
    og.connect(sfxGain);
    osc.start(now);
    osc.stop(now + 0.9);
    return;
  }

  if (name === 'flesh_hit') {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.32 * volMul, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(sfxGain);
    osc.start(now);
    osc.stop(now + 0.18);
    const src = audioCtx.createBufferSource();
    src.buffer = noiseBuffer(0.1);
    const ng = audioCtx.createGain();
    ng.gain.setValueAtTime(0.18 * volMul, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    src.connect(ng);
    ng.connect(sfxGain);
    src.start(now);
    src.stop(now + 0.12);
    return;
  }

  const groaning = name === 'zombie_idle' || name === 'zombie_agro' || name === 'zombie_attack';
  const duration = name === 'zombie_die' ? 0.55 : (name === 'zombie_hurt' ? 0.22 : 0.45);
  const src = audioCtx.createBufferSource();
  src.buffer = noiseBuffer(duration);
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  const base = name === 'zombie_agro' ? 420 : name === 'zombie_attack' ? 280 : name === 'zombie_hurt' ? 520 : 180;
  filter.frequency.setValueAtTime(base, now);
  filter.frequency.linearRampToValueAtTime(base * (groaning ? 0.55 : 0.4), now + duration);
  filter.Q.value = 2.2;
  const gain = audioCtx.createGain();
  const peak = (name === 'zombie_attack' ? 0.28 : name === 'zombie_die' ? 0.34 : 0.16) * volMul;
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(peak, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(sfxGain);
  src.start(now);
  src.stop(now + duration + 0.02);

  if (groaning || name === 'zombie_die') {
    const osc = audioCtx.createOscillator();
    const og = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(name === 'zombie_die' ? 70 : 95, now);
    osc.frequency.linearRampToValueAtTime(name === 'zombie_die' ? 40 : 60, now + duration);
    og.gain.setValueAtTime(0.001, now);
    og.gain.linearRampToValueAtTime(0.08 * volMul, now + 0.04);
    og.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(og);
    og.connect(sfxGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
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

let heartbeatWait = 0;

export function updateHeartbeat(awareness, delta) {
  if (!audioCtx || awareness < 0.18) {
    heartbeatWait = 0;
    return;
  }
  const interval = 1.12 - awareness * 0.62;
  heartbeatWait -= delta;
  if (heartbeatWait > 0) return;
  heartbeatWait = Math.max(0.38, interval);
  playSfx('heartbeat', { volume: 0.35 + awareness * 0.7, pitch: awareness });
}
