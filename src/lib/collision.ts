import { BENCHES, BINOC, DECK, EDGE_X, FLOOR_Y, MAQUETA, MIRROR, RAILINGS, RAMP, SELECTOR, SIGN, SLATS, STRUCT_POSTS, WALL, WATER_Y, WHEEL, SLIDERS } from './layout';
import { heightAt } from './terrain';
import { TREES } from './vegData';
import { towerBoxes, towerSurfaces } from './tower';

const yboxes = towerBoxes();
import { BAY, NBAYS, PADDOCK, PRISM_BAYS, TUNNEL_LEN, frameAt, openness, widthAt } from './tunnel';

interface Box { cx: number; cz: number; hx: number; hz: number; c: number; s: number }
interface Circle { x: number; z: number; r: number }

const boxes: Box[] = [];
const circles: Circle[] = [];

function addBox(cx: number, cz: number, hx: number, hz: number, rot = 0) {
  boxes.push({ cx, cz, hx, hz, c: Math.cos(rot), s: Math.sin(rot) });
}
function addSeg(x1: number, z1: number, x2: number, z2: number, th = 0.08) {
  const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
  const len = Math.hypot(x2 - x1, z2 - z1);
  addBox(cx, cz, len / 2 + th / 2, th / 2, Math.atan2(z2 - z1, x2 - x1));
}

for (const [x1, z1, x2, z2] of RAILINGS) addSeg(x1, z1, x2, z2, 0.14);
addSeg(WALL.x, WALL.z0, WALL.x, WALL.z1, 0.16);
addSeg(SLATS.x, SLATS.z0, SLATS.x, SLATS.z1, 0.14);
for (const [x, z] of STRUCT_POSTS) addBox(x, z, 0.1, 0.1);
for (const b of BENCHES) {
  addBox(b.x, b.z, b.len / 2, b.depth / 2, -b.rot);
}
addBox(WHEEL.x, WHEEL.z, WHEEL.width / 2, 0.2, -WHEEL.rot);
circles.push({ x: SELECTOR.x, z: SELECTOR.z, r: 0.2 });
addBox(MAQUETA.x, MAQUETA.z, MAQUETA.d / 2, MAQUETA.w / 2);
circles.push({ x: BINOC.x, z: BINOC.z, r: 0.14 });
addBox(MIRROR.x, MIRROR.z, MIRROR.w / 2, MIRROR.d / 2);
circles.push({ x: SIGN.x, z: SIGN.z, r: 0.25 });
// ramp handrails
addSeg(RAMP.x0, RAMP.z0, RAMP.x0, RAMP.z1, 0.1);
addSeg(RAMP.x1, RAMP.z0, RAMP.x1, RAMP.z1, 0.1);
for (const t of TREES) if (!t.far && t.kind !== 'guadua') circles.push({ x: t.x, z: t.z, r: 0.45 });
for (const t of TREES) if (!t.far && t.kind === 'guadua') circles.push({ x: t.x, z: t.z, r: 1.1 });
// guadua tunnel: side walls between frames (open at both ends), prisms, tower, stable and paddock
{
  const side = (s: number, k: number) => { const f = frameAt(s); const w = widthAt(s) / 2; return [f.p.x + f.r.x * w * k, f.p.z + f.r.z * w * k] as const; };
  for (let i = 0; i < NBAYS; i++) {
    const s0 = i * BAY, s1 = Math.min(TUNNEL_LEN, (i + 1) * BAY);
    if (openness(s1) > 0.85) continue;
    for (const k of [-1, 1]) { const a = side(s0, k), b = side(s1, k); addSeg(a[0], a[1], b[0], b[1], 0.12); }
    if (PRISM_BAYS.includes(i)) { const f = frameAt((s0 + s1) / 2); const w = widthAt((s0 + s1) / 2) / 2 - 0.55; circles.push({ x: f.p.x + f.r.x * w, z: f.p.z + f.r.z * w, r: 0.4 }); }
  }
  addSeg(PADDOCK.x0, PADDOCK.z0, PADDOCK.x1, PADDOCK.z0); addSeg(PADDOCK.x1, PADDOCK.z0, PADDOCK.x1, PADDOCK.z1); addSeg(PADDOCK.x1, PADDOCK.z1, PADDOCK.x0, PADDOCK.z1); addSeg(PADDOCK.x0, PADDOCK.z1, PADDOCK.x0, PADDOCK.z0);
}
void SLIDERS; void EDGE_X;

export const inDeck = (x: number, z: number) => x > DECK.x0 && x < DECK.x1 && z > DECK.z0 && z < DECK.z1;
export const inRamp = (x: number, z: number) => x > RAMP.x0 && x < RAMP.x1 && z >= DECK.z1 && z < RAMP.z1;

/** Ground height; inside the tower picks the floor / stair / ramp surface reachable from refY (feet height). */
export function groundY(x: number, z: number, refY?: number) {
  const base = baseGround(x, z);
  const S = towerSurfaces(x, z);
  if (!S.length) return base;
  const ref = refY ?? base + 0.5;
  let best = base;
  for (const h of S) if (h <= ref + 0.5 && h > best) best = h;
  return best;
}

function baseGround(x: number, z: number) {
  if (inDeck(x, z)) return FLOOR_Y;
  if (inRamp(x, z)) {
    const t = (z - RAMP.z0) / (RAMP.z1 - RAMP.z0);
    return FLOOR_Y * (1 - Math.min(1, Math.max(0, t))) + Math.max(0, heightAt(x, RAMP.z1)) * Math.min(1, Math.max(0, t));
  }
  return heightAt(x, z);
}

export function walkable(x: number, z: number) {
  if (inDeck(x, z) || inRamp(x, z)) return true;
  if (Math.hypot(x - 4, z + 8) > 72) return false;
  return heightAt(x, z) > WATER_Y + 0.12;
}

export function blocked(x: number, z: number, r = 0.28, y?: number) {
  if (!walkable(x, z)) return true;
  const fy = y ?? groundY(x, z);
  for (const b of yboxes) {
    if (fy < b.y0 || fy > b.y1) continue;
    const qx = Math.max(b.cx - b.hx, Math.min(b.cx + b.hx, x)), qz = Math.max(b.cz - b.hz, Math.min(b.cz + b.hz, z));
    if ((x - qx) ** 2 + (z - qz) ** 2 < r * r) return true;
  }
  for (const b of boxes) {
    const dx = x - b.cx, dz = z - b.cz;
    const lx = dx * b.c + dz * b.s, lz = -dx * b.s + dz * b.c;
    const qx = Math.max(-b.hx, Math.min(b.hx, lx)), qz = Math.max(-b.hz, Math.min(b.hz, lz));
    if ((lx - qx) ** 2 + (lz - qz) ** 2 < r * r) return true;
  }
  for (const c of circles) if ((x - c.x) ** 2 + (z - c.z) ** 2 < (c.r + r) ** 2) return true;
  return false;
}

/** Moves with wall sliding; returns resolved position. */
export function moveWithCollision(x: number, z: number, dx: number, dz: number, y?: number): [number, number] {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.08));
  for (let i = 0; i < steps; i++) {
    const sx = dx / steps, sz = dz / steps;
    if (!blocked(x + sx, z + sz, 0.28, y)) { x += sx; z += sz; continue; }
    if (!blocked(x + sx, z, 0.28, y)) { x += sx; continue; }
    if (!blocked(x, z + sz, 0.28, y)) { z += sz; continue; }
  }
  return [x, z];
}
