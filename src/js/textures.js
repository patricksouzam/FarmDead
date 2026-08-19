// Texturas geradas proceduralmente via canvas 2D — evita depender de assets externos
// e mantém o app 100% offline/self-contained.
import * as THREE from 'three';

function canvasTexture(size, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function noise(ctx, size, count, colorFn, radiusRange) {
  const [rMin, rMax] = radiusRange || [1, size * 0.02 + 1];
  for (let i = 0; i < count; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = rMin + Math.random() * (rMax - rMin);
    ctx.fillStyle = colorFn();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function makeGrassTexture() {
  return canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#4bc22e';
    ctx.fillRect(0, 0, s, s);
    // manchas grandes de variação de tom para quebrar a repetição do tile
    noise(ctx, s, 55, () => `rgba(${50 + Math.random()*30|0},${150 + Math.random()*30|0},${35 + Math.random()*20|0},0.18)`, [s*0.06, s*0.16]);
    noise(ctx, s, 70, () => `rgba(${100 + Math.random()*40|0},${180 + Math.random()*40|0},${50 + Math.random()*25|0},0.12)`, [s*0.08, s*0.18]);
    noise(ctx, s, 900, () => `rgba(${70 + Math.random()*40|0},${170 + Math.random()*40|0},${45 + Math.random()*25|0},0.3)`);
    noise(ctx, s, 400, () => `rgba(${40 + Math.random()*30|0},${130 + Math.random()*25|0},${35 + Math.random()*15|0},0.25)`);
    // tufos de grama mais claros e pontas de palha seca
    for (let i = 0; i < 260; i++) {
      const x = Math.random() * s, y = Math.random() * s;
      const len = 3 + Math.random() * 5;
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.9;
      ctx.strokeStyle = Math.random() < 0.15
        ? `rgba(${190 + Math.random()*40|0},${170 + Math.random()*40|0},${70 + Math.random()*30|0},0.5)`
        : `rgba(${90 + Math.random()*50|0},${170 + Math.random()*50|0},${60 + Math.random()*30|0},0.55)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.stroke();
    }
  });
}

export function makeDirtTexture() {
  return canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#735232';
    ctx.fillRect(0, 0, s, s);
    noise(ctx, s, 50, () => `rgba(${50 + Math.random()*30|0},${34 + Math.random()*20|0},${18 + Math.random()*12|0},0.22)`, [s*0.05, s*0.13]);
    noise(ctx, s, 40, () => `rgba(${140 + Math.random()*30|0},${110 + Math.random()*25|0},${70 + Math.random()*20|0},0.12)`, [s*0.04, s*0.1]);
    noise(ctx, s, 700, () => `rgba(${90 + Math.random()*40|0},${60 + Math.random()*30|0},${35 + Math.random()*20|0},0.55)`);
    noise(ctx, s, 250, () => `rgba(${45 + Math.random()*20|0},${30 + Math.random()*15|0},${15 + Math.random()*10|0},0.5)`);
    // pequenas pedrinhas e detritos para dar textura ao caminho
    for (let i = 0; i < 120; i++) {
      const x = Math.random() * s, y = Math.random() * s;
      const r = 1 + Math.random() * 2.2;
      ctx.fillStyle = `rgba(${120 + Math.random()*50|0},${105 + Math.random()*40|0},${85 + Math.random()*30|0},0.6)`;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.7, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

export function makeTilledDirtTexture() {
  return canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#5a3d24';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(30,20,10,0.5)';
    ctx.lineWidth = 4;
    for (let y = 16; y < s; y += 28) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(s, y);
      ctx.stroke();
    }
    noise(ctx, s, 300, () => `rgba(${100 + Math.random()*40|0},${70 + Math.random()*30|0},${40 + Math.random()*20|0},0.4)`);
  });
}

export function makeWoodTexture() {
  return canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#7a5232';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 14; i++) {
      const y = (i / 14) * s + (Math.random() - 0.5) * 6;
      ctx.strokeStyle = `rgba(${40 + Math.random()*30|0},${25 + Math.random()*15|0},${10 + Math.random()*10|0},0.6)`;
      ctx.lineWidth = 2 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(s * 0.3, y + 8, s * 0.7, y - 8, s, y);
      ctx.stroke();
    }
    // nós da madeira e veios finos extras para dar realismo às tábuas
    for (let i = 0; i < 4; i++) {
      const kx = Math.random() * s, ky = Math.random() * s;
      const kr = 4 + Math.random() * 4;
      const grad = ctx.createRadialGradient(kx, ky, 0, kx, ky, kr);
      grad.addColorStop(0, 'rgba(30,18,8,0.7)');
      grad.addColorStop(1, 'rgba(30,18,8,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(kx, ky, kr, kr * 0.75, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    noise(ctx, s, 60, () => `rgba(${100 + Math.random()*40|0},${65 + Math.random()*25|0},${30 + Math.random()*15|0},0.25)`, [0.5, 1.5]);
  });
}

// Textura neutra (tons de cinza) para que `texMat({ color })` tinja o telhado
// com a cor desejada por multiplicação, em vez de ficar presa ao vermelho —
// usada tanto no telhado vermelho da casa quanto no cinza-azulado do celeiro/moinho.
export function makeRoofTexture() {
  return canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, s, s);
    const rowH = 20;
    const tileW = 22;
    let row = 0;
    for (let y = 0; y < s + rowH; y += rowH) {
      const offset = (row % 2) * (tileW / 2);
      for (let x = -tileW; x < s + tileW; x += tileW) {
        const shade = 0.85 + Math.random() * 0.3;
        const v = 255 * shade | 0;
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.beginPath();
        ctx.moveTo(x + offset, y + rowH);
        ctx.quadraticCurveTo(x + offset + tileW / 2, y + rowH * 0.15, x + offset + tileW, y + rowH);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(30,30,30,0.55)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      row++;
    }
    noise(ctx, s, 150, () => `rgba(255,255,255,${0.1 + Math.random() * 0.15})`);
  });
}

export function makeSandTexture() {
  return canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#dcc98a';
    ctx.fillRect(0, 0, s, s);
    noise(ctx, s, 60, () => `rgba(${230 + Math.random()*20|0},${210 + Math.random()*20|0},${150 + Math.random()*20|0},0.2)`, [s*0.05, s*0.12]);
    noise(ctx, s, 800, () => `rgba(${200 + Math.random()*30|0},${180 + Math.random()*30|0},${120 + Math.random()*25|0},0.35)`);
    noise(ctx, s, 300, () => `rgba(${160 + Math.random()*30|0},${145 + Math.random()*25|0},${95 + Math.random()*20|0},0.4)`);
  });
}

export function makeStoneTexture() {
  return canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#8a8a8a';
    ctx.fillRect(0, 0, s, s);
    // blocos de pedra irregulares com contorno de argamassa
    const cols = 5, rows = 7;
    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * (s / cols / 2);
      for (let c = -1; c <= cols; c++) {
        const bw = s / cols;
        const bh = s / rows;
        const x = c * bw + offset + (Math.random() - 0.5) * 3;
        const y = r * bh + (Math.random() - 0.5) * 3;
        const shade = 0.8 + Math.random() * 0.35;
        ctx.fillStyle = `rgb(${140 * shade | 0},${140 * shade | 0},${145 * shade | 0})`;
        ctx.fillRect(x + 2, y + 2, bw - 4, bh - 4);
      }
    }
    ctx.strokeStyle = 'rgba(70,70,72,0.6)';
    ctx.lineWidth = 3;
    for (let r = 0; r <= rows; r++) ctx.strokeRect(0, r * (s / rows), s, 0);
    noise(ctx, s, 300, () => `rgba(${110 + Math.random()*50|0},${110 + Math.random()*50|0},${110 + Math.random()*50|0},0.35)`);
    noise(ctx, s, 150, () => `rgba(${60 + Math.random()*30|0},${60 + Math.random()*30|0},${60 + Math.random()*30|0},0.3)`);
  });
}
