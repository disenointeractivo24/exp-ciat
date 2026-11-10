// Vector silhouettes shared by laser-cut geometry (roof, railings) and canvas graphics.
// Every generator returns closed polygons in local units.

export type V2 = [number, number];
export type Poly = V2[];
type PtIn = [number, number] | [number, number, number];

export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function xform(p: Poly, o: { x?: number; y?: number; s?: number; sy?: number; r?: number; fx?: boolean }): Poly {
  const c = Math.cos(o.r ?? 0), s = Math.sin(o.r ?? 0), k = o.s ?? 1, ky = o.sy ?? k;
  const out: Poly = p.map(([x, y]) => {
    const xx = (o.fx ? -x : x) * k, yy = y * ky;
    return [(o.x ?? 0) + xx * c - yy * s, (o.y ?? 0) + xx * s + yy * c];
  });
  return o.fx ? out.reverse() : out;
}

export function area(p: Poly) {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

function clipHalf(poly: Poly, a: number, b: number, c: number): Poly {
  const out: Poly = [];
  for (let i = 0; i < poly.length; i++) {
    const P = poly[i], Q = poly[(i + 1) % poly.length];
    const fp = a * P[0] + b * P[1] + c, fq = a * Q[0] + b * Q[1] + c;
    if (fp >= 0) out.push(P);
    if (fp >= 0 !== fq >= 0) {
      const t = fp / (fp - fq);
      out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]);
    }
  }
  return out;
}

/** Chaikin smoothing. Points with a 3rd component = 1 stay sharp. */
export function smooth(pts: PtIn[], iters = 3): Poly {
  let p: V2[] = [];
  for (const q of pts) {
    if (q.length === 3 && q[2]) p.push([q[0], q[1]], [q[0], q[1]], [q[0], q[1]]);
    else p.push([q[0], q[1]]);
  }
  for (let it = 0; it < iters; it++) {
    const o: V2[] = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    p = o;
  }
  return p.filter((v, i) => {
    const w = p[(i + p.length - 1) % p.length];
    return Math.hypot(v[0] - w[0], v[1] - w[1]) > 1e-5;
  });
}

// ---------------------------------------------------------------- leaves

export interface LeafOpts { len: number; width: number; midrib?: number; vein?: number; veins?: number; slant?: number; samples?: number }

function leafHalfWidth(len: number, width: number) {
  return (v: number) => {
    const t = Math.min(1, Math.max(0, v / len));
    return (width / 2) * Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(t, 0.78))), 0.72);
  };
}

/** Solid leaf outline centred at origin, base at -len/2, tip at +len/2. */
export function leafOutline(len: number, width: number, samples = 20): Poly {
  const w = leafHalfWidth(len, width);
  const right: Poly = [];
  for (let i = 0; i <= samples; i++) {
    const v = (len * i) / samples;
    right.push([w(v), v - len / 2]);
  }
  const left = right.slice(1, -1).reverse().map(([x, y]) => [-x, y] as V2);
  return [...right, ...left];
}

/** Laser-cut leaf: blade split into segments by a midrib and slanted veins. */
export function leafHoles(o: LeafOpts): Poly[] {
  const { len, width } = o;
  const m = o.midrib ?? len * 0.04;
  const vein = o.vein ?? len * 0.022;
  const n = o.veins ?? 4;
  const slant = o.slant ?? 0.6;
  const S = o.samples ?? 16;
  const w = leafHalfWidth(len, width);
  const pts: V2[] = [];
  for (let i = 0; i <= S; i++) {
    const v = len * (0.03 + 0.95 * (i / S));
    const u = w(v);
    if (u > m / 2 + len * 0.012) pts.push([u, v]);
  }
  if (pts.length < 3) return [];
  const half: Poly = [[m / 2, pts[0][1]], ...pts, [m / 2, pts[pts.length - 1][1]]];
  const veinS: number[] = [];
  for (let k = 0; k < n; k++) veinS.push(len * (0.14 + (0.62 * k) / Math.max(1, n - 1)));
  const hv = (vein / 2) * Math.sqrt(1 + slant * slant);
  const bands: [number, number][] = [];
  let prev = -1e9;
  for (const s of veinS) { bands.push([prev, s]); prev = s; }
  bands.push([prev, 1e9]);
  const segs: Poly[] = [];
  for (const [s0, s1] of bands) {
    let p = half;
    if (s0 > -1e8) p = clipHalf(p, -slant, 1, -(s0 + hv));
    if (s1 < 1e8) p = clipHalf(p, slant, -1, s1 - hv);
    if (p.length >= 3 && Math.abs(area(p)) > len * len * 0.0025) segs.push(p);
  }
  const res: Poly[] = [];
  for (const p of segs) {
    res.push(p.map(([u, v]) => [u, v - len / 2] as V2));
    res.push(p.map(([u, v]) => [-u, v - len / 2] as V2).reverse());
  }
  return res;
}

// ---------------------------------------------------------------- birds

const HERON_BODY: PtIn[] = [
  [64, 86, 1], [49, 89.5], [45, 92.5], [39, 91.5], [29, 94, 1], [35, 88.5], [39, 82], [42, 74], [40, 66], [33, 60],
  [25, 57], [14, 50], [3, 40, 1], [12, 40], [21, 38], [31, 37.5], [39, 40.5], [44, 47], [47, 55], [49, 63], [50, 72],
  [47, 79], [48, 84], [51, 86.5],
];
const HERON_LEG1: PtIn[] = [[27.4, 34], [29.4, 34], [26.4, 4, 1], [29.5, 1.2, 1], [21, 1.2, 1], [24.6, 4, 1]];
const HERON_LEG2: PtIn[] = [[33, 34], [35, 34], [40.5, 4, 1], [44.5, 1.2, 1], [36.5, 1.2, 1], [38.6, 4, 1]];

/** Standing heron facing +x, feet at y=0, height 1. */
export function heron(): Poly[] {
  const n = (p: Poly) => p.map(([x, y]) => [(x - 33) / 100, y / 100] as V2);
  return [n(smooth(HERON_BODY, 3)), n(smooth(HERON_LEG1, 1)), n(smooth(HERON_LEG2, 1))];
}

const FLY_BIRD: PtIn[] = [
  [100, 40, 1], [90, 43.5], [85, 46], [79, 44], [71, 40.5], [62, 41], [55, 45], [44, 64], [32, 82, 1], [37, 63], [39, 47],
  [28, 43], [14, 41], [1, 45, 1], [7, 37], [21, 33], [40, 31.5], [57, 33], [70, 35.5], [83, 37.5], [91, 39],
];
/** Egret in flight (profile), width 1, centred. */
export function flyingBird(): Poly {
  return smooth(FLY_BIRD, 3).map(([x, y]) => [(x - 50) / 100, (y - 50) / 100] as V2);
}

const SOAR_BIRD: PtIn[] = [
  [0, 13, 1], [4, 8], [5, 1], [9, 2.5], [24, 8.5], [40, 10.5], [53, 6, 1], [38, 2], [22, -2], [8, -4], [5, -13], [2, -20, 1],
  [0, -16.5], [-2, -20, 1], [-5, -13], [-8, -4], [-22, -2], [-38, 2], [-53, 6, 1], [-40, 10.5], [-24, 8.5], [-9, 2.5],
  [-5, 1], [-4, 8],
];
/** Bird seen from below with spread wings, width ~1, head toward +y. */
export function soaringBird(): Poly {
  return smooth(SOAR_BIRD, 2).map(([x, y]) => [x / 106, y / 106] as V2);
}

// ---------------------------------------------------------------- plants & water

/** Tapered curved blade from (x,0) up to height h. */
export function blade(x: number, h: number, w: number, bend: number, steps = 8): Poly {
  const L: V2[] = [], R: V2[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = x + bend * t * t;
    const hw = (w / 2) * (1 - t) ** 0.9;
    const dx = 2 * bend * t; // tangent slope wrt t
    const nrm = Math.hypot(dx, h) || 1;
    const nx = h / nrm, ny = -dx / nrm;
    L.push([cx - nx * hw, t * h - ny * hw]);
    R.push([cx + nx * hw, t * h + ny * hw]);
  }
  return [...R, ...L.slice(0, -1).reverse()];
}

/** Constant-thickness wavy band. */
export function waveStrip(x0: number, x1: number, y: number, amp: number, wl: number, th: number, phase = 0, steps = 60): Poly {
  const top: V2[] = [], bot: V2[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = x0 + ((x1 - x0) * i) / steps;
    const yy = y + amp * Math.sin((x / wl) * Math.PI * 2 + phase);
    top.push([x, yy + th / 2]);
    bot.push([x, yy - th / 2]);
  }
  return [...top, ...bot.reverse()];
}

// ---------------------------------------------------------------- roof bay composition

export type BayTheme = 'hojas' | 'aves' | 'mixto';

interface Placed { x: number; y: number; r: number }

/** Composes non-overlapping laser-cut motifs inside a W x H bay centred at the origin. */
export function composeBay(seed: number, W: number, H: number, theme: BayTheme): Poly[] {
  const rnd = mulberry32(seed);
  const placed: Placed[] = [];
  const holes: Poly[] = [];
  const margin = 0.07, gap = 0.045;
  const fits = (x: number, y: number, r: number) => {
    if (x - r < -W / 2 + margin || x + r > W / 2 - margin || y - r < -H / 2 + margin || y + r > H / 2 - margin) return false;
    for (const p of placed) if (Math.hypot(p.x - x, p.y - y) < p.r + r + gap) return false;
    return true;
  };
  const tryPlace = (r: number, make: (x: number, y: number, rot: number) => Poly[], tries = 160) => {
    for (let i = 0; i < tries; i++) {
      const x = (rnd() - 0.5) * W, y = (rnd() - 0.5) * H;
      if (fits(x, y, r)) {
        placed.push({ x, y, r });
        holes.push(...make(x, y, rnd() * Math.PI * 2));
        return true;
      }
    }
    return false;
  };
  const bigLeaf = (len: number) => (x: number, y: number, rot: number) =>
    leafHoles({ len, width: len * 0.82, veins: 5, slant: 0.42, samples: 18 }).map((p) => xform(p, { x, y, r: rot }));
  const medLeaf = (len: number) => (x: number, y: number, rot: number) =>
    leafHoles({ len, width: len * 0.5, veins: 4, slant: 0.75, samples: 14 }).map((p) => xform(p, { x, y, r: rot }));
  const smallLeaf = (len: number) => (x: number, y: number, rot: number) =>
    leafHoles({ len, width: len * 0.46, veins: 2, slant: 0.8, samples: 10, midrib: len * 0.06 }).map((p) => xform(p, { x, y, r: rot }));
  const cluster = (len: number, n: number) => (x: number, y: number, rot: number) => {
    const out: Poly[] = [];
    const spread = 0.62;
    for (let k = 0; k < n; k++) {
      const a = rot + (k - (n - 1) / 2) * spread;
      const d = len * 0.2 + len / 2;
      const lp = leafHoles({ len, width: len * 0.27, veins: 3, slant: 1.0, samples: 12, midrib: len * 0.05 });
      for (const p of lp) out.push(xform(p, { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, r: a - Math.PI / 2 }));
    }
    return out;
  };
  const bird = (size: number) => (x: number, y: number, rot: number) => {
    const flip = rot > Math.PI;
    return [xform(flyingBird(), { x, y, s: size, r: (rot % 0.8) - 0.4, fx: flip })];
  };
  const soar = (size: number) => (x: number, y: number, rot: number) => [xform(soaringBird(), { x, y, s: size, r: rot })];

  if (theme === 'aves') {
    tryPlace(0.32, bird(0.6));
    tryPlace(0.27, bird(0.5));
    tryPlace(0.22, soar(0.42));
    tryPlace(0.4, bigLeaf(0.8));
  } else {
    const L = 0.85 + rnd() * 0.25;
    tryPlace(L / 2, bigLeaf(L));
    if (theme === 'mixto') tryPlace(0.3, bird(0.56));
    tryPlace(0.36, bigLeaf(0.7));
    const cl = 0.36 + rnd() * 0.06;
    tryPlace(cl * 1.2, cluster(cl, 3));
  }
  for (let i = 0; i < 4; i++) { const l = 0.42 + rnd() * 0.18; tryPlace(l / 2, medLeaf(l), 80); }
  for (let i = 0; i < 10; i++) { const l = 0.2 + rnd() * 0.1; tryPlace(l / 2, smallLeaf(l), 60); }
  return holes;
}

// ---------------------------------------------------------------- CIAT crops & forages (tunnel lattices)
// Unit-size motifs (fit in a ~0.55 radius), separated parts only, so they can be laser-cut as holes.

/** Cassava (yuca): palmate leaf with seven separate lobes and a petiole. */
export function cassavaLeaf(): Poly[] {
  const out: Poly[] = [];
  for (let k = 0; k < 7; k++) {
    const a = Math.PI / 2 + (k - 3) * 0.45;
    const len = 0.5 * (1 - 0.13 * Math.abs(k - 3));
    const r0 = 0.07 + len / 2;
    out.push(xform(leafOutline(len, len * 0.24, 14), { x: Math.cos(a) * r0, y: Math.sin(a) * r0, r: a - Math.PI / 2 }));
  }
  out.push([[-0.012, -0.05], [0.012, -0.05], [0.02, -0.42], [-0.004, -0.42]]);
  return out;
}

/** Bean (fríjol): trifoliate leaf. */
export function beanLeaf(): Poly[] {
  return [
    xform(leafOutline(0.44, 0.3, 16), { x: 0, y: 0.29 }),
    xform(leafOutline(0.36, 0.25, 16), { x: -0.23, y: 0.02, r: 1.3 }),
    xform(leafOutline(0.36, 0.25, 16), { x: 0.23, y: 0.02, r: -1.3 }),
    [[-0.012, -0.09], [0.012, -0.09], [0.018, -0.45], [-0.006, -0.45]],
  ];
}

/** Rice / brachiaria forage: a clump of diverging blades. */
export function grassClump(): Poly[] {
  const out: Poly[] = [];
  for (let i = 0; i < 5; i++) out.push(xform(blade((i - 2) * 0.075, 0.82 - Math.abs(i - 2) * 0.12, 0.04, (i - 2) * 0.16, 10), { y: -0.42 }));
  return out;
}

export interface Rect { x0: number; y0: number; x1: number; y1: number }

/** Rounded rectangle polygon (window openings). */
export function roundRect(r: Rect, rad = 0.05, seg = 4): Poly {
  const p: Poly = [];
  const corners: [number, number, number][] = [[r.x1 - rad, r.y0 + rad, -Math.PI / 2], [r.x1 - rad, r.y1 - rad, 0], [r.x0 + rad, r.y1 - rad, Math.PI / 2], [r.x0 + rad, r.y0 + rad, Math.PI]];
  for (const [cx, cy, a0] of corners) for (let k = 0; k <= seg; k++) { const a = a0 + (k / seg) * (Math.PI / 2); p.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]); }
  return p;
}

/** Laser-cut lattice of CIAT flora in a W×H panel (origin at centre), avoiding reserved rectangles (windows, boards). */
export function composeFlora(seed: number, W: number, H: number, reserved: Rect[] = [], density = 1, only?: (() => Poly[])[]): Poly[] {
  const rnd = mulberry32(seed);
  const placed: { x: number; y: number; r: number }[] = [];
  const holes: Poly[] = [];
  const margin = 0.06, gap = 0.05;
  const fits = (x: number, y: number, r: number) => {
    if (x - r < -W / 2 + margin || x + r > W / 2 - margin || y - r < -H / 2 + margin || y + r > H / 2 - margin) return false;
    for (const q of reserved) if (x + r > q.x0 - gap && x - r < q.x1 + gap && y + r > q.y0 - gap && y - r < q.y1 + gap) return false;
    for (const p of placed) if (Math.hypot(p.x - x, p.y - y) < p.r + r + gap) return false;
    return true;
  };
  const motifs = only ?? [cassavaLeaf, beanLeaf, grassClump];
  const place = (size: number, tries: number) => {
    const r = size * 0.56;
    for (let i = 0; i < tries; i++) {
      const x = (rnd() - 0.5) * W, y = (rnd() - 0.5) * H;
      if (!fits(x, y, r)) continue;
      const m = motifs[Math.floor(rnd() * motifs.length)];
      const rot = (rnd() - 0.5) * 1.6;
      placed.push({ x, y, r });
      holes.push(...m().map((p) => xform(p, { x, y, s: size, r: rot })));
      return;
    }
  };
  const big = Math.round(3 * density), med = Math.round(5 * density), small = Math.round(9 * density);
  for (let i = 0; i < big; i++) place(0.62 + rnd() * 0.18, 140);
  for (let i = 0; i < med; i++) place(0.36 + rnd() * 0.1, 100);
  for (let i = 0; i < small; i++) place(0.2 + rnd() * 0.06, 70);
  return holes;
}
