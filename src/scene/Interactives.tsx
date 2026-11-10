import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { BENCHES, FLOOR_Y, PALETTE, SELECTOR, SIGN, SLIDERS, SLIDE_OFFSET, SLIDE_Y0, SLIDE_Y1, WHEEL, type BenchDef, type SliderDef } from '../lib/layout';
import { selectorTexture, sliderLayerTexture } from '../lib/textures';
import { ASPECT, SIGNAGE, signTex } from '../lib/signage';

// Official disc artwork: items clockwise from the top, and the relation (0 orilla, 1 refugio, 2 superficie,
// 3 profundidad) each one belongs to. Three items of the same relation under the arrows open the window.
const DISC_ITEMS = [['Colibrí', 'Libélula', 'Pez', 'Garza'], ['Nenúfar', 'Árbol', 'Junco', 'Raíces'], ['Superficie', 'Profundidad', 'Orilla', 'Lluvia']];
const DISC_SET = [[1, 2, 3, 0], [2, 1, 0, 3], [2, 3, 0, 1]];
import { slideRailTexture, wheelWindowTexture, WHEEL_WINDOW } from '../lib/realTextures';
import { useInteractable } from '../lib/interact';
import { heightAt } from '../lib/terrain';
import { sound } from '../lib/audio';
import { env, useStore, PATTERN_TEXT, type NightPattern } from '../store';
import { MAT } from './materials';
import { T } from './Deck';

const LIME = new THREE.Color(PALETTE.lime);

/** Pulses a lime emissive on the given materials while the object is hovered. */
export function useHoverGlow(id: string, mats: THREE.MeshStandardMaterial[], base = 0) {
  useFrame(() => {
    const h = useStore.getState().hovered === id;
    const v = h ? 0.11 + Math.sin(env.elapsed * 5) * 0.05 : 0;
    for (const m of mats) { m.emissive.copy(LIME); m.emissiveIntensity = base + v; }
  });
}

// ---------------------------------------------------------------- benches
// Seat 0.45 m, backrest to 0.9 m tilted 10°, armrests at 0.66 m on both ends: an older adult can sit down
// and stand up pushing on the armrests. The visitor faces local -Z.
function Bench({ b, index }: { b: BenchDef; index: number }) {
  const ref = useRef<THREE.Group>(null);
  const sit = useStore((s) => s.sit);
  const top = useMemo(() => { const m = MAT.wood.clone(); m.emissive = new THREE.Color(0); return m; }, []);
  useHoverGlow(b.id, [top]);
  const act = useCallback(() => sit(index), [sit, index]);
  useInteractable(b.id, `Sentarse · ${b.name}`, ref, act);
  const L = b.len, D = 0.5, H = 0.45;
  return (
    <group name={b.name} ref={ref} position={[b.x, FLOOR_Y, b.z]} rotation-y={b.rot}>
      {Array.from({ length: 5 }, (_, i) => -D / 2 + 0.055 + i * ((D - 0.11) / 4)).map((z) => (
        <T key={z} s={[L - 0.12, 0.045, 0.095]} p={[0, H - 0.0225, z]} m={top} />
      ))}
      {/* end frames with armrests */}
      {[-L / 2 + 0.03, L / 2 - 0.03].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <T s={[0.06, H - 0.045, D]} p={[0, (H - 0.045) / 2, 0]} m={MAT.woodWarm} />
          <T s={[0.06, 0.66 - H, 0.06]} p={[0, H + (0.66 - H) / 2, -D / 2 + 0.06]} m={MAT.woodWarm} />
          <T s={[0.08, 0.045, D + 0.04]} p={[0, 0.66, 0.0]} m={MAT.woodWarm} />
        </group>
      ))}
      {/* backrest, tilted back 10° */}
      <group position={[0, H, D / 2 - 0.02]} rotation-x={0.17}>
        {[0.1, 0.23, 0.36].map((y) => <T key={y} s={[L - 0.12, 0.09, 0.03]} p={[0, y, 0]} m={top} />)}
        {[-L / 2 + 0.12, 0, L / 2 - 0.12].map((x) => <T key={x} s={[0.05, 0.45, 0.04]} p={[x, 0.22, 0.03]} m={MAT.woodDark} />)}
      </group>
      {/* recessed plinth with downward LED line */}
      <mesh position={[0, 0.04, 0]} material={MAT.steel}><boxGeometry args={[L - 0.24, 0.08, D - 0.16]} /></mesh>
      <mesh position={[0, 0.075, -D / 2 + 0.05]} material={MAT.led}><boxGeometry args={[L - 0.16, 0.012, 0.015]} /></mesh>
    </group>
  );
}

export function Benches() {
  return <>{BENCHES.map((b, i) => <Bench key={b.id} b={b} index={i} />)}</>;
}

// ---------------------------------------------------------------- biodiversity wheel
// Three discs in a row on a lectern tilted 14°, centres at 1.05 m: reachable seated or standing.
// When the three symbols line up, a wooden shutter rises and reveals the printed relationship.
const PAIR_HINTS = ['¿Qué animal vive aquí?', '¿Qué planta los acompaña?', '¿Qué agua completa esta relación?']; // by disc: fauna, vegetación, agua
const DISC_X = [-0.52, 0, 0.52];
const DISC_R = 0.21;
const DISC_Y = 1.05;
const WIN_Y = 1.42;
const Q = Math.PI / 2;

export function BiodiversityWheel() {
  const ref = useRef<THREE.Group>(null);
  const holders = useRef<(THREE.Group | null)[]>([]);
  const discs = useRef<(THREE.Group | null)[]>([]);
  const shutter = useRef<THREE.Mesh>(null);
  const angles = useRef([Q * 1, Q * 3, Q * 2]);
  const targets = useRef([Q * 1, Q * 3, Q * 2]);
  const drag = useRef<{ i: number; last: number; total: number } | null>(null);
  const lastCombo = useRef('');
  const reveal = useRef({ k: -1, open: 0, until: 0 });
  const mode = useStore((s) => s.mode);
  const focus = useStore((s) => s.focus);
  const enterFocus = useStore((s) => s.enterFocus);
  const active = mode === 'focus' && focus === 'wheel';
  const rimMat = useMemo(() => new THREE.MeshStandardMaterial({ color: PALETTE.cream, roughness: 0.4, metalness: 0.2, emissive: LIME.clone(), emissiveIntensity: 0 }), []);
  const postMat = useMemo(() => { const m = MAT.woodWarm.clone(); m.emissive = new THREE.Color(0); return m; }, []);
  useHoverGlow('wheel', [postMat]);
  const faceMats = useMemo(() => [0, 1, 2].map((i) => new THREE.MeshStandardMaterial({ map: signTex(SIGNAGE.discos[i]), roughness: 0.45, transparent: true, alphaTest: 0.5, emissive: new THREE.Color('#ffffff'), emissiveMap: signTex(SIGNAGE.discos[i]), emissiveIntensity: 0 })), []);
  const plate = useMemo(() => new THREE.MeshStandardMaterial({ map: signTex(SIGNAGE.senalBio), roughness: 0.6, emissiveMap: signTex(SIGNAGE.senalBio), emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0 }), []);
  const ask = useMemo(() => new THREE.MeshStandardMaterial({ map: signTex(SIGNAGE.senalPregunta), roughness: 0.6, emissiveMap: signTex(SIGNAGE.senalPregunta), emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0 }), []);
  const winMat = useMemo(() => new THREE.MeshStandardMaterial({ map: wheelWindowTexture(0), roughness: 0.7, emissive: new THREE.Color('#ffffff'), emissiveMap: wheelWindowTexture(0), emissiveIntensity: 0 }), []);
  const shutMat = useMemo(() => new THREE.MeshStandardMaterial({ map: wheelWindowTexture(4), roughness: 0.6 }), []);
  const act = useCallback(() => enterFocus('wheel'), [enterFocus]);
  useInteractable('wheel', 'Girar la rueda de la biodiversidad', ref, act);

  const evaluate = useCallback(() => {
    const pos = targets.current.map((a) => ((Math.round(a / Q) % 4) + 4) % 4);
    const idx = pos.map((p, d) => DISC_SET[d][p]);
    const names = pos.map((p, d) => DISC_ITEMS[d][p]);
    const key = pos.join('');
    if (key === lastCombo.current) return;
    lastCombo.current = key;
    const st = useStore.getState();
    if (idx[0] === idx[1] && idx[1] === idx[2]) {
      const k = idx[0];
      const found = st.wheelFound.slice(); found[k] = true;
      useStore.setState({ wheelFound: found });
      const n = found.filter(Boolean).length;
      st.mark(3);
      env.wheelGlow = 1;
      sound.chime();
      const map = wheelWindowTexture(k);
      winMat.map = map; winMat.emissiveMap = map; winMat.needsUpdate = true;
      reveal.current = { k, open: reveal.current.open, until: env.elapsed + 12 };
      st.setInfo(n === 4
        ? `${WHEEL_WINDOW[k][0]} · Encontraste las 4 relaciones: ningún ser de la laguna vive solo.`
        : `${WHEEL_WINDOW[k][0]} · la ventana se abrió (${n} de 4). Gira de nuevo para buscar otra.`);
    } else if (idx[0] === idx[1] || idx[1] === idx[2] || idx[0] === idx[2]) {
      const odd = idx[0] === idx[1] ? 2 : idx[1] === idx[2] ? 0 : 1;
      st.setInfo(`${names.join(' · ')} — casi. ${PAIR_HINTS[odd]}`);
    } else {
      st.setInfo(names.join(' · '));
    }
  }, [winMat]);

  useEffect(() => {
    if (active) useStore.getState().setInfo('Gira cada disco (arrastra o clic): tres símbolos iguales bajo las flechas abren la ventana');
  }, [active]);

  const plane = useMemo(() => new THREE.Plane(), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  const nrm = useMemo(() => new THREE.Vector3(), []);
  const ctr = useMemo(() => new THREE.Vector3(), []);
  const angleFromRay = (i: number, ray: THREE.Ray) => {
    const h = holders.current[i];
    if (!h) return null;
    h.getWorldPosition(ctr);
    h.getWorldDirection(nrm);
    plane.setFromNormalAndCoplanarPoint(nrm, ctr);
    if (!ray.intersectPlane(plane, hit)) return null;
    h.worldToLocal(hit);
    return Math.atan2(hit.y, hit.x);
  };
  const onDown = (i: number) => (e: ThreeEvent<PointerEvent>) => {
    if (!active) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const a = angleFromRay(i, e.ray);
    if (a === null) return;
    drag.current = { i, last: a, total: 0 };
  };
  const onMove = (i: number) => (e: ThreeEvent<PointerEvent>) => {
    const d = drag.current;
    if (!d || d.i !== i) return;
    e.stopPropagation();
    const a = angleFromRay(i, e.ray);
    if (a === null) return;
    let da = a - d.last;
    if (da > Math.PI) da -= Math.PI * 2;
    if (da < -Math.PI) da += Math.PI * 2;
    d.last = a; d.total += Math.abs(da);
    targets.current[i] += da;
    angles.current[i] = targets.current[i];
  };
  const onUp = (i: number) => (e: ThreeEvent<PointerEvent>) => {
    const d = drag.current;
    if (!d || d.i !== i) return;
    e.stopPropagation();
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    if (d.total < 0.06) targets.current[i] += Q; // simple click: next sector
    targets.current[i] = Math.round(targets.current[i] / Q) * Q;
    drag.current = null;
    sound.click();
    evaluate();
  };

  useFrame((_, dt) => {
    for (let i = 0; i < 3; i++) {
      if (!drag.current || drag.current.i !== i) angles.current[i] += (targets.current[i] - angles.current[i]) * (1 - Math.exp(-dt * 9));
      const d = discs.current[i];
      if (d) d.rotation.z = angles.current[i];
    }
    // shutter: rises while the relation is shown, then drops back
    const r = reveal.current;
    const want = r.k >= 0 && env.elapsed < r.until ? 1 : 0;
    r.open += (want - r.open) * (1 - Math.exp(-dt * (want ? 3 : 1.5)));
    if (shutter.current) shutter.current.position.y = WIN_Y + r.open * 0.235;
    env.wheelGlow = Math.max(0, env.wheelGlow - dt * 0.35);
    rimMat.emissiveIntensity = env.wheelGlow * (0.6 + Math.sin(env.elapsed * 8) * 0.3) + env.nightMix * 0.05;
    const n = env.nightMix;
    faceMats.forEach((m) => { m.emissiveIntensity = n * 0.22; });
    plate.emissiveIntensity = n * 0.25; ask.emissiveIntensity = n * 0.25;
    winMat.emissiveIntensity = n * 0.3 + r.open * 0.08;
  });

  const keyHandler = useCallback((e: KeyboardEvent) => {
    if (!active) return;
    const k = ['1', '2', '3'].indexOf(e.key);
    if (k >= 0) { targets.current[k] += Q; sound.click(); evaluate(); }
  }, [active, evaluate]);
  useEffect(() => {
    window.addEventListener('keydown', keyHandler);
    return () => window.removeEventListener('keydown', keyHandler);
  }, [keyHandler]);

  const W = WHEEL.width;
  return (
    <group name="Rueda_biodiversidad" ref={ref} position={[WHEEL.x, FLOOR_Y, WHEEL.z]} rotation-y={WHEEL.rot}>
      {/* timber frame */}
      {[-W / 2 + 0.05, W / 2 - 0.05].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.82, -0.05]} material={postMat} castShadow><boxGeometry args={[0.1, 1.64, 0.1]} /></mesh>
          <mesh position={[x, 0.02, -0.05]} material={MAT.steel}><boxGeometry args={[0.14, 0.04, 0.4]} /></mesh>
        </group>
      ))}
      {/* tilted lectern carrying the discs */}
      <group position={[0, DISC_Y, 0]} rotation-x={-0.25}>
        <mesh position={[0, 0, -0.045]} material={MAT.forest} castShadow receiveShadow><boxGeometry args={[W - 0.2, 0.52, 0.04]} /></mesh>
        {DISC_X.map((x, i) => (
          <group key={i} ref={(el) => { holders.current[i] = el; }} position={[x, 0, 0]}>
            <mesh rotation-x={Math.PI / 2} position={[0, 0, -0.02]} material={MAT.steel}><cylinderGeometry args={[0.03, 0.03, 0.06, 12]} /></mesh>
            <group ref={(el) => { discs.current[i] = el; }}>
              <mesh rotation-x={Math.PI / 2} material={rimMat} castShadow onPointerDown={onDown(i)} onPointerMove={onMove(i)} onPointerUp={onUp(i)}>
                <cylinderGeometry args={[DISC_R, DISC_R, 0.035, 48]} />
              </mesh>
              <mesh position={[0, 0, 0.0185]} material={faceMats[i]} onPointerDown={onDown(i)} onPointerMove={onMove(i)} onPointerUp={onUp(i)}>
                <circleGeometry args={[DISC_R - 0.004, 64]} />
              </mesh>
            </group>
            {/* fixed lime pointer at 12 o'clock */}
            <mesh position={[0, DISC_R + 0.03, 0.03]} rotation-z={Math.PI} material={MAT.ledLime}>
              <coneGeometry args={[0.035, 0.06, 3]} />
            </mesh>
          </group>
        ))}
      </group>
      {/* reveal window: printed relation behind a wooden shutter that rises into the title board */}
      <mesh position={[0, WIN_Y, -0.04]} material={MAT.forest}><boxGeometry args={[W - 0.2, 0.26, 0.04]} /></mesh>
      <mesh position={[0, WIN_Y, -0.017]} material={winMat}><planeGeometry args={[1.3, 0.22]} /></mesh>
      <mesh ref={shutter} position={[0, WIN_Y, -0.008]} material={shutMat}><planeGeometry args={[1.3, 0.22]} /></mesh>
      <mesh position={[0, WIN_Y + 0.125 + (W - 0.2) / ASPECT.strip / 2, 0.0]} material={[MAT.forest, MAT.forest, MAT.forest, MAT.forest, plate, MAT.forest]} castShadow>
        <boxGeometry args={[W - 0.2, (W - 0.2) / ASPECT.strip, 0.03]} />
      </mesh>
      {/* instruction strip under the lectern */}
      <mesh position={[0, 0.58, -0.03]} material={[MAT.forest, MAT.forest, MAT.forest, MAT.forest, ask, MAT.forest]} castShadow>
        <boxGeometry args={[W - 0.2, (W - 0.2) / ASPECT.strip, 0.03]} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------- sliding transparent graphic panels
const ZONES: Record<0 | 1, string[]> = {
  0: [
    'Dosel · El barranquero anida en los taludes y caza desde las ramas. Busca en la orilla real los árboles que le dan sombra.',
    'Orilla · La garza caza entre los juncos, donde el agua apenas cubre el fondo. ¿Ves alguna quieta en la laguna?',
    'Superficie · Libélulas y nenúfares viven donde el agua toca el aire. Compara: hay hojas flotando frente al deck.',
  ],
  1: [
    'Garza real (Ardea alba) · Planea sobre el espejo de agua. Mira el cielo: quizá alguna esté volando ahora.',
    'Pato pisingo y garcita bueyera · Comparten la orilla con el ganado y los cultivos vecinos.',
    'Martín pescador y gavilán caracolero · Cazadores de la laguna: sin agua limpia, no hay presas.',
  ],
};

function SlidingPanel({ d }: { d: SliderDef }) {
  const ref = useRef<THREE.Group>(null);
  const rig = useRef<THREE.Group>(null);
  const layer = useRef<THREE.Group>(null);
  const s = useRef(-0.6);
  const target = useRef(-0.6);
  const moved = useRef(0);
  const drag = useRef<{ off: number } | null>(null);
  const mode = useStore((st) => st.mode);
  const focus = useStore((st) => st.focus);
  const enterFocus = useStore((st) => st.enterFocus);
  const active = mode === 'focus' && focus === d.id;
  const Y0 = SLIDE_Y0, Y1 = SLIDE_Y1;
  const LW = 0.95, LH = Y1 - Y0 - 0.04;
  const range = (d.len - LW) / 2 - 0.06;
  const handleMat = useMemo(() => { const m = MAT.woodWarm.clone(); m.emissive = new THREE.Color(0); return m; }, []);
  useHoverGlow(d.id, [handleMat]);
  const layerMat = useMemo(() => {
    const t = sliderLayerTexture(d.variant);
    return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: new THREE.Color('#fff2cc'), emissiveIntensity: 0, transparent: true, depthWrite: false, side: THREE.DoubleSide, roughness: 0.2 });
  }, [d.variant]);
  const railMat = useMemo(() => { const t = slideRailTexture(d.variant); return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0, roughness: 0.6 }); }, [d.variant]);
  const act = useCallback(() => enterFocus(d.id as 'slider-a' | 'slider-b'), [enterFocus, d.id]);
  useInteractable(d.id, `Deslizar capa · ${d.title}`, ref, act);

  const plane = useMemo(() => new THREE.Plane(), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  const nrm = useMemo(() => new THREE.Vector3(), []);
  const ctr = useMemo(() => new THREE.Vector3(), []);
  const localX = (ray: THREE.Ray) => {
    const g = rig.current;
    if (!g) return null;
    g.getWorldPosition(ctr);
    g.getWorldDirection(nrm);
    plane.setFromNormalAndCoplanarPoint(nrm, ctr);
    if (!ray.intersectPlane(plane, hit)) return null;
    g.worldToLocal(hit);
    return hit.x;
  };
  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (!active) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const x = localX(e.ray);
    if (x !== null) drag.current = { off: x - target.current };
  };
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return;
    e.stopPropagation();
    const x = localX(e.ray);
    if (x !== null) {
      const nt = Math.max(-range, Math.min(range, x - drag.current.off));
      moved.current += Math.abs(nt - target.current);
      target.current = nt;
    }
  };
  const onUp = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    drag.current = null;
  };
  useEffect(() => {
    if (!active) return;
    const h = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') { target.current = Math.max(-range, target.current - 0.15); moved.current += 0.15; }
      if (k === 'arrowright' || k === 'd') { target.current = Math.min(range, target.current + 0.15); moved.current += 0.15; }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [active, range]);

  const lastZone = useRef(-1);
  useFrame((_, dt) => {
    s.current += (target.current - s.current) * (1 - Math.exp(-dt * 10));
    if (layer.current) layer.current.position.x = s.current;
    layerMat.emissiveIntensity = env.nightMix * 0.55;
    railMat.emissiveIntensity = env.nightMix * 0.25;
    if (active) {
      const u = (s.current + range) / (2 * range);
      const z = Math.min(2, Math.floor(u * 3));
      if (z !== lastZone.current) {
        lastZone.current = z;
        useStore.getState().setInfo(ZONES[d.variant][z]);
      }
      if (moved.current > 0.35) useStore.getState().mark(2);
    } else lastZone.current = -1;
  });

  return (
    <group name={`Capa_deslizante_${d.title}`} ref={ref} position={[d.x, FLOOR_Y, d.z]} rotation-y={d.rot}>
      <group ref={rig} position={[0, 0, SLIDE_OFFSET]}>
        {/* stainless uprights and rails on the deck side of the handrail */}
        {[-d.len / 2 + 0.02, d.len / 2 - 0.02].map((x) => (
          <mesh key={x} position={[x, (Y0 - 0.16 + Y1 + 0.04) / 2, -0.01]} material={MAT.alu} castShadow><boxGeometry args={[0.035, Y1 + 0.2 - Y0, 0.035]} /></mesh>
        ))}
        <mesh position={[0, Y1, -0.01]} material={MAT.alu}><boxGeometry args={[d.len, 0.03, 0.05]} /></mesh>
        <mesh position={[0, Y0 - 0.02, -0.01]} material={MAT.alu}><boxGeometry args={[d.len, 0.03, 0.05]} /></mesh>
        {/* printed rail: the three stops of the layer, legible without a screen */}
        <mesh position={[0, Y0 - 0.1, 0.0]} material={railMat}><planeGeometry args={[d.len - 0.08, 0.12]} /></mesh>
        <group ref={layer}>
          <mesh position={[0, (Y0 + Y1) / 2, 0]} material={layerMat} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}>
            <planeGeometry args={[LW, LH]} />
          </mesh>
          {[Y0 + 0.005, Y1 - 0.005].map((y) => <mesh key={y} position={[0, y, 0]} material={MAT.steel}><boxGeometry args={[LW, 0.012, 0.02]} /></mesh>)}
          {[-LW / 2, LW / 2].map((x) => <mesh key={x} position={[x, (Y0 + Y1) / 2, 0]} material={MAT.steel}><boxGeometry args={[0.012, LH, 0.02]} /></mesh>)}
          {/* timber pull handle, vertical so it can be gripped from any height */}
          <mesh position={[LW / 2 - 0.06, (Y0 + Y1) / 2, 0.05]} material={handleMat} castShadow onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}>
            <boxGeometry args={[0.05, 0.4, 0.05]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export function SlidingPanels() {
  return <>{SLIDERS.map((d) => <SlidingPanel key={d.id} d={d} />)}</>;
}

// ---------------------------------------------------------------- night projection selector post
const PATTERNS: { id: NightPattern; label: string }[] = [
  { id: 'hojas', label: 'Hojas' }, { id: 'aves', label: 'Aves' }, { id: 'agua', label: 'Agua' },
];

function SelectorButton({ i, p }: { i: number; p: { id: NightPattern; label: string } }) {
  const ref = useRef<THREE.Mesh>(null);
  const setPattern = useStore((s) => s.setPattern);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2d3a1c', emissive: LIME.clone(), emissiveIntensity: 0, roughness: 0.4 }), []);
  useFrame(() => {
    const st = useStore.getState();
    const on = st.pattern === p.id;
    const hov = st.hovered === 'sel-' + p.id;
    mat.emissiveIntensity = (on ? 1.4 : 0.05) + (hov ? 0.5 + Math.sin(env.elapsed * 5) * 0.2 : 0);
  });
  const act = useCallback(() => {
    setPattern(p.id);
    sound.click();
    const night = useStore.getState().night;
    useStore.getState().showToast(night ? PATTERN_TEXT[p.id] : `${PATTERN_TEXT[p.id]} Se proyectará al caer la noche.`, 'Proyección nocturna', 'info', 5000);
  }, [setPattern, p]);
  useInteractable('sel-' + p.id, `Proyección nocturna · ${p.label}`, ref, act, 2.6);
  return (
    <mesh ref={ref} position={[-0.155 + i * 0.155, -0.1, 0.022]} rotation-x={Math.PI / 2} material={mat}>
      <cylinderGeometry args={[0.035, 0.035, 0.02, 24]} />
    </mesh>
  );
}

export function PatternSelector() {
  const face = useMemo(() => new THREE.MeshStandardMaterial({ map: selectorTexture(), emissiveMap: selectorTexture(), emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0, roughness: 0.6 }), []);
  useFrame(() => { face.emissiveIntensity = env.nightMix * 0.3; });
  return (
    <group name="Botonera_proyeccion_nocturna" position={[SELECTOR.x, FLOOR_Y, SELECTOR.z]} rotation-y={SELECTOR.rot}>
      <T s={[0.12, 0.9, 0.1]} p={[0, 0.45, -0.03]} m={MAT.woodWarm} />
      <group position={[0, 0.95, 0]} rotation-x={-0.6}>
        <mesh material={[MAT.forest, MAT.forest, MAT.forest, MAT.forest, face, MAT.forest]} castShadow><boxGeometry args={[0.48, 0.36, 0.04]} /></mesh>
        {PATTERNS.map((p, i) => <SelectorButton key={p.id} i={i} p={p} />)}
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- arrival sign interaction
export function SignInteract() {
  const ref = useRef<THREE.Mesh>(null);
  const act = useCallback(() => {
    const st = useStore.getState();
    st.mark(0);
    st.showToast('Antes de subir a la torre, aquí se mira la laguna desde el suelo, sin prisa: abajo, a través y hacia arriba. Toma un pasaporte y calca las seis placas del deck.', 'Pausa para observar.', 'info', 9000);
  }, []);
  useInteractable('sign', 'Leer letrero', ref, act, 4);
  return (
    <mesh ref={ref} position={[SIGN.x, heightAt(SIGN.x, SIGN.z) + 1.3, SIGN.z]} visible={false}>
      <boxGeometry args={[0.95, 0.65, 0.1]} />
    </mesh>
  );
}
