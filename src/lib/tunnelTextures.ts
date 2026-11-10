// Graphics for the guadua tunnel, the stable and the tower (everything printed or engraved on site).
import * as THREE from 'three';
import { PALETTE } from './layout';
import { beanLeaf, cassavaLeaf, flyingBird, grassClump, heron, mulberry32, xform, type Poly } from './shapes';
import { FONT, canvas, drawPolys, grain, memo, normalFromHeight, tex } from './textures';

/** Timber boardwalk: planks laid across the walkway (u = across, v = along, 1 m tile), with gaps and grain. */
export function plankTextures() {
  return memo('planks', () => {
    const S = 512, N = 7, ph = S / N; // 7 planks of ~14 cm per metre
    const { c, ctx } = canvas(S, S);
    const h = canvas(S, S);
    const rnd = mulberry32(23);
    const tones = ['#9a6438', '#8c5a31', '#a56d3f', '#93603a', '#87552e', '#a8754a'];
    h.ctx.fillStyle = '#fff'; h.ctx.fillRect(0, 0, S, S);
    for (let k = 0; k < N; k++) {
      const y = k * ph;
      ctx.fillStyle = tones[Math.floor(rnd() * tones.length)];
      ctx.fillRect(0, y, S, ph);
      grain(ctx, 0, y, S, ph, rnd, 2.4);
      ctx.fillStyle = 'rgba(25,12,5,0.95)'; ctx.fillRect(0, y, S, 4);
      h.ctx.fillStyle = '#000'; h.ctx.fillRect(0, y - 1, S, 6);
      // one butt joint per plank, staggered
      const jx = Math.floor(rnd() * S);
      ctx.fillStyle = 'rgba(25,12,5,0.85)'; ctx.fillRect(jx, y, 3, ph);
      h.ctx.fillRect(jx - 1, y, 4, ph);
      // two screw heads at each end of the joint
      ctx.fillStyle = '#3a3530';
      for (const dx of [-10, 12]) for (const dy of [0.3, 0.7]) { ctx.beginPath(); ctx.arc(jx + dx, y + ph * dy, 3, 0, Math.PI * 2); ctx.fill(); }
    }
    const map = tex(c, { repeat: [1, 1], aniso: 16 });
    const normalMap = tex(normalFromHeight(h.c, 3), { srgb: false, repeat: [1, 1], aniso: 16 });
    return { map, normalMap };
  });
}

/** Round floor medallion marking an observation stop, burnt into the planks. */
export function medallionTexture(kind: 'lagoon' | 'stable' | 'prism') {
  return memo('medal' + kind, () => {
    const S = 256, R = S / 2;
    const { c, ctx } = canvas(S, S);
    ctx.clearRect(0, 0, S, S);
    // pyrographed into the planks: a burnt ring and motif, no added material
    ctx.strokeStyle = 'rgba(40,20,8,0.9)'; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.arc(R, R, R - 12, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(R, R, R - 26, 0, Math.PI * 2); ctx.stroke();
    const m = ([x, y]: [number, number]): [number, number] => [R + x * 120, R - y * 120];
    const ink = 'rgba(40,20,8,0.9)';
    if (kind === 'lagoon') drawPolys(ctx, heron().map((p) => xform(p, { y: -0.45, s: 0.85 })), ink, m);
    if (kind === 'stable') drawPolys(ctx, cassavaLeaf(), ink, m);
    if (kind === 'prism') drawPolys(ctx, beanLeaf(), ink, m);
    return tex(c);
  });
}

export interface Species { name: string; sci: string; lines: string[]; draw: (ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) => void }

const fillPolys = (ctx: CanvasRenderingContext2D, polys: Poly[], cx: number, cy: number, s: number) => drawPolys(ctx, polys, PALETTE.forest, ([x, y]) => [cx + x * s, cy - y * s]);

export const SPECIES: Species[] = [
  {
    name: 'Garza real', sci: 'Ardea alba',
    lines: ['Caza peces y ranas en el agua', 'poco profunda: espera inmóvil', 'y ataca con un golpe del pico.'],
    draw: (ctx, cx, cy, s) => fillPolys(ctx, heron(), cx, cy + s * 0.5, s),
  },
  {
    name: 'Pato pisingo', sci: 'Dendrocygna autumnalis',
    lines: ['Silba al volar. Come semillas y', 'plantas de la orilla, y a veces', 'anida en huecos de árboles.'],
    draw: (ctx, cx, cy, s) => {
      ctx.fillStyle = PALETTE.forest;
      ctx.beginPath(); ctx.ellipse(cx - s * 0.05, cy + s * 0.12, s * 0.32, s * 0.15, -0.05, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + s * 0.25, cy - s * 0.12, s * 0.06, s * 0.2, 0.25, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + s * 0.3, cy - s * 0.3, s * 0.085, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx + s * 0.37, cy - s * 0.31); ctx.lineTo(cx + s * 0.5, cy - s * 0.27); ctx.lineTo(cx + s * 0.37, cy - s * 0.25); ctx.fill();
      ctx.fillRect(cx - s * 0.02, cy + s * 0.24, s * 0.025, s * 0.2); ctx.fillRect(cx + s * 0.06, cy + s * 0.24, s * 0.025, s * 0.2);
    },
  },
  {
    name: 'Martín pescador', sci: 'Megaceryle torquata',
    lines: ['Se lanza en picada desde una', 'percha para atrapar peces.', 'Anida en túneles en barrancos.'],
    draw: (ctx, cx, cy, s) => {
      ctx.fillStyle = PALETTE.forest;
      ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.05, s * 0.13, s * 0.27, 0.35, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + s * 0.08, cy - s * 0.27, s * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx + s * 0.02, cy - s * 0.37); ctx.lineTo(cx - s * 0.12, cy - s * 0.46); ctx.lineTo(cx - s * 0.03, cy - s * 0.3); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx + s * 0.17, cy - s * 0.3); ctx.lineTo(cx + s * 0.48, cy - s * 0.24); ctx.lineTo(cx + s * 0.17, cy - s * 0.21); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx - s * 0.1, cy + s * 0.25); ctx.lineTo(cx - s * 0.2, cy + s * 0.48); ctx.lineTo(cx - s * 0.02, cy + s * 0.3); ctx.fill();
      ctx.fillRect(cx - s * 0.42, cy + s * 0.33, s * 0.84, s * 0.035);
    },
  },
  {
    name: 'Libélula', sci: 'orden Odonata',
    lines: ['Vive su primera etapa bajo el', 'agua como ninfa; ya adulta,', 'caza mosquitos al vuelo.'],
    draw: (ctx, cx, cy, s) => {
      ctx.fillStyle = PALETTE.forest;
      for (const [rx, ry, a] of [[-0.2, -0.12, -0.18], [0.2, -0.12, 0.18], [-0.18, 0.0, 0.22], [0.18, 0.0, -0.22]] as const) { ctx.beginPath(); ctx.ellipse(cx + rx * s, cy + ry * s, s * 0.2, s * 0.05, a, 0, Math.PI * 2); ctx.fill(); }
      ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.16, s * 0.025, s * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy - s * 0.17, s * 0.055, 0, Math.PI * 2); ctx.fill();
    },
  },
  {
    name: 'Nenúfar', sci: 'Nymphaea sp.',
    lines: ['Sus hojas flotantes dan sombra', 'al agua y refugio a peces,', 'ranas e insectos.'],
    draw: (ctx, cx, cy, s) => {
      ctx.fillStyle = PALETTE.forest;
      ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.22, s * 0.42, s * 0.14, 0, 0.3, Math.PI * 2 - 0.3); ctx.lineTo(cx, cy + s * 0.22); ctx.fill();
      for (let i = 0; i < 7; i++) { ctx.save(); ctx.translate(cx, cy + s * 0.05); ctx.rotate(-1.35 + i * 0.45); ctx.beginPath(); ctx.ellipse(0, -s * 0.15, s * 0.05, s * 0.15, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    },
  },
];

/** Prism face A: silhouette on clear acrylic (transparent background). */
export function prismSilhouetteTexture(i: number) {
  return memo('psil' + i, () => {
    const W = 384, H = 512;
    const { c, ctx } = canvas(W, H);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(244,240,227,0.08)'; ctx.fillRect(0, 0, W, H);
    SPECIES[i].draw(ctx, W / 2, H * 0.45, 300);
    ctx.fillStyle = PALETTE.forest; ctx.fillRect(0, H - 64, W, 64);
    ctx.fillStyle = PALETTE.lime; ctx.font = `800 30px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText(SPECIES[i].name.toUpperCase(), W / 2, H - 24);
    return tex(c);
  });
}

/** Prism face B: the upper half stays clear (landscape behind), text on a frosted lower half. */
export function prismInfoTexture(i: number) {
  return memo('pinf' + i, () => {
    const W = 384, H = 512;
    const { c, ctx } = canvas(W, H);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(244,240,227,0.08)'; ctx.fillRect(0, 0, W, H * 0.42);
    ctx.fillStyle = 'rgba(244,240,227,0.94)'; ctx.fillRect(0, H * 0.42, W, H * 0.58);
    ctx.fillStyle = PALETTE.forest; ctx.font = `800 32px ${FONT}`; ctx.textAlign = 'left';
    ctx.fillText(SPECIES[i].name, 22, H * 0.42 + 48);
    ctx.font = `italic 500 20px ${FONT}`; ctx.fillStyle = PALETTE.olive;
    ctx.fillText(SPECIES[i].sci, 22, H * 0.42 + 78);
    ctx.font = `500 21px ${FONT}`; ctx.fillStyle = '#2b4a3c';
    SPECIES[i].lines.forEach((l, k) => ctx.fillText(l, 22, H * 0.42 + 120 + k * 30));
    ctx.fillStyle = PALETTE.lime; ctx.fillRect(0, H - 10, W, 10);
    return tex(c);
  });
}

/** Interpretive board facing into the tunnel, next to the windows onto the stable. */
export function stablePanelTexture() {
  return memo('stablepanel', () => {
    const W = 1120, H = 720;
    const { c, ctx } = canvas(W, H);
    ctx.fillStyle = PALETTE.forest; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = PALETTE.lime; ctx.font = `800 54px ${FONT}`; ctx.fillText('DEL ESTABLO AL CULTIVO', 48, 84);
    ctx.fillStyle = PALETTE.cream; ctx.font = `500 30px ${FONT}`;
    ctx.fillText('Mira por las ventanas: las vacas del CIAT también hacen parte de la red.', 48, 132);
    // cycle: four stations on a ring
    const cx = W / 2, cy = 420, R = 200;
    ctx.strokeStyle = PALETTE.lime; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    const st: [string, string][] = [['Vacas', 'comen forrajes'], ['Estiércol', 'materia orgánica'], ['Compost', 'abono para el suelo'], ['Cultivos', 'fríjol, yuca, forrajes']];
    st.forEach(([t, s], k) => {
      const a = -Math.PI / 2 + (k * Math.PI) / 2;
      const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
      ctx.fillStyle = PALETTE.cream; ctx.beginPath(); ctx.arc(x, y, 58, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = PALETTE.forest;
      if (k === 0) { ctx.fillRect(x - 32, y - 12, 56, 26); ctx.fillRect(x + 20, y - 22, 20, 18); for (const lx of [-28, -12, 6, 18]) ctx.fillRect(x + lx, y + 12, 6, 18); }
      if (k === 1) { ctx.beginPath(); ctx.ellipse(x, y + 14, 34, 16, 0, Math.PI, 0); ctx.fill(); ctx.beginPath(); ctx.ellipse(x, y, 22, 12, 0, Math.PI, 0); ctx.fill(); }
      if (k === 2) { ctx.beginPath(); ctx.moveTo(x - 40, y + 26); ctx.lineTo(x, y - 30); ctx.lineTo(x + 40, y + 26); ctx.fill(); }
      if (k === 3) drawPolys(ctx, beanLeaf(), PALETTE.forest, ([px, py]) => [x + px * 80, y - py * 80]);
      const lx = k === 1 ? x + 72 : k === 3 ? x - 72 : x;
      const ly = k === 0 ? y - 76 : k === 2 ? y + 96 : y - 6;
      ctx.textAlign = k === 1 ? 'left' : k === 3 ? 'right' : 'center';
      ctx.fillStyle = PALETTE.lime; ctx.font = `800 32px ${FONT}`; ctx.fillText(t, lx, ly);
      ctx.fillStyle = PALETTE.cream; ctx.font = `500 22px ${FONT}`; ctx.fillText(s, lx, ly + 28);
      // arrow head on the ring, between stations
      const b = a + Math.PI / 4;
      ctx.save(); ctx.translate(cx + Math.cos(b) * R, cy + Math.sin(b) * R); ctx.rotate(b + Math.PI / 2);
      ctx.fillStyle = PALETTE.lime; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-10, -14); ctx.lineTo(-10, 14); ctx.fill(); ctx.restore();
    });
    ctx.textAlign = 'left';
    return tex(c);
  });
}

export function tunnelSignTexture() {
  return memo('tunnelsign', () => {
    const W = 900, H = 600;
    const { c, ctx } = canvas(W, H);
    ctx.fillStyle = PALETTE.forest; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = PALETTE.lime; ctx.fillRect(0, H - 26, W, 26);
    drawPolys(ctx, cassavaLeaf(), PALETTE.lime, ([x, y]) => [760 + x * 200, 170 - y * 200]);
    ctx.fillStyle = PALETTE.cream; ctx.font = `800 70px ${FONT}`;
    ctx.fillText('Túnel de', 60, 250); ctx.fillText('la guadua', 60, 330);
    ctx.font = `500 30px ${FONT}`; ctx.fillStyle = 'rgba(244,240,227,0.85)';
    ctx.fillText('Laguna a la izquierda, establo a la derecha.', 60, 420);
    ctx.fillStyle = PALETTE.lime; ctx.fillText('Deck de descanso  →  60 m', 60, 480);
    return tex(c);
  });
}

/** Holstein coat: white with black patches. */
export function cowTexture(seed: number) {
  return memo('cow' + seed, () => {
    const W = 256, H = 128;
    const { c, ctx } = canvas(W, H);
    const rnd = mulberry32(seed);
    ctx.fillStyle = '#efeae0'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#1d1c1a';
    for (let i = 0; i < 7; i++) {
      const x = rnd() * W, y = rnd() * H, r = 14 + rnd() * 26;
      ctx.beginPath();
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2, rr = r * (0.7 + rnd() * 0.5); ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8); }
      ctx.fill();
    }
    return tex(c);
  });
}

/** Bamboo culm: warm straw colour, darker nodes every ~35 cm (u around, v along the culm, 1 tile = 1 m). */
export function bambooTexture() {
  return memo('bamboo', () => {
    const W = 64, H = 256;
    const { c, ctx } = canvas(W, H);
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, '#9c8247'); g.addColorStop(0.5, '#c9ae6c'); g.addColorStop(1, '#9c8247');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.25; grain(ctx, 0, 0, W, H, mulberry32(5), 0.4); ctx.globalAlpha = 1;
    for (const y of [0, 90, 180]) { ctx.fillStyle = '#6e5a2c'; ctx.fillRect(0, y, W, 5); ctx.fillStyle = '#d8c48a'; ctx.fillRect(0, y + 5, W, 2); }
    const t = tex(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  });
}

export { flyingBird, grassClump };
