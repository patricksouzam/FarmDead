import * as THREE from 'three';
import { skyPaletteForSeason } from './seasons.js';

const SHADOW_EXTENT = 40;
const NIGHT_TOP = new THREE.Color(0x06101c);
const NIGHT_BOTTOM = new THREE.Color(0x121820);

let sceneRef = null;
let ambientLight = null;
let hemiLight = null;
let sunLight = null;
let moonLight = null;
let fillLight = null;
let areaPreset = 'overworld';
let shadowsEnabled = true;

const nightOnlyLanterns = [];

function configureShadowCam(light, { radius = 2 } = {}) {
  light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  light.shadow.camera.near = 1;
  light.shadow.camera.far = 140;
  light.shadow.camera.left = -SHADOW_EXTENT;
  light.shadow.camera.right = SHADOW_EXTENT;
  light.shadow.camera.top = SHADOW_EXTENT;
  light.shadow.camera.bottom = -SHADOW_EXTENT;
  light.shadow.bias = -0.0015;
  light.shadow.radius = radius;
}

export function createLighting(scene) {
  sceneRef = scene;
  nightOnlyLanterns.length = 0;

  ambientLight = new THREE.AmbientLight(0xdfe8ff, 0.38);
  scene.add(ambientLight);

  hemiLight = new THREE.HemisphereLight(0xcfe8ff, 0x6a8a46, 0.5);
  scene.add(hemiLight);

  sunLight = new THREE.DirectionalLight(0xfff0c8, 3.2);
  sunLight.position.set(30, 40, 20);
  sunLight.castShadow = false;
  scene.add(sunLight);

  fillLight = new THREE.DirectionalLight(0xaecdff, 0.28);
  fillLight.position.set(-25, 18, -18);
  scene.add(fillLight);

  moonLight = new THREE.DirectionalLight(0xb8c8ff, 0);
  moonLight.position.set(-30, 40, -20);
  configureShadowCam(moonLight, { radius: 2 });
  scene.add(moonLight);
  scene.add(moonLight.target);

  return { ambientLight, hemiLight, sunLight, moonLight, fillLight };
}

export function createLantern({
  color = 0xffc878,
  intensity = 1.1,
  range = 8,
  decay = 1.8,
  nightOnly = false,
  nightIntensity = intensity || 2.4,
  glassMat = null,
  glassEmissive = 1.6
} = {}) {
  const light = new THREE.PointLight(color, nightOnly ? 0 : intensity, range, decay);
  if (nightOnly) {
    nightOnlyLanterns.push({ light, glassMat, nightIntensity, glassEmissive });
  }
  return { light, glassMat };
}

export function setAreaPreset(name) {
  areaPreset = name === 'basement' ? 'basement' : 'overworld';
  applyCasterFlags();
}

export function applyLightingQuality(graphics = {}) {
  shadowsEnabled = graphics.shadows !== false;
  const quality = graphics.quality || 'high';
  const size = quality === 'low' ? 512 : quality === 'medium' ? 1024 : 2048;
  if (moonLight) {
    moonLight.shadow.mapSize.set(size, size);
    moonLight.shadow.needsUpdate = true;
  }
  applyCasterFlags();
}

function applyCasterFlags() {
  if (sunLight) sunLight.castShadow = false;
  if (moonLight) {
    moonLight.castShadow = shadowsEnabled && areaPreset !== 'basement';
  }
}

function followShadowCaster(followPos, sunAngle, sunHeight) {
  if (!moonLight || !followPos) return;
  const px = followPos.x ?? 0;
  const py = followPos.y ?? 0;
  const pz = followPos.z ?? 0;
  moonLight.position.set(
    px - Math.cos(sunAngle) * 45,
    py + Math.max(-sunHeight, -0.15) * 45 + 5,
    pz - 15
  );
  moonLight.target.position.set(px, py, pz);
  moonLight.target.updateMatrixWorld();
}

function applyBasementOverride() {
  if (sunLight) sunLight.intensity = 0.02;
  if (moonLight) moonLight.intensity = 0.06;
  if (ambientLight) ambientLight.intensity = 0.1;
  if (hemiLight) hemiLight.intensity = 0.14;
  if (fillLight) fillLight.intensity = 0.04;
}

export function updateLighting({
  worldTime = 0,
  simTime = 0,
  simDelta = 0.016,
  season,
  weatherMul = 1,
  followPos = null,
  treesEyes = null,
  sunMesh = null,
  moonMesh = null,
  skyUniforms = null,
  scene = sceneRef,
  renderer = null
} = {}) {
  if (!sunLight || !moonLight) return;

  const sunAngle = (worldTime / 1440) * Math.PI * 2 - Math.PI / 2;
  const sunHeight = Math.sin(sunAngle);
  const dayFactor = THREE.MathUtils.clamp((sunHeight + 0.15) / 0.35, 0, 1);
  const nightGlow = 1 - dayFactor;
  const isDawnDusk = false;

  sunLight.position.set(Math.cos(sunAngle) * 45, Math.max(sunHeight, -0.15) * 45 + 5, 15);
  moonLight.position.set(-Math.cos(sunAngle) * 45, Math.max(-sunHeight, -0.15) * 45 + 5, -15);

  if (sunMesh) {
    const skyDist = 118;
    sunMesh.position.set(
      Math.cos(sunAngle) * skyDist,
      Math.max(sunHeight, 0.02) * skyDist * 0.72 + 18,
      28
    );
    sunMesh.visible = dayFactor > 0.05;
    sunMesh.rotation.y += simDelta * 0.15;
    const sunScale = THREE.MathUtils.lerp(0.7, 1.15, dayFactor);
    sunMesh.scale.setScalar(sunScale * (isDawnDusk ? 1.2 : 1));
  }
  if (moonMesh) {
    const skyDist = 110;
    moonMesh.position.set(
      -Math.cos(sunAngle) * skyDist,
      Math.max(-sunHeight, 0.02) * skyDist * 0.72 + 16,
      -22
    );
    moonMesh.visible = dayFactor < 0.85;
    moonMesh.scale.setScalar(THREE.MathUtils.lerp(1.1, 0.4, dayFactor));
  }

  sunLight.intensity = THREE.MathUtils.lerp(0.05, isDawnDusk ? 2.55 : 3.2, dayFactor);
  sunLight.color.setHex(isDawnDusk ? 0xffb06a : 0xfff0c8);
  moonLight.intensity = THREE.MathUtils.lerp(1.15 + Math.sin(simTime * 0.12) * 0.18, 0, dayFactor);
  ambientLight.intensity = THREE.MathUtils.lerp(0.16, 0.38, dayFactor);
  hemiLight.intensity = THREE.MathUtils.lerp(0.22, 0.48, dayFactor);
  fillLight.intensity = THREE.MathUtils.lerp(0.12, 0.28, dayFactor);

  if (areaPreset === 'basement') applyBasementOverride();
  else followShadowCaster(followPos, sunAngle, sunHeight);

  if (skyUniforms && scene?.fog) {
    const seasonSky = skyPaletteForSeason(season);
    const skyTop = new THREE.Color(isDawnDusk ? 0xe6853e : seasonSky.top).lerp(NIGHT_TOP, 1 - dayFactor);
    const skyBottom = new THREE.Color(isDawnDusk ? 0xffd49a : seasonSky.bottom).lerp(NIGHT_BOTTOM, 1 - dayFactor);
    skyUniforms.topColor.value.lerp(skyTop, 0.05);
    skyUniforms.bottomColor.value.lerp(skyBottom, 0.05);
    scene.fog.color.copy(skyUniforms.bottomColor.value);
    const fogDay = 0.0025;
    const fogDusk = 0.0048;
    const fogNight = 0.0155 + Math.sin(simTime * 0.18) * 0.0035;
    const fogTarget = (isDawnDusk
      ? THREE.MathUtils.lerp(fogNight, fogDusk, dayFactor)
      : THREE.MathUtils.lerp(fogNight, fogDay, dayFactor)) * weatherMul;
    scene.fog.density = THREE.MathUtils.damp(scene.fog.density, fogTarget, 1.2, simDelta);
  }

  if (renderer) {
    renderer.toneMappingExposure = THREE.MathUtils.lerp(0.78, isDawnDusk ? 1.22 : 1.18, dayFactor);
  }

  if (treesEyes) treesEyes.visible = dayFactor < 0.15;

  for (const lantern of nightOnlyLanterns) {
    if (!lantern.light) continue;
    lantern.light.intensity = THREE.MathUtils.lerp(0, lantern.nightIntensity, nightGlow);
    if (lantern.glassMat) {
      lantern.glassMat.emissiveIntensity = THREE.MathUtils.lerp(0, lantern.glassEmissive, nightGlow);
    }
  }

  return { dayFactor, nightGlow, sunAngle, sunHeight };
}
