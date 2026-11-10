import * as THREE from 'three';
import { PALETTE } from '../lib/layout';
import { woodTexture } from '../lib/textures';

const geoCache = new Map<string, THREE.BufferGeometry>();

/** Box with world-scaled UVs whose U runs along the longest in-face dimension (timber grain). */
export function timberGeo(w: number, h: number, d: number) {
  const key = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}`;
  const hit = geoCache.get(key);
  if (hit) return hit;
  const g = new THREE.BoxGeometry(w, h, d);
  const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
  const sz = [w, h, d];
  const ofs = (w * 3.1 + h * 7.3 + d * 1.7) % 1;
  for (let i = 0; i < pos.count; i++) {
    const n = [Math.abs(nor.getX(i)), Math.abs(nor.getY(i)), Math.abs(nor.getZ(i))];
    const p = [pos.getX(i), pos.getY(i), pos.getZ(i)];
    const axes = n[0] > 0.5 ? [1, 2] : n[1] > 0.5 ? [0, 2] : [0, 1];
    const [a, b] = sz[axes[0]] >= sz[axes[1]] ? axes : [axes[1], axes[0]];
    uv.setXY(i, p[a] / 1.4 + ofs, p[b] / 0.35 + ofs * 3);
  }
  geoCache.set(key, g);
  return g;
}

function woodMat(color: string, seed: number, rough = 0.68) {
  const map = woodTexture(color, seed);
  return new THREE.MeshStandardMaterial({ map, roughness: rough, metalness: 0, color: '#ffffff' });
}

export const MAT = {
  wood: woodMat(PALETTE.wood, 7),
  woodWarm: woodMat('#a86c3e', 9, 0.6),
  woodDark: woodMat(PALETTE.woodDark, 12, 0.72),
  steel: new THREE.MeshStandardMaterial({ color: PALETTE.steel, metalness: 0.75, roughness: 0.38 }),
  alu: new THREE.MeshStandardMaterial({ color: '#8f948e', metalness: 0.85, roughness: 0.3 }),
  forest: new THREE.MeshStandardMaterial({ color: PALETTE.forest, roughness: 0.55, metalness: 0.15 }),
  olive: new THREE.MeshStandardMaterial({ color: PALETTE.olive, roughness: 0.55, metalness: 0.15 }),
  concrete: new THREE.MeshStandardMaterial({ color: '#8e8a80', roughness: 0.95 }),
  led: new THREE.MeshStandardMaterial({ color: '#3a2c1c', emissive: '#ffb45e', emissiveIntensity: 0 }),
  ledLime: new THREE.MeshStandardMaterial({ color: '#3c4220', emissive: PALETTE.lime, emissiveIntensity: 0 }),
  polycarb: new THREE.MeshPhysicalMaterial({ color: '#eef4f0', transparent: true, opacity: 0.12, roughness: 0.15, metalness: 0, depthWrite: false, side: THREE.DoubleSide }),
};

/** Materials whose emissiveIntensity follows the night mix: [material, nightIntensity, dayIntensity]. */
export const NIGHT_EMISSIVE: [THREE.MeshStandardMaterial, number, number][] = [
  [MAT.led, 3.2, 0],
  [MAT.ledLime, 1.6, 0],
];
