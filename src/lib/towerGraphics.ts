// Environmental graphics that dress the tower: mesh + graphic railing panels, tall cladding,
// route totem, floor wave lines, and the engraved floor targets of the shadow panels.
import * as THREE from 'three';
import { PALETTE } from './layout';
import { beanLeaf, blade, cassavaLeaf, flyingBird, grassClump, heron, leafHoles, soaringBird, waveStrip, xform, type Poly } from './shapes';
import { FONT, canvas, drawPolys, memo, tex } from './textures';

const P = (ctx: CanvasRenderingContext2D, polys: Poly[], col: string, cx: number, cy: number, s: number) => drawPolys(ctx, polys, col, ([x, y]) => [cx + x * s, cy - y * s]);

function butterfly(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, col: string) {
  ctx.fillStyle = col;
  for (const sx of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(x + sx * s * 0.28, y - s * 0.16, s * 0.3, s * 0.24, sx * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + sx * s * 0.22, y + s * 0.2, s * 0.2, s * 0.17, -sx * 0.4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillRect(x - s * 0.03, y - s * 0.32, s * 0.06, s * 0.6);
}

/** Galvanised welded wire mesh (transparent between wires), 1 tile = 0.5 m. */
export function meshTexture() {
  return memo('g-mesh', () => {
    const S = 128;
    const { c, ctx } = canvas(S, S);
    ctx.clearRect(0, 0, S, S);
    ctx.strokeStyle = 'rgba(150,156,150,0.95)'; ctx.lineWidth = 3;
    for (let i = 0; i <= 4; i++) { const v = (i * S) / 4; ctx.beginPath(); ctx.moveTo(v, 0); ctx.lineTo(v, S); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, v); ctx.lineTo(S, v); ctx.stroke(); }
    const t = tex(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  });
}

/** Green graphic railing panels (forest ground, lime / olive / cream silhouettes). */
export function railGraphicTexture(k: number) {
  return memo('g-rail' + k, () => {
    const W = 512, H = 384;
    const { c, ctx } = canvas(W, H);
    const bgs = [PALETTE.forest, '#2f5a45', PALETTE.olive];
    ctx.fillStyle = bgs[k % 3]; ctx.fillRect(0, 0, W, H);
    const lime = PALETTE.lime, cream = PALETTE.cream, olive = '#9DBE5A';
    switch (k % 6) {
      case 0: P(ctx, heron(), cream, 300, 380, 330); for (let i = 0; i < 8; i++) P(ctx, [blade(0, 1, 0.07, (i - 4) * 0.05)], lime, 40 + i * 30, 384, 160 + (i % 3) * 40); break;
      case 1: P(ctx, cassavaLeaf(), lime, 170, 220, 300); P(ctx, beanLeaf(), olive, 380, 200, 220); break;
      case 2: P(ctx, [flyingBird()], cream, 180, 160, 230); P(ctx, [flyingBird()], lime, 360, 250, 160); P(ctx, [soaringBird()], cream, 420, 100, 110); break;
      case 3: butterfly(ctx, 256, 190, 230, lime); P(ctx, grassClump(), olive, 80, 300, 200); break;
      case 4: for (let i = 0; i < 4; i++) P(ctx, [waveStrip(-256, 256, 0, 10, 130, 16, i)], i % 2 ? lime : cream, 256, 250 + i * 34, 1); P(ctx, leafHoles({ len: 1, width: 0.5, veins: 4 }), olive, 140, 140, 170); break;
      default: P(ctx, grassClump(), lime, 140, 260, 300); P(ctx, leafHoles({ len: 1, width: 0.55, veins: 5 }), cream, 360, 200, 240);
    }
    return tex(c);
  });
}

/** Tall cladding panels for the level-1 west face (heron + leaves, crops, water). */
export function claddingTexture(k: number) {
  return memo('g-clad' + k, () => {
    const W = 512, H = 1024;
    const { c, ctx } = canvas(W, H);
    ctx.fillStyle = k === 1 ? PALETTE.olive : PALETTE.forest; ctx.fillRect(0, 0, W, H);
    const lime = PALETTE.lime, cream = PALETTE.cream;
    if (k === 0) { P(ctx, heron(), cream, 280, 980, 760); P(ctx, leafHoles({ len: 1, width: 0.6, veins: 5 }).map((p) => xform(p, { r: 0.5 })), lime, 130, 420, 300); }
    if (k === 1) { P(ctx, cassavaLeaf(), PALETTE.forest, 256, 360, 480); P(ctx, beanLeaf(), lime, 256, 800, 330); }
    if (k === 2) { for (let i = 0; i < 12; i++) P(ctx, [blade(0, 1, 0.06, (i - 6) * 0.04)], lime, 20 + i * 42, 1024, 380 + (i % 4) * 90); for (let i = 0; i < 4; i++) P(ctx, [waveStrip(-256, 256, 0, 12, 160, 20, i)], cream, 256, 380 + i * 46, 1); P(ctx, [flyingBird()], cream, 300, 180, 260); }
    return tex(c);
  });
}

/** Route totem discs: 1 Descubrir (leaf + shadow), 2 Conectar (linked nodes), 3 Elevar (eye + horizon). */
export function totemDiscTexture(k: number) {
  return memo('g-totem' + k, () => {
    const S = 256, R = S / 2;
    const { c, ctx } = canvas(S, S);
    ctx.fillStyle = [PALETTE.lime, PALETTE.cream, PALETTE.olive][k]; ctx.beginPath(); ctx.arc(R, R, R - 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = PALETTE.forest; ctx.lineWidth = 8; ctx.stroke();
    ctx.fillStyle = PALETTE.forest; ctx.strokeStyle = PALETTE.forest;
    if (k === 0) P(ctx, leafHoles({ len: 1, width: 0.55, veins: 4 }).map((p) => xform(p, { r: 0.6 })), PALETTE.forest, R, R + 10, 130);
    if (k === 1) {
      const pts = [[R - 50, R - 40], [R + 50, R - 40], [R, R + 50]];
      ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[1][0], pts[1][1]); ctx.lineTo(pts[2][0], pts[2][1]); ctx.closePath(); ctx.stroke();
      for (const [x, y] of pts) { ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill(); }
    }
    if (k === 2) {
      ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(R - 70, R); ctx.quadraticCurveTo(R, R - 60, R + 70, R); ctx.quadraticCurveTo(R, R + 60, R - 70, R); ctx.stroke();
      ctx.beginPath(); ctx.arc(R, R, 22, 0, Math.PI * 2); ctx.fill();
    }
    ctx.font = `800 34px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(String(k + 1), R, S - 34);
    return tex(c);
  });
}

export function totemPlaqueTexture() {
  return memo('g-totemplaque', () => {
    const W = 420, H = 900;
    const { c, ctx } = canvas(W, H);
    ctx.fillStyle = PALETTE.forest; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = PALETTE.lime; ctx.font = `800 38px ${FONT}`; ctx.fillText('RECORRIDO', 28, 70); ctx.fillText('POR ETAPAS', 28, 114);
    const rows: [string, string, string][] = [['3', 'Elevar', 'Mirador y lectura del paisaje.'], ['2', 'Conectar', 'Relaciones entre especies.'], ['1', 'Descubrir', 'Sombras, formas y luz.']];
    rows.forEach(([n, t, d], i) => {
      const y = 230 + i * 210;
      ctx.fillStyle = PALETTE.lime; ctx.beginPath(); ctx.arc(60, y, 30, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = PALETTE.forest; ctx.font = `800 32px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(n, 60, y + 11); ctx.textAlign = 'left';
      ctx.fillStyle = PALETTE.cream; ctx.font = `800 36px ${FONT}`; ctx.fillText(t, 108, y + 4);
      ctx.font = `500 24px ${FONT}`; ctx.fillStyle = 'rgba(244,240,227,0.85)'; ctx.fillText(d, 108, y + 40);
    });
    ctx.fillStyle = PALETTE.cream; ctx.font = `600 22px ${FONT}`;
    ctx.fillText('El nivel 1 se recorre', 28, 820); ctx.fillText('completo sin escaleras.', 28, 850);
    return tex(c);
  });
}

/** Level-1 floor: three flowing lines (lime / olive / forest) from the ramp to the stair and the shadow garden. */
export function floorWavesTexture(w: number, d: number, paths: [number, number][][]) {
  return memo('g-floorwaves' + w + d, () => {
    const PX = 96, W = Math.round(w * PX), H = Math.round(d * PX);
    const { c, ctx } = canvas(W, H);
    ctx.clearRect(0, 0, W, H);
    const cols = [PALETTE.lime, PALETTE.olive, PALETTE.forest];
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    paths.forEach((pts, i) => {
      for (const [k, off] of [[0, -0.09], [1, 0], [2, 0.09]] as const) {
        ctx.strokeStyle = cols[(k + i) % 3]; ctx.lineWidth = 0.075 * PX;
        ctx.beginPath();
        pts.forEach(([x, z], j) => { const px = (x + off) * PX, pz = (z + off) * PX; if (j === 0) ctx.moveTo(px, pz); else { const [x0, z0] = pts[j - 1]; ctx.quadraticCurveTo((x0 + off) * PX, (z0 + off) * PX, (px + (x0 + off) * PX) / 2, (pz + (z0 + off) * PX) / 2); } });
        const [lx, lz] = pts[pts.length - 1]; ctx.lineTo((lx + off) * PX, (lz + off) * PX);
        ctx.stroke();
      }
    });
    return tex(c);
  });
}

export const PLANT_INFO: Record<string, { name: string; fact: string }> = {
  yuca: { name: 'Yuca', fact: 'Resiste la sequía y es alimento básico para cientos de millones de personas en el trópico.' },
  frijol: { name: 'Fríjol', fact: 'El banco de semillas del CIAT conserva una de las colecciones de fríjol más grandes del mundo.' },
  forraje: { name: 'Forrajes', fact: 'Los pastos tropicales alimentan al ganado y, bien manejados, protegen el suelo y guardan carbono.' },
};

/** Engraved floor target: the outline where the panel's shadow should land, with the plant's name and fact. */
export function shadowTargetTexture(plant: string) {
  return memo('g-target' + plant, () => {
    const W = 512, H = 640;
    const { c, ctx } = canvas(W, H);
    ctx.clearRect(0, 0, W, H);
    const ink = 'rgba(40,20,8,0.85)';
    const m = plant === 'yuca' ? cassavaLeaf() : plant === 'frijol' ? beanLeaf() : grassClump();
    ctx.strokeStyle = ink; ctx.lineWidth = 5; ctx.setLineDash([14, 10]);
    for (const poly of m) { ctx.beginPath(); poly.forEach(([x, y], i) => { const px = 256 + x * 330, py = 250 - y * 330; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }); ctx.closePath(); ctx.stroke(); }
    ctx.setLineDash([]);
    const info = PLANT_INFO[plant];
    ctx.fillStyle = ink; ctx.font = `800 44px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(info.name.toUpperCase(), 256, 500);
    ctx.font = `500 22px ${FONT}`; ctx.fillText('Gira el panel hasta que su sombra', 256, 548); ctx.fillText('llene este contorno', 256, 578);
    return tex(c);
  });
}
