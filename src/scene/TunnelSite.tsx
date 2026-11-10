// What the tunnel looks onto from its stable-side windows: the cows in a fenced paddock (no building).
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { heightAt } from '../lib/terrain';
import { PADDOCK } from '../lib/tunnel';
import { cowTexture } from '../lib/tunnelTextures';
import { env } from '../store';
import { MAT } from './materials';
import { T } from './Deck';
import { Culms, type Culm } from './Tunnel';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const gy = (x: number, z: number) => heightAt(x, z);

// ---------------------------------------------------------------- cows
function Cow({ x, z, yaw, seed }: { x: number; z: number; yaw: number; seed: number }) {
  const head = useRef<THREE.Group>(null);
  const coat = useMemo(() => new THREE.MeshStandardMaterial({ map: cowTexture(seed), roughness: 0.8 }), [seed]);
  const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 0.7 }), []);
  const pink = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d8a49a', roughness: 0.7 }), []);
  const ph = seed * 1.7;
  useFrame(() => { if (head.current) head.current.rotation.x = 0.35 + Math.sin(env.elapsed * 0.6 + ph) * 0.25; });
  return (
    <group position={[x, gy(x, z), z]} rotation-y={yaw}>
      <mesh position={[0, 0.95, 0]} rotation-z={Math.PI / 2} material={coat} castShadow><capsuleGeometry args={[0.36, 0.95, 6, 12]} /></mesh>
      {[[-0.5, -0.2], [-0.5, 0.2], [0.5, -0.2], [0.5, 0.2]].map(([lx, lz]) => (
        <mesh key={`${lx}${lz}`} position={[lx, 0.35, lz]} material={coat} castShadow><cylinderGeometry args={[0.07, 0.06, 0.7, 8]} /></mesh>
      ))}
      <group ref={head} position={[0.85, 1.1, 0]}>
        <mesh position={[0.22, -0.05, 0]} material={coat} castShadow><boxGeometry args={[0.42, 0.3, 0.26]} /></mesh>
        <mesh position={[0.45, -0.1, 0]} material={pink}><boxGeometry args={[0.1, 0.18, 0.22]} /></mesh>
        {[-1, 1].map((s) => <mesh key={s} position={[0.08, 0.06, s * 0.18]} rotation-x={s * 0.6} material={dark}><boxGeometry args={[0.06, 0.04, 0.14]} /></mesh>)}
      </group>
      <mesh position={[-0.92, 0.75, 0]} rotation-z={-0.3} material={dark}><cylinderGeometry args={[0.02, 0.02, 0.6, 6]} /></mesh>
      <mesh position={[0, 0.55, 0]} material={pink}><sphereGeometry args={[0.12, 8, 6]} /></mesh>
    </group>
  );
}

// a small herd grazing across the pasture: some close to the tunnel windows, the rest spread out in loose groups
const COWS: { x: number; z: number; yaw: number }[] = [
  [-27.5, -14], [-29.5, -10.5], [-26.8, -33], [-30.5, -36.5], [-28, -4],
  [-41, -22], [-44, -25.5], [-39, -46], [-52, -12], [-55, -16],
  [-63, -38], [-66, -34.5], [-72, -8], [-78, -27],
].map(([x, z], i) => ({ x: Math.max(PADDOCK.x0 + 2, Math.min(PADDOCK.x1 - 2, x)), z: Math.max(PADDOCK.z0 + 2, Math.min(PADDOCK.z1 - 2, z)), yaw: (i * 2.39) % 6.28 }));

// ---------------------------------------------------------------- paddock (fences only), right beside the tunnel
export function Stable() {
  const { fence, posts } = useMemo(() => {
    const fence: Culm[] = [];
    const posts: [number, number][] = [];
    const c: [number, number][] = [[PADDOCK.x0, PADDOCK.z0], [PADDOCK.x1, PADDOCK.z0], [PADDOCK.x1, PADDOCK.z1], [PADDOCK.x0, PADDOCK.z1], [PADDOCK.x0, PADDOCK.z0]];
    for (let e = 0; e < 4; e++) {
      const [x1, z1] = c[e], [x2, z2] = c[e + 1];
      const L = Math.hypot(x2 - x1, z2 - z1), n = Math.ceil(L / 2);
      for (let k = 0; k < n; k++) {
        const ax = x1 + ((x2 - x1) * k) / n, az = z1 + ((z2 - z1) * k) / n, bx = x1 + ((x2 - x1) * (k + 1)) / n, bz = z1 + ((z2 - z1) * (k + 1)) / n;
        posts.push([ax, az]);
        for (const h of [0.5, 1.0, 1.4]) fence.push({ a: V(ax, gy(ax, az) + h, az), b: V(bx, gy(bx, bz) + h, bz), r: 0.035 });
      }
    }
    return { fence, posts };
  }, []);
  return (
    <group>
      <group name="Establo_corral">
        {posts.map(([x, z], i) => <T key={i} s={[0.1, 1.55, 0.1]} p={[x, gy(x, z) + 0.75, z]} m={MAT.woodWarm} />)}
        <Culms culms={fence} name="Establo_corral_cercas" />
      </group>
      <group name="Vacas">{COWS.map((c, i) => <Cow key={i} {...c} seed={i + 1} />)}</group>
    </group>
  );
}
