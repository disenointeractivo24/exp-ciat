// Three-level biodiversity observation tower: dimensions, walkable surfaces (floors, ramp, stairs)
// and level-aware collision boxes. Everything is relative to the tower centre T (x, z) and its base B.
// Layout (plan, north = -z): 7.5 m timber core with a central light well; exterior stair on the east side
// (two parallel flights with landings), shadow-garden terrace to the south, accessible ramp from the north.
import { TOWER } from './layout';
import { heightAt } from './terrain';

export const T = TOWER;
/** Base level (ground under the tower, levelled by the terrain bake). */
export const B = () => heightAt(T.x, T.z);
export const LEVEL = { l1: 0.45, l2: 3.75, l3: 7.05, roof: 9.95 }; // above B
export const CORE = 3.75; // core half-size (7.5 × 7.5 m)
/** Level 1 platform: core, 1 m ring, east strip under the stairs, 4 m shadow terrace to the south. */
export const L1 = { x0: -4.75, x1: 6.2, z0: -4.75, z1: 7.9 };
/** Accessible ramp 1:12 from the path (north) up to level 1. */
export const RAMPT = { x0: -0.8, x1: 0.8, z0: -4.75 - 5.4, z1: -4.75 };
/** Central light well through levels 2 and 3, under the perforated roof. */
export const ATRIUM = { x0: -1.2, x1: 1.2, z0: -1.2, z1: 1.2 };
/** Exterior stair: flight 1 (L1→L2) rises north, flight 2 (L2→L3) rises south on a parallel strip further out. */
export const ST1 = { x0: 3.85, x1: 4.95, zBottom: 3.1, zTop: -2.0 };
export const ST2 = { x0: 5.0, x1: 6.1, zBottom: -2.0, zTop: 3.1 };
export const LAND2 = { x0: CORE, x1: 6.1, z0: -CORE, z1: -2.0 }; // level-2 landing (north-east)
export const LAND3 = { x0: CORE, x1: 6.1, z0: 3.1, z1: 4.3 }; // level-3 landing (south-east)
/** Wide entry from the level-3 landing into the platform (over the lower part of flight 1). */
export const LAND3B = { x0: CORE, x1: 4.97, z0: 1.6, z1: 3.1 };
export const STAIR_N = 18; // risers per flight (3.3 m → 18.3 cm)

/** Rotating shadow panels on the level-1 terrace (centre x, z), each with one CIAT plant. */
export const SHADOW_PANELS = [
  { x: -2.8, z: 6.9, plant: 'yuca', target: 0.55 },
  { x: 0, z: 6.9, plant: 'frijol', target: -0.45 },
  { x: 2.8, z: 6.9, plant: 'forraje', target: 0.3 },
] as const;
/** Anamorphic eye point on level 3 (relative x, z): looks north over the west half. */
export const ANA_EYE = { x: -2.6, z: 2.9 };
export const VIEWER = { x: 2.7, z: -2.7 };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const inRect = (x: number, z: number, x0: number, x1: number, z0: number, z1: number) => x >= x0 && x <= x1 && z >= z0 && z <= z1;
const inR = (x: number, z: number, r: { x0: number; x1: number; z0: number; z1: number }) => inRect(x, z, r.x0, r.x1, r.z0, r.z1);

/** Walkable surfaces at a world point (absolute heights). */
export function towerSurfaces(wx: number, wz: number): number[] {
  const x = wx - T.x, z = wz - T.z;
  if (x < L1.x0 - 1 || x > L1.x1 + 1 || z < RAMPT.z0 - 0.5 || z > L1.z1 + 0.5) return [];
  const b = B(), out: number[] = [];
  if (inR(x, z, L1)) out.push(b + LEVEL.l1);
  if (inR(x, z, RAMPT)) {
    const foot = heightAt(T.x, T.z + RAMPT.z0);
    out.push(foot + (b + LEVEL.l1 - foot) * clamp01((z - RAMPT.z0) / (RAMPT.z1 - RAMPT.z0)));
  }
  const inCore = inRect(x, z, -CORE, CORE, -CORE, CORE) && !inR(x, z, ATRIUM);
  if (inCore || inR(x, z, LAND2)) out.push(b + LEVEL.l2);
  if (inCore || inR(x, z, LAND3) || inR(x, z, LAND3B)) out.push(b + LEVEL.l3);
  if (inRect(x, z, ST1.x0, ST1.x1, ST1.zTop, ST1.zBottom + 0.3)) out.push(b + LEVEL.l1 + (LEVEL.l2 - LEVEL.l1) * clamp01((ST1.zBottom - z) / (ST1.zBottom - ST1.zTop)));
  if (inRect(x, z, ST2.x0, ST2.x1, ST2.zBottom - 0.3, ST2.zTop + 0.3)) out.push(b + LEVEL.l2 + (LEVEL.l3 - LEVEL.l2) * clamp01((z - ST2.zBottom) / (ST2.zTop - ST2.zBottom)));
  return out;
}

/** Which level a height belongs to (0 = ground, 1..3). */
export function levelOf(y: number) {
  const b = B();
  if (y > b + LEVEL.l3 - 0.4) return 3;
  if (y > b + LEVEL.l2 - 0.4) return 2;
  if (y > b + LEVEL.l1 - 0.3) return 1;
  return 0;
}

export interface YBox { cx: number; cz: number; hx: number; hz: number; y0: number; y1: number }
/** Railings, stair sides and the space under the stairs, each active only within a height range. */
export function towerBoxes(): YBox[] {
  const b = B(), out: YBox[] = [];
  const seg = (x1: number, z1: number, x2: number, z2: number, y0: number, y1: number, th = 0.12) => {
    out.push({ cx: T.x + (x1 + x2) / 2, cz: T.z + (z1 + z2) / 2, hx: Math.abs(x2 - x1) / 2 + th / 2, hz: Math.abs(z2 - z1) / 2 + th / 2, y0: b + y0, y1: b + y1 });
  };
  const box = (x0: number, x1: number, z0: number, z1: number, y0: number, y1: number) => out.push({ cx: T.x + (x0 + x1) / 2, cz: T.z + (z0 + z1) / 2, hx: (x1 - x0) / 2, hz: (z1 - z0) / 2, y0: b + y0, y1: b + y1 });
  const { l1, l2, l3 } = LEVEL;
  const g1: [number, number] = [-2, l1 + 1.2];
  // level 1 perimeter (open at the ramp)
  seg(L1.x0, L1.z0, RAMPT.x0, L1.z0, ...g1); seg(RAMPT.x1, L1.z0, L1.x1, L1.z0, ...g1);
  seg(L1.x0, L1.z0, L1.x0, L1.z1, ...g1); seg(L1.x1, L1.z0, L1.x1, L1.z1, ...g1); seg(L1.x0, L1.z1, L1.x1, L1.z1, ...g1);
  seg(RAMPT.x0, RAMPT.z0, RAMPT.x0, RAMPT.z1, -2, l1 + 1.2, 0.1); seg(RAMPT.x1, RAMPT.z0, RAMPT.x1, RAMPT.z1, -2, l1 + 1.2, 0.1);
  // level 2: core perimeter with the opening to the north-east landing; landing edges; light well
  const r2: [number, number] = [l2 - 0.3, l2 + 1.5];
  seg(-CORE, -CORE, CORE, -CORE, ...r2); seg(-CORE, CORE, CORE, CORE, ...r2); seg(-CORE, -CORE, -CORE, CORE, ...r2); seg(CORE, LAND2.z1, CORE, CORE, ...r2);
  seg(LAND2.x0, LAND2.z0, LAND2.x1, LAND2.z0, ...r2); seg(LAND2.x1, LAND2.z0, LAND2.x1, LAND2.z1, ...r2);
  // level 3: same idea with the south-east landing
  const r3: [number, number] = [l3 - 0.3, l3 + 1.5];
  seg(-CORE, -CORE, CORE, -CORE, ...r3); seg(-CORE, CORE, CORE, CORE, ...r3); seg(-CORE, -CORE, -CORE, CORE, ...r3); seg(CORE, -CORE, CORE, LAND3B.z0, ...r3);
  seg(LAND3.x0, LAND3.z1, LAND3.x1, LAND3.z1, ...r3); seg(LAND3.x1, LAND3.z0, LAND3.x1, LAND3.z1, ...r3); seg(LAND3B.x0, LAND3B.z0, LAND3B.x1, LAND3B.z0, ...r3);
  for (const r of [r2, r3]) { seg(ATRIUM.x0, ATRIUM.z0, ATRIUM.x1, ATRIUM.z0, ...r); seg(ATRIUM.x0, ATRIUM.z1, ATRIUM.x1, ATRIUM.z1, ...r); seg(ATRIUM.x0, ATRIUM.z0, ATRIUM.x0, ATRIUM.z1, ...r); seg(ATRIUM.x1, ATRIUM.z0, ATRIUM.x1, ATRIUM.z1, ...r); }
  // stairs: sides of each flight, and the low space under them on level 1
  seg(ST1.x0 - 0.04, ST1.zTop, ST1.x0 - 0.04, ST1.zBottom, l1 - 0.3, l2 + 1.2);
  seg((ST1.x1 + ST2.x0) / 2, ST2.zBottom, (ST1.x1 + ST2.x0) / 2, ST1.zBottom, l1 - 0.3, l3 + 1.2, 0.06);
  seg(ST2.x1 + 0.04, ST2.zBottom, ST2.x1 + 0.04, ST2.zTop, l2 - 0.3, l3 + 1.2);
  box(ST1.x0 - 0.05, ST2.x1 + 0.05, -CORE, 0.5, l1 - 0.3, l1 + 1.0); // ends where the flight is already >1.4 m up
  // core posts (all heights)
  for (const px of [-CORE, 0, CORE]) for (const pz of [-CORE, 0, CORE]) if (px || pz) seg(px, pz, px, pz, -2, 12, 0.3);
  // level-1 installations
  for (const p of SHADOW_PANELS) seg(p.x - 0.65, p.z, p.x + 0.65, p.z, l1 - 0.3, l1 + 2.5, 0.5);
  seg(-CORE + 0.1, -2.6, -CORE + 0.1, 2.6, l1 - 0.3, l1 + 2.8, 0.15); // cladding (west face)
  seg(1.9, -0.2, 1.9, 0.2, l1 - 0.3, l1 + 2.0, 0.35); // route totem
  box(-2.9, -1.3, -0.3, 0.3, l1 - 0.3, l1 + 0.5); // bench under the light well
  // level 2 / 3 installations
  seg(-2.4, CORE - 0.35, 2.3, CORE - 0.35, l2 - 0.3, l2 + 2.4, 0.4); // relations wall
  box(-3.4, -1.8, -3.5, -3.0, l2 - 0.3, l2 + 0.5); // bench level 2
  seg(VIEWER.x, VIEWER.z, VIEWER.x, VIEWER.z, l3 - 0.3, l3 + 1.6, 0.35);
  box(0.9, 2.7, 3.1, 3.55, l3 - 0.3, l3 + 0.5); // bench level 3
  return out;
}
