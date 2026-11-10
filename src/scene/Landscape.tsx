import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { heightAt, lagoonD, LAGOON, PATH_PTS, PATH_WIDTH, pathCurve } from '../lib/terrain';
import { WATER_Y, RAMP, PALETTE } from '../lib/layout';
import { groundTexture, pathTexture, waterNormalTexture } from '../lib/textures';
import { env } from '../store';
import { PlankWalk } from './Tunnel';

export function Terrain() {
  const geo = useMemo(() => {
    const size = 200, seg = 220;
    const g = new THREE.PlaneGeometry(size, size, seg, seg);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const col = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    const grass = new THREE.Color('#7f9a52'), dry = new THREE.Color('#a39a68'), mud = new THREE.Color('#5a4a34'), deep = new THREE.Color('#3a3326');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = heightAt(x, z);
      pos.setY(i, h);
      const d = lagoonD(x, z);
      c.copy(grass).lerp(dry, Math.max(0, Math.min(1, (Math.sin(x * 0.11) * Math.cos(z * 0.13) + 0.6) * 0.35)));
      const wet = THREE.MathUtils.smoothstep(h, WATER_Y + 0.35, WATER_Y - 0.05);
      c.lerp(mud, wet * 0.85);
      if (h < WATER_Y - 0.1) c.lerp(deep, 0.8);
      void d;
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  const map = groundTexture();
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial map={map} vertexColors roughness={0.95} metalness={0} />
    </mesh>
  );
}

export function Lagoon() {
  const normal = waterNormalTexture();
  const mat = useRef<any>(null);
  useFrame((_, dt) => {
    normal.offset.x += dt * 0.004;
    normal.offset.y += dt * 0.0025;
    if (mat.current) {
      const m = env.nightMix;
      mat.current.color.set('#3c5a4c').lerp(new THREE.Color('#1a2a3a'), m);
      mat.current.mixStrength = 2.4 + m * 2.5;
    }
  });
  return (
    <mesh rotation-x={-Math.PI / 2} position={[LAGOON.cx, WATER_Y, LAGOON.cz + 2]}>
      <planeGeometry args={[LAGOON.rx * 2 + 24, LAGOON.rz * 2 + 24]} />
      <MeshReflectorMaterial
        ref={mat}
        resolution={512}
        mirror={0.85}
        mixBlur={0.6}
        blur={[80, 30]}
        mixStrength={2.4}
        mixContrast={1}
        depthScale={0}
        minDepthThreshold={0.9}
        maxDepthThreshold={1}
        roughness={0.12}
        metalness={0.1}
        color="#3c5a4c"
        normalMap={normal}
        normalScale={new THREE.Vector2(0.16, 0.16)}
        distortion={0.12}
        distortionMap={normal}
      />
    </mesh>
  );
}

const PATH_LEN = pathCurve.getLength();
const pathAt = (s: number) => {
  const u = Math.min(1, Math.max(0, s / PATH_LEN));
  const p = pathCurve.getPointAt(u), t = pathCurve.getTangentAt(u).setY(0).normalize();
  return { p, t, r: new THREE.Vector3(-t.z, 0, t.x) };
};
const pathWidth = () => PATH_WIDTH + 0.3;
/** The eco path to the deck, in timber planks like the tunnel and the stepped zone. */
export function EcoPath() {
  if (PATH_LEN < 2) return null; // the tower ramp now continues straight from the deck ramp
  return (
    <group>
      <PlankWalk at={pathAt} length={PATH_LEN} width={pathWidth} name="Sendero_tablones" />
      <PathBollards />
    </group>
  );
}

function PathBollards() {
  const items = useMemo(() => {
    const out: { p: THREE.Vector3; side: number }[] = [];
    for (let k = 0; k < 9; k++) {
      const t = 0.012 + k * 0.045;
      const p = pathCurve.getPointAt(t);
      const tan = pathCurve.getTangentAt(t);
      const side = k % 2 ? 1 : -1;
      const nx = -tan.z, nz = tan.x, l = Math.hypot(nx, nz) || 1;
      const x = p.x + (nx / l) * side * (PATH_WIDTH / 2 + 0.3), z = p.z + (nz / l) * side * (PATH_WIDTH / 2 + 0.3);
      out.push({ p: new THREE.Vector3(x, heightAt(x, z), z), side });
    }
    return out;
  }, []);
  const glow = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2a22', emissive: '#ffc27a', emissiveIntensity: 0 }), []);
  useFrame(() => { glow.emissiveIntensity = env.nightMix * 2.2; });
  return (
    <group>
      {items.map(({ p }, i) => (
        <group key={i} position={p}>
          <mesh position={[0, 0.3, 0]} castShadow>
            <boxGeometry args={[0.12, 0.6, 0.12]} />
            <meshStandardMaterial color={PALETTE.forest} roughness={0.6} metalness={0.3} />
          </mesh>
          {/* downward-facing low-level light slot */}
          <mesh position={[0, 0.5, 0]} material={glow}>
            <boxGeometry args={[0.125, 0.04, 0.125]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
