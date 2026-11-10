// Graphics for the observation tower: illustrated walls, the five transparent layers of the relations wall,
// the anamorphic composition and the orientation strip.
import { PALETTE } from './layout';
import { beanLeaf, blade, cassavaLeaf, flyingBird, grassClump, heron, leafHoles, mulberry32, soaringBird, waveStrip, xform, type Poly } from './shapes';
import { FONT, canvas, drawPolys, memo, tex } from './textures';

const P = (ctx: CanvasRenderingContext2D, polys: Poly[], col: string, cx: number, cy: number, s: number) => drawPolys(ctx, polys, col, ([x, y]) => [cx + x * s, cy - y * s]);

function cow(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, col: string, spot: string) {
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.ellipse(x, y, s * 0.42, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + s * 0.48, y - s * 0.08, s * 0.13, s * 0.09, -0.3, 0, Math.PI * 2); ctx.fill();
  for (const lx of [-0.3, -0.15, 0.18, 0.3]) ctx.fillRect(x + lx * s, y + s * 0.12, s * 0.06, s * 0.3);
  ctx.fillStyle = spot;
  ctx.beginPath(); ctx.ellipse(x - s * 0.12, y - s * 0.05, s * 0.12, s * 0.08, 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + s * 0.18, y + s * 0.04, s * 0.08, s * 0.06, -0.3, 0, Math.PI * 2); ctx.fill();
}
function dragonfly(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, col: string) {
  ctx.fillStyle = col;
  for (const [rx, ry, a] of [[-0.2, -0.05, -0.15], [0.2, -0.05, 0.15], [-0.18, 0.06, 0.2], [0.18, 0.06, -0.2]] as const) { ctx.beginPath(); ctx.ellipse(x + rx * s, y + ry * s, s * 0.2, s * 0.05, a, 0, Math.PI * 2); ctx.fill(); }
  ctx.beginPath(); ctx.ellipse(x, y + s * 0.2, s * 0.025, s * 0.3, 0, 0, Math.PI * 2); ctx.fill();
}

/** Level 1, south face of the core: large botanical illustration + "Cada sombra revela una forma de vida." */
export function shadowWallTexture() {
  return memo('t-shadowwall', () => {
    const W = 1600, H = 900;
    const { c, ctx } = canvas(W, H);
    ctx.fillStyle = PALETTE.cream; ctx.fillRect(0, 0, W, H);
    P(ctx, cassavaLeaf(), PALETTE.olive, 1180, 520, 620);
    P(ctx, beanLeaf(), PALETTE.forest, 420, 560, 420);
    P(ctx, grassClump(), '#9DBE5A', 800, 640, 520);
    ctx.fillStyle = PALETTE.forest; ctx.font = `800 70px ${FONT}`;
    ctx.fillText('Cada sombra revela', 70, 130); ctx.fillText('una forma de vida.', 70, 210);
    ctx.fillStyle = PALETTE.olive; ctx.font = `600 34px ${FONT}`;
    ctx.fillText('NIVEL 1 · DESCUBRIR', 70, 280);
    ctx.font = `500 30px ${FONT}`; ctx.fillStyle = '#2b4a3c';
    ctx.fillText('Gira los paneles de la terraza: la luz dibuja', 70, 340);
    ctx.fillText('hojas de yuca, fríjol y forrajes sobre la madera.', 70, 380);
    ctx.fillStyle = PALETTE.lime; ctx.fillRect(0, H - 22, W, 22);
    return tex(c);
  });
}

/** Level 1, north face (seen when leaving down the ramp). */
export function exitWallTexture() {
  return memo('t-exitwall', () => {
    const W = 1600, H = 900;
    const { c, ctx } = canvas(W, H);
    ctx.fillStyle = PALETTE.forest; ctx.fillRect(0, 0, W, H);
    P(ctx, [xform(flyingBird(), { s: 1 })], 'rgba(214,230,90,0.9)', 1270, 230, 360);
    P(ctx, [xform(soaringBird(), { s: 1 })], 'rgba(244,240,227,0.5)', 1030, 160, 160);
    ctx.fillStyle = PALETTE.cream; ctx.font = `800 104px ${FONT}`;
    ctx.fillText('Elevar la mirada,', 80, 470); ctx.fillText('conectar la vida.', 80, 590);
    ctx.fillStyle = PALETTE.lime; ctx.font = `600 34px ${FONT}`;
    ctx.fillText('TORRE DE OBSERVACIÓN · CIAT PALMIRA', 80, 680);
    ctx.fillStyle = 'rgba(244,240,227,0.8)'; ctx.font = `500 30px ${FONT}`;
    ctx.fillText('Nivel 1 Descubrir · Nivel 2 Conectar · Nivel 3 Elevar', 80, 740);
    ctx.fillStyle = PALETTE.lime; ctx.fillRect(0, H - 22, W, 22);
    return tex(c);
  });
}

// ---------------------------------------------------------------- relations wall (level 2)
export const ELEMENTS = [
  { id: 'veg', name: 'Vegetación' },
  { id: 'agua', name: 'Agua' },
  { id: 'ganado', name: 'Ganado' },
  { id: 'ins', name: 'Insectos' },
  { id: 'aves', name: 'Aves' },
] as const;
export type ElementId = (typeof ELEMENTS)[number]['id'];

/** Meaningful combinations (exactly these three layers in the frame) and the sentence they complete. */
export const RELATIONS: { set: ElementId[]; title: string; text: string }[] = [
  { set: ['veg', 'ins', 'aves'], title: 'Alimento y refugio', text: 'Las plantas ofrecen alimento y refugio; los insectos participan en procesos ecológicos y sirven de alimento a distintas aves.' },
  { set: ['agua', 'veg', 'aves'], title: 'Hábitats', text: 'El agua y la vegetación crean condiciones para diferentes hábitats.' },
  { set: ['ganado', 'aves', 'ins'], title: 'Compañeros de potrero', text: 'La garcita bueyera sigue al ganado para atrapar los insectos que este espanta al caminar.' },
  { set: ['ganado', 'veg', 'agua'], title: 'Ciclo del potrero', text: 'El ganado pasta y bebe; su materia orgánica vuelve al suelo y nutre las plantas.' },
  { set: ['agua', 'ins', 'aves'], title: 'Vida entre dos mundos', text: 'Las libélulas nacen en el agua y, ya adultas, alimentan a las aves de la orilla.' },
];

/** Transparent layer: each element owns a zone of the frame, so overlapping layers compose one scene. */
export function layerTexture(id: ElementId) {
  return memo('t-layer' + id, () => {
    const W = 640, H = 540;
    const { c, ctx } = canvas(W, H);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(244,240,227,0.06)'; ctx.fillRect(0, 0, W, H);
    const rnd = mulberry32(id.length * 7);
    if (id === 'agua') for (let i = 0; i < 4; i++) P(ctx, [waveStrip(-320, 320, 0, 8, 120, 14, i)], i % 2 ? 'rgba(80,150,170,0.85)' : 'rgba(214,230,90,0.7)', 320, 440 + i * 24, 1);
    if (id === 'veg') {
      for (let i = 0; i < 9; i++) P(ctx, [blade(0, 1, 0.08, (rnd() - 0.5) * 0.4)], 'rgba(113,140,58,0.9)', 40 + i * 70, 470, 150 + rnd() * 90);
      P(ctx, cassavaLeaf(), 'rgba(16,60,47,0.85)', 520, 300, 230);
      P(ctx, leafHoles({ len: 1, width: 0.5, veins: 4 }), 'rgba(113,140,58,0.9)', 120, 260, 170);
    }
    if (id === 'ganado') { cow(ctx, 230, 380, 210, 'rgba(244,240,227,0.95)', 'rgba(29,28,26,0.9)'); }
    if (id === 'ins') { dragonfly(ctx, 470, 330, 150, 'rgba(214,230,90,0.95)'); dragonfly(ctx, 140, 160, 90, 'rgba(16,60,47,0.9)'); ctx.fillStyle = 'rgba(16,60,47,0.9)'; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(280 + rnd() * 120, 390 + rnd() * 30, 4, 0, Math.PI * 2); ctx.fill(); } }
    if (id === 'aves') {
      P(ctx, heron(), 'rgba(244,240,227,0.95)', 300, 440, 300);
      P(ctx, [flyingBird()], 'rgba(16,60,47,0.9)', 470, 110, 170);
      P(ctx, [soaringBird()], 'rgba(16,60,47,0.8)', 170, 80, 110);
    }
    // name tab on the visible edge of the layer
    ctx.fillStyle = PALETTE.forest; ctx.fillRect(0, 0, 210, 44);
    ctx.fillStyle = PALETTE.lime; ctx.font = `800 26px ${FONT}`; ctx.fillText(ELEMENTS.find((e) => e.id === id)!.name.toUpperCase(), 12, 31);
    return tex(c);
  });
}

/** Text strip under the frame: idle instruction, or the relationship completed by the layers. */
export function relationStripTexture(k: number) {
  return memo('t-relstrip' + k, () => {
    const W = 1400, H = 200;
    const { c, ctx } = canvas(W, H);
    ctx.fillStyle = k < 0 ? PALETTE.forest : PALETTE.cream; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    if (k < 0) {
      ctx.fillStyle = PALETTE.lime; ctx.font = `800 46px ${FONT}`; ctx.fillText('TODO ESTÁ CONECTADO', W / 2, 78);
      ctx.fillStyle = PALETTE.cream; ctx.font = `500 30px ${FONT}`;
      ctx.fillText('Desliza tres capas dentro del marco: la frase se completa cuando la relación existe.', W / 2, 130);
      ctx.fillText('Se maneja desde los dos lados: invita a otra persona.', W / 2, 172);
      return tex(c);
    }
    const r = RELATIONS[k];
    ctx.fillStyle = PALETTE.forest; ctx.font = `800 44px ${FONT}`; ctx.fillText(r.title.toUpperCase(), W / 2, 66);
    ctx.font = `500 28px ${FONT}`; ctx.fillStyle = '#2b4a3c';
    const words = r.text.split(' '); let line = '', y = 112;
    for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > W - 120) { ctx.fillText(line, W / 2, y); line = w; y += 38; } else line = t; }
    ctx.fillText(line, W / 2, y);
    return tex(c);
  });
}

// ---------------------------------------------------------------- anamorphic composition (level 3)
export function anamorphicTexture() {
  return memo('t-ana', () => {
    const W = 1800, H = 1000;
    const { c, ctx } = canvas(W, H);
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, PALETTE.cream); sky.addColorStop(0.55, '#e9edd2'); sky.addColorStop(0.56, PALETTE.olive); sky.addColorStop(1, PALETTE.forest);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    // tree line on the horizon
    ctx.fillStyle = PALETTE.forest;
    ctx.beginPath(); ctx.moveTo(0, 560);
    for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 520 - Math.max(0, Math.sin(x * 0.012) * 60 + Math.sin(x * 0.037) * 30));
    ctx.lineTo(W, 560); ctx.fill();
    // lagoon
    ctx.fillStyle = '#4f8f97'; ctx.beginPath(); ctx.ellipse(W / 2, 700, 700, 110, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 3; i++) P(ctx, [waveStrip(-500, 500, 0, 6, 140, 6, i)], 'rgba(244,240,227,0.7)', W / 2, 680 + i * 30, 1);
    // reeds, crops, heron, birds, dragonfly
    for (let i = 0; i < 26; i++) P(ctx, [blade(0, 1, 0.05, (i % 5 - 2) * 0.08)], PALETTE.lime, 60 + i * 26, 840, 160 + (i % 4) * 30);
    P(ctx, cassavaLeaf(), PALETTE.lime, 1560, 860, 300);
    P(ctx, heron(), PALETTE.cream, 980, 790, 260);
    P(ctx, [flyingBird()], PALETTE.forest, 520, 300, 240);
    P(ctx, [flyingBird()], PALETTE.forest, 760, 240, 130);
    dragonfly(ctx, 1300, 380, 160, PALETTE.forest);
    cow(ctx, 260, 600, 120, PALETTE.cream, PALETTE.forest);
    ctx.fillStyle = PALETTE.forest; ctx.font = `800 78px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText('Elevar la mirada, conectar la vida.', W / 2, 140);
    ctx.font = `600 32px ${FONT}`; ctx.fillStyle = PALETTE.olive;
    ctx.fillText('AGUA · VEGETACIÓN · AVES · INSECTOS · GANADO · PAISAJE', W / 2, 196);
    return tex(c);
  });
}

/** Floor marker of the anamorphic viewpoint. */
export function eyeMarkTexture() {
  return memo('t-eyemark', () => {
    const S = 256;
    const { c, ctx } = canvas(S, S);
    ctx.clearRect(0, 0, S, S);
    ctx.strokeStyle = PALETTE.lime; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2 - 10, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = PALETTE.lime;
    for (const dx of [-26, 26]) { ctx.beginPath(); ctx.ellipse(S / 2 + dx, S / 2 + 10, 17, 34, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.font = `800 22px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('MIRA DESDE AQUÍ', S / 2, 52);
    return tex(c);
  });
}

/** Orientation strip for the north railing: names placed at their real bearing from the tower. */
export function orientationTexture(labels: { u: number; name: string }[]) {
  return memo('t-orient' + labels.map((l) => l.name + l.u.toFixed(2)).join('|'), () => {
    const W = 2048, H = 128;
    const { c, ctx } = canvas(W, H);
    ctx.fillStyle = PALETTE.forest; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = PALETTE.lime; ctx.fillRect(0, 54, W, 4);
    ctx.textAlign = 'center';
    for (const l of labels) {
      const x = l.u * W;
      ctx.fillStyle = PALETTE.lime; ctx.beginPath(); ctx.moveTo(x, 40); ctx.lineTo(x - 12, 18); ctx.lineTo(x + 12, 18); ctx.fill();
      ctx.fillStyle = PALETTE.cream; ctx.font = `700 34px ${FONT}`; ctx.fillText(l.name, x, 104);
    }
    ctx.textAlign = 'left'; ctx.fillStyle = PALETTE.lime; ctx.font = `800 20px ${FONT}`; ctx.fillText('N ↑', 12, 34);
    return tex(c);
  });
}
