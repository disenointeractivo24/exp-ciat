import { mulberry32 } from './shapes';
import planCtx from '../data/ciatContext.json';
import { heightAt, lagoonD, pathDist } from './terrain';
import { DECK, RAMP, TOWER, WATER_Y } from './layout';
import { LAGOON_SIDE, PADDOCK, STEPS, fenceDist, TUNNEL_LEN, frameAt, tunnelDist } from './tunnel';

// real roads from the CIAT plan (scene space): keep trees and grass off them
const ROAD_SEGS: [number, number, number, number][] = [];
for (const l of planCtx.roads as [number, number][][]) for (let i = 0; i < l.length - 1; i++) if (Math.max(Math.abs(l[i][0]), Math.abs(l[i][1])) < 160) ROAD_SEGS.push([l[i][0], l[i][1], l[i + 1][0], l[i + 1][1]]);
export function onRoad(x: number, z: number, m: number) {
  for (const [ax, az, bx, bz] of ROAD_SEGS) {
    const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    if (Math.hypot(x - ax - t * dx, z - az - t * dz) < 3 + m) return true;
  }
  return false;
}

/** Keep the tunnel, the plaza, the tower, the stable and the fields clear of trunks and big plants. */
function inBuilt(x: number, z: number, m: number) {
  if (onRoad(x, z, m)) return true;
  if (x > -50 && x < 0 && z > -70 && z < 20 && tunnelDist(x, z).d < 2.4 + m) return true;
  // tower site, and the view from its top platform toward the deck and the lagoon (north / north-east)
  if (x > TOWER.x - 7.5 - m && x < TOWER.x + 7.5 + m && z > TOWER.z - 16 - m && z < TOWER.z + 11 + m) return true;
  { const dx = x - TOWER.x, dz = z - TOWER.z, d = Math.hypot(dx, dz), a = Math.atan2(dx, -dz);
    if (d > 6 && d < 48 && a > -0.05 && a < 0.85) return true; }
  if (x > STEPS.x0 - 0.5 - m && x < STEPS.x1 + 0.5 + m && z > STEPS.z0 - 0.5 - m && z < STEPS.z1 + 0.5 + m) return true;
  if (fenceDist(x, z) < 1.2 + m) return true; // keep the fence line clear (trees inside the pasture are fine)
  return false;
}

export type TreeKind = 'saman' | 'round' | 'guadua' | 'palma';
export interface TreeDef { x: number; z: number; h: number; r: number; kind: TreeKind; seed: number; far: boolean }
export interface PlantDef { x: number; z: number; s: number; rot: number; kind: 'oreja' | 'heliconia' }

const rnd = mulberry32(20241108);
const LAGOON_BOX = { x0: -18, x1: 50, z0: -51, z1: 0 };

function nearDeck(x: number, z: number, m: number) {
  return x > DECK.x0 - m && x < DECK.x1 + m && z > DECK.z0 - m && z < RAMP.z1 + m * 0.6;
}
// keep the panoramic view from the deck toward the lagoon open
// keep the arrival sight-line from the path start to the deck open
function blocksArrival(x: number, z: number, r: number) {
  const ax = -4, az = 16, bx = -0.5, bz = 1;
  const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / ((bx - ax) ** 2 + (bz - az) ** 2)));
  return Math.hypot(x - (ax + (bx - ax) * t), z - (az + (bz - az) * t)) < r * 0.8 + 1.5;
}
function inViewCone(x: number, z: number) {
  return z < -2 && x > -15 && x < 50 && z > -52; // the whole lagoon
}

export const TREES: TreeDef[] = [];
// hero trees framing the deck (as in the reference image)
TREES.push({ x: -7.6, z: 3.8, h: 9.5, r: 5.2, kind: 'saman', seed: 1, far: false });
TREES.push({ x: 6.8, z: 7.2, h: 8.5, r: 4.4, kind: 'round', seed: 2, far: false });
TREES.push({ x: -9.5, z: -5.5, h: 13, r: 2.6, kind: 'guadua', seed: 3, far: false });
TREES.push({ x: 9.5, z: 12.5, h: 12, r: 2.4, kind: 'guadua', seed: 4, far: false });

(() => {
  let tries = 0;
  while (TREES.filter((t) => !t.far).length < 46 && tries++ < 6000) {
    const x = (rnd() - 0.5) * 90, z = (rnd() - 0.5) * 90 - 4;
    const d = lagoonD(x, z);
    if (d < 1.12 || heightAt(x, z) < WATER_Y + 0.3) continue;
    if (nearDeck(x, z, 4)) continue;
    if (inBuilt(x, z, 1.5)) continue;
    if (z > 0 && pathDist(x, z).d < 3.2) continue;
    if (Math.hypot(x, z) > 46) continue;
    if (TREES.some((t) => Math.hypot(t.x - x, t.z - z) < t.r * 0.9 + 2.5)) continue;
    const k = rnd();
    const kind: TreeKind = k < 0.12 ? 'guadua' : k < 0.55 ? 'saman' : 'round';
    const h = kind === 'guadua' ? 10 + rnd() * 4 : 7 + rnd() * 6;
    const r = kind === 'guadua' ? 2.2 + rnd() : kind === 'saman' ? 4 + rnd() * 2.5 : 2.6 + rnd() * 1.8;
    if (blocksArrival(x, z, r)) continue;
    if (inBuilt(x, z, r * 0.55)) continue;
    TREES.push({ x, z, h, r, kind, seed: Math.floor(rnd() * 1e6), far: false });
  }
  // horizon ring
  // (the horizon ring is now the real CIAT context from the DWG plan, see scene/CiatContext.tsx)
  for (let i = 0; i < 0; i++) {
    const a = rnd() * Math.PI * 2, rr = 50 + rnd() * 32;
    const x = 4 + Math.cos(a) * rr, z = -8 + Math.sin(a) * rr;
    const kind: TreeKind = rnd() < 0.5 ? 'saman' : 'round';
    if (inBuilt(x, z, 4)) continue;
    TREES.push({ x, z, h: 10 + rnd() * 8, r: 4.5 + rnd() * 3.5, kind, seed: Math.floor(rnd() * 1e6), far: true });
  }
})();

// Real trees of the CIAT plan around the site, drawn with the same tree model as the rest of the scene.
// Near ones get full detail; far ones use the lighter "far" crowns. Beyond ~600 m the haze hides them.
(() => {
  for (const [x, z, cr] of planCtx.trees as [number, number, number][]) {
    const d = Math.hypot(x, z);
    if (d > 600) continue;
    const h = Math.abs(Math.sin(x * 12.9898 + z * 78.233)) % 1;
    const r = Math.min(7, Math.max(2.2, cr * 1.1));
    TREES.push({ x, z, h: 6.5 + r * 1.45 + h * 2, r, kind: h < 0.45 ? 'saman' : 'round', seed: Math.floor(h * 1e6) + 7, far: d > 140 });
  }
})();

export const PLANTS: PlantDef[] = [];

// ---------------------------------------------------------------- trees lining the tunnel trail
// As in the site photo: big trunks right beside the trail, palms and broad-leaved plants on the lagoon side,
// trees behind the cow paddock on the other side. Canopies rise well above the 3 m lattice roof.
(() => {
  const r2 = mulberry32(777);
  const free = (x: number, z: number) => heightAt(x, z) > WATER_Y + 0.35 && !nearDeck(x, z, 2) &&
    !(x > STEPS.x0 - 1 && x < STEPS.x1 + 1 && z > STEPS.z0 - 1 && z < STEPS.z1 + 1) &&
    fenceDist(x, z) > 1.0 &&
    !onRoad(x, z, 2) && !TREES.some((t) => !t.far && Math.hypot(t.x - x, t.z - z) < 2.6);
  for (let s = 1.5; s < TUNNEL_LEN - 1; s += 3.6 + r2() * 1.6) {
    const f = frameAt(s);
    for (const side of [-1, 1]) {
      const lagoon = side === LAGOON_SIDE;
      const off = (lagoon ? 3.1 : 3.3) + r2() * 1.4;
      const x = f.p.x + f.r.x * off * side + (r2() - 0.5) * 0.6, z = f.p.z + f.r.z * off * side + (r2() - 0.5) * 0.6;
      if (!free(x, z)) continue;
      const pick = r2();
      const kind: TreeKind = lagoon ? (pick < 0.45 ? 'palma' : 'round') : (pick < 0.25 ? 'palma' : 'round');
      const h = kind === 'palma' ? 7 + r2() * 3 : 11 + r2() * 4;
      const r = kind === 'palma' ? 2.6 : 3.2 + r2() * 1.6;
      TREES.push({ x, z, h, r, kind, seed: Math.floor(r2() * 1e6), far: false });
    }
  }
  // a second, looser row behind the paddock and behind the lagoon-side trees
  for (let s = 3; s < TUNNEL_LEN - 2; s += 6 + r2() * 3) {
    const f = frameAt(s);
    for (const side of [-1, 1]) {
      const off = side === LAGOON_SIDE ? 6.5 + r2() * 2 : (f.p.z > PADDOCK.z0 - 1 && f.p.z < PADDOCK.z1 + 1 ? 9 + r2() * 6 : 7 + r2() * 3);
      const x = f.p.x + f.r.x * off * side, z = f.p.z + f.r.z * off * side;
      if (!free(x, z) || lagoonD(x, z) < 1.08) continue;
      TREES.push({ x, z, h: 12 + r2() * 5, r: 4 + r2() * 1.5, kind: r2() < 0.5 ? 'saman' : 'round', seed: Math.floor(r2() * 1e6), far: false });
    }
  }
  // broad-leaved understorey (heliconias, oreja de elefante) along the lagoon-side wall
  for (let s = 2; s < TUNNEL_LEN - 2; s += 1.6 + r2() * 1.8) {
    const f = frameAt(s);
    const off = 2.1 + r2() * 1.0;
    const x = f.p.x + f.r.x * off * LAGOON_SIDE, z = f.p.z + f.r.z * off * LAGOON_SIDE;
    if (heightAt(x, z) < WATER_Y + 0.25 || nearDeck(x, z, 1) || onRoad(x, z, 0.5)) continue;
    PLANTS.push({ x, z, s: 0.9 + r2() * 0.6, rot: r2() * 6.28, kind: r2() < 0.5 ? 'heliconia' : 'oreja' });
  }
})();
(() => {
  // foreground planting around the deck & path edges
  const spots: [number, number][] = [
    [-4.9, -0.8], [-5.3, 1.6], [-4.7, 3.7], [-3.2, 3.9], [0.4, 3.6], [1.9, 3.8], [3.8, 3.7], [4.9, 2.6], [-0.1, 6.2],
    [-3.1, 6.0], [-3.4, 8.3], [0.3, 9.2], [-5.6, 12.2], [-1.7, 13.4], [-6.2, 17.6], [-2.0, 18.9], [-5.6, -2.6],
  ];
  for (const [x, z] of spots) if (!inBuilt(x, z, 0.5)) PLANTS.push({ x, z, s: 0.8 + rnd() * 0.5, rot: rnd() * 6.28, kind: rnd() < 0.7 ? 'oreja' : 'heliconia' });
  let tries = 0;
  while (PLANTS.length < 110 && tries++ < 5000) {
    const x = (rnd() - 0.5) * 70, z = (rnd() - 0.5) * 70;
    const d = lagoonD(x, z);
    if (d < 1.05 || d > 1.9) continue;
    if (nearDeck(x, z, 1.2)) continue;
    if (inBuilt(x, z, 0.6)) continue;
    if (z > 0 && pathDist(x, z).d < 1.4) continue;
    if (inViewCone(x, z) && d < 1.2) continue;
    PLANTS.push({ x, z, s: 0.7 + rnd() * 0.7, rot: rnd() * 6.28, kind: rnd() < 0.6 ? 'oreja' : 'heliconia' });
  }
})();

export interface Scatter { x: number; z: number; s: number; rot: number }

export const GRASS: Scatter[] = [];
export const REEDS: Scatter[] = [];
export const LILIES: Scatter[] = [];
(() => {
  let tries = 0;
  while (GRASS.length < 4800 && tries++ < 60000) {
    const x = (rnd() - 0.5) * 100, z = (rnd() - 0.5) * 100;
    const h = heightAt(x, z);
    if (h < WATER_Y + 0.08) continue;
    if (nearDeck(x, z, 0.15) && !(z > RAMP.z0 && (x < RAMP.x0 - 0.2 || x > RAMP.x1 + 0.2))) continue;
    if (x > RAMP.x0 - 0.15 && x < RAMP.x1 + 0.15 && z > RAMP.z0 - 0.2 && z < RAMP.z1 + 0.2) continue;
    if (z > 2 && pathDist(x, z).d < 1.0) continue;
    if (x > -50 && x < 0 && z > -70 && z < 20 && tunnelDist(x, z).d < 2.1) continue;
    if (x > STEPS.x0 - 0.2 && x < STEPS.x1 + 0.2 && z > STEPS.z0 - 0.2 && z < STEPS.z1 + 0.2) continue;
    if (onRoad(x, z, 0.3)) continue;
    if (x > TOWER.x - 5.2 && x < TOWER.x + 6.6 && z > TOWER.z - 10.6 && z < TOWER.z + 8.3) continue; // tower platform + ramp
    const r = Math.hypot(x, z);
    if (r > 30 && rnd() < 0.6) continue;
    const d = lagoonD(x, z);
    const dense = d < 1.25 ? 1 : 0.55;
    if (rnd() > dense) continue;
    GRASS.push({ x, z, s: 0.55 + rnd() * 0.75 + (d < 1.15 ? 0.3 : 0), rot: rnd() * 6.28 });
  }
  tries = 0;
  while (REEDS.length < 1900 && tries++ < 60000) {
    const x = LAGOON_BOX.x0 + rnd() * (LAGOON_BOX.x1 - LAGOON_BOX.x0), z = LAGOON_BOX.z0 + rnd() * (LAGOON_BOX.z1 - LAGOON_BOX.z0);
    const h = heightAt(x, z);
    if (h > WATER_Y + 0.12 || h < WATER_Y - 0.55) continue;
    if (x > -5.8 && x < 5.8 && z > -4.6 && z < 4) continue;
    if (x > -4.6 && x < 7 && z > -8 && z < 3.2) { if (rnd() > 0.12) continue; }
    // clumps
    const cl = Math.sin(x * 0.7) * Math.cos(z * 0.55) + Math.sin(x * 0.23 + z * 0.31);
    if (cl < 0.1 && rnd() > 0.15) continue;
    REEDS.push({ x, z, s: 0.8 + rnd() * 0.6, rot: rnd() * 6.28 });
  }
  const patches: [number, number, number][] = [[0.5, -6.8, 1.6], [-3.8, -6.0, 1.1], [6.5, -5.2, 1.4], [3, -11, 2.2], [12, -9, 2], [-2, -13, 1.6], [16, -18, 2.5], [8, -22, 2]];
  for (const [cx, cz, r] of patches) {
    const n = Math.round(r * 16);
    for (let i = 0; i < n; i++) {
      const a = rnd() * 6.28, d = Math.sqrt(rnd()) * r;
      const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d * 0.7;
      if (heightAt(x, z) > WATER_Y - 0.12) continue;
      if (LILIES.some((l) => Math.hypot(l.x - x, l.z - z) < 0.36)) continue;
      LILIES.push({ x, z, s: 0.65 + rnd() * 0.6, rot: rnd() * 6.28 });
    }
  }
})();

export function findShore(cands: [number, number][]): [number, number][] {
  return cands.map(([x, z]) => {
    let best: [number, number] = [x, z], bd = 1e9;
    for (let i = 0; i < 200; i++) {
      const a = (i / 200) * Math.PI * 2;
      for (let r = 0; r < 6; r += 0.5) {
        const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
        const h = heightAt(px, pz);
        const dh = Math.abs(h - (WATER_Y - 0.1));
        if (dh < 0.04 && r < bd) { bd = r; best = [px, pz]; }
      }
    }
    return best;
  });
}

// Standing egrets placed in shallow water inside the lagoon view
export const HERONS: [number, number][] = findShore([[-6.5, -8], [11, -4.5], [-2.5, -24], [20, -12]]);
