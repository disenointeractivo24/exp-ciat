import * as THREE from 'three';
import ctx from '../data/ciatContext.json';

// The scene is rotated to sit on the real CIAT plan (see scene/CiatContext.tsx). Real east / south in scene axes:
const ROT = (-ctx.rotationDeg * Math.PI) / 180; // plan → scene rotation
const EAST = new THREE.Vector2(Math.cos(ROT), -Math.sin(ROT)); // scene (x, z) of plan (1, 0)
const SOUTH = new THREE.Vector2(Math.sin(ROT), Math.cos(ROT)); // scene (x, z) of plan (0, -1)
/** Real compass north in scene coordinates (x, z). */
export const NORTH = new THREE.Vector2(-SOUTH.x, -SOUTH.y);

/** Sun path over Palmira (3.5°N): rises in the real east, passes slightly to the south, sets in the west. */
export function sunDirAt(time: number, out = new THREE.Vector3()) {
  const th = ((Math.min(17.8, Math.max(6.2, time)) - 6) / 12) * Math.PI;
  const e = Math.cos(th), s = 0.36 * Math.sin(th) + 0.04;
  return out.set(e * EAST.x + s * SOUTH.x, Math.sin(th) * 0.93, e * EAST.y + s * SOUTH.y).normalize();
}
