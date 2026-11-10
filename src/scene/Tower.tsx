// Three-level biodiversity observation tower: "Elevar la mirada, conectar la vida."
// Timber frame with galvanised connector plates, exterior stair with mesh guards, a central light well under a
// perforated roof, and environmental graphics on every level.
// L1 Descubrir (shadow garden, by ramp) · L2 Conectar (relations wall) · L3 Elevar (anamorphic + viewer).
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { EYE, PALETTE } from '../lib/layout';
import { beanLeaf, cassavaLeaf, composeFlora, grassClump, type Poly } from '../lib/shapes';
import { heightAt } from '../lib/terrain';
import { ANA_EYE, ATRIUM, B, CORE, L1, LAND2, LAND3, LAND3B, LEVEL, RAMPT, SHADOW_PANELS, ST1, ST2, STAIR_N, T, VIEWER, levelOf } from '../lib/tower';
import { ELEMENTS, RELATIONS, anamorphicTexture, exitWallTexture, eyeMarkTexture, layerTexture, orientationTexture, relationStripTexture, shadowWallTexture, type ElementId } from '../lib/towerTextures';
import { PLANT_INFO, claddingTexture, meshTexture, railGraphicTexture, shadowTargetTexture, totemDiscTexture } from '../lib/towerGraphics';
import { SIGNAGE, signTex } from '../lib/signage';
import { useInteractable } from '../lib/interact';
import { sound } from '../lib/audio';
import { HERONS } from '../lib/vegData';
import { env, useStore } from '../store';
import { MAT } from './materials';
import { T as Tb } from './Deck';

const LIME = new THREE.Color(PALETTE.lime);
type V3 = [number, number, number];
const GALV = new THREE.MeshStandardMaterial({ color: '#b8bcb6', metalness: 0.85, roughness: 0.35 });
const STEEL_G = new THREE.MeshStandardMaterial({ color: '#2e3b33', metalness: 0.6, roughness: 0.45 });

function useGlow(id: string, mat: THREE.MeshStandardMaterial) {
  useFrame(() => {
    const h = useStore.getState().hovered === id;
    mat.emissive.copy(LIME); mat.emissiveIntensity = h ? 0.12 + Math.sin(env.elapsed * 5) * 0.05 : 0;
  });
}

// ---------------------------------------------------------------- shared materials for railing infill
let meshMat: THREE.MeshStandardMaterial | null = null;
function getMeshMat() {
  if (!meshMat) meshMat = new THREE.MeshStandardMaterial({ map: meshTexture(), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.4 });
  return meshMat;
}
const railGraphicMats = new Map<number, THREE.MeshStandardMaterial>();
function getGraphicMat(k: number) {
  if (!railGraphicMats.has(k)) { const t = railGraphicTexture(k); railGraphicMats.set(k, new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0, roughness: 0.55, side: THREE.DoubleSide })); }
  return railGraphicMats.get(k)!;
}
function NightGraphics() {
  useFrame(() => { railGraphicMats.forEach((m) => { m.emissiveIntensity = env.nightMix * 0.22; }); });
  return null;
}

/** Railing: dark steel posts and frame, timber handrail, bays alternating welded mesh and green graphic panels. */
function Railing({ a, b, y, h = 1.1, graphics = 0.5, seed = 0 }: { a: [number, number]; b: [number, number]; y: number; h?: number; graphics?: number; seed?: number }) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const rot = Math.atan2(-(b[1] - a[1]), b[0] - a[0]);
  const n = Math.max(1, Math.round(len / 1.25));
  const bw = len / n;
  const mesh = getMeshMat();
  return (
    <group position={[(a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2]} rotation-y={rot}>
      {Array.from({ length: n + 1 }, (_, i) => -len / 2 + i * bw).map((x) => <mesh key={'p' + x} position={[x, h / 2, 0]} material={STEEL_G} castShadow><boxGeometry args={[0.05, h, 0.05]} /></mesh>)}
      <Tb s={[len + 0.06, 0.05, 0.12]} p={[0, h + 0.025, 0]} m={MAT.woodWarm} />
      <mesh position={[0, 0.1, 0]} material={STEEL_G}><boxGeometry args={[len, 0.04, 0.04]} /></mesh>
      <mesh position={[0, h - 0.04, 0]} material={STEEL_G}><boxGeometry args={[len, 0.04, 0.04]} /></mesh>
      {Array.from({ length: n }, (_, i) => {
        const cx = -len / 2 + (i + 0.5) * bw;
        const g = ((i * 7 + seed * 3) % 10) / 10 < graphics;
        return g
          ? <mesh key={i} position={[cx, (h + 0.06) / 2, 0]} material={getGraphicMat((i + seed) % 6)} castShadow><planeGeometry args={[bw - 0.08, h - 0.2]} /></mesh>
          : <mesh key={i} position={[cx, (h + 0.06) / 2, 0]} material={mesh} castShadow><planeGeometry args={[bw - 0.06, h - 0.18]} /></mesh>;
      })}
      <mesh position={[0, h - 0.02, 0.07]} material={MAT.led}><boxGeometry args={[len - 0.1, 0.01, 0.015]} /></mesh>
    </group>
  );
}

/** One straight stair flight: timber treads on steel stringers, mesh guards and handrails on both sides. */
function Flight({ x0, x1, zBottom, zTop, y0, y1, seed }: { x0: number; x1: number; zBottom: number; zTop: number; y0: number; y1: number; seed: number }) {
  const run = (zTop - zBottom) / STAIR_N, rise = (y1 - y0) / STAIR_N;
  const L = Math.hypot(zTop - zBottom, y1 - y0);
  const ang = Math.atan2(y1 - y0, Math.abs(zTop - zBottom)) * Math.sign(zBottom - zTop);
  const W = x1 - x0, x = (x0 + x1) / 2, zc = (zBottom + zTop) / 2, yc = (y0 + y1) / 2;
  const mesh = getMeshMat();
  return (
    <group name={`Torre_escalera_${seed}`}>
      {Array.from({ length: STAIR_N }, (_, k) => (
        <Tb key={k} s={[W - 0.08, 0.05, Math.abs(run) + 0.03]} p={[x, y0 + (k + 1) * rise - 0.025, zBottom + (k + 0.5) * run]} m={MAT.wood} />
      ))}
      {[x0, x1].map((sx, i) => (
        <group key={sx} position={[sx, yc, zc]} rotation-x={ang}>
          <mesh position={[0, -0.12, 0]} material={STEEL_G} castShadow><boxGeometry args={[0.04, 0.26, L]} /></mesh>
          <mesh position={[0, 0.5, 0]} rotation-y={Math.PI / 2} material={i === 1 && seed === 1 ? getGraphicMat(3) : mesh}><planeGeometry args={[L, 0.8]} /></mesh>
          <mesh position={[0, 0.93, 0]} material={MAT.woodWarm} castShadow><boxGeometry args={[0.06, 0.05, L]} /></mesh>
          <mesh position={[0, 0.03, 0]} material={MAT.ledLime}><boxGeometry args={[0.012, 0.012, L - 0.2]} /></mesh>
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- structure
function Structure() {
  const { l1, l2, l3, roof } = LEVEL;
  // perforated roof: four coloured bays of radial cassava-leaf cut-outs under a clear polycarbonate cover
  const roofBays = useMemo(() => {
    const W = CORE, out: { geo: THREE.BufferGeometry; x: number; z: number; color: string }[] = [];
    const colors = [PALETTE.lime, PALETTE.olive, '#9DBE5A', PALETTE.forest];
    let k = 0;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const shape = new THREE.Shape([new THREE.Vector2(-W / 2, -W / 2), new THREE.Vector2(W / 2, -W / 2), new THREE.Vector2(W / 2, W / 2), new THREE.Vector2(-W / 2, W / 2)]);
      for (const p of composeFlora(940 + k * 11, W - 0.05, W - 0.05, [], 1.4, [cassavaLeaf]) as Poly[]) shape.holes.push(new THREE.Path(p.map(([x, y]) => new THREE.Vector2(x, y))));
      const g = new THREE.ExtrudeGeometry(shape, { depth: 0.01, bevelEnabled: false, curveSegments: 2 });
      g.rotateX(Math.PI / 2);
      out.push({ geo: g, x: (sx * W) / 2, z: (sz * W) / 2, color: colors[k++] });
    }
    return out;
  }, []);
  const roofMats = useMemo(() => new Map(roofBays.map((r) => [r.color, new THREE.MeshStandardMaterial({ color: r.color, roughness: 0.55, metalness: 0.2, side: THREE.DoubleSide })])), [roofBays]);
  const posts: [number, number][] = [];
  for (const px of [-CORE, 0, CORE]) for (const pz of [-CORE, 0, CORE]) if (px || pz) posts.push([px, pz]);
  const stairPosts: [number, number][] = [[ST2.x1 + 0.05, -CORE], [ST2.x1 + 0.05, -2.0], [ST2.x1 + 0.05, ST2.zTop], [ST2.x1 + 0.05, LAND3.z1], [CORE + 0.05, LAND3.z1]];
  const braces: { a: V3; b: V3 }[] = [];
  for (const sx of [-CORE]) for (const [ya, yb] of [[l1, l2], [l2, l3]]) for (const [za, zb] of [[-CORE, 0], [0, CORE]]) braces.push({ a: [sx, ya, za], b: [sx, yb, zb] }, { a: [sx, ya, zb], b: [sx, yb, za] });
  const slab = (x0: number, x1: number, z0: number, z1: number, y: number, k: string) => <Tb key={k} s={[x1 - x0, 0.18, z1 - z0]} p={[(x0 + x1) / 2, y - 0.09, (z0 + z1) / 2]} m={MAT.wood} />;
  // floor of a level with the light well cut out
  const levelSlab = (y: number) => [
    slab(-CORE, CORE, -CORE, ATRIUM.z0, y, 'n' + y), slab(-CORE, CORE, ATRIUM.z1, CORE, y, 's' + y),
    slab(-CORE, ATRIUM.x0, ATRIUM.z0, ATRIUM.z1, y, 'w' + y), slab(ATRIUM.x1, CORE, ATRIUM.z0, ATRIUM.z1, y, 'e' + y),
  ];
  return (
    <group name="Torre_estructura">
      {posts.map(([x, z]) => <Tb key={`${x}${z}`} s={[0.26, roof + 0.3, 0.26]} p={[x, (roof - 0.3) / 2, z]} m={MAT.woodWarm} />)}
      {stairPosts.map(([x, z]) => <Tb key={`s${x}${z}`} s={[0.2, l3 + 1.2, 0.2]} p={[x, (l3 + 1.2) / 2 - 0.15, z]} m={MAT.woodWarm} />)}
      {/* galvanised steel connector plates where beams meet posts */}
      {posts.flatMap(([x, z]) => [l1, l2, l3, roof].map((y) => (
        <mesh key={`g${x}${z}${y}`} position={[x, y - 0.25, z]} material={GALV} castShadow><boxGeometry args={[0.34, 0.42, 0.34]} /></mesh>
      )))}
      {/* level 1 platform on short piers */}
      <Tb s={[L1.x1 - L1.x0, 0.14, L1.z1 - L1.z0]} p={[(L1.x0 + L1.x1) / 2, l1 - 0.07, (L1.z0 + L1.z1) / 2]} m={MAT.wood} />
      {[L1.x0 + 0.1, 0, CORE, L1.x1 - 0.1].flatMap((x) => [L1.z0 + 0.1, 2, L1.z1 - 0.1].map((z) => <Tb key={`p${x}${z}`} s={[0.18, l1 + 0.3, 0.18]} p={[x, (l1 - 0.3) / 2, z]} m={MAT.woodDark} />))}
      {levelSlab(l2)}
      {levelSlab(l3)}
      {slab(LAND2.x0, LAND2.x1, LAND2.z0, LAND2.z1, l2, 'land2')}
      {slab(LAND3.x0, LAND3.x1, LAND3.z0, LAND3.z1, l3, 'land3')}
      {slab(LAND3B.x0, LAND3B.x1, LAND3B.z0, LAND3B.z1, l3, 'land3b')}
      {[l2, l3, roof].map((y) => (
        <group key={y}>
          {[-CORE, ATRIUM.z0, ATRIUM.z1, CORE].map((z) => <Tb key={'bz' + z} s={[2 * CORE + 0.3, 0.3, 0.16]} p={[0, y - 0.33, z]} m={MAT.woodWarm} />)}
          {[-CORE, ATRIUM.x0, ATRIUM.x1, CORE].map((x) => <Tb key={'bx' + x} s={[0.16, 0.3, 2 * CORE]} p={[x, y - 0.33, 0]} m={MAT.woodWarm} />)}
        </group>
      ))}
      {braces.map(({ a, b }, i) => {
        const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), d = vb.clone().sub(va);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
        return <mesh key={i} position={va.clone().add(vb).multiplyScalar(0.5)} quaternion={q} material={GALV}><cylinderGeometry args={[0.016, 0.016, d.length(), 6]} /></mesh>;
      })}
      {/* exterior stair on the east side */}
      <Flight x0={ST1.x0} x1={ST1.x1} zBottom={ST1.zBottom} zTop={ST1.zTop} y0={l1} y1={l2} seed={0} />
      <Flight x0={ST2.x0} x1={ST2.x1} zBottom={ST2.zBottom} zTop={ST2.zTop} y0={l2} y1={l3} seed={1} />
      {/* railings: level 1 perimeter, levels 2-3 perimeters, landings, light well */}
      <Railing a={[L1.x0, L1.z0]} b={[RAMPT.x0, L1.z0]} y={l1} h={1.0} graphics={0.3} seed={1} />
      <Railing a={[RAMPT.x1, L1.z0]} b={[L1.x1, L1.z0]} y={l1} h={1.0} graphics={0.3} seed={2} />
      <Railing a={[L1.x0, L1.z0]} b={[L1.x0, L1.z1]} y={l1} h={1.0} graphics={0.4} seed={3} />
      <Railing a={[L1.x1, L1.z0]} b={[L1.x1, L1.z1]} y={l1} h={1.0} graphics={0.3} seed={4} />
      <Railing a={[L1.x0, L1.z1]} b={[L1.x1, L1.z1]} y={l1} h={1.0} graphics={0.2} seed={5} />
      <Railing a={[-CORE, -CORE]} b={[CORE, -CORE]} y={l2} graphics={0.6} seed={0} />
      <Railing a={[-CORE, CORE]} b={[CORE, CORE]} y={l2} graphics={0.5} seed={1} />
      <Railing a={[-CORE, -CORE]} b={[-CORE, CORE]} y={l2} graphics={0.6} seed={2} />
      <Railing a={[CORE, LAND2.z1]} b={[CORE, CORE]} y={l2} graphics={0.4} seed={3} />
      <Railing a={[LAND2.x0, LAND2.z0]} b={[LAND2.x1, LAND2.z0]} y={l2} graphics={0.5} seed={4} />
      <Railing a={[LAND2.x1, LAND2.z0]} b={[LAND2.x1, LAND2.z1]} y={l2} graphics={0} seed={5} />
      <Railing a={[-CORE, -CORE]} b={[CORE, -CORE]} y={l3} graphics={0.4} seed={3} />
      <Railing a={[-CORE, CORE]} b={[CORE, CORE]} y={l3} graphics={0.4} seed={4} />
      <Railing a={[-CORE, -CORE]} b={[-CORE, CORE]} y={l3} graphics={0.4} seed={5} />
      <Railing a={[CORE, -CORE]} b={[CORE, LAND3B.z0]} y={l3} graphics={0.3} seed={0} />
      <Railing a={[LAND3.x0, LAND3.z1]} b={[LAND3.x1, LAND3.z1]} y={l3} graphics={0.5} seed={1} />
      <Railing a={[LAND3.x1, LAND3.z0]} b={[LAND3.x1, LAND3.z1]} y={l3} graphics={0} seed={2} />
      <Railing a={[LAND3B.x0, LAND3B.z0]} b={[LAND3B.x1, LAND3B.z0]} y={l3} graphics={0} seed={3} />
      <Railing a={[LAND3B.x1, LAND3B.z0]} b={[LAND3B.x1, LAND3.z0]} y={l3} graphics={0} seed={4} />
      {[l2, l3].map((y) => (
        <group key={'atr' + y}>
          <Railing a={[ATRIUM.x0, ATRIUM.z0]} b={[ATRIUM.x1, ATRIUM.z0]} y={y} graphics={1} seed={y > 5 ? 2 : 0} />
          <Railing a={[ATRIUM.x0, ATRIUM.z1]} b={[ATRIUM.x1, ATRIUM.z1]} y={y} graphics={1} seed={y > 5 ? 3 : 1} />
          <Railing a={[ATRIUM.x0, ATRIUM.z0]} b={[ATRIUM.x0, ATRIUM.z1]} y={y} graphics={1} seed={y > 5 ? 4 : 2} />
          <Railing a={[ATRIUM.x1, ATRIUM.z0]} b={[ATRIUM.x1, ATRIUM.z1]} y={y} graphics={1} seed={y > 5 ? 5 : 3} />
        </group>
      ))}
      {/* roof: coloured perforated panels (light reaches level 1 through the light well) + clear cover + eaves */}
      {roofBays.map((r, i) => <mesh key={i} geometry={r.geo} material={roofMats.get(r.color)} position={[r.x, roof + 0.01, r.z]} castShadow receiveShadow />)}
      <mesh position={[0, roof + 0.32, 0]} rotation-x={-Math.PI / 2} material={MAT.polycarb}><planeGeometry args={[2 * CORE + 0.9, 2 * CORE + 0.9]} /></mesh>
      {[-1, 1].map((s) => <Tb key={'ez' + s} s={[2 * CORE + 0.9, 0.22, 0.06]} p={[0, roof + 0.2, s * (CORE + 0.45)]} m={MAT.woodDark} />)}
      {[-1, 1].map((s) => <Tb key={'ex' + s} s={[0.06, 0.22, 2 * CORE + 0.9]} p={[s * (CORE + 0.45), roof + 0.2, 0]} m={MAT.woodDark} />)}
      <Ramp />
      <NightGraphics />
    </group>
  );
}

function Ramp() {
  const b = B();
  const foot = heightAt(T.x, T.z + RAMPT.z0) - b;
  const L = RAMPT.z1 - RAMPT.z0, rise = LEVEL.l1 - foot, ang = Math.atan2(rise, L), len = Math.hypot(L, rise);
  const W = RAMPT.x1 - RAMPT.x0;
  return (
    <group name="Torre_rampa" position={[0, (LEVEL.l1 + foot) / 2, (RAMPT.z0 + RAMPT.z1) / 2]} rotation-x={-ang}>
      {Array.from({ length: Math.floor(len / 0.23) }, (_, i) => -len / 2 + 0.115 + i * 0.23).map((z) => <Tb key={z} s={[W, 0.05, 0.2]} p={[0, -0.025, z]} m={MAT.wood} />)}
      <Tb s={[W, 0.2, len]} p={[0, -0.16, 0]} m={MAT.woodDark} />
      {[-W / 2, W / 2].map((x) => (
        <group key={x}>
          <Tb s={[0.08, 0.1, len]} p={[x, 0.05, 0]} m={MAT.woodDark} />
          {[0.15, 0.5, 0.85].map((t) => <mesh key={t} position={[x, 0.47, -len / 2 + t * len]} rotation-x={ang} material={STEEL_G}><boxGeometry args={[0.05, 0.95, 0.05]} /></mesh>)}
          <Tb s={[0.07, 0.05, len]} p={[x, 0.92, 0]} m={MAT.woodWarm} />
          <mesh position={[x, 0.7, 0]} material={STEEL_G}><boxGeometry args={[0.035, 0.035, len]} /></mesh>
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- level 1: shadow garden
const MOTIF: Record<string, () => Poly[]> = { yuca: cassavaLeaf, frijol: beanLeaf, forraje: grassClump };

function ShadowPanel({ i }: { i: number }) {
  const P0 = SHADOW_PANELS[i];
  const id = `sombra-${i}` as 'sombra-0' | 'sombra-1' | 'sombra-2';
  const ref = useRef<THREE.Group>(null);
  const pivot = useRef<THREE.Group>(null);
  const spot = useRef<THREE.SpotLight>(null);
  const target = useRef(new THREE.Object3D());
  const angle = useRef(P0.target + (i % 2 ? 1.1 : -1.1));
  const goal = useRef(angle.current);
  const found = useRef(false);
  const geo = useMemo(() => {
    const W = 1.2, H = 2.0;
    const shape = new THREE.Shape([new THREE.Vector2(-W / 2, -H / 2), new THREE.Vector2(W / 2, -H / 2), new THREE.Vector2(W / 2, H / 2), new THREE.Vector2(-W / 2, H / 2)]);
    for (const p of composeFlora(610 + i * 17, W, H, [], 1.0, [MOTIF[P0.plant]])) shape.holes.push(new THREE.Path(p.map(([px, py]) => new THREE.Vector2(px, py))));
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false, curveSegments: 2 });
    g.translate(0, 0, -0.01);
    return g;
  }, [i, P0.plant]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: [PALETTE.forest, PALETTE.olive, '#2f5a45'][i], roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide }), [i]);
  const handle = useMemo(() => { const m = MAT.woodWarm.clone(); m.emissive = new THREE.Color(0); return m; }, []);
  const plate = useMemo(() => { const t = shadowTargetTexture(P0.plant); return new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.8, emissive: LIME.clone(), emissiveMap: t, emissiveIntensity: 0 }); }, [P0.plant]);
  useGlow(id, handle);
  const enterFocus = useStore((s) => s.enterFocus);
  const active = useStore((s) => s.mode === 'focus' && s.focus === id);
  const act = useCallback(() => {
    enterFocus(id);
    useStore.getState().setInfo(`Panel de ${PLANT_INFO[P0.plant].name.toLowerCase()}: gíralo (arrastra o ← →) hasta que su sombra llene el contorno grabado en el piso.`);
  }, [enterFocus, id, P0.plant]);
  useInteractable(id, `Girar el panel · ${PLANT_INFO[P0.plant].name}`, ref, act, 3);
  useEffect(() => {
    if (!active) return;
    let down = false, last = 0;
    const pd = (e: PointerEvent) => { down = true; last = e.clientX; };
    const pm = (e: PointerEvent) => { if (!down) return; goal.current += (e.clientX - last) * 0.006; last = e.clientX; };
    const pu = () => { if (down) sound.click(); down = false; };
    const kd = (e: KeyboardEvent) => { if (e.key === 'ArrowLeft') goal.current -= 0.18; if (e.key === 'ArrowRight') goal.current += 0.18; };
    window.addEventListener('pointerdown', pd); window.addEventListener('pointermove', pm); window.addEventListener('pointerup', pu); window.addEventListener('keydown', kd);
    return () => { window.removeEventListener('pointerdown', pd); window.removeEventListener('pointermove', pm); window.removeEventListener('pointerup', pu); window.removeEventListener('keydown', kd); };
  }, [active]);
  useEffect(() => { if (spot.current) spot.current.target = target.current; }, []);
  useFrame((_, dt) => {
    angle.current += (goal.current - angle.current) * (1 - Math.exp(-dt * 6));
    if (pivot.current) pivot.current.rotation.y = angle.current;
    if (spot.current) spot.current.intensity = env.nightMix * 26;
    const d = Math.abs(((angle.current - P0.target + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    const near = d < 0.12;
    plate.emissiveIntensity = near ? 0.55 + Math.sin(env.elapsed * 4) * 0.15 : 0;
    if (near && !found.current) {
      found.current = true;
      sound.chime();
      useStore.getState().showToast(PLANT_INFO[P0.plant].fact, `${PLANT_INFO[P0.plant].name} · la sombra encontró su forma`, 'success', 9000);
      useStore.getState().setInfo(`${PLANT_INFO[P0.plant].name}: ${PLANT_INFO[P0.plant].fact}`);
    }
    if (!near && d > 0.4) found.current = false;
  });
  return (
    <group ref={ref} name={`Torre_panel_sombra_${P0.plant}`} position={[P0.x, LEVEL.l1, P0.z]}>
      {/* fixed steel gate frame with the pivot bearings */}
      {[-0.75, 0.75].map((dx) => <mesh key={dx} position={[dx, 1.3, 0]} material={STEEL_G} castShadow><boxGeometry args={[0.06, 2.6, 0.06]} /></mesh>)}
      <mesh position={[0, 2.6, 0]} material={STEEL_G} castShadow><boxGeometry args={[1.56, 0.06, 0.06]} /></mesh>
      <mesh position={[0, 0.02, 0]} material={GALV}><cylinderGeometry args={[0.16, 0.18, 0.04, 20]} /></mesh>
      <group ref={pivot}>
        <mesh position={[0, 1.3, 0]} material={GALV}><cylinderGeometry args={[0.02, 0.02, 2.6, 8]} /></mesh>
        <mesh geometry={geo} material={mat} position={[0, 1.3, 0]} castShadow receiveShadow />
        {[-1, 1].map((sy) => <mesh key={sy} position={[0, 1.3 + sy * 1.0, 0]} material={STEEL_G}><boxGeometry args={[1.22, 0.03, 0.04]} /></mesh>)}
        <mesh position={[0.52, 1.0, 0.07]} material={handle} castShadow><boxGeometry args={[0.05, 0.45, 0.05]} /></mesh>
      </group>
      {/* engraved target where the shadow should land */}
      <mesh position={[0, 0.004, -1.75]} rotation-x={-Math.PI / 2} material={plate}><planeGeometry args={[1.0, 1.25]} /></mesh>
      {/* night: warm LED projector behind the panel, aimed through it at the terrace floor */}
      <group position={[0, 0, 0.75]}>
        <mesh position={[0, 0.45, 0]} material={STEEL_G}><boxGeometry args={[0.06, 0.9, 0.06]} /></mesh>
        <mesh position={[0, 0.95, 0]} rotation-x={0.5} material={STEEL_G}><cylinderGeometry args={[0.06, 0.07, 0.18, 12]} /></mesh>
        <spotLight ref={spot} position={[0, 1.05, -0.05]} angle={0.55} penumbra={0.45} decay={2} distance={8} color="#ffcf94" intensity={0} castShadow shadow-mapSize={[512, 512]} shadow-bias={-0.0005} />
      </group>
      <primitive object={target.current} position={[0, 0, -2.4]} />
    </group>
  );
}

function Level1() {
  const wall = useMemo(() => new THREE.MeshStandardMaterial({ map: shadowWallTexture(), roughness: 0.6, emissive: new THREE.Color('#ffffff'), emissiveMap: shadowWallTexture(), emissiveIntensity: 0 }), []);
  const exit = useMemo(() => new THREE.MeshStandardMaterial({ map: exitWallTexture(), roughness: 0.6, emissive: new THREE.Color('#ffffff'), emissiveMap: exitWallTexture(), emissiveIntensity: 0 }), []);
  const clad = useMemo(() => [0, 1, 2].map((k) => new THREE.MeshStandardMaterial({ map: claddingTexture(k), roughness: 0.6, emissive: new THREE.Color('#ffffff'), emissiveMap: claddingTexture(k), emissiveIntensity: 0 })), []);
  const discs = useMemo(() => [0, 1, 2].map((k) => new THREE.MeshStandardMaterial({ map: totemDiscTexture(k), roughness: 0.5 })), []);
  const totem = useMemo(() => new THREE.MeshStandardMaterial({ map: signTex(SIGNAGE.niveles[0]), roughness: 0.6, alphaTest: 0.5 }), []);
  useFrame(() => {
    const n = env.nightMix;
    wall.emissiveIntensity = n * 0.25; exit.emissiveIntensity = n * 0.3;
    clad.forEach((m) => { m.emissiveIntensity = n * 0.18; });
  });
  const y = LEVEL.l1;
  // official level signs (stair landings announce the level above)
  const p2 = useMemo(() => new THREE.MeshStandardMaterial({ map: signTex(SIGNAGE.niveles[1]), roughness: 0.6, alphaTest: 0.5 }), []);
  const p3 = useMemo(() => new THREE.MeshStandardMaterial({ map: signTex(SIGNAGE.niveles[2]), roughness: 0.6, alphaTest: 0.5 }), []);
  return (
    <group name="Torre_nivel1">
      {SHADOW_PANELS.map((_, i) => <ShadowPanel key={i} i={i} />)}
      {/* tall graphic cladding + timber battens on the west face */}
      {[-1.75, 0, 1.75].map((z, k) => (
        <group key={z} position={[-CORE + 0.06, y + 1.45, z]} rotation-y={Math.PI / 2}>
          <mesh position={[0, 0, -0.02]} material={MAT.forest}><boxGeometry args={[1.5, 2.9, 0.04]} /></mesh>
          <mesh material={clad[k]}><planeGeometry args={[1.44, 2.84]} /></mesh>
        </group>
      ))}
      {Array.from({ length: 14 }, (_, k) => -3.55 + k * 0.55).filter((z) => Math.abs(Math.abs(z) - 1.75) > 0.8 && Math.abs(z) > 0.8).map((z) => <Tb key={'bat' + z} s={[0.05, 2.9, 0.07]} p={[-CORE + 0.12, y + 1.45, z]} m={MAT.woodWarm} />)}
      {/* route totem: three pictogram discs + the stages of the visit */}
      <group position={[1.9, y, 0]} rotation-y={-Math.PI / 2}>
        <mesh position={[0, 1.0, -0.04]} material={STEEL_G} castShadow><boxGeometry args={[0.5, 2.0, 0.06]} /></mesh>
        {[0, 1, 2].map((k) => <mesh key={k} position={[0, 0.55 + (2 - k) * 0.5, 0.0]} material={discs[k]}><circleGeometry args={[0.2, 40]} /></mesh>)}
        <mesh position={[0, 1.35, -0.08]} rotation-y={Math.PI} material={totem}><planeGeometry args={[0.46, 0.46]} /></mesh>
      </group>
      {/* bench under the light well: dappled light from the perforated roof falls here */}
      <group position={[-2.1, y, 0]} rotation-y={Math.PI / 2}>
        {[0, 1, 2, 3].map((k) => <Tb key={k} s={[1.6, 0.045, 0.1]} p={[0, 0.45, -0.17 + k * 0.115]} />)}
        {[-0.76, 0.76].map((x) => <Tb key={x} s={[0.06, 0.45, 0.5]} p={[x, 0.225, 0]} m={MAT.woodWarm} />)}
      </group>
      {/* stair plaques */}
      {/* stair plaques, fixed to structure beside the flights (never in the way) */}
      {/* level signs on a timber backing with a post down to the floor */}
      {([[CORE - 0.55, y, CORE + 0.16, 1.6, p2], [(ST2.x0 + ST2.x1) / 2, LEVEL.l2, -CORE + 0.08, 1.35, p3]] as [number, number, number, number, THREE.Material][]).map(([sx, fy, sz, h, m], k) => (
        <group key={k} position={[sx, fy, sz]}>
          <mesh position={[0, h, 0.006]} material={m}><planeGeometry args={[0.5, 0.5]} /></mesh>
          <mesh position={[0, h, -0.012]} material={MAT.forest} castShadow><boxGeometry args={[0.54, 0.54, 0.03]} /></mesh>
          <mesh position={[0, (h - 0.27) / 2, -0.04]} material={MAT.woodWarm} castShadow><boxGeometry args={[0.07, h - 0.27, 0.07]} /></mesh>
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- level 2: relations wall (five transparent layers)
const FRAME_W = 1.45, LAYER_W = 1.3, LAYER_H = 1.1;
function RelationsWall() {
  const ref = useRef<THREE.Group>(null);
  const layers = useRef<(THREE.Group | null)[]>([]);
  const inFrame = useRef<boolean[]>([false, false, false, false, false]);
  const pos = useRef<number[]>(ELEMENTS.map((_, k) => parkX(k)));
  const enterFocus = useStore((s) => s.enterFocus);
  const active = useStore((s) => s.mode === 'focus' && s.focus === 'muro');
  const frameMat = useMemo(() => new THREE.MeshStandardMaterial({ color: PALETTE.forest, roughness: 0.5, emissive: LIME.clone(), emissiveIntensity: 0 }), []);
  const back = useMemo(() => new THREE.MeshStandardMaterial({ color: PALETTE.cream, roughness: 0.8, emissive: new THREE.Color('#fff4dc'), emissiveIntensity: 0 }), []);
  const strip = useMemo(() => new THREE.MeshStandardMaterial({ map: relationStripTexture(-1), roughness: 0.6, emissive: new THREE.Color('#ffffff'), emissiveMap: relationStripTexture(-1), emissiveIntensity: 0 }), []);
  const lmats = useMemo(() => ELEMENTS.map((e) => new THREE.MeshStandardMaterial({ map: layerTexture(e.id), transparent: true, depthWrite: false, side: THREE.DoubleSide, roughness: 0.2, emissive: new THREE.Color('#ffffff'), emissiveMap: layerTexture(e.id), emissiveIntensity: 0 })), []);
  const match = useRef(-1);
  const glowMat = useMemo(() => { const m = MAT.woodWarm.clone(); m.emissive = new THREE.Color(0); return m; }, []);
  useGlow('muro', glowMat);
  const evaluate = useCallback(() => {
    const ids = ELEMENTS.filter((_, k) => inFrame.current[k]).map((e) => e.id as ElementId);
    const k = ids.length === 3 ? RELATIONS.findIndex((r) => r.set.every((s) => ids.includes(s))) : -1;
    const st = useStore.getState();
    if (k !== match.current) {
      match.current = k;
      const t = relationStripTexture(k);
      strip.map = t; strip.emissiveMap = t; strip.needsUpdate = true;
      if (k >= 0) { sound.chime(); st.setInfo(`${RELATIONS[k].title}: ${RELATIONS[k].text}`); }
    }
    if (k < 0) st.setInfo(ids.length ? `En el marco: ${ids.map((i) => ELEMENTS.find((e) => e.id === i)!.name).join(' · ')}${ids.length === 3 ? ' — esta combinación no forma una relación; prueba otra.' : ' — faltan capas: la frase aparece con tres.'}` : 'Haz clic en una capa (o 1-5) para deslizarla dentro del marco.');
  }, [strip]);
  const toggle = useCallback((k: number) => { inFrame.current[k] = !inFrame.current[k]; sound.click(); evaluate(); }, [evaluate]);
  const act = useCallback(() => { enterFocus('muro'); setTimeout(evaluate, 0); }, [enterFocus, evaluate]);
  useInteractable('muro', 'Armar relaciones · muro de capas', ref, act, 3.2);
  useEffect(() => {
    if (!active) return;
    const kd = (e: KeyboardEvent) => { const k = ['1', '2', '3', '4', '5'].indexOf(e.key); if (k >= 0) toggle(k); };
    window.addEventListener('keydown', kd);
    return () => window.removeEventListener('keydown', kd);
  }, [active, toggle]);
  useFrame((_, dt) => {
    ELEMENTS.forEach((_, k) => {
      const goal = inFrame.current[k] ? 0 : parkX(k);
      pos.current[k] += (goal - pos.current[k]) * (1 - Math.exp(-dt * 5));
      const g = layers.current[k];
      if (g) g.position.x = pos.current[k];
    });
    const n = env.nightMix;
    back.emissiveIntensity = n * 0.9;
    lmats.forEach((m) => { m.emissiveIntensity = n * 0.35; });
    strip.emissiveIntensity = n * 0.3;
    frameMat.emissiveIntensity = match.current >= 0 ? 0.35 + Math.sin(env.elapsed * 3) * 0.1 : 0;
  });
  const onLayer = (k: number) => (e: ThreeEvent<PointerEvent>) => { if (!active) return; e.stopPropagation(); toggle(k); };
  const yc = 1.55;
  return (
    // faces north (into the level), mounted on the south edge of level 2
    <group ref={ref} name="Torre_muro_relaciones" position={[0, LEVEL.l2, CORE - 0.35]} rotation-y={Math.PI}>
      <mesh position={[0, 1.2, -0.12]} material={back} receiveShadow><boxGeometry args={[4.7, 2.3, 0.05]} /></mesh>
      {[-2.35, 2.35].map((x) => <mesh key={x} position={[x, 1.2, -0.05]} material={glowMat} castShadow><boxGeometry args={[0.1, 2.4, 0.1]} /></mesh>)}
      {/* rails top and bottom, one per layer depth */}
      {ELEMENTS.map((_, k) => [yc + LAYER_H / 2 + 0.03, yc - LAYER_H / 2 - 0.03].map((y) => <mesh key={`${k}${y}`} position={[0, y, layerZ(k)]} material={MAT.alu}><boxGeometry args={[4.6, 0.02, 0.02]} /></mesh>))}
      {ELEMENTS.map((e, k) => (
        <group key={e.id} ref={(el) => { layers.current[k] = el; }} position={[parkX(k), yc, layerZ(k)]}>
          <mesh material={lmats[k]} onPointerDown={onLayer(k)}><planeGeometry args={[LAYER_W, LAYER_H]} /></mesh>
          {[-1, 1].map((sx) => <mesh key={sx} position={[sx * LAYER_W / 2, 0, 0]} material={MAT.steel}><boxGeometry args={[0.015, LAYER_H, 0.015]} /></mesh>)}
        </group>
      ))}
      {/* the "window" frame in front of all layers */}
      <group position={[0, yc, layerZ(ELEMENTS.length) + 0.02]}>
        {[-1, 1].map((sy) => <mesh key={'h' + sy} position={[0, sy * (LAYER_H / 2 + 0.06), 0]} material={frameMat}><boxGeometry args={[FRAME_W + 0.12, 0.1, 0.03]} /></mesh>)}
        {[-1, 1].map((sx) => <mesh key={'v' + sx} position={[sx * (FRAME_W / 2 + 0.01), 0, 0]} material={frameMat}><boxGeometry args={[0.1, LAYER_H + 0.2, 0.03]} /></mesh>)}
      </group>
      <mesh position={[0, yc - LAYER_H / 2 - 0.32, layerZ(ELEMENTS.length) + 0.02]} material={strip}><planeGeometry args={[2.1, 0.3]} /></mesh>
    </group>
  );
}
function parkX(k: number) { return k < 3 ? -1.55 - k * 0.1 : 1.55 + (k - 3) * 0.1; }
function layerZ(k: number) { return 0.02 + k * 0.045; }

// ---------------------------------------------------------------- level 3: anamorphic slats, viewer, bench, orientation
const ANA = { tMin: -0.33, tMax: 0.33, vDown: -0.31, vUp: 0.27, depths: [1.5, 2.8, 1.9, 3.2, 1.6, 2.6, 2.1, 3.0, 1.7] };
/** World eye point of the anamorphic composition. */
export function anaEye() { return new THREE.Vector3(T.x + ANA_EYE.x, B() + LEVEL.l3 + EYE, T.z + ANA_EYE.z); }

function Anamorphic() {
  const tex = useMemo(() => anamorphicTexture(), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, emissive: new THREE.Color('#ffffff'), emissiveMap: tex, emissiveIntensity: 0 }), [tex]);
  useFrame(() => { mat.emissiveIntensity = env.nightMix * 0.35; });
  const markMat = useMemo(() => new THREE.MeshStandardMaterial({ map: eyeMarkTexture(), transparent: true, roughness: 0.7 }), []);
  const slats = useMemo(() => {
    const N = ANA.depths.length, dT = (ANA.tMax - ANA.tMin) / N;
    const ex = ANA_EYE.x, ez = ANA_EYE.z, ey = LEVEL.l3 + EYE;
    return ANA.depths.map((d, k) => {
      const t0 = ANA.tMin + k * dT, t1 = t0 + dT, over = dT * 0.03;
      const w = d * (dT + 2 * over), h = d * (ANA.vUp - ANA.vDown);
      const u0 = (t0 - over - ANA.tMin) / (ANA.tMax - ANA.tMin), u1 = (t1 + over - ANA.tMin) / (ANA.tMax - ANA.tMin);
      const g = new THREE.PlaneGeometry(w, h);
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) < 0.5 ? u0 : u1, uv.getY(i) < 0.5 ? 0 : 1);
      return { g, x: ex + d * (t0 + t1) / 2, z: ez - d, y: ey + d * (ANA.vDown + ANA.vUp) / 2, h, w, bottom: ey + d * ANA.vDown };
    });
  }, []);
  // completion: standing on the mark and looking north
  const done = useRef(false);
  useFrame(({ camera }) => {
    if (done.current) return;
    const st = useStore.getState();
    if (st.mode !== 'walk') return;
    const e = anaEye();
    const f = new THREE.Vector3(); camera.getWorldDirection(f);
    if (Math.hypot(camera.position.x - e.x, camera.position.z - e.z) < 0.35 && Math.abs(camera.position.y - e.y) < 0.3 && f.z < -0.9) {
      done.current = true;
      sound.chime();
      st.showToast('Desde este punto los fragmentos se alinean: agua, vegetación, aves, insectos y ganado forman un solo paisaje. Cambiar de perspectiva revela las conexiones.', 'Elevar la mirada, conectar la vida.', 'final', 11000);
    }
  });
  return (
    <group name="Torre_anamorfosis">
      {slats.map((s, k) => (
        <group key={k} position={[s.x, s.y, s.z]}>
          <mesh geometry={s.g} material={mat} castShadow />
          <mesh position={[0, 0, -0.012]} rotation-y={Math.PI} material={MAT.woodWarm}><planeGeometry args={[s.w, s.h]} /></mesh>
          <mesh position={[0, -s.h / 2 - (s.bottom - LEVEL.l3) / 2, -0.03]} material={MAT.steel}><boxGeometry args={[0.04, s.bottom - LEVEL.l3, 0.04]} /></mesh>
        </group>
      ))}
      <mesh position={[ANA_EYE.x, LEVEL.l3 + 0.006, ANA_EYE.z]} rotation-x={-Math.PI / 2} material={markMat}><circleGeometry args={[0.38, 32]} /></mesh>
    </group>
  );
}

/** Things the viewer can identify (world positions). */
const VIEW_TARGETS = () => [
  { name: 'Laguna', note: 'el agua que conecta todo el recorrido', x: 8.5, z: -10 },
  { name: 'Deck de descanso', note: 'el mirador a nivel del suelo', x: 0, z: 0 },
  { name: 'Túnel de la guadua', note: 'celosías con hojas de yuca, fríjol y forrajes', x: -12.4, z: -8 },
  { name: 'Corral de las vacas', note: 'su materia orgánica alimenta los cultivos', x: -20, z: -10 },
  { name: 'Gradas bajas', note: 'la pequeña loma entre el túnel y el deck', x: -7, z: 9 },
  ...(HERONS[1] ? [{ name: 'Garzas en la orilla', note: 'cazan inmóviles en el agua poco profunda', x: HERONS[1][0], z: HERONS[1][1] }] : []),
];

function Viewer() {
  const ref = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const body = useMemo(() => new THREE.MeshStandardMaterial({ color: PALETTE.forest, roughness: 0.4, metalness: 0.3, emissive: LIME.clone(), emissiveIntensity: 0 }), []);
  useGlow('visor', body);
  const enterFocus = useStore((s) => s.enterFocus);
  const act = useCallback(() => enterFocus('visor'), [enterFocus]);
  useInteractable('visor', 'Usar el visor del paisaje', ref, act, 2.6);
  const last = useRef('');
  useFrame(({ camera }) => {
    const st = useStore.getState();
    const looking = st.mode === 'focus' && st.focus === 'visor';
    if (head.current) head.current.visible = !looking;
    if (!looking) { last.current = ''; return; }
    const f = new THREE.Vector3(); camera.getWorldDirection(f);
    const yaw = Math.atan2(f.x, f.z);
    let best: ReturnType<typeof VIEW_TARGETS>[number] | null = null, bd = 0.14;
    for (const t of VIEW_TARGETS()) {
      const d = Math.abs(((Math.atan2(t.x - camera.position.x, t.z - camera.position.z) - yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (d < bd) { bd = d; best = t; }
    }
    const msg = best ? `${best.name} — ${best.note}` : 'Gira el visor (arrastra) hacia la laguna, el deck, el túnel o el corral.';
    if (msg !== last.current) { last.current = msg; st.setInfo(msg); }
  });
  return (
    <group ref={ref} name="Torre_visor" position={[VIEWER.x, LEVEL.l3, VIEWER.z]}>
      <mesh position={[0, 0.6, 0]} material={MAT.steel} castShadow><cylinderGeometry args={[0.05, 0.08, 1.2, 14]} /></mesh>
      <mesh position={[0, 0.02, 0]} material={MAT.steel}><cylinderGeometry args={[0.2, 0.22, 0.04, 20]} /></mesh>
      <group ref={head} position={[0, 1.3, 0]}>
        <mesh rotation-x={Math.PI / 2} material={body} castShadow><cylinderGeometry args={[0.09, 0.07, 0.36, 16]} /></mesh>
        <mesh position={[0, 0.12, 0]} material={MAT.ledLime}><boxGeometry args={[0.1, 0.03, 0.2]} /></mesh>
      </group>
    </group>
  );
}

/** Focus pose of the viewer (used by the camera rig). */
export function viewerEye() { return new THREE.Vector3(T.x + VIEWER.x, B() + LEVEL.l3 + 1.42, T.z + VIEWER.z); }

function Level3() {
  const y = LEVEL.l3;
  const labels = useMemo(() => VIEW_TARGETS().map((t) => {
    const dx = t.x - T.x, dz = t.z - T.z;
    const x = dz < -0.1 ? (dx / -dz) * CORE : Math.sign(dx) * CORE;
    return { u: Math.min(0.95, Math.max(0.05, (x + CORE) / (2 * CORE))), name: t.name };
  }), []);
  const orient = useMemo(() => new THREE.MeshStandardMaterial({ map: orientationTexture(labels), roughness: 0.6 }), [labels]);
  return (
    <group name="Torre_nivel3">
      <Anamorphic />
      <Viewer />
      {/* orientation strip on the north railing cap, names at their real bearing */}
      <group position={[0, y + 1.16, -CORE + 0.02]} rotation-x={-1.0}>
        <mesh material={orient}><planeGeometry args={[2 * CORE - 0.2, 0.16]} /></mesh>
      </group>
      {/* bench under the partial roof, facing the landscape */}
      <group position={[1.8, y, CORE - 0.42]}>
        {[0, 1, 2, 3].map((k) => <Tb key={k} s={[1.8, 0.045, 0.1]} p={[0, 0.45, -0.17 + k * 0.115]} />)}
        {[-0.85, 0.85].map((x) => <Tb key={x} s={[0.06, 0.66, 0.5]} p={[x, 0.33, 0]} m={MAT.woodWarm} />)}
        <group position={[0, 0.45, 0.24]} rotation-x={0.17}>{[0.1, 0.23, 0.36].map((yy) => <Tb key={yy} s={[1.7, 0.09, 0.03]} p={[0, yy, 0]} />)}</group>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- the tower
export function ObservationTower() {
  const said = useRef<Record<number, boolean>>({});
  useFrame(({ camera }) => {
    const st = useStore.getState();
    if (st.mode !== 'walk') return;
    const x = camera.position.x - T.x, z = camera.position.z - T.z;
    if (x < L1.x0 || x > L1.x1 || z < L1.z0 || z > L1.z1) return;
    const lv = levelOf(camera.position.y - EYE);
    if (!lv || said.current[lv]) return;
    said.current[lv] = true;
    const msg: Record<number, [string, string]> = {
      1: ['Nivel 1 · Contemplación', 'Cada sombra revela una forma de vida. Gira los paneles de la terraza y mira cómo la luz dibuja hojas sobre la madera. Este nivel se recorre completo sin escaleras.'],
      2: ['Nivel 2 · Corredores', 'Todo está conectado. Desliza capas transparentes —vegetación, agua, ganado, insectos y aves— dentro del marco hasta completar una relación.'],
      3: ['Nivel 3 · Mirador', 'El paisaje completo. Busca el punto marcado en el piso: desde ahí, los fragmentos forman una sola imagen. El visor nombra lo que señalas.'],
    };
    st.showToast(msg[lv][1], msg[lv][0], 'info', 9000);
  });
  return (
    <group name="Torre_observacion" position={[T.x, B(), T.z]}>
      <Structure />
      <Level1 />
      <RelationsWall />
      <group name="Torre_nivel2_banca" position={[-2.6, LEVEL.l2, -CORE + 0.5]} rotation-y={Math.PI}>
        {[0, 1, 2, 3].map((k) => <Tb key={k} s={[1.6, 0.045, 0.1]} p={[0, 0.45, -0.17 + k * 0.115]} />)}
        {[-0.76, 0.76].map((x) => <Tb key={x} s={[0.06, 0.66, 0.5]} p={[x, 0.33, 0]} m={MAT.woodWarm} />)}
        <group position={[0, 0.45, 0.24]} rotation-x={0.17}>{[0.1, 0.23, 0.36].map((yy) => <Tb key={yy} s={[1.5, 0.09, 0.03]} p={[0, yy, 0]} />)}</group>
      </group>
      <Level3 />
    </group>
  );
}
