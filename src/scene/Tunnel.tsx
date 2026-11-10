// Guadua tunnel from the deck to the observation tower: square section, lattice walls and roof that cast
// shadows of CIAT flora, windows at three heights, rotating 3-face prisms, and an end that opens onto the lagoon.
import { useCallback, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PALETTE } from '../lib/layout';
import { composeFlora, roundRect, type Poly, type Rect } from '../lib/shapes';
import { heightAt } from '../lib/terrain';
import { BAY, LAGOON_SIDE, NBAYS, PADDOCK, STEPS, OPEN_FROM, PRISM_BAYS, TUNNEL_H, TUNNEL_LEN, TUNNEL_SAMPLES, bayKind, frameAt, openness, roofPanel, tunnelDist, widthAt } from '../lib/tunnel';
import { bambooTexture, medallionTexture } from '../lib/tunnelTextures';
import { ASPECT, SIGNAGE, signTex } from '../lib/signage';
import { RoofSilhouette } from './SignageExtras';

/** Birds of the tunnel prisms (official signage: silhouette card + 'Conócela' card). */
const BIRDS = [
  { name: 'Urutau', sci: 'Nyctibius griseus', text: 'Ave nocturna y silenciosa que permanece inmóvil durante el día, camuflada como una rama. Por la noche caza insectos en vuelo.' },
  { name: 'Garza blanca', sci: 'Ardea alba', text: 'Camina despacio por la orilla y pesca peces, ranas e insectos. Si la laguna está sana, ella tiene alimento.' },
];
import { useInteractable } from '../lib/interact';
import { sound } from '../lib/audio';
import { env, useStore } from '../store';
import { MAT } from './materials';
import { T } from './Deck';

const LIME = new THREE.Color(PALETTE.lime);
const UP = new THREE.Vector3(0, 1, 0);
const floorY = (x: number, z: number) => heightAt(x, z) + 0.05;

// ---------------------------------------------------------------- instanced bamboo culms
export type Culm = { a: THREE.Vector3; b: THREE.Vector3; r: number };

function CulmBatch({ L, list, geo }: { L: number; list: Culm[]; geo: THREE.BufferGeometry }) {
  const mat = useMemo(() => {
    const t = bambooTexture().clone();
    t.needsUpdate = true;
    t.repeat.set(1, L);
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.55 });
  }, [L]);
  const ref = useCallback((im: THREE.InstancedMesh | null) => {
    if (!im) return;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), d = new THREE.Vector3(), mid = new THREE.Vector3(), sc = new THREE.Vector3();
    list.forEach((c, i) => {
      d.subVectors(c.b, c.a);
      const len = d.length();
      q.setFromUnitVectors(UP, d.normalize());
      m.compose(mid.addVectors(c.a, c.b).multiplyScalar(0.5), q, sc.set(c.r, len, c.r));
      im.setMatrixAt(i, m);
    });
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
  }, [list]);
  return <instancedMesh ref={ref} args={[geo, mat, list.length]} castShadow receiveShadow />;
}

export function Culms({ culms, name }: { culms: Culm[]; name: string }) {
  const geo = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 10, 1), []);
  const groups = useMemo(() => {
    const by = new Map<number, Culm[]>();
    for (const c of culms) {
      const L = Math.max(0.25, Math.round(c.a.distanceTo(c.b) * 4) / 4);
      if (!by.has(L)) by.set(L, []);
      by.get(L)!.push(c);
    }
    return [...by.entries()];
  }, [culms]);
  return <group name={name}>{groups.map(([L, list]) => <CulmBatch key={L} L={L} list={list} geo={geo} />)}</group>;
}

// ---------------------------------------------------------------- lattice panels (shared geometry variants)
const PW = BAY - 0.14, PH = 2.5, P_BOTTOM = 0.3; // wall panel size, bottom above floor
const PC = P_BOTTOM + PH / 2; // panel centre above floor
const wy = (worldY: number) => worldY - PC; // floor-relative height → panel coords
const WIN = {
  kid: { x0: -0.58, x1: -0.12, y0: wy(0.45), y1: wy(0.82) },
  seated: { x0: -0.05, x1: 0.5, y0: wy(1.0), y1: wy(1.4) },
  standing: { x0: -0.58, x1: -0.08, y0: wy(1.48), y1: wy(1.88) },
};
const BOARD: Rect = { x0: -0.7, x1: 0.1, y0: wy(0.95), y1: wy(1.78) };

function panelGeometry(holes: Poly[], w: number, h: number, depth: number) {
  const shape = new THREE.Shape([new THREE.Vector2(-w / 2, -h / 2), new THREE.Vector2(w / 2, -h / 2), new THREE.Vector2(w / 2, h / 2), new THREE.Vector2(-w / 2, h / 2)]);
  for (const p of holes) shape.holes.push(new THREE.Path(p.map(([x, y]) => new THREE.Vector2(x, y))));
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 2 });
  g.translate(0, 0, -depth / 2);
  return g;
}

function useLatticeGeometries() {
  return useMemo(() => {
    const winRects = [WIN.kid, WIN.seated, WIN.standing];
    const windows = [0, 1, 2].map((v) => panelGeometry([...winRects.map((r) => roundRect(r, 0.06)), ...composeFlora(500 + v, PW, PH, winRects, 0.8)], PW, PH, 0.02));
    const infoWins = [{ x0: 0.2, x1: 0.62, y0: WIN.kid.y0, y1: WIN.kid.y1 }, { x0: 0.2, x1: 0.62, y0: WIN.standing.y0, y1: WIN.standing.y1 }];
    const info = panelGeometry([...infoWins.map((r) => roundRect(r, 0.06)), ...composeFlora(520, PW, PH, [...infoWins, BOARD], 0.6)], PW, PH, 0.02);
    const RW = 3.1, RL = BAY - 0.08;
    const roof = [0, 1, 2].map((v) => {
      const g = panelGeometry(composeFlora(700 + v * 13, RL, RW, [], 1.3), RL, RW, 0.008);
      g.rotateX(Math.PI / 2); // shape X along the bay, shape Y across the tunnel (local Z)
      return g;
    });
    return { windows, info, roof };
  }, []);
}

const PANEL_COLORS = [PALETTE.forest, PALETTE.olive, '#2f5a45'];

// ---------------------------------------------------------------- rotating prism (silhouette / information / frame)
const PRISM_A = 0.62, PRISM_HGT = (PRISM_A - 0.03) / ASPECT.ave + 0.04; // faces keep the cards' proportions
function Prism({ idx, pos, faceYaw }: { idx: number; pos: THREE.Vector3; faceYaw: number }) {
  const ref = useRef<THREE.Group>(null);
  const rot = useRef<THREE.Group>(null);
  const target = useRef(0);
  const face = useRef(0);
  const ap = PRISM_A / (2 * Math.sqrt(3));
  const mats = useMemo(() => [
    new THREE.MeshStandardMaterial({ map: signTex(SIGNAGE.aves[idx].sil), roughness: 0.4, alphaTest: 0.5 }),
    new THREE.MeshStandardMaterial({ map: signTex(SIGNAGE.aves[idx].info), roughness: 0.4, alphaTest: 0.5 }),
  ], [idx]);
  const edge = useMemo(() => { const m = MAT.woodWarm.clone(); m.emissive = new THREE.Color(0); return m; }, []);
  useFrame((_, dt) => {
    if (rot.current) rot.current.rotation.y += (target.current - rot.current.rotation.y) * (1 - Math.exp(-dt * 5));
    const h = useStore.getState().hovered === 'prisma-' + idx;
    edge.emissive.copy(LIME); edge.emissiveIntensity = h ? 0.12 + Math.sin(env.elapsed * 5) * 0.05 : 0;
  });
  const act = useCallback(() => {
    target.current -= (Math.PI * 2) / 3;
    face.current = (face.current + 1) % 3;
    sound.click();
    const sp = BIRDS[idx];
    const msg = ['¿Quién proyecta esta silueta?', `${sp.name} (${sp.sci}): ${sp.text}`, 'El marco vacío encuadra la laguna: busca aquí al animal o la planta que acabas de conocer.'][face.current];
    useStore.getState().showToast(msg, ['Silueta', 'Información', 'Marco'][face.current], 'info', 6000);
  }, [idx]);
  useInteractable('prisma-' + idx, `Girar el prisma · ${BIRDS[idx].name}`, ref, act, 2.6);
  const yc = 0.6 + PRISM_HGT / 2;
  return (
    <group ref={ref} name={`Tunel_prisma_${BIRDS[idx].name}`} position={pos} rotation-y={faceYaw}>
      {/* fixed steel pivot column and base */}
      <mesh position={[0, 0.3, 0]} material={MAT.steel} castShadow><cylinderGeometry args={[0.035, 0.045, 0.6, 12]} /></mesh>
      <mesh position={[0, 0.015, 0]} material={MAT.steel}><cylinderGeometry args={[0.16, 0.18, 0.03, 16]} /></mesh>
      <group ref={rot} position={[0, yc, 0]}>
        {[0, 1, 2].map((k) => {
          const a = (k * Math.PI * 2) / 3; // face k normal points to local +Z rotated by a
          return (
            <group key={k} rotation-y={a}>
              {k < 2 ? (
                <mesh position={[0, 0, ap]} material={mats[k]}><planeGeometry args={[PRISM_A - 0.03, PRISM_HGT - 0.04]} /></mesh>
              ) : (
                // face C: an empty frame that frames the real landscape
                <group position={[0, 0, ap + 0.005]}>
                  {[-1, 1].map((sy) => <mesh key={'h' + sy} position={[0, sy * (PRISM_HGT / 2 - 0.05), 0]} material={MAT.forest}><boxGeometry args={[PRISM_A - 0.06, 0.06, 0.012]} /></mesh>)}
                  {[-1, 1].map((sx) => <mesh key={'v' + sx} position={[sx * (PRISM_A / 2 - 0.05), 0, 0]} material={MAT.forest}><boxGeometry args={[0.06, PRISM_HGT - 0.04, 0.012]} /></mesh>)}
                </group>
              )}
              {/* vertical timber edge at the corner between faces */}
              <mesh position={[PRISM_A / 2, 0, ap]} rotation-y={0} material={edge} castShadow><boxGeometry args={[0.035, PRISM_HGT, 0.035]} /></mesh>
            </group>
          );
        })}
        {[-1, 1].map((sy) => (
          <mesh key={sy} position={[0, sy * (PRISM_HGT / 2 + 0.015), 0]} material={edge} castShadow>
            <cylinderGeometry args={[ap * 2 + 0.02, ap * 2 + 0.02, 0.03, 3]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- floors: separated timber planks on joists
const PLANK_W = 0.2, PLANK_GAP = 0.03, PLANK_T = 0.05;
export type Sampler = (s: number) => { p: THREE.Vector3; t: THREE.Vector3; r: THREE.Vector3 };

function useInstances(list: THREE.Matrix4[]) {
  return useCallback((im: THREE.InstancedMesh | null) => { if (!im) return; list.forEach((mm, i) => im.setMatrixAt(i, mm)); im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); }, [list]);
}
export function usePlankMaterial() {
  return useMemo(() => { const m = MAT.wood.clone(); const t = m.map!.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2.4, 0.3); m.map = t; return m; }, []);
}
const plankGeo = new THREE.BoxGeometry(1, PLANK_T, PLANK_W);
const joistGeo = new THREE.BoxGeometry(0.08, 0.12, 1);

/** Boardwalk along a centreline: planks across, 3 cm gaps, three joists underneath. */
export function PlankWalk({ at, length, width, name, lift = 0.05 }: { at: Sampler; length: number; width: (s: number) => number; name: string; lift?: number }) {
  const { planks, joists } = useMemo(() => {
    const planks: THREE.Matrix4[] = [], joists: THREE.Matrix4[] = [];
    const q = new THREE.Quaternion(), m = new THREE.Matrix4(), sc = new THREE.Vector3();
    const top = (x: number, z: number) => heightAt(x, z) + lift;
    for (let s = PLANK_W / 2; s < length; s += PLANK_W + PLANK_GAP) {
      const { p, t } = at(s);
      q.setFromAxisAngle(UP, Math.atan2(-t.x, -t.z)); // box X → across the walk
      planks.push(m.compose(new THREE.Vector3(p.x, top(p.x, p.z) - PLANK_T / 2, p.z), q, sc.set(width(s), 1, 1)).clone());
    }
    for (let s0 = 0; s0 < length - 0.01; s0 += 0.5) {
      const s1 = Math.min(length, s0 + 0.5);
      const f0 = at(s0), f1 = at(s1);
      for (const u of [-0.42, 0, 0.42]) {
        const a = f0.p.clone().addScaledVector(f0.r, u * width(s0)), b = f1.p.clone().addScaledVector(f1.r, u * width(s1));
        const mid = a.clone().add(b).multiplyScalar(0.5), d = b.clone().sub(a);
        q.setFromAxisAngle(UP, Math.atan2(d.x, d.z));
        joists.push(m.compose(mid.setY(top(mid.x, mid.z) - PLANK_T - 0.06), q, sc.set(1, 1, d.length() + 0.02)).clone());
      }
    }
    return { planks, joists };
  }, [at, length, width, lift]);
  const mat = usePlankMaterial();
  return (
    <group name={name}>
      <instancedMesh ref={useInstances(planks)} args={[plankGeo, mat, planks.length]} castShadow receiveShadow />
      <instancedMesh ref={useInstances(joists)} args={[joistGeo, MAT.woodDark, joists.length]} receiveShadow />
    </group>
  );
}

const tunnelWidth = (s: number) => widthAt(s) + 0.3;
function Boardwalk() {
  return <PlankWalk at={frameAt} length={TUNNEL_LEN} width={tunnelWidth} name="Tunel_piso_tablones" />;
}

/** Low stepped zone ("gradas bajas"): plank terraces of a few centimetres climbing the mound to the deck. */
export function SteppedZone() {
  const { planks, risers } = useMemo(() => {
    const planks: THREE.Matrix4[] = [], risers: THREE.Matrix4[] = [];
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
    const zm = (STEPS.z0 + STEPS.z1) / 2, D = STEPS.z1 - STEPS.z0;
    const hw = heightAt(STEPS.x0 + 0.05, zm) + 0.05, he = heightAt(STEPS.x1 - 0.05, zm) + 0.05;
    const tread = (STEPS.x1 - STEPS.x0) / STEPS.n;
    q.setFromAxisAngle(UP, Math.PI / 2); // plank X → along z (across the climb)
    for (let k = 0; k < STEPS.n; k++) {
      const x0 = STEPS.x0 + k * tread;
      const y = hw + ((k + 1) / STEPS.n) * (he - hw) + 0.02;
      for (let x = x0 + PLANK_W / 2 + 0.02; x < x0 + tread - 0.05; x += PLANK_W + PLANK_GAP) planks.push(m.compose(new THREE.Vector3(x, y - PLANK_T / 2, zm), q, sc.set(D, 1, 1)).clone());
      const g = Math.min(heightAt(x0, STEPS.z0), heightAt(x0, STEPS.z1)) - 0.1;
      risers.push(m.compose(new THREE.Vector3(x0 + 0.03, (y + g) / 2, zm), new THREE.Quaternion(), sc.set(0.06, y - g, D)).clone());
    }
    return { planks, risers };
  }, []);
  const mat = usePlankMaterial();
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  return (
    <group name="Gradas_bajas">
      <instancedMesh ref={useInstances(planks)} args={[plankGeo, mat, planks.length]} castShadow receiveShadow />
      <instancedMesh ref={useInstances(risers)} args={[box, MAT.woodDark, risers.length]} castShadow receiveShadow />
    </group>
  );
}

// ---------------------------------------------------------------- lanterns (night)
function Lanterns({ spots }: { spots: THREE.Vector3[] }) {
  const glow = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f1e3c4', emissive: '#ffcf8a', emissiveIntensity: 0, roughness: 0.6, transparent: true, opacity: 0.95 }), []);
  const lights = useRef<(THREE.PointLight | null)[]>([]);
  useFrame(() => {
    const m = env.nightMix;
    glow.emissiveIntensity = 0.15 + m * 2.2;
    lights.current.forEach((l) => { if (l) l.intensity = m * 1.6; });
  });
  return (
    <group name="Tunel_faroles">
      {spots.map((p, i) => (
        <group key={i} position={p}>
          <mesh position={[0, 0.32, 0]} material={MAT.steel}><cylinderGeometry args={[0.006, 0.006, 0.3, 6]} /></mesh>
          <mesh material={glow} castShadow={false}><cylinderGeometry args={[0.13, 0.11, 0.38, 12, 1]} /></mesh>
          {[-1, 1].map((s) => <mesh key={s} position={[0, s * 0.2, 0]} material={MAT.woodDark}><cylinderGeometry args={[0.14, 0.14, 0.03, 12]} /></mesh>)}
          {i % 2 === 0 && <pointLight ref={(el) => { lights.current[i / 2] = el; }} position={[0, -0.25, 0]} distance={5} decay={2} color="#ffc98a" intensity={0} />}
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- the tunnel
export function GuaduaTunnel() {
  const lattice = useLatticeGeometries();
  const panelMats = useMemo(() => PANEL_COLORS.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.15, side: THREE.DoubleSide })), []);
  const boardMat = useMemo(() => new THREE.MeshStandardMaterial({ map: signTex(SIGNAGE.hEstablo), roughness: 0.6 }), []);
  const medals = useMemo(() => ({ lagoon: medallionTexture('lagoon'), stable: medallionTexture('stable'), prism: medallionTexture('prism') }), []);

  const data = useMemo(() => {
    const culms: Culm[] = [];
    const panels: { pos: THREE.Vector3; yaw: number; geo: THREE.BufferGeometry; mat: number; side: number }[] = [];
    const roofs: { pos: THREE.Vector3; yaw: number; geo: THREE.BufferGeometry; mat: number }[] = [];
    const birdRoofs: { k: number; pos: THREE.Vector3; yaw: number }[] = [];
    const boards: { pos: THREE.Vector3; yaw: number }[] = [];
    const prisms: { idx: number; pos: THREE.Vector3; yaw: number }[] = [];
    const medal: { pos: THREE.Vector3; kind: 'lagoon' | 'stable' | 'prism' }[] = [];
    const lanterns: THREE.Vector3[] = [];
    const H = TUNNEL_H;
    const frames = Array.from({ length: NBAYS + 1 }, (_, i) => {
      const s = Math.min(TUNNEL_LEN, i * BAY);
      const f = frameAt(s);
      const w = widthAt(s);
      const L = f.p.clone().addScaledVector(f.r, -w / 2), R = f.p.clone().addScaledVector(f.r, w / 2);
      return { s, f, w, o: openness(s), L: L.setY(floorY(L.x, L.z)), R: R.setY(floorY(R.x, R.z)), c: f.p.clone().setY(floorY(f.p.x, f.p.z)) };
    });
    // frames: twin culm posts each side + twin beam + knee braces
    for (const fr of frames) {
      const top = Math.max(fr.L.y, fr.R.y) + H;
      for (const base of [fr.L, fr.R]) for (const k of [-0.055, 0.055]) {
        const b = base.clone().addScaledVector(fr.f.t, k);
        culms.push({ a: b.clone().setY(base.y - 0.05), b: b.clone().setY(top + 0.12), r: 0.05 });
      }
      if (fr.o < 0.8) {
        for (const k of [-0.055, 0.055]) {
          const a = fr.L.clone().addScaledVector(fr.f.t, k).addScaledVector(fr.f.r, -0.15).setY(top);
          const b = fr.R.clone().addScaledVector(fr.f.t, k).addScaledVector(fr.f.r, 0.15).setY(top);
          culms.push({ a, b, r: 0.05 });
        }
        for (const [base, dir] of [[fr.L, 1], [fr.R, -1]] as const) {
          culms.push({ a: base.clone().setY(top - 0.65), b: base.clone().addScaledVector(fr.f.r, 0.6 * dir).setY(top), r: 0.03 });
        }
      }
      if (fr.o < 0.5 && Math.round(fr.s / BAY) % 3 === 1) lanterns.push(fr.c.clone().setY(top - 0.55));
    }
    // bays
    for (let i = 0; i < NBAYS; i++) {
      const A = frames[i], B = frames[i + 1];
      const sMid = (A.s + B.s) / 2;
      const o = openness(sMid);
      const top = Math.max(A.L.y, A.R.y, B.L.y, B.R.y) + H;
      for (const side of [-1, 1] as const) {
        const a = side < 0 ? A.L : A.R, b = side < 0 ? B.L : B.R;
        const kind = bayKind(i, side);
        const chord = b.clone().sub(a);
        const yaw = Math.atan2(-chord.z, chord.x);
        const inward = (side < 0 ? A.f.r : A.f.r.clone().negate()).clone();
        // continuous handrail at 0.9 m (+ low kick rail): on every bay, for older visitors
        const rail = (h: number, r: number, inset = 0) => culms.push({ a: a.clone().addScaledVector(inward, inset).setY(a.y + h), b: b.clone().addScaledVector(inward, inset).setY(b.y + h), r });
        rail(0.9, 0.035, kind === 'windows' || kind === 'info' ? 0.09 : 0);
        if (o < 0.95) rail(0.15, 0.03);
        if (kind === 'open' || kind === 'prism') {
          if (o < 0.55) rail(1.55, 0.03);
          if (o < 0.3) rail(2.3, 0.03);
        } else {
          const mid = a.clone().add(b).multiplyScalar(0.5);
          const pos = mid.clone().setY(Math.min(a.y, b.y) + PC);
          const variant = kind === 'info' ? -1 : i % 3;
          panels.push({ pos, yaw, geo: variant < 0 ? lattice.info : lattice.windows[variant], mat: i % 3, side });
          const floorPt = mid.clone().addScaledVector(inward, 0.7);
          medal.push({ pos: floorPt.setY(floorY(floorPt.x, floorPt.z) + 0.004), kind: side === LAGOON_SIDE ? 'lagoon' : 'stable' });
          if (kind === 'info') {
            const bp = mid.clone().addScaledVector(inward, 0.06).addScaledVector(chord.clone().normalize(), -0.3 * side * (side < 0 ? -1 : 1));
            boards.push({ pos: bp.setY(Math.min(a.y, b.y) + (0.95 + 1.78) / 2), yaw: yaw + (side < 0 ? 0 : Math.PI) });
          }
        }
        if (kind === 'prism') {
          const k = PRISM_BAYS.indexOf(i);
          const mid = a.clone().add(b).multiplyScalar(0.5).addScaledVector(inward, 0.55);
          prisms.push({ idx: k % BIRDS.length, pos: mid.setY(floorY(mid.x, mid.z)), yaw: Math.atan2(inward.x, inward.z) });
          const fp = mid.clone().addScaledVector(inward, 0.75);
          medal.push({ pos: fp.setY(floorY(fp.x, fp.z) + 0.004), kind: 'prism' });
        }
      }
      // roof: purlins along the bay (fewer as the tunnel opens) + perforated flora panel on alternate bays
      const n = Math.round(9 * (1 - o));
      for (let k = 0; k < n; k++) {
        const u = -1 + (2 * (k + 0.5)) / Math.max(1, n);
        const pa = A.c.clone().addScaledVector(A.f.r, (u * A.w) / 2).setY(top + 0.08);
        const pb = B.c.clone().addScaledVector(B.f.r, (u * B.w) / 2).setY(top + 0.08);
        culms.push({ a: pa, b: pb, r: 0.025 });
      }
      if (PRISM_BAYS.includes(i)) {
        // open roof bay over each prism: a bird cut-out whose shadow falls on the planks
        const mid = A.c.clone().add(B.c).multiplyScalar(0.5).setY(top + 0.14);
        const ch = B.c.clone().sub(A.c);
        birdRoofs.push({ k: PRISM_BAYS.indexOf(i), pos: mid, yaw: Math.atan2(ch.x, ch.z) });
      } else if (roofPanel(i)) {
        const mid = A.c.clone().add(B.c).multiplyScalar(0.5).setY(top + 0.12);
        const ch = B.c.clone().sub(A.c);
        roofs.push({ pos: mid, yaw: Math.atan2(-ch.z, ch.x), geo: lattice.roof[i % 3], mat: (i / 2) % 3 });
      }
    }
    return { culms, panels, roofs, birdRoofs, boards, prisms, medal, lanterns };
  }, [lattice]);

  // zone messages as the visitor walks through
  const said = useRef<Record<string, boolean>>({});
  const tick = useRef(0);
  useFrame(({ camera }) => {
    tick.current++;
    if (tick.current % 15) return;
    const st = useStore.getState();
    if (st.mode !== 'walk') return;
    const td = tunnelDist(camera.position.x, camera.position.z);
    if (td.d > widthAt(td.s) / 2 + 0.5) return;
    const say = (k: string, title: string, text: string) => { if (said.current[k]) return; said.current[k] = true; st.showToast(text, title, 'info', 8000); };
    if (td.s < 8) say('in', 'Túnel de la guadua', 'Las celosías del techo y las paredes recortan hojas de yuca, fríjol y forrajes: los cultivos que el CIAT estudia. A la izquierda, la laguna; a la derecha, el establo.');
    else if (td.s > OPEN_FROM - 2 && td.s < TUNNEL_LEN - 2) say('out', 'La laguna completa', 'El túnel se abre poco a poco: menos celosía, más cielo. Al frente aparece toda la laguna y el deck de descanso.');
    else if (td.side !== LAGOON_SIDE && camera.position.z < PADDOCK.z1 + 4 && camera.position.z > PADDOCK.z0 - 4) say('stable', 'Del establo al cultivo', 'Por las ventanas de la derecha se ve el establo. El estiércol de las vacas se composta y vuelve al suelo como abono para los cultivos.');
  });

  return (
    <group name="Tunel_guadua">
      <Boardwalk />
      <Culms culms={data.culms} name="Tunel_estructura_guadua" />
      <group name="Tunel_celosias_paredes">
        {data.panels.map((p, i) => (
          <mesh key={i} geometry={p.geo} material={panelMats[p.mat]} position={p.pos} rotation-y={p.yaw} castShadow receiveShadow />
        ))}
      </group>
      <group name="Tunel_celosias_techo">
        {data.roofs.map((p, i) => (
          <mesh key={i} geometry={p.geo} material={panelMats[p.mat]} position={p.pos} rotation-y={p.yaw} castShadow />
        ))}
      </group>
      <group name="Tunel_panel_establo">
        {data.boards.map((b, i) => (
          <group key={i} position={b.pos} rotation-y={b.yaw}>
            <mesh position={[0, 0, -0.012]} material={MAT.forest}><boxGeometry args={[0.84, 0.8 / ASPECT.horizontal + 0.04, 0.02]} /></mesh>
            <mesh material={boardMat}><planeGeometry args={[0.8, 0.8 / ASPECT.horizontal]} /></mesh>
          </group>
        ))}
      </group>
      <group name="Tunel_medallones_piso">
        {data.medal.map((m, i) => (
          <mesh key={i} position={m.pos} rotation-x={-Math.PI / 2} receiveShadow>
            <circleGeometry args={[0.42, 32]} />
            <meshStandardMaterial map={medals[m.kind]} transparent roughness={0.8} />
          </mesh>
        ))}
      </group>
      {data.prisms.map((p, i) => <Prism key={i} idx={p.idx} pos={p.pos} faceYaw={p.yaw} />)}
      <Lanterns spots={data.lanterns} />
      {data.birdRoofs.map((b, i) => <RoofSilhouette key={'bird' + i} k={b.k} pos={b.pos} yaw={b.yaw} />)}
      <TunnelSign />
      <SteppedZone />
    </group>
  );
}

// trail-entrance totem (mupi) with the official wayfinding panel
const MUPI_W = 0.82, MUPI_H = MUPI_W / ASPECT.entrada, MUPI_Y0 = 0.18;
function TunnelSign() {
  const mats = useMemo(() => {
    const f = new THREE.MeshStandardMaterial({ map: signTex(SIGNAGE.entrada), roughness: 0.55 });
    return [MAT.forest, MAT.forest, MAT.forest, MAT.forest, f, MAT.forest];
  }, []);
  const { p, t, r } = frameAt(0.2);
  const pos = p.clone().addScaledVector(r, -(widthAt(0) / 2 + 0.9)).addScaledVector(t, -0.6);
  const y = heightAt(pos.x, pos.z);
  const face = t.clone().negate();
  return (
    <group name="Tunel_letrero_entrada" position={[pos.x, y, pos.z]} rotation-y={Math.atan2(face.x, face.z) + 0.5}>
      {[-1, 1].map((sx) => <T key={sx} s={[0.1, MUPI_Y0 + MUPI_H + 0.1, 0.1]} p={[sx * (MUPI_W / 2 + 0.06), (MUPI_Y0 + MUPI_H + 0.1) / 2, -0.03]} m={MAT.woodWarm} />)}
      <T s={[MUPI_W + 0.22, 0.08, 0.14]} p={[0, MUPI_Y0 + MUPI_H + 0.14, -0.03]} m={MAT.woodWarm} />
      <mesh position={[0, MUPI_Y0 + MUPI_H / 2, 0]} material={mats} castShadow><boxGeometry args={[MUPI_W, MUPI_H, 0.05]} /></mesh>
    </group>
  );
}
