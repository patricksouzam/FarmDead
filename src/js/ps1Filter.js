import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

export const PS1_INTERNAL_WIDTH = 480;
export const PS1_VERTEX_SNAP = 160.0;
export const PS1_POSTERIZE = 24;
export const PS1_VIGNETTE = 0.18;
export const PS1_SCANLINE = 0.04;

const PS1_SNAP_INJECT = /* glsl */ `
#include <project_vertex>
float ps1VertexSnap = ${PS1_VERTEX_SNAP.toFixed(1)};
if (gl_Position.w > 0.001) {
  gl_Position.xy = floor(gl_Position.xy / gl_Position.w * ps1VertexSnap + 0.5) / ps1VertexSnap * gl_Position.w;
}
`;

let snapEnabled = false;

const Ps1Shader = {
  name: 'Ps1RetroShader',
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2(1280, 720) },
    pixelWidth: { value: PS1_INTERNAL_WIDTH },
    posterize: { value: PS1_POSTERIZE },
    vignette: { value: PS1_VIGNETTE },
    scanline: { value: PS1_SCANLINE }
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float pixelWidth;
    uniform float posterize;
    uniform float vignette;
    uniform float scanline;
    varying vec2 vUv;

    float bayer4(vec2 p) {
      vec2 xy = mod(floor(p), 4.0);
      float x = xy.x;
      float y = xy.y;
      float index = x + y * 4.0;
      float dither = 0.0;
      if (index < 8.0) {
        if (index < 4.0) dither = index < 2.0 ? (index < 1.0 ? 0.0 : 8.0) : (index < 3.0 ? 2.0 : 10.0);
        else dither = index < 6.0 ? (index < 5.0 ? 12.0 : 4.0) : (index < 7.0 ? 14.0 : 6.0);
      } else {
        if (index < 12.0) dither = index < 10.0 ? (index < 9.0 ? 3.0 : 11.0) : (index < 11.0 ? 1.0 : 9.0);
        else dither = index < 14.0 ? (index < 13.0 ? 15.0 : 7.0) : (index < 15.0 ? 13.0 : 5.0);
      }
      return dither / 16.0;
    }

    void main() {
      float aspect = resolution.x / max(resolution.y, 1.0);
      vec2 grid = vec2(pixelWidth, max(1.0, floor(pixelWidth / aspect)));
      vec2 uv = (floor(vUv * grid) + 0.5) / grid;
      vec4 color = texture2D(tDiffuse, uv);

      float levels = max(posterize, 2.0);
      float dither = (bayer4(uv * grid) - 0.5) / levels;
      color.rgb = floor((color.rgb + dither) * levels + 0.5) / levels;

      vec2 vc = vUv * 2.0 - 1.0;
      float vig = 1.0 - dot(vc, vc) * vignette;
      color.rgb *= vig;

      float line = 1.0 - scanline * step(0.5, fract(uv.y * grid.y * 0.5));
      color.rgb *= line;

      gl_FragColor = color;
    }
  `
};

function skipSnapMaterial(mat) {
  return !mat
    || mat.isMeshDepthMaterial
    || mat.isMeshDistanceMaterial
    || mat.isRawShaderMaterial
    || mat.name === 'Ps1RetroShader';
}

function patchMaterial(mat) {
  if (skipSnapMaterial(mat) || mat.userData.ps1SnapHook) return;
  mat.userData.ps1SnapHook = true;
  const prevCompile = mat.onBeforeCompile.bind(mat);
  const prevKey = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : () => '';
  mat.customProgramCacheKey = () => `${prevKey()}|ps1snap:${snapEnabled ? '1' : '0'}`;
  mat.onBeforeCompile = (shader, renderer) => {
    prevCompile(shader, renderer);
    if (!snapEnabled) return;
    if (!shader.vertexShader.includes('#include <project_vertex>')) return;
    if (shader.vertexShader.includes('ps1VertexSnap')) return;
    shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', PS1_SNAP_INJECT);
  };
}

function refreshSnapMaterials(root) {
  if (!root) return;
  root.traverse((obj) => {
    const mats = obj.material;
    if (!mats) return;
    const list = Array.isArray(mats) ? mats : [mats];
    for (const mat of list) {
      patchMaterial(mat);
      if (mat && mat.userData.ps1SnapHook) mat.needsUpdate = true;
    }
  });
}

export function createPs1Pass(width, height) {
  const pass = new ShaderPass(Ps1Shader);
  pass.material.depthTest = false;
  pass.material.depthWrite = false;
  pass.material.toneMapped = false;
  pass.material.blending = THREE.NoBlending;
  pass.enabled = true;
  updatePs1PassSize(pass, width, height);
  return pass;
}

export function updatePs1PassSize(pass, width, height) {
  if (!pass?.uniforms?.resolution) return;
  pass.uniforms.resolution.value.set(Math.max(1, width), Math.max(1, height));
}

export function setPs1VertexSnap(enabled, root) {
  snapEnabled = !!enabled;
  refreshSnapMaterials(root);
}
