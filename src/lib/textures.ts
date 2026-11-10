import * as THREE from 'three';
import { PALETTE } from './layout';
import { Poly, blade, flyingBird, heron, leafHoles, leafOutline, mulberry32, soaringBird, waveStrip, xform } from './shapes';

export const FONT = '"Avenir Next", "Avenir", "Helvetica Neue", Arial, sans-serif';

const cache = new Map<string, unknown>();
export function memo<T>(key: string, fn: () => T): T {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key) as T;
}

export function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  return { c, ctx };
}

export function tex(c: HTMLCanvasElement, opts: { srgb?: boolean; repeat?: [number, number]; aniso?: number } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (opts.srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = opts.aniso ?? 8;
  if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...opts.repeat); }
  t.needsUpdate = true;
  return t;
}

export function drawPolys(ctx: CanvasRenderingContext2D, polys: Poly[], fill: string, map: (p: [number, number]) => [number, number]) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  for (const p of polys) {
    p.forEach((pt, i) => {
      const [x, y] = map(pt);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
  }
  ctx.fill('nonzero');
}

/** Normal map from a grayscale height canvas. */
export function normalFromHeight(src: HTMLCanvasElement, strength: number) {
  const w = src.width, h = src.height;
  const d = src.getContext('2d')!.getImageData(0, 0, w, h).data;
  const { c, ctx } = canvas(w, h);
  const out = ctx.createImageData(w, h);
  const H = (x: number, y: number) => d[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (H(x - 1, y) - H(x + 1, y)) * strength;
      const dy = (H(x, y - 1) - H(x, y + 1)) * strength;
      const l = Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      out.data[i] = ((dx / l) * 0.5 + 0.5) * 255;
      out.data[i + 1] = ((-dy / l) * 0.5 + 0.5) * 255;
      out.data[i + 2] = ((1 / l) * 0.5 + 0.5) * 255;
      out.data[i + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  return c;
}

export function grain(ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, rnd: () => number, dens = 1, alpha = 1) {
  const n = Math.floor(w * h * 0.0016 * dens) + 6;
  for (let i = 0; i < n; i++) {
    const y = y0 + rnd() * h;
    const len = w * (0.25 + rnd() * 0.9);
    const x = x0 + rnd() * w - len * 0.3;
    const dark = rnd() < 0.6;
    ctx.strokeStyle = dark ? `rgba(60,30,12,${(0.05 + rnd() * 0.14) * alpha})` : `rgba(255,220,170,${(0.03 + rnd() * 0.07) * alpha})`;
    ctx.lineWidth = 0.6 + rnd() * 1.8;
    ctx.beginPath();
    const amp = rnd() * 2.5, f = 0.003 + rnd() * 0.01, ph = rnd() * 6;
    for (let s = 0; s <= 24; s++) {
      const xx = x + (len * s) / 24;
      const yy = y + Math.sin(xx * f + ph) * amp;
      if (s === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
  }
}

// ---------------------------------------------------------------- wood
export function woodTexture(base = PALETTE.wood, seed = 7) {
  return memo('wood' + base + seed, () => {
    const W = 1024, H = 256;
    const { c, ctx } = canvas(W, H);
    const rnd = mulberry32(seed);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, H);
    // broad tonal bands
    for (let i = 0; i < 14; i++) {
      const y = rnd() * H;
      const g = ctx.createLinearGradient(0, y - 20, 0, y + 20);
      const col = rnd() < 0.5 ? 'rgba(80,40,15,0.18)' : 'rgba(255,210,150,0.10)';
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, col); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, y - 20, W, 40);
    }
    grain(ctx, -100, 0, W + 200, H, rnd, 3.5);
    // wrap seam: copy left edge onto right edge for tiling
    ctx.globalAlpha = 0.5;
    ctx.drawImage(c, 0, 0, 40, H, W - 40, 0, 40, H);
    ctx.globalAlpha = 1;
    return tex(c, { repeat: [1, 1] });
  });
}

// ---------------------------------------------------------------- deck floor (8m x 6m) with painted water lines
const FLOOR_PX = 256; // px per meter
export function deckFloorTextures() {
  return memo('deckfloor', () => {
    const W = 8 * FLOOR_PX, H = 6 * FLOOR_PX;
    const { c, ctx } = canvas(W, H);
    const hgt = canvas(W, H);
    const emi = canvas(W, H);
    const rnd = mulberry32(42);
    const BW = 0.14 * FLOOR_PX, GAP = 2;
    hgt.ctx.fillStyle = '#fff'; hgt.ctx.fillRect(0, 0, W, H);
    emi.ctx.fillStyle = '#000'; emi.ctx.fillRect(0, 0, W, H);
    const tones = ['#9c6339', '#8f5a33', '#a36a3d', '#94603a', '#8a5530', '#a87245'];
    for (let y = 0, row = 0; y < H; y += BW, row++) {
      let x = -rnd() * 600;
      while (x < W) {
        const len = 500 + rnd() * 700;
        ctx.fillStyle = tones[Math.floor(rnd() * tones.length)];
        ctx.fillRect(x, y, len, BW);
        grain(ctx, x, y, len, BW, rnd, 2.2);
        // end joint
        ctx.fillStyle = 'rgba(30,15,6,0.85)';
        ctx.fillRect(x + len - 1.5, y, 1.5, BW);
        hgt.ctx.fillStyle = '#000';
        hgt.ctx.fillRect(x + len - 2, y, 2, BW);
        x += len;
      }
      void row;
    }
    // painted flowing water lines (weather-resistant non-slip paint)
    const m = (x: number, z: number): [number, number] => [(x + 4) * FLOOR_PX, (z + 3) * FLOOR_PX];
    // grain overlay so paint reads as applied on timber
    ctx.globalAlpha = 0.35;
    grain(ctx, 0, 0, W, H, rnd, 1.2);
    ctx.globalAlpha = 1;
    // board gaps drawn last
    for (let y = 0; y < H; y += BW) {
      ctx.fillStyle = 'rgba(25,12,5,0.95)';
      ctx.fillRect(0, y, W, GAP);
      hgt.ctx.fillStyle = '#000';
      hgt.ctx.fillRect(0, y - 1, W, GAP + 2);
    }
    const map = tex(c, { aniso: 16 });
    const normalMap = tex(normalFromHeight(hgt.c, 3), { srgb: false, aniso: 16 });
    const emissiveMap = tex(emi.c);
    return { map, normalMap, emissiveMap };
  });
}

// ---------------------------------------------------------------- concrete path with flowing lines
export function pathTexture() {
  return memo('path', () => {
    const W = 256, H = 1024;
    const { c, ctx } = canvas(W, H);
    const rnd = mulberry32(5);
    ctx.fillStyle = '#b8b2a4';
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 9000; i++) {
      const v = 150 + rnd() * 70;
      ctx.fillStyle = `rgba(${v},${v - 5},${v - 14},${0.25 + rnd() * 0.3})`;
      ctx.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 2.5, 1 + rnd() * 2.5);
    }
    const band = (x: number, col: string, w: number, ph: number) => {
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'butt';
      ctx.beginPath();
      for (let y = 0; y <= H; y += 8) {
        const xx = x + Math.sin((y / H) * Math.PI * 4 + ph) * 34;
        if (y === 0) ctx.moveTo(xx, y); else ctx.lineTo(xx, y);
      }
      ctx.stroke();
    };
    band(98, PALETTE.olive, 20, 0);
    band(124, PALETTE.lime, 14, 0);
    band(146, PALETTE.forest, 9, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    for (let y = 0; y < H; y += 256) ctx.fillRect(0, y, W, 2);
    return tex(c, { repeat: [1, 1] });
  });
}

// ---------------------------------------------------------------- generic ground
export function groundTexture() {
  return memo('ground', () => {
    const W = 512;
    const { c, ctx } = canvas(W, W);
    const rnd = mulberry32(11);
    ctx.fillStyle = '#4d6b2c';
    ctx.fillRect(0, 0, W, W);
    for (let i = 0; i < 26000; i++) {
      const x = rnd() * W, y = rnd() * W;
      const g = 70 + rnd() * 70;
      ctx.fillStyle = rnd() < 0.08 ? `rgba(110,85,50,0.5)` : `rgba(${g * 0.55},${g},${g * 0.32},0.55)`;
      const l = 2 + rnd() * 6;
      ctx.fillRect(x, y, 1.2, l);
      if (x > W - 8) ctx.fillRect(x - W, y, 1.2, l);
      if (y > W - 8) ctx.fillRect(x, y - W, 1.2, l);
    }
    return tex(c, { repeat: [60, 60] });
  });
}

export function barkTexture() {
  return memo('bark', () => {
    const { c, ctx } = canvas(256, 512);
    const rnd = mulberry32(3);
    ctx.fillStyle = '#5b4a3a';
    ctx.fillRect(0, 0, 256, 512);
    for (let i = 0; i < 500; i++) {
      const x = rnd() * 256;
      ctx.strokeStyle = rnd() < 0.5 ? 'rgba(30,22,15,0.45)' : 'rgba(150,130,105,0.25)';
      ctx.lineWidth = 1 + rnd() * 3;
      ctx.beginPath();
      ctx.moveTo(x, rnd() * 512);
      ctx.lineTo(x + (rnd() - 0.5) * 8, rnd() * 512);
      ctx.stroke();
    }
    return tex(c, { repeat: [2, 3] });
  });
}

// ---------------------------------------------------------------- foliage cards
export function leafCardTexture(kind: 'canopy' | 'bamboo' = 'canopy') {
  return memo('leafcard' + kind, () => {
    const S = 256;
    const { c, ctx } = canvas(S, S);
    const rnd = mulberry32(kind === 'canopy' ? 21 : 22);
    const greens = ['#3f6b2a', '#4f7d30', '#2f5522', '#5b8a37', '#36602a', '#6a9440'];
    const n = kind === 'canopy' ? 26 : 22;
    for (let i = 0; i < n; i++) {
      const cx = 30 + rnd() * (S - 60), cy = 30 + rnd() * (S - 60);
      const len = kind === 'canopy' ? 40 + rnd() * 34 : 60 + rnd() * 50;
      const wid = kind === 'canopy' ? len * (0.45 + rnd() * 0.15) : len * 0.16;
      const p = xform(leafOutline(1, wid / len, 14), { x: cx, y: cy, s: len, r: rnd() * Math.PI * 2 });
      drawPolys(ctx, [p], greens[Math.floor(rnd() * greens.length)], (q) => q);
      ctx.strokeStyle = 'rgba(20,40,10,0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    const t = tex(c);
    t.anisotropy = 4;
    return t;
  });
}

export function grassTexture(kind: 'grass' | 'reed') {
  return memo('grass' + kind, () => {
    const W = kind === 'grass' ? 256 : 128, H = 256;
    const { c, ctx } = canvas(W, H);
    const rnd = mulberry32(kind === 'grass' ? 31 : 32);
    const n = kind === 'grass' ? 46 : 18;
    for (let i = 0; i < n; i++) {
      const x = 10 + rnd() * (W - 20);
      const h = H * (kind === 'grass' ? 0.45 + rnd() * 0.5 : 0.7 + rnd() * 0.28);
      const g = 80 + rnd() * 80;
      const col = kind === 'grass' ? `rgb(${g * 0.55},${g},${g * 0.3})` : `rgb(${g * 0.62},${g * 0.95},${g * 0.38})`;
      const p = blade(x, h, kind === 'grass' ? 5 + rnd() * 4 : 5 + rnd() * 3, (rnd() - 0.5) * (kind === 'grass' ? 60 : 24));
      drawPolys(ctx, [p], col, ([a, b]) => [a, H - b]);
    }
    if (kind === 'reed') {
      for (let i = 0; i < 4; i++) {
        const x = 20 + rnd() * (W - 40), y = 30 + rnd() * 40;
        ctx.fillStyle = '#5a3d22';
        ctx.beginPath(); ctx.ellipse(x, y, 4, 16, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#6c8a3a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, y + 16); ctx.lineTo(x, H); ctx.stroke();
      }
    }
    return tex(c);
  });
}

// ---------------------------------------------------------------- water ripples (tileable normal map)
export function waterNormalTexture() {
  return memo('waternormal', () => {
    const S = 256;
    const { c, ctx } = canvas(S, S);
    const img = ctx.createImageData(S, S);
    const rnd = mulberry32(9);
    const waves: [number, number, number, number][] = [];
    for (let i = 0; i < 26; i++) waves.push([Math.floor(rnd() * 9) - 4, Math.floor(rnd() * 9) - 4, rnd() * 6.28, 0.3 + rnd()]);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      let h = 0;
      for (const [kx, ky, ph, a] of waves) h += (a * Math.sin(((kx * x + ky * y) / S) * Math.PI * 2 + ph)) / (1 + Math.hypot(kx, ky) * 0.5);
      const v = Math.max(0, Math.min(255, 128 + h * 28));
      const i = (y * S + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const n = tex(normalFromHeight(c, 2.2), { srgb: false, repeat: [14, 14] });
    return n;
  });
}

// ---------------------------------------------------------------- graphic acrylic railing panels
export function acrylicTexture(variant: number) {
  return memo('acrylic' + variant, () => {
    const W = 1024, H = 640;
    const { c, ctx } = canvas(W, H);
    const e = canvas(W, H);
    const rnd = mulberry32(100 + variant);
    // frosted acrylic base
    ctx.fillStyle = 'rgba(232,240,214,0.16)';
    ctx.fillRect(0, 0, W, H);
    e.ctx.fillStyle = '#000'; e.ctx.fillRect(0, 0, W, H);
    const both = (polys: Poly[], col: string, glow: string, m: (p: [number, number]) => [number, number]) => {
      drawPolys(ctx, polys, col, m);
      drawPolys(e.ctx, polys, glow, m);
    };
    const flip = ([x, y]: [number, number]): [number, number] => [x, H - y];
    // reeds always
    const reeds: Poly[] = [];
    for (let i = 0; i < 16; i++) reeds.push(blade(30 + rnd() * (W - 60), 180 + rnd() * 280, 10 + rnd() * 10, (rnd() - 0.5) * 140));
    both(reeds, 'rgba(214,230,90,0.85)', '#9fb03a', flip);
    if (variant === 0 || variant === 3) {
      both(heron().map((p) => xform(p, { x: variant === 0 ? 700 : 300, y: 0, s: 430, fx: variant === 3 })), 'rgba(244,240,227,0.95)', '#f4f0e3', flip);
    }
    if (variant === 1 || variant === 3) {
      for (let i = 0; i < 5; i++) {
        const L = 150 + rnd() * 120;
        both(leafHoles({ len: L, width: L * 0.5, veins: 4, slant: 0.7 }).map((p) => xform(p, { x: 120 + rnd() * (W - 240), y: 200 + rnd() * 300, r: (rnd() - 0.5) * 1.6 })), 'rgba(113,140,58,0.92)', '#55702a', flip);
      }
    }
    if (variant === 2) {
      for (let i = 0; i < 3; i++) both([xform(flyingBird(), { x: 220 + i * 260 + rnd() * 60, y: 430 + rnd() * 120, s: 170 + rnd() * 60 })], 'rgba(244,240,227,0.95)', '#f4f0e3', flip);
      for (let i = 0; i < 3; i++) both([waveStrip(0, W, 50 + i * 38, 10, 260, 12, i)], 'rgba(214,230,90,0.9)', '#c8d850', flip);
    }
    if (variant === 1) {
      both([xform(soaringBird(), { x: 760, y: 520, s: 150 })], 'rgba(244,240,227,0.95)', '#f4f0e3', flip);
    }
    const map = tex(c);
    const emissiveMap = tex(e.c);
    return { map, emissiveMap };
  });
}

// ---------------------------------------------------------------- sliding transparent illustration layers
export function sliderLayerTexture(variant: 0 | 1) {
  return memo('slider' + variant, () => {
    const W = 1024, H = 600;
    const { c, ctx } = canvas(W, H);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(244,240,227,0.10)';
    ctx.fillRect(0, 0, W, H);
    const flip = ([x, y]: [number, number]): [number, number] => [x, H - y];
    const outline = (polys: Poly[], fill: string, stroke = PALETTE.forest) => {
      drawPolys(ctx, polys, fill, flip);
      ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.stroke();
    };
    const label = (x: number, y: number, t: string, sub?: string) => {
      ctx.font = `600 26px ${FONT}`;
      const w = ctx.measureText(t).width + 26;
      ctx.fillStyle = 'rgba(16,60,47,0.88)';
      ctx.beginPath(); ctx.roundRect(x, y - 24, w, 36, 18); ctx.fill();
      ctx.fillStyle = PALETTE.cream; ctx.fillText(t, x + 13, y + 3);
      if (sub) { ctx.font = `italic 500 20px ${FONT}`; ctx.fillStyle = 'rgba(16,60,47,0.95)'; ctx.fillText(sub, x + 6, y + 34); }
    };
    if (variant === 0) {
      // strata: canopy / shore / water surface
      ctx.setLineDash([10, 10]); ctx.strokeStyle = 'rgba(214,230,90,0.9)'; ctx.lineWidth = 3;
      [200, 400].forEach((y) => { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); });
      ctx.setLineDash([]);
      ctx.font = `700 22px ${FONT}`; ctx.fillStyle = PALETTE.lime;
      ctx.fillText('DOSEL', 24, 40); ctx.fillText('ORILLA', 24, 240); ctx.fillText('SUPERFICIE DEL AGUA', 24, 440);
      for (let i = 0; i < 4; i++) {
        const L = 110 + i * 10;
        outline(leafHoles({ len: L, width: L * 0.55, veins: 4 }).map((p) => xform(p, { x: 560 + i * 120, y: 520 + (i % 2) * 30, r: -0.6 + i * 0.4 })), 'rgba(113,140,58,0.85)');
      }
      outline([xform(flyingBird(), { x: 330, y: 500, s: 200 })], 'rgba(244,240,227,0.95)');
      label(250, 580 - 520 + 40, 'Barranquero', 'anida en el dosel');
      outline(heron().map((p) => xform(p, { x: 640, y: 210, s: 210 })), 'rgba(244,240,227,0.95)');
      const reeds: Poly[] = [];
      for (let i = 0; i < 10; i++) reeds.push(blade(760 + i * 22, 120 + (i % 3) * 40, 9, (i - 5) * 6));
      outline(reeds.map((p) => xform(p, { y: 210 })), 'rgba(214,230,90,0.85)');
      label(470, 240, 'Garza real', 'caza en aguas someras');
      label(800, 270, 'Juncos');
      // lily pads & dragonfly
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = 'rgba(113,140,58,0.9)';
        ctx.beginPath(); ctx.ellipse(160 + i * 150, H - 70 + (i % 2) * 18, 52, 18, 0, 0.25, Math.PI * 2 - 0.25); ctx.lineTo(160 + i * 150, H - 70 + (i % 2) * 18); ctx.fill();
        ctx.strokeStyle = PALETTE.forest; ctx.lineWidth = 3; ctx.stroke();
      }
      drawDragonfly(ctx, 420, H - 150, 1.2);
      label(80, H - 140, 'Nenúfares');
      label(480, H - 160, 'Libélula');
    } else {
      // birds of the lagoon at different heights
      const birds: [number, number, number, string, string][] = [
        [180, 470, 190, 'Garza real', 'vuela sobre la laguna'],
        [560, 520, 140, 'Pato pisingo', 'se desplaza en bandadas'],
        [850, 430, 160, 'Gavilán caracolero', 'se alimenta de caracoles'],
      ];
      for (const [x, y, s, n, d] of birds) {
        outline([xform(flyingBird(), { x, y, s, fx: x > 700 })], 'rgba(244,240,227,0.95)');
        label(x - s * 0.45, H - y + s * 0.42 + 26, n, d);
      }
      outline(heron().map((p) => xform(p, { x: 420, y: 40, s: 240, fx: true })), 'rgba(244,240,227,0.95)');
      label(470, H - 130, 'Garcita bueyera');
      ctx.fillStyle = 'rgba(214,230,90,0.85)';
      // kingfisher perched on branch
      ctx.strokeStyle = PALETTE.forest; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(700, H - 150); ctx.quadraticCurveTo(820, H - 190, 980, H - 160); ctx.stroke();
      ctx.fillStyle = 'rgba(214,230,90,0.95)';
      ctx.beginPath(); ctx.ellipse(850, H - 215, 26, 38, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath(); ctx.arc(838, H - 260, 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = PALETTE.forest;
      ctx.beginPath(); ctx.moveTo(820, H - 262); ctx.lineTo(770, H - 252); ctx.lineTo(822, H - 252); ctx.fill();
      label(760, H - 108, 'Martín pescador', 'se zambulle para pescar');
      for (let i = 0; i < 3; i++) { drawPolys(ctx, [waveStrip(0, W, 24 + i * 24, 8, 200, 7, i * 1.3)], 'rgba(214,230,90,0.75)', flip); }
    }
    return tex(c);
  });
}

function drawDragonfly(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(244,240,227,0.85)';
  ctx.strokeStyle = PALETTE.forest; ctx.lineWidth = 2;
  for (const [rx, ry, a] of [[-38, -6, -0.25], [38, -6, 0.25], [-34, 10, 0.2], [34, 10, -0.2]] as const) {
    ctx.beginPath(); ctx.ellipse(rx, ry, 36, 9, a, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = PALETTE.forest;
  ctx.beginPath(); ctx.ellipse(0, 22, 4, 40, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -16, 8, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- heron mural wall
export function muralTexture() {
  return memo('mural', () => {
    const W = 1024, H = 940;
    const { c, ctx } = canvas(W, H);
    const rnd = mulberry32(77);
    ctx.fillStyle = PALETTE.forest;
    ctx.fillRect(0, 0, W, H);
    const flip = ([x, y]: [number, number]): [number, number] => [x, H - y];
    // botanical stems
    for (let i = 0; i < 4; i++) {
      const bx = 110 + i * 70;
      ctx.strokeStyle = PALETTE.olive; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(bx, H - 120); ctx.quadraticCurveTo(bx + 40, H - 400, bx - 20 + i * 18, H - 640 - i * 40); ctx.stroke();
      for (let k = 0; k < 4; k++) {
        const L = 120 + rnd() * 60;
        const y = 260 + k * 120 + i * 20;
        drawPolys(ctx, [xform(leafOutline(L, L * 0.42), { x: bx + (k % 2 ? 55 : -50), y, r: k % 2 ? -0.7 : 0.7 })], k % 2 ? PALETTE.lime : PALETTE.olive, flip);
      }
    }
    drawPolys(ctx, heron().map((p) => xform(p, { x: 620, y: 160, s: 640 })), PALETTE.cream, flip);
    for (let i = 0; i < 3; i++) drawPolys(ctx, [waveStrip(0, W, 60 + i * 44, 16, 330, 22, i * 0.8)], i === 1 ? PALETTE.lime : PALETTE.cream, flip);
    ctx.font = `600 34px ${FONT}`;
    ctx.fillStyle = PALETTE.lime;
    ctx.fillText('LAGUNA · HÁBITAT DE VIDA', 60, 80);
    ctx.font = `500 26px ${FONT}`;
    ctx.fillStyle = PALETTE.cream;
    ctx.fillText('Agua, plantas y aves: una misma red.', 60, 122);
    return tex(c);
  });
}

// ---------------------------------------------------------------- arrival / exit sign
export function signTexture(side: 'front' | 'back') {
  return memo('sign' + side, () => {
    const W = 900, H = 600;
    const { c, ctx } = canvas(W, H);
    ctx.fillStyle = PALETTE.forest;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = PALETTE.lime;
    ctx.fillRect(0, H - 26, W, 26);
    if (side === 'front') {
      drawPolys(ctx, [xform(soaringBird(), { x: 120, y: 0, s: 150 })], PALETTE.lime, ([x, y]) => [x, 140 - y]);
      ctx.fillStyle = PALETTE.cream;
      ctx.font = `700 76px ${FONT}`;
      ctx.fillText('Pausa', 60, 300);
      ctx.fillText('para observar.', 60, 384);
      ctx.font = `500 30px ${FONT}`;
      ctx.fillStyle = 'rgba(244,240,227,0.8)';
      ctx.fillText('Mira abajo, a través y hacia arriba.', 60, 470);
      ctx.fillText('Mirador accesible  →  20 m', 60, 515);
    } else {
      ctx.fillStyle = PALETTE.cream;
      ctx.font = `700 62px ${FONT}`;
      ctx.fillText('Elevar la mirada,', 60, 210);
      ctx.fillText('conectar la vida.', 60, 288);
      ctx.font = `500 30px ${FONT}`;
      ctx.fillStyle = PALETTE.lime;
      ctx.fillText('¿Qué otras conexiones verás en el camino?', 60, 380);
      ctx.fillText('Continúa el sendero ecológico  →', 60, 430);
      drawPolys(ctx, leafHoles({ len: 1, width: 0.5, veins: 4 }), PALETTE.olive, ([x, y]) => [760 + x * 180, 160 - y * 180]);
    }
    return tex(c);
  });
}

export function selectorTexture() {
  return memo('selector', () => {
    const W = 512, H = 384;
    const { c, ctx } = canvas(W, H);
    ctx.fillStyle = PALETTE.forest; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = PALETTE.lime; ctx.font = `700 30px ${FONT}`;
    ctx.fillText('PROYECCIÓN NOCTURNA', 34, 56);
    ctx.fillStyle = PALETTE.cream; ctx.font = `500 24px ${FONT}`;
    ctx.fillText('Elige la sombra que se proyecta', 34, 96);
    ['Hojas', 'Aves', 'Agua'].forEach((t, i) => {
      ctx.fillText(t, 50 + i * 155, 340);
    });
    return tex(c);
  });
}

export function wheelPlateTexture() {
  return memo('wheelplate', () => {
    const W = 512, H = 256;
    const { c, ctx } = canvas(W, H);
    ctx.fillStyle = PALETTE.forest; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = PALETTE.lime; ctx.font = `700 34px ${FONT}`;
    ctx.fillText('RUEDA DE LA', 30, 70);
    ctx.fillText('BIODIVERSIDAD', 30, 112);
    ctx.fillStyle = PALETTE.cream; ctx.font = `500 24px ${FONT}`;
    ctx.fillText('Gira cada disco: tres símbolos', 30, 170);
    ctx.fillText('iguales abren la ventana', 30, 204);
    return tex(c);
  });
}

// ---------------------------------------------------------------- gobo projector patterns
export function goboTexture(pattern: 'hojas' | 'aves' | 'agua') {
  return memo('gobo' + pattern, () => {
    const S = 512;
    const { c, ctx } = canvas(S, S);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, S, S);
    const rnd = mulberry32(pattern.length * 13);
    const m = ([x, y]: [number, number]): [number, number] => [x, y];
    if (pattern === 'hojas') {
      for (let i = 0; i < 9; i++) {
        const L = 110 + rnd() * 90;
        drawPolys(ctx, leafHoles({ len: L, width: L * (0.5 + rnd() * 0.3), veins: 4, slant: 0.6 }).map((p) => xform(p, { x: 80 + rnd() * 350, y: 80 + rnd() * 350, r: rnd() * 6.28 })), '#fff', m);
      }
    } else if (pattern === 'aves') {
      for (let i = 0; i < 7; i++) {
        drawPolys(ctx, [xform(rnd() < 0.5 ? flyingBird() : soaringBird(), { x: 90 + rnd() * 330, y: 90 + rnd() * 330, s: 90 + rnd() * 70, r: (rnd() - 0.5) * 0.9 })], '#fff', m);
      }
    } else {
      for (let i = 0; i < 9; i++) drawPolys(ctx, [waveStrip(0, S, 50 + i * 50, 16, 150 + (i % 3) * 30, 14, i * 0.9)], '#fff', m);
    }
    // soft circular aperture
    const g = ctx.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.5);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    // faint ambient fill so the projected area reads as a soft pool of light
    ctx.globalCompositeOperation = 'lighter';
    const g2 = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S * 0.48);
    g2.addColorStop(0, 'rgba(60,60,60,1)'); g2.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = g2; ctx.fillRect(0, 0, S, S);
    ctx.globalCompositeOperation = 'source-over';
    const t = tex(c);
    return t;
  });
}

// ---------------------------------------------------------------- biodiversity wheel discs
export const WHEEL_DATA = [
  { title: 'FAUNA', items: ['Garza', 'Colibrí', 'Libélula', 'Pez'] },
  { title: 'VEGETACIÓN', items: ['Juncos', 'Árbol', 'Nenúfar', 'Raíces'] },
  { title: 'AGUA', items: ['Orilla', 'Lluvia', 'Superficie', 'Profundidad'] },
];
export const NICHE_COLORS = [PALETTE.lime, PALETTE.cream, '#9DBE5A', 'ring'];

export function wheelDiscTexture(disc: number) {
  return memo('wheeldisc' + disc, () => {
    const S = 1024, R = S / 2;
    const { c, ctx } = canvas(S, S);
    ctx.clearRect(0, 0, S, S);
    const bgs = disc === 0 ? [PALETTE.forest, '#174a3a'] : disc === 1 ? ['#4f6a26', PALETTE.olive] : ['#1d4f5a', '#245e66'];
    for (let k = 0; k < 4; k++) {
      const phi = Math.PI / 2 - (k * Math.PI) / 2; // local angle (y up)
      const a0 = -phi - Math.PI / 4, a1 = -phi + Math.PI / 4; // canvas angles
      ctx.fillStyle = bgs[k % 2];
      ctx.beginPath(); ctx.moveTo(R, R); ctx.arc(R, R, R - 4, a0, a1); ctx.closePath(); ctx.fill();
      ctx.save();
      ctx.translate(R + Math.cos(-phi) * R * 0.52, R + Math.sin(-phi) * R * 0.52);
      ctx.rotate((k * Math.PI) / 2);
      drawWheelIcon(ctx, disc, k);
      ctx.fillStyle = PALETTE.cream;
      ctx.font = `700 46px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(WHEEL_DATA[disc].items[k].toUpperCase(), 0, -150);
      // niche marker
      const nc = NICHE_COLORS[k];
      ctx.beginPath(); ctx.arc(0, 168, 20, 0, Math.PI * 2);
      if (nc === 'ring') { ctx.strokeStyle = PALETTE.cream; ctx.lineWidth = 7; ctx.stroke(); }
      else { ctx.fillStyle = nc; ctx.fill(); }
      ctx.restore();
    }
    // dividers + rim
    ctx.strokeStyle = PALETTE.cream; ctx.lineWidth = 6;
    for (let k = 0; k < 4; k++) {
      const a = -Math.PI / 4 + (k * Math.PI) / 2;
      ctx.beginPath(); ctx.moveTo(R + Math.cos(a) * 70, R + Math.sin(a) * 70); ctx.lineTo(R + Math.cos(a) * (R - 6), R + Math.sin(a) * (R - 6)); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(R, R, R - 8, 0, Math.PI * 2); ctx.lineWidth = 10; ctx.stroke();
    ctx.fillStyle = PALETTE.cream;
    ctx.beginPath(); ctx.arc(R, R, 64, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.forest; ctx.font = `700 30px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText(String(disc + 1), R, R + 11);
    return tex(c, { aniso: 8 });
  });
}

function drawWheelIcon(ctx: CanvasRenderingContext2D, disc: number, k: number) {
  const cream = PALETTE.cream, lime = PALETTE.lime;
  const P = (polys: Poly[], col: string, s: number, ox = 0, oy = 0) => drawPolys(ctx, polys, col, ([x, y]) => [ox + x * s, oy - y * s]);
  ctx.save();
  if (disc === 0) {
    if (k === 0) P(heron(), cream, 230, 0, 110);
    if (k === 1) {
      // hummingbird
      ctx.fillStyle = cream;
      ctx.beginPath(); ctx.ellipse(0, 10, 54, 28, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(46, -22, 22, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(60, -28); ctx.lineTo(130, -46); ctx.lineTo(62, -16); ctx.fill();
      ctx.fillStyle = lime;
      ctx.beginPath(); ctx.ellipse(-10, -40, 22, 70, -0.9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = cream;
      ctx.beginPath(); ctx.moveTo(-40, 24); ctx.lineTo(-110, 60); ctx.lineTo(-96, 30); ctx.fill();
    }
    if (k === 2) drawDragonflyIcon(ctx);
    if (k === 3) {
      ctx.fillStyle = cream;
      ctx.beginPath(); ctx.ellipse(0, 0, 90, 40, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-80, 0); ctx.lineTo(-135, -38); ctx.lineTo(-135, 38); ctx.fill();
      ctx.fillStyle = PALETTE.forest; ctx.beginPath(); ctx.arc(52, -8, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = lime; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(110 + i * 8, -30 - i * 26, 8 - i * 2, 0, Math.PI * 2); ctx.fill(); }
    }
  } else if (disc === 1) {
    if (k === 0) { const r: Poly[] = []; for (let i = 0; i < 7; i++) r.push(blade(-90 + i * 30, 160 + (i % 3) * 30, 16, (i - 3) * 18)); P(r, lime, 1, 0, 100); }
    if (k === 1) {
      ctx.fillStyle = cream; ctx.fillRect(-12, 20, 24, 90);
      ctx.fillStyle = lime;
      for (const [x, y, r] of [[0, -40, 70], [-60, 0, 52], [60, 0, 52], [-30, -90, 46], [34, -86, 46]] as const) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
    }
    if (k === 2) {
      ctx.fillStyle = lime;
      ctx.beginPath(); ctx.ellipse(0, 40, 120, 46, 0, 0.3, Math.PI * 2 - 0.3); ctx.lineTo(0, 40); ctx.fill();
      ctx.fillStyle = cream;
      for (let i = 0; i < 7; i++) { ctx.save(); ctx.translate(0, -10); ctx.rotate(-1.4 + i * 0.47); ctx.beginPath(); ctx.ellipse(0, -38, 14, 40, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    }
    if (k === 3) {
      ctx.strokeStyle = cream; ctx.lineCap = 'round';
      ctx.fillStyle = lime; ctx.fillRect(-120, -70, 240, 10);
      const root = (x: number, y: number, d: number, a: number, w: number) => {
        if (d === 0) return;
        const nx = x + Math.sin(a) * 50, ny = y + Math.cos(a) * 50;
        ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(nx, ny); ctx.stroke();
        root(nx, ny, d - 1, a - 0.45, w * 0.65); root(nx, ny, d - 1, a + 0.45, w * 0.65);
      };
      root(0, -60, 4, 0, 16);
    }
  } else {
    if (k === 0) { P([waveStrip(-130, 130, 10, 12, 90, 18, 0)], cream, 1); const r: Poly[] = []; for (let i = 0; i < 5; i++) r.push(blade(-110 + i * 18, 120, 12, -10 + i * 6)); P(r, lime, 1, 0, 0); P([waveStrip(-130, 130, -40, 12, 90, 18, 1)], cream, 1); }
    if (k === 1) {
      ctx.fillStyle = cream;
      for (const [x, y, r] of [[-40, -60, 50], [30, -70, 60], [80, -40, 40], [-80, -40, 38]] as const) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillRect(-118, -40, 236, 40);
      ctx.fillStyle = lime;
      for (let i = 0; i < 6; i++) { ctx.beginPath(); const x = -90 + i * 36, y = 40 + (i % 2) * 30; ctx.moveTo(x, y - 20); ctx.quadraticCurveTo(x + 12, y + 6, x, y + 12); ctx.quadraticCurveTo(x - 12, y + 6, x, y - 20); ctx.fill(); }
    }
    if (k === 2) { for (let i = 0; i < 3; i++) { ctx.strokeStyle = i === 1 ? lime : cream; ctx.lineWidth = 12; ctx.beginPath(); ctx.ellipse(0, 0, 40 + i * 42, 16 + i * 17, 0, 0, Math.PI * 2); ctx.stroke(); } }
    if (k === 3) { for (let i = 0; i < 5; i++) P([waveStrip(-130, 130, 90 - i * 44, 10, 110, 14 + i * 3, i)], i % 2 ? lime : cream, 1); }
  }
  ctx.restore();
}

function drawDragonflyIcon(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = PALETTE.lime;
  for (const [rx, ry, a] of [[-62, -28, -0.2], [62, -28, 0.2], [-56, 2, 0.25], [56, 2, -0.25]] as const) { ctx.beginPath(); ctx.ellipse(rx, ry, 60, 16, a, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = PALETTE.cream;
  ctx.beginPath(); ctx.ellipse(0, 40, 9, 80, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -50, 17, 0, Math.PI * 2); ctx.fill();
}
