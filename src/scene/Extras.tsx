// Physical, buildable devices that replace what used to exist only on screen:
// rubbing plates (paper passport), the tactile relief model at the centre of the deck and fixed binoculars.
import { useCallback, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BINOC, FLOOR_Y, MAQUETA, PALETTE, PLATES, WATER_Y, type PlateDef } from '../lib/layout';
import { plaqueTexture, plateTextures, PLATE_LABEL } from '../lib/realTextures';
import { heightAt } from '../lib/terrain';
import { TREES } from '../lib/vegData';
import { TUNNEL_SAMPLES } from '../lib/tunnel';
import { useInteractable } from '../lib/interact';
import { sound } from '../lib/audio';
import { env, LINKS, NODES, useStore } from '../store';
import { MAT } from './materials';
import { T } from './Deck';

const LIME = new THREE.Color(PALETTE.lime);

// ---------------------------------------------------------------- rubbing plates
const PLATE_TEXT: Record<string, string> = {
  luz: 'La luz que atraviesa el techo, como la de un dosel, marca la hora sobre la madera.',
  veg: 'La guadua y los árboles de la orilla dan sombra, refugio y alimento.',
  aves: 'Garzas, patos y martines pescadores dependen de la laguna.',
  ins: 'Las libélulas nacen bajo el agua y vuelan sobre ella.',
  agua: 'Toda la laguna en tus manos: el agua es el centro de la red.',
  tu: 'Detenerte a mirar también es una forma de cuidar la laguna.',
};

function Plate({ p }: { p: PlateDef }) {
  const ref = useRef<THREE.Group>(null);
  const { map, normalMap } = plateTextures(p.node);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map, normalMap, normalScale: new THREE.Vector2(1.4, 1.4), metalness: 0.55, roughness: 0.42, emissive: LIME.clone(), emissiveIntensity: 0 }), [map, normalMap]);
  const id = 'plate-' + p.node;
  useFrame(() => {
    const st = useStore.getState();
    const h = st.hovered === id;
    mat.emissiveIntensity = (h ? 0.12 + Math.sin(env.elapsed * 5) * 0.05 : 0) + (st.stamps[p.node] ? 0 : env.nightMix * 0.05);
  });
  const act = useCallback(() => {
    const st = useStore.getState();
    const label = PLATE_LABEL[p.node];
    if (st.stamps[p.node]) { st.showToast(PLATE_TEXT[p.node], `${label} · ya está en tu pasaporte`, 'info', 4500); return; }
    const fresh = st.stamp(p.node);
    sound.click();
    const n = Object.keys(useStore.getState().stamps).length;
    const name = (id: string) => NODES.find((x) => x.id === id)!.label;
    const linkTxt = fresh.length ? ` Nueva conexión: ${fresh.map((f) => { const l = LINKS.find((x) => x.id === f)!; return `${name(l.a)} ↔ ${name(l.b)}`; }).join(', ')}.` : '';
    st.showToast(`${PLATE_TEXT[p.node]}${linkTxt}`, `Calco ${n} de 6 · ${label}`, n === 6 ? 'success' : 'link', 7000);
  }, [p.node]);
  useInteractable(id, `Calcar placa · ${PLATE_LABEL[p.node]}`, ref, act, 2.4);
  return (
    <group name={`Placa_calco_${p.node}`} ref={ref} position={[p.x, FLOOR_Y + p.y, p.z]} rotation-y={p.rot}>
      <group rotation-x={p.tilt}>
        <mesh position={[0, 0, -0.008]} material={MAT.steel}><boxGeometry args={[0.21, 0.21, 0.016]} /></mesh>
        <mesh position={[0, 0, 0.001]} material={mat}><planeGeometry args={[0.18, 0.18]} /></mesh>
        {/* crayon cup */}
        <mesh position={[0.135, -0.06, 0.02]} material={MAT.steel}><cylinderGeometry args={[0.018, 0.015, 0.07, 12]} /></mesh>
      </group>
    </group>
  );
}

export function Plates() {
  return <>{PLATES.map((p) => <Plate key={p.node} p={p} />)}</>;
}

// ---------------------------------------------------------------- tactile relief model ("la laguna desde arriba")
const MAP = { cx: 2.5, cz: -9, s: 0.0108 }; // world centre shown at the table centre; 1 m ≈ 1.1 cm (deck, tunnel, lagoon)

function reliefGeometry(w: number, d: number) {
  const g = new THREE.PlaneGeometry(d, w, 70, 92);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const water = new THREE.Color('#2f6a73'), shore = new THREE.Color('#9DBE5A'), land = new THREE.Color(PALETTE.olive);
  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i), lz = pos.getZ(i);
    const wx = MAP.cx + lx / MAP.s, wz = MAP.cz + lz / MAP.s;
    const h = heightAt(wx, wz);
    const wet = h < WATER_Y + 0.02;
    pos.setY(i, wet ? 0.004 : 0.008 + Math.min(0.05, (h - WATER_Y) * 0.012));
    if (wet) c.copy(water); else c.copy(shore).lerp(land, Math.min(1, (h - WATER_Y) * 0.6));
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

export function TactileModel() {
  const ref = useRef<THREE.Group>(null);
  const enterFocus = useStore((s) => s.enterFocus);
  const W = MAQUETA.w - 0.08, D = MAQUETA.d - 0.08;
  const geo = useMemo(() => reliefGeometry(W, D), [W, D]);
  const reliefMat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }), []);
  const tunnelMark = useMemo(() => new THREE.MeshStandardMaterial({ color: PALETTE.cream, roughness: 0.6 }), []);
  const limeMark = useMemo(() => new THREE.MeshStandardMaterial({ color: PALETTE.lime, emissive: PALETTE.lime, emissiveIntensity: 0.25, roughness: 0.5 }), []);
  const edge = useMemo(() => { const m = MAT.woodWarm.clone(); m.emissive = new THREE.Color(0); return m; }, []);
  useFrame(() => {
    const h = useStore.getState().hovered === 'maqueta';
    edge.emissive.copy(LIME); edge.emissiveIntensity = h ? 0.11 + Math.sin(env.elapsed * 5) * 0.05 : 0;
  });
  const trees = useMemo(() => TREES.filter((t) => {
    const lx = (t.x - MAP.cx) * MAP.s, lz = (t.z - MAP.cz) * MAP.s;
    return Math.abs(lx) < D / 2 - 0.01 && Math.abs(lz) < W / 2 - 0.01;
  }).slice(0, 140), [W, D]);
  const setTrees = useCallback((im: THREE.InstancedMesh | null) => {
    if (!im) return;
    const m = new THREE.Matrix4();
    trees.forEach((t, i) => {
      const s = 0.6 + Math.min(1.4, t.r / 3);
      m.compose(new THREE.Vector3((t.x - MAP.cx) * MAP.s, 0.02, (t.z - MAP.cz) * MAP.s), new THREE.Quaternion(), new THREE.Vector3(s, s, s));
      im.setMatrixAt(i, m);
    });
    im.instanceMatrix.needsUpdate = true;
  }, [trees]);
  const plaque = useMemo(() => new THREE.MeshStandardMaterial({ map: plaqueTexture('LA LAGUNA DESDE ARRIBA', ['Toca el relieve: el agua es lisa, la orilla', 'rugosa. Crema: el túnel. Lima: el deck.'], 640, 200), roughness: 0.6 }), []);
  const act = useCallback(() => {
    enterFocus('maqueta');
    const st = useStore.getState();
    st.setInfo('Así se ve la laguna desde arriba. Toca el relieve: el agua es lisa y la orilla rugosa; el punto lima es este deck, y tú estás en él.');
    if (!st.journey[5]) {
      st.mark(5);
      st.showToast('Desde arriba se ve lo que desde el suelo no: el agua, la orilla, los árboles, el túnel… y este deck, con todos alrededor de la mesa. Tú también haces parte de la red. En el borde sur está la placa «Tú».', 'Elevar la mirada', 'final', 11000);
      sound.chime();
    }
  }, [enterFocus]);
  useInteractable('maqueta', 'Tocar la maqueta · la laguna desde arriba', ref, act, 2.8);
  const deckPos = [(0 - MAP.cx) * MAP.s, 0.03, (0 - MAP.cz) * MAP.s] as const;
  return (
    <group name="Maqueta_tactil" ref={ref} position={[MAQUETA.x, FLOOR_Y, MAQUETA.z]}>
      {/* table: 0.8 m top, open underneath (0.7 m knee clearance) so it can be used seated from every side */}
      <T s={[MAQUETA.d, 0.06, MAQUETA.w]} p={[0, MAQUETA.top - 0.03, 0]} m={edge} />
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz]) => (
        <T key={`${sx}${sz}`} s={[0.06, MAQUETA.top - 0.06, 0.06]} p={[sx * (MAQUETA.d / 2 - 0.05), (MAQUETA.top - 0.06) / 2, sz * (MAQUETA.w / 2 - 0.05)]} m={MAT.woodDark} />
      ))}
      <group position={[0, MAQUETA.top, 0]}>
        <mesh geometry={geo} material={reliefMat} receiveShadow castShadow />
        <instancedMesh ref={setTrees} args={[undefined, undefined, Math.max(1, trees.length)]} castShadow>
          <sphereGeometry args={[0.012, 8, 6]} />
          <meshStandardMaterial color="#3f5f2a" roughness={0.9} />
        </instancedMesh>
        <mesh position={deckPos as unknown as THREE.Vector3Tuple} material={limeMark}><boxGeometry args={[0.1, 0.012, 0.075]} /></mesh>
        {/* guadua tunnel in relief: a raised cream band from the road to the deck */}
        {TUNNEL_SAMPLES.filter((_, i) => i % 3 === 0).map((q, i) => {
          const lx = (q.x - MAP.cx) * MAP.s, lz = (q.z - MAP.cz) * MAP.s;
          if (Math.abs(lx) > D / 2 - 0.01 || Math.abs(lz) > W / 2 - 0.01) return null;
          return <mesh key={i} position={[lx, 0.022, lz]} material={tunnelMark}><boxGeometry args={[0.032, 0.012, 0.032]} /></mesh>;
        })}
      </group>
      {/* low plaque sloping out from the south edge (toward the arrival), below the relief so it hides nothing */}
      <group position={[-0.25, MAQUETA.top - 0.07, MAQUETA.w / 2 + 0.04]} rotation-x={-0.55}>
        <mesh position={[0, 0, -0.006]} material={MAT.forest}><boxGeometry args={[0.68, 0.22, 0.01]} /></mesh>
        <mesh material={plaque}><planeGeometry args={[0.64, 0.2]} /></mesh>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- fixed binoculars at seated eye height
export function Binoculars() {
  const ref = useRef<THREE.Group>(null);
  const enterFocus = useStore((s) => s.enterFocus);
  const body = useMemo(() => new THREE.MeshStandardMaterial({ color: PALETTE.forest, roughness: 0.4, metalness: 0.3, emissive: LIME.clone(), emissiveIntensity: 0 }), []);
  useFrame(() => {
    const h = useStore.getState().hovered === 'binoc';
    body.emissiveIntensity = h ? 0.12 + Math.sin(env.elapsed * 5) * 0.05 : 0;
  });
  const act = useCallback(() => {
    enterFocus('binoc');
    useStore.getState().setInfo('Binoculares a 1,18 m: se usan sentado, en silla de ruedas o de pie. Arrastra para girarlos y busca la garza en la orilla.');
  }, [enterFocus]);
  useInteractable('binoc', 'Mirar por los binoculares', ref, act, 2.6);
  const e = BINOC.eye;
  // while looking through them, the camera sits where the eyepieces are: hide the head so it doesn't block the view
  const looking = useStore((s) => s.mode === 'focus' && s.focus === 'binoc');
  return (
    <group name="Binoculares" ref={ref} position={[BINOC.x, FLOOR_Y, BINOC.z]}>
      <mesh position={[0, (e - 0.12) / 2, 0]} material={MAT.steel} castShadow><cylinderGeometry args={[0.045, 0.06, e - 0.12, 16]} /></mesh>
      <mesh position={[0, 0.02, 0]} material={MAT.steel}><cylinderGeometry args={[0.16, 0.18, 0.04, 20]} /></mesh>
      <group position={[0, e, 0]} visible={!looking}>
        {[-0.045, 0.045].map((x) => (
          <group key={x}>
            <mesh position={[x, 0, -0.05]} rotation-x={Math.PI / 2} material={body} castShadow><cylinderGeometry args={[0.04, 0.034, 0.2, 18]} /></mesh>
            <mesh position={[x, 0, 0.07]} rotation-x={Math.PI / 2} material={MAT.steel}><cylinderGeometry args={[0.022, 0.026, 0.05, 14]} /></mesh>
          </group>
        ))}
        <mesh position={[0, -0.06, -0.04]} material={MAT.steel}><boxGeometry args={[0.05, 0.06, 0.06]} /></mesh>
      </group>
    </group>
  );
}

