import * as THREE from 'three';
import { DECK, MOUND, RAMP, TOWER, WATER_Y } from './layout';
import { STEPS, TUNNEL_LEN, tunnelCurve, tunnelDist } from './tunnel';

// ---------------------------------------------------------------- noise
function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
function vnoise(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x: number, y: number, oct = 4) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f); f *= 2.03; a *= 0.5; }
  return s;
}
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

// ---------------------------------------------------------------- lagoon
// size and position as marked by the user on the site (blue area): a broad, almost rectangular pond; the deck sits on
// its edge and the entrance trail runs along its other side
export const LAGOON = { cx: 16, cz: -26, rx: 32, rz: 23 };
const LAGOON_P = 3; // superellipse exponent: rounded-rectangle outline

/** Normalised lagoon distance: <1 water, >1 land. */
export function lagoonD(x: number, z: number) {
  const dx = (x - LAGOON.cx) / LAGOON.rx, dz = (z - LAGOON.cz) / LAGOON.rz;
  const a = Math.atan2(dz, dx);
  const wob = 0.035 * Math.sin(3 * a + 1.3) + 0.025 * Math.sin(5 * a + 0.4) + 0.015 * Math.sin(9 * a + 2.1);
  return Math.pow(Math.abs(dx) ** LAGOON_P + Math.abs(dz) ** LAGOON_P, 1 / LAGOON_P) * (1 - wob);
}

// ---------------------------------------------------------------- ecological path
const PATH_CTRL = [
  new THREE.Vector3(-1.5, 0, RAMP.z1 - 0.05),
  new THREE.Vector3(TOWER.x, 0, TOWER.z - 10.0), // deck ramp → tower ramp, no path in between
];
export const pathCurve = new THREE.CatmullRomCurve3(PATH_CTRL, false, 'centripetal');
export const PATH_PTS: THREE.Vector3[] = pathCurve.getSpacedPoints(110);
export const PATH_WIDTH = 1.7;

export function pathDist(x: number, z: number) {
  let best = 1e9, bestT = 0;
  for (let i = 0; i < PATH_PTS.length - 1; i++) {
    const a = PATH_PTS[i], b = PATH_PTS[i + 1];
    const abx = b.x - a.x, abz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * abx + (z - a.z) * abz) / (abx * abx + abz * abz)));
    const px = a.x + abx * t, pz = a.z + abz * t;
    const d = Math.hypot(x - px, z - pz);
    if (d < best) { best = d; bestT = (i + t) / (PATH_PTS.length - 1); }
  }
  return { d: best, t: bestT };
}

// ---------------------------------------------------------------- height
function rawHeight(x: number, z: number) {
  const d = lagoonD(x, z);
  let h = 0.45 * (fbm(x * 0.045 + 3, z * 0.045 - 1) - 0.5) + 0.12 * Math.sin(x * 0.09) * Math.cos(z * 0.07);
  const r = Math.hypot(x - 4, z + 8);
  // CIAT Palmira is flat valley floor: no rim of hills; the edge of the modelled site fades to 0 to meet the plan context
  h *= 1 - smoothstep(78, 97, Math.max(Math.abs(x), Math.abs(z)));
  void r;
  // flatten the deck surroundings
  const dd = Math.max(0, Math.max(DECK.x0 - x, x - DECK.x1), Math.max(DECK.z0 - z, z - DECK.z1));
  h = mix(MOUND + 0.02, h, smoothstep(2.5, 9, dd)); // low mound under the deck
  // lagoon basin
  const shore = smoothstep(0.88, 1.03, d);
  const basin = WATER_Y - 0.28 - 1.6 * smoothstep(0.96, 0.45, d);
  return mix(basin, h, shore);
}

// Baked heightfield for fast queries
const EXT = 100, RES = 0.5, N = Math.round((EXT * 2) / RES) + 1;
const HF = new Float32Array(N * N);
(() => {
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const x = -EXT + i * RES, z = -EXT + j * RES;
      let h = rawHeight(x, z);
      if (Math.abs(x) < 30 && z > 0 && z < 60) {
        const pd = pathDist(x, z);
        if (pd.d < 4) {
          const p = pathCurve.getPointAt(Math.min(1, pd.t));
          const hc = Math.max(rawHeight(p.x, p.z), WATER_Y + 0.25);
          h = mix(hc, h, smoothstep(PATH_WIDTH * 0.55, 3.6, pd.d));
        }
      }
      // level a 5 m band under the guadua tunnel
      if (x > -32 && x < 0 && z > -70 && z < 19) {
        const td = tunnelDist(x, z);
        if (td.d < 5.5) {
          const c = tunnelCurve.getPointAt(Math.min(1, td.s / TUNNEL_LEN));
          const hc = Math.max(rawHeight(c.x, c.z), WATER_Y + 0.3);
          h = mix(hc, h, smoothstep(2.4, 5.5, td.d));
        }
      }
      // level the tower site (level-1 platform, ramp and a margin around them)
      {
        const ox = Math.max(TOWER.x - 6 - x, x - TOWER.x - 6, 0), oz = Math.max(TOWER.z - 5.5 - z, z - TOWER.z - 9.5, 0), od = Math.hypot(ox, oz);
        if (od < 4) h = mix(rawHeight(TOWER.x, TOWER.z), h, smoothstep(0, 4, od));
      }
      // stepped zone: an even slope from the tunnel exit up to the foot of the deck ramp
      {
        const ox = Math.max(STEPS.x0 - x, x - STEPS.x1, 0), oz = Math.max(STEPS.z0 - z, z - STEPS.z1, 0), od = Math.hypot(ox, oz);
        if (od < 2) {
          const zm = (STEPS.z0 + STEPS.z1) / 2;
          const hw = Math.max(rawHeight(STEPS.x0 - 1, zm), WATER_Y + 0.3), he = rawHeight(-1.5, RAMP.z1 + 0.3);
          const k = Math.min(1, Math.max(0, (x - STEPS.x0) / (STEPS.x1 - STEPS.x0)));
          h = mix(hw + (he - hw) * k - 0.03, h, smoothstep(0.3, 2, od));
        }
      }
      HF[j * N + i] = h;
    }
  }
})();

export function heightAt(x: number, z: number) {
  const fx = (x + EXT) / RES, fz = (z + EXT) / RES;
  const i = Math.max(0, Math.min(N - 2, Math.floor(fx))), j = Math.max(0, Math.min(N - 2, Math.floor(fz)));
  const tx = Math.min(1, Math.max(0, fx - i)), tz = Math.min(1, Math.max(0, fz - j));
  const a = HF[j * N + i], b = HF[j * N + i + 1], c = HF[(j + 1) * N + i], d = HF[(j + 1) * N + i + 1];
  return mix(mix(a, b, tx), mix(c, d, tx), tz);
}

export const isWater = (x: number, z: number) => heightAt(x, z) < WATER_Y + 0.02;
export { smoothstep, mix, hash };
