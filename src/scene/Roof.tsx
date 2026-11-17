import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PALETTE, ROOF_X_LINES, ROOF_Y, ROOF_Z_LINES } from '../lib/layout';
import { BayTheme, composeBay } from '../lib/shapes';
import { env } from '../store';
import { woodTexture } from '../lib/textures';

// Cut-out timber ceiling panels (no metal, no paint): real cut-outs that cast botanical shadows.
// Three natural wood tones alternate so the grid still reads as a canopy.
const LIGHT = '#c49a62', MID = PALETTE.wood, DARK = '#7d5230';
const COLORS = [
  [MID, LIGHT, DARK, MID],
  [LIGHT, DARK, MID, LIGHT],
  [DARK, MID, LIGHT, DARK],
];
const THEMES: BayTheme[][] = [
  ['hojas', 'aves', 'hojas', 'mixto'],
  ['mixto', 'hojas', 'aves', 'hojas'],
  ['hojas', 'mixto', 'hojas', 'aves'],
];

export function Roof() {
  const bays = useMemo(() => {
    const out: { geo: THREE.BufferGeometry; x: number; z: number; color: string }[] = [];
    for (let j = 0; j < ROOF_Z_LINES.length - 1; j++) {
      for (let i = 0; i < ROOF_X_LINES.length - 1; i++) {
        const x0 = ROOF_X_LINES[i] + 0.035, x1 = ROOF_X_LINES[i + 1] - 0.035;
        const z0 = ROOF_Z_LINES[j] + 0.035, z1 = ROOF_Z_LINES[j + 1] - 0.035;
        const W = x1 - x0, H = z1 - z0;
        const holes = composeBay(1000 + j * 17 + i * 5, W, H, THEMES[j][i]);
        const shape = new THREE.Shape([
          new THREE.Vector2(-W / 2, -H / 2), new THREE.Vector2(W / 2, -H / 2), new THREE.Vector2(W / 2, H / 2), new THREE.Vector2(-W / 2, H / 2),
        ]);
        for (const p of holes) shape.holes.push(new THREE.Path(p.map(([x, y]) => new THREE.Vector2(x, y))));
        const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.018, bevelEnabled: false, curveSegments: 1 });
        // shape XY -> world XZ (shape +Y maps to world -Z), thickness downward
        geo.rotateX(Math.PI / 2);
        out.push({ geo, x: (x0 + x1) / 2, z: (z0 + z1) / 2, color: COLORS[j][i] });
      }
    }
    return out;
  }, []);
  const mats = useMemo(() => {
    const m = new Map<string, THREE.MeshStandardMaterial>();
    for (const b of bays) if (!m.has(b.color)) m.set(b.color, new THREE.MeshStandardMaterial({ map: woodTexture(b.color, 3 + m.size), roughness: 0.7, metalness: 0, side: THREE.DoubleSide, emissive: new THREE.Color('#ffb46b'), emissiveIntensity: 0 }));
    return m;
  }, [bays]);
  useFrame(() => mats.forEach((m) => { m.emissiveIntensity = env.nightMix * 0.16; }));
  return (
    <group name="Techo_perforado" position={[0, ROOF_Y + 0.012, 0]}>
      {bays.map((b, i) => (
        <mesh key={i} geometry={b.geo} material={mats.get(b.color)} position={[b.x, 0, b.z]} castShadow receiveShadow />
      ))}
    </group>
  );
}
