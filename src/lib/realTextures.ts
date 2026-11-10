// Textures for the buildable version of the deck: everything a visitor reads or touches on site
// (rubbing plates, plaques, printed rails, panoramic guide, bird-safe glass).
import { PALETTE } from './layout';
import { flyingBird, leafHoles, mulberry32, waveStrip, xform } from './shapes';
import { FONT, canvas, drawPolys, grain, memo, normalFromHeight, tex } from './textures';

/** Clear glass with a ceramic-frit dot grid (≈5 × 10 cm): visible to birds, transparent for people. */
export function birdSafeGlassTexture() {
  return memo('birdglass', () => {
    const W = 512, H = 320; // ≈1.3 × 0.8 m
    const { c, ctx } = canvas(W, H);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(214,232,228,0.05)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(244,240,227,0.8)';
    const sx = 20, sy = 40;
    for (let y = sy / 2, r = 0; y < H; y += sy, r++) {
      for (let x = (r % 2 ? sx / 2 : 0) + 6; x < W; x += sx) { ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill(); }
    }
    return tex(c, { aniso: 8 });
  });
}

const PANO: [number, string][][] = [
  [[0.27, 'Guadua'], [0.74, 'Dormidero de garzas']],
  [[0.3, 'Juncos'], [0.72, 'Garza real']],
  [[0.3, 'Nenúfares'], [0.74, 'Espejo de agua']],
];
/** Panoramic identification strip on the handrail: the horizon drawn as a line, readable from the benches. */
export function panoramaTexture(k: number) {
  return memo('pano' + k, () => {
    const W = 1024, H = 160;
    const { c, ctx } = canvas(W, H);
    const rnd = mulberry32(300 + k);
    ctx.fillStyle = PALETTE.forest; ctx.fillRect(0, 0, W, H);
    // horizon silhouette (top half)
    ctx.fillStyle = PALETTE.olive;
    ctx.beginPath(); ctx.moveTo(0, 58);
    for (let x = 0; x <= W; x += 8) {
      const t = x / W;
      const tree = Math.max(0, Math.sin(t * 9 + k * 2.1) * 0.55 + Math.sin(t * 23 + k) * 0.3);
      ctx.lineTo(x, 60 - tree * 34 - rnd() * 3);
    }
    ctx.lineTo(W, 66); ctx.lineTo(0, 66); ctx.fill();
    ctx.fillStyle = PALETTE.lime; ctx.fillRect(0, 66, W, 4);
    // names (bottom half): large cream type on solid green, readable from the bench
    ctx.font = `800 46px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    for (const [u, t] of PANO[k]) {
      const x = u * W;
      ctx.fillStyle = PALETTE.cream;
      ctx.beginPath(); ctx.arc(x, 24, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(x - 1.5, 24, 3, 42);
      ctx.fillText(t, x, 130);
    }
    if (k === 0) { ctx.textAlign = 'left'; ctx.font = `800 20px ${FONT}`; ctx.fillStyle = PALETTE.lime; ctx.fillText('LO QUE VES DESDE LA BANCA', 14, 154); }
    return tex(c);
  });
}

export const PLATE_LABEL: Record<string, string> = { agua: 'AGUA', veg: 'VEGETACIÓN', aves: 'AVES', ins: 'INSECTOS', luz: 'LUZ', tu: 'TÚ' };

function plateSymbol(g: CanvasRenderingContext2D, node: string, cx: number, cy: number, fg: string) {
  g.fillStyle = fg; g.strokeStyle = fg;
  const M = (s: number) => ([x, y]: [number, number]): [number, number] => [cx + x * s, cy - y * s];
  if (node === 'agua') for (let i = 0; i < 3; i++) drawPolys(g, [waveStrip(-75, 75, (i - 1) * 32, 9, 55, 11, i)], fg, ([x, y]) => [cx + x, cy - y]);
  if (node === 'veg') drawPolys(g, leafHoles({ len: 1, width: 0.55, veins: 4 }).map((p) => xform(p, { r: 0.7 })), fg, M(130));
  if (node === 'aves') drawPolys(g, [flyingBird()], fg, M(160));
  if (node === 'ins') {
    for (const [rx, ry, a] of [[-38, -18, -0.2], [38, -18, 0.2], [-34, 4, 0.25], [34, 4, -0.25]] as const) { g.beginPath(); g.ellipse(cx + rx, cy + ry, 38, 10, a, 0, Math.PI * 2); g.fill(); }
    g.beginPath(); g.ellipse(cx, cy + 22, 6, 50, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(cx, cy - 32, 11, 0, Math.PI * 2); g.fill();
  }
  if (node === 'luz') {
    g.beginPath(); g.arc(cx, cy, 30, 0, Math.PI * 2); g.fill();
    g.lineWidth = 9; g.lineCap = 'round';
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * 44, cy + Math.sin(a) * 44); g.lineTo(cx + Math.cos(a) * 66, cy + Math.sin(a) * 66); g.stroke(); }
  }
  if (node === 'tu') {
    g.lineWidth = 9;
    g.beginPath(); g.moveTo(cx - 72, cy); g.quadraticCurveTo(cx, cy - 62, cx + 72, cy); g.quadraticCurveTo(cx, cy + 62, cx - 72, cy); g.stroke();
    g.beginPath(); g.arc(cx, cy, 22, 0, Math.PI * 2); g.fill();
  }
}

/** Cast-bronze rubbing plate in relief: colour map + normal map from the same drawing. */
export function plateTextures(node: string) {
  return memo('plate' + node, () => {
    const S = 256;
    const { c, ctx } = canvas(S, S);
    const h = canvas(S, S);
    const draw = (g: CanvasRenderingContext2D, fg: string, bg: string) => {
      g.fillStyle = bg; g.fillRect(0, 0, S, S);
      g.strokeStyle = fg; g.lineWidth = 7; g.strokeRect(12, 12, S - 24, S - 24);
      plateSymbol(g, node, S / 2, S * 0.43, fg);
      g.fillStyle = fg; g.font = `800 27px ${FONT}`; g.textAlign = 'center';
      g.fillText(PLATE_LABEL[node], S / 2, S - 30);
    };
    draw(ctx, '#e0c48a', '#4a3a24');
    draw(h.ctx, '#000000', '#ffffff');
    return { map: tex(c), normalMap: tex(normalFromHeight(h.c, 5), { srgb: false }) };
  });
}

/** Small engraved plaque: title + up to three lines. */
export function plaqueTexture(title: string, lines: string[], w = 512, h = 192) {
  return memo('plaque' + title + lines.join('|') + w + h, () => {
    const { c, ctx } = canvas(w, h);
    ctx.fillStyle = PALETTE.forest; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = PALETTE.lime; ctx.fillRect(0, h - 10, w, 10);
    let size = Math.round(h * 0.17);
    ctx.font = `800 ${size}px ${FONT}`;
    const tw = ctx.measureText(title).width;
    if (tw > w - 44) { size = Math.floor((size * (w - 44)) / tw); ctx.font = `800 ${size}px ${FONT}`; }
    ctx.fillText(title, 22, h * 0.28);
    ctx.fillStyle = PALETTE.cream; ctx.font = `500 ${Math.round(h * 0.13)}px ${FONT}`;
    lines.forEach((l, i) => ctx.fillText(l, 22, h * (0.5 + i * 0.17)));
    return tex(c);
  });
}

export const WHEEL_WINDOW: [string, string][] = [
  ['LA ORILLA', 'La garza caza entre los juncos, donde el agua es poco profunda.'],
  ['EL REFUGIO', 'La lluvia mantiene vivo el árbol que da refugio y néctar al colibrí.'],
  ['LA SUPERFICIE', 'La libélula nace bajo el agua y vive sobre los nenúfares.'],
  ['LA PROFUNDIDAD', 'Las raíces limpian el agua y dan refugio a los peces.'],
];
/** Text printed behind the wheel's reveal window (k = relation 0..3), or the closed wooden shutter (k = 4). */
export function wheelWindowTexture(k: number) {
  return memo('wwin' + k, () => {
    const W = 1024, H = 176;
    const { c, ctx } = canvas(W, H);
    ctx.textAlign = 'center';
    if (k === 4) {
      ctx.fillStyle = '#a86c3e'; ctx.fillRect(0, 0, W, H);
      grain(ctx, 0, 0, W, H, mulberry32(77), 1.6);
      ctx.fillStyle = 'rgba(16,60,47,0.92)'; ctx.font = `700 40px ${FONT}`;
      ctx.fillText('¿Qué relación se esconde aquí?', W / 2, 80);
      ctx.font = `500 28px ${FONT}`;
      ctx.fillText('Alinea tres símbolos iguales bajo las flechas', W / 2, 128);
      return tex(c);
    }
    ctx.fillStyle = PALETTE.cream; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = PALETTE.forest; ctx.font = `800 44px ${FONT}`;
    ctx.fillText(WHEEL_WINDOW[k][0], W / 2, 66);
    ctx.font = `500 32px ${FONT}`; ctx.fillStyle = '#2b4a3c';
    ctx.fillText(WHEEL_WINDOW[k][1], W / 2, 124);
    return tex(c);
  });
}

const RAIL_ZONES: [string, string][][] = [
  [['DOSEL', 'barranquero · árboles'], ['ORILLA', 'garza · juncos'], ['SUPERFICIE', 'libélula · nenúfares']],
  [['EN VUELO', 'garza real'], ['EN LA ORILLA', 'pato · garcita bueyera'], ['CAZADORES', 'martín pescador · gavilán']],
];
/** Printed strip under the sliding layer: the three stops of the layer, readable without a screen. */
export function slideRailTexture(variant: 0 | 1) {
  return memo('srail' + variant, () => {
    const W = 2048, H = 96;
    const { c, ctx } = canvas(W, H);
    ctx.fillStyle = PALETTE.forest; ctx.fillRect(0, 0, W, H);
    RAIL_ZONES[variant].forEach(([t, s], i) => {
      const x0 = (i * W) / 3;
      if (i) { ctx.fillStyle = PALETTE.lime; ctx.fillRect(x0 - 2, 10, 4, H - 20); }
      ctx.textAlign = 'center';
      ctx.fillStyle = PALETTE.lime; ctx.font = `800 36px ${FONT}`; ctx.fillText(t, x0 + W / 6, 44);
      ctx.fillStyle = PALETTE.cream; ctx.font = `500 26px ${FONT}`; ctx.fillText(s, x0 + W / 6, 80);
    });
    return tex(c);
  });
}

/** Hour number for the shadow clock (inlaid brass on timber). */
export function hourTexture(h: number) {
  return memo('hour' + h, () => {
    const S = 128;
    const { c, ctx } = canvas(S, S);
    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = '#e0bd70'; ctx.font = `800 70px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText(String(h), S / 2, 90);
    return tex(c);
  });
}
