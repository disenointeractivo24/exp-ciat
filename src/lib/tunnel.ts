// Guadua tunnel: route, cross-section and what happens along it. Pure data (no terrain import, to avoid cycles).
import * as THREE from 'three';
import { TOWER } from './layout';

export const TUNNEL_W = 3.0; // clear width (m) — square section
export const TUNNEL_H = 3.0; // clear height (m)
export const BAY = 1.6; // frame spacing (m)

// Starts at the far (north) end, runs south along the west shore (lagoon on the LEFT, cow stable on the RIGHT),
// turns east and opens gradually into the low stepped zone that climbs the mound to the deck.
// entrance next to the south road (user's pink mark), straight along the lagoon's west side, then the turn to the deck
const CTRL: [number, number][] = [
  [-20.6, -61.6], [-20.8, -51], [-21.1, -40], [-21.3, -28], [-21.3, -16], [-21.1, -5], [-20.9, 2.5], [-20.2, 6.4], [-17.8, 8.6], [-14.5, 9.0],
];
export const tunnelCurve = new THREE.CatmullRomCurve3(CTRL.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
export const TUNNEL_LEN = tunnelCurve.getLength();
const STEP = 0.5;
export const TUNNEL_SAMPLES = tunnelCurve.getSpacedPoints(Math.ceil(TUNNEL_LEN / STEP));

/** Position / tangent / right vector at arc length s (right = stable side, left = lagoon side). */
export const LAGOON_SIDE = -1 as const;
export function frameAt(s: number) {
  const u = Math.min(1, Math.max(0, s / TUNNEL_LEN));
  const p = tunnelCurve.getPointAt(u);
  const t = tunnelCurve.getTangentAt(u).setY(0).normalize();
  const r = new THREE.Vector3(-t.z, 0, t.x);
  return { p, t, r };
}

/** Nearest point on the centreline: distance, arc length, signed side (+ right). */
export function tunnelDist(x: number, z: number) {
  let best = 1e9, bs = 0, side = 1;
  const P = TUNNEL_SAMPLES;
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], b = P[i + 1];
    const abx = b.x - a.x, abz = b.z - a.z;
    const L2 = abx * abx + abz * abz;
    const k = Math.max(0, Math.min(1, ((x - a.x) * abx + (z - a.z) * abz) / L2));
    const px = a.x + abx * k, pz = a.z + abz * k;
    const d = Math.hypot(x - px, z - pz);
    if (d < best) { best = d; bs = (i + k) * (TUNNEL_LEN / (P.length - 1)); side = Math.sign(abx * (z - a.z) - abz * (x - a.x)) || 1; }
  }
  return { d: best, s: bs, side };
}

const sstep = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** 0 inside the tunnel → 1 where it has fully opened, arriving at the deck. */
export const OPEN_FROM = TUNNEL_LEN - 13;
export const openness = (s: number) => sstep(OPEN_FROM, TUNNEL_LEN, s);
/** The section flares as it opens. */
export const widthAt = (s: number) => TUNNEL_W + 2.6 * openness(s) ** 2;


// Cow stable west of the north stretch, paddock between it and the tunnel, crop fields beyond.
// Cows to the north-west, as marked on the site plan: paddock facing the tunnel, stable behind it.
/** Cow paddock (user's red mark): the whole pasture west of the tunnel, fences only; its east fence runs right beside
 *  the tunnel, from near the south road up to the deck's latitude. */
export const PADDOCK = { x0: -94, x1: -23.4, z0: -59.5, z1: 7 };
/** Distance from a point to the paddock's fence line. */
export function fenceDist(x: number, z: number) {
  const inside = x > PADDOCK.x0 && x < PADDOCK.x1 && z > PADDOCK.z0 && z < PADDOCK.z1;
  if (inside) return Math.min(x - PADDOCK.x0, PADDOCK.x1 - x, z - PADDOCK.z0, PADDOCK.z1 - z);
  return Math.hypot(Math.max(PADDOCK.x0 - x, 0, x - PADDOCK.x1), Math.max(PADDOCK.z0 - z, 0, z - PADDOCK.z1));
}
/** Low stepped zone (gradas bajas) from the tunnel exit up the mound to the deck ramp and the boardwalk. */
export const STEPS = { x0: -14.5, x1: -2.5, z0: 6.4, z1: 11.6, n: 7 };
export const FIELDS = { x0: -55, x1: -43, z0: -20, z1: -10 };

export const NBAYS = Math.floor(TUNNEL_LEN / BAY);

/** Arc length of the bay closest to a world point (used to place things facing the stable). */
export function bayNear(x: number, z: number) {
  return Math.min(NBAYS - 1, Math.max(0, Math.floor(tunnelDist(x, z).s / BAY)));
}

export type BayKind = 'open' | 'windows' | 'info' | 'prism';
const STABLE_BAY = bayNear(PADDOCK.x1, (PADDOCK.z0 + PADDOCK.z1) / 2);
/** Bays (index) with rotating prisms on the lagoon side. */
export const PRISM_BAYS = [0.3, 0.62].map((f) => Math.round(f * (NBAYS - 9))); // one per bird of the official panels (urutau, garza)

/** What fills each side of each bay: open bamboo rails, a lattice panel with windows, the stable panel, or a prism. */
export function bayKind(i: number, side: 1 | -1): BayKind {
  const s = (i + 0.5) * BAY;
  if (s > OPEN_FROM - 1 || i === 0) return 'open';
  if (side === LAGOON_SIDE) {
    if (PRISM_BAYS.includes(i)) return 'prism';
    return i % 3 === 1 ? 'windows' : 'open';
  }
  if (i === STABLE_BAY) return 'info';
  if (Math.abs(i - STABLE_BAY) <= 4) return i % 2 === 0 ? 'windows' : 'open';
  return i % 3 === 0 ? 'windows' : 'open';
}
/** Roof: perforated flora panel on alternate bays, bamboo purlins only on the others. */
export const roofPanel = (i: number) => i % 2 === 0 && (i + 0.5) * BAY < OPEN_FROM;

export { TOWER };
