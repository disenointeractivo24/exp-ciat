import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { env, useStore, type FocusId } from '../store';
import { BENCHES, BINOC, EYE, FLOOR_Y, MAQUETA, MIRROR, TOWER, SEAT_EYE, SIGN, SLIDERS, SLIDE_OFFSET, START, WHEEL } from '../lib/layout';
import { groundY, inDeck, moveWithCollision } from '../lib/collision';
import { activate, registry } from '../lib/interact';
import { sound } from '../lib/audio';
import { heightAt } from '../lib/terrain';
import { HERONS } from '../lib/vegData';
import { B, CORE, LEVEL, SHADOW_PANELS, T as TW } from '../lib/tower';
import { anaEye, viewerEye } from './Tower';
import { BAY, LAGOON_SIDE, NBAYS, PRISM_BAYS, STEPS, bayKind, frameAt, tunnelDist, widthAt } from '../lib/tunnel';

type Pose = { pos: THREE.Vector3; yaw: number; pitch: number };

function lookPose(pos: THREE.Vector3, target: THREE.Vector3): Pose {
  const d = target.clone().sub(pos);
  return { pos, yaw: Math.atan2(-d.x, -d.z), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)) };
}

/** Where the binoculars point: a heron on the shore if there is one, otherwise the middle of the lagoon. */
export const BINOC_TARGET = HERONS[2] ? new THREE.Vector3(HERONS[2][0], 0.6, HERONS[2][1]) : new THREE.Vector3(2, 0, -18);
export const BINOC_FOV = 13;

export function focusPose(id: FocusId): Pose {
  if (id === 'wheel') {
    const n = new THREE.Vector3(Math.sin(WHEEL.rot), 0, Math.cos(WHEEL.rot));
    const c = new THREE.Vector3(WHEEL.x, FLOOR_Y + 1.15, WHEEL.z);
    return lookPose(c.clone().addScaledVector(n, 1.55).setY(FLOOR_Y + 1.45), c);
  }
  if (id === 'binoc') {
    return lookPose(new THREE.Vector3(BINOC.x, FLOOR_Y + BINOC.eye, BINOC.z + 0.16), BINOC_TARGET);
  }
  if (id === 'visor') {
    const e = viewerEye();
    return lookPose(e, new THREE.Vector3(8.5, e.y - 4, -10));
  }
  if (id === 'muro') {
    const wz = TW.z + CORE - 0.35;
    return lookPose(new THREE.Vector3(TW.x, B() + LEVEL.l2 + 1.6, wz - 2.3), new THREE.Vector3(TW.x, B() + LEVEL.l2 + 1.35, wz));
  }
  if (id.startsWith('sombra-')) {
    const p = SHADOW_PANELS[Number(id.slice(7))];
    const px = TW.x + p.x, pz = TW.z + p.z, y = B() + LEVEL.l1;
    return lookPose(new THREE.Vector3(px - 0.7, y + 1.65, pz - 3.1), new THREE.Vector3(px, y + 0.9, pz - 0.2));
  }
  if (id === 'torre') {
    // top platform of the observation tower (9 m), looking over the whole lagoon
    const y = heightAt(TOWER.x, TOWER.z) + 9 + 1.6;
    const p = new THREE.Vector3(TOWER.x + 0.9, y, TOWER.z + 0.6);
    return lookPose(p, new THREE.Vector3(8, 0, -15));
  }
  if (id === 'espejo') {
    // standing (or seated) at the south edge, looking down into the mirror
    const c = new THREE.Vector3(MIRROR.x, FLOOR_Y + MIRROR.top, MIRROR.z - 0.05);
    return lookPose(new THREE.Vector3(MIRROR.x, FLOOR_Y + 1.45, MIRROR.z + MIRROR.d / 2 + 0.45), c);
  }
  if (id === 'maqueta') {
    const c = new THREE.Vector3(MAQUETA.x, FLOOR_Y + MAQUETA.top, MAQUETA.z);
    return lookPose(new THREE.Vector3(MAQUETA.x - 0.72, FLOOR_Y + 1.3, MAQUETA.z), c);
  }
  // sliding layers: seen from a seated / wheelchair eye height (1.25 m), the height they were designed for
  const s = SLIDERS.find((d) => d.id === id)!;
  const n = new THREE.Vector3(Math.sin(s.rot), 0, Math.cos(s.rot));
  const c = new THREE.Vector3(s.x, FLOOR_Y + 1.15, s.z).addScaledVector(n, SLIDE_OFFSET);
  return lookPose(c.clone().addScaledVector(n, 1.2).setY(FLOOR_Y + 1.25), c);
}

export function seatPose(i: number): Pose {
  const b = BENCHES[i];
  const fwd = new THREE.Vector3(-Math.sin(b.rot), 0, -Math.cos(b.rot));
  const back = fwd.clone().multiplyScalar(-0.1);
  return { pos: new THREE.Vector3(b.x + back.x, FLOOR_Y + SEAT_EYE, b.z + back.z), yaw: b.rot, pitch: -0.06 };
}

// tour poses inside the tunnel: first rotating prism, and the stable board with its windows
const prismAt = () => {
  const i = PRISM_BAYS[0];
  const sm = (i + 0.5) * BAY, f = frameAt(sm), w = widthAt(sm);
  const p = f.p.clone().addScaledVector(f.r, LAGOON_SIDE * (w / 2 - 0.55));
  return { p, f, w, y: heightAt(p.x, p.z) };
};
function prismPose(): Pose {
  const { p, f, y } = prismAt();
  const eye = p.clone().addScaledVector(f.r, -LAGOON_SIDE * 1.5).addScaledVector(f.t, -0.6);
  return lookPose(eye.setY(y + 1.45), p.clone().setY(y + 1.05));
}
const prismFeet = (): [number, number] => { const { p, f } = prismAt(); const e = p.clone().addScaledVector(f.r, -LAGOON_SIDE * 1.5); return [e.x, e.z]; };
const boardAt = () => {
  let i = 0;
  while (i < NBAYS && bayKind(i, -LAGOON_SIDE as 1 | -1) !== 'info') i++;
  const sm = (i + 0.5) * BAY, f = frameAt(sm), w = widthAt(sm);
  const p = f.p.clone().addScaledVector(f.r, -LAGOON_SIDE * (w / 2 - 0.1)).addScaledVector(f.t, -0.3);
  return { p, f, y: heightAt(p.x, p.z) };
};
function boardPose(): Pose {
  const { p, f, y } = boardAt();
  const eye = p.clone().addScaledVector(f.r, LAGOON_SIDE * 1.7).addScaledVector(f.t, -0.4);
  return lookPose(eye.setY(y + 1.5), p.clone().setY(y + 1.3));
}
const boardFeet = (): [number, number] => { const { p, f } = boardAt(); const e = p.clone().addScaledVector(f.r, LAGOON_SIDE * 1.7); return [e.x, e.z]; };

export const TOUR = [
  {
    title: 'El túnel',
    text: 'La visita empieza en el túnel de la guadua. Las celosías recortan hojas de yuca, fríjol y forrajes, y el sol las dibuja en los tablones. A la izquierda, la laguna; a la derecha, el corral de las vacas.',
    pose: () => ({ pos: new THREE.Vector3(START.x, heightAt(START.x, START.z) + EYE, START.z), yaw: START.yaw, pitch: -0.02 }),
    feet: [START.x, START.z],
    mark: 0,
  },
  {
    title: 'Prismas giratorios',
    text: 'Cada prisma tiene tres caras: la silueta de una especie del lago, su información y un marco vacío que encuadra el paisaje real. Gíralo y busca en la laguna lo que acabas de conocer.',
    pose: () => prismPose(),
    feet: prismFeet(),
  },
  {
    title: 'Del establo al cultivo',
    text: 'Ventanas a tres alturas, para niños, personas sentadas y adultos, se abren hacia el corral. El panel explica cómo la materia orgánica de las vacas se composta y alimenta los cultivos.',
    pose: () => boardPose(),
    feet: boardFeet(),
  },
  {
    title: 'Gradas bajas',
    text: 'Al final, el túnel se abre poco a poco y unas gradas muy bajas, de pocos centímetros, suben la pequeña loma hasta el deck. Al frente aparece toda la laguna.',
    pose: () => lookPose(new THREE.Vector3(STEPS.x0 - 1.2, heightAt(STEPS.x0 - 1.2, 9) + EYE, 9), new THREE.Vector3(-1.5, FLOOR_Y + 1.2, 1.5)),
    feet: [STEPS.x0 - 1.2, 9],
  },
  {
    title: 'Mirar abajo',
    text: 'Cada mancha de luz es una hoja o un ave recortada en el techo, como bajo la copa de un samán. Un óculo deja pasar un solo punto de sol que recorre la línea de bronce del piso: es el reloj de luz, y funciona sin pantallas.',
    pose: () => lookPose(new THREE.Vector3(-1.65, FLOOR_Y + EYE, 1.0), new THREE.Vector3(-0.9, FLOOR_Y, -0.7)),
    feet: [-1.65, 1.0],
    mark: 1,
  },
  {
    title: 'Mirar a través',
    text: 'La capa transparente corre a la altura de los ojos de alguien sentado o en silla de ruedas. Dosel, orilla y superficie están impresos en el riel: deslízala y busca en la laguna lo que ves dibujado.',
    pose: () => focusPose('slider-a'),
    feet: [1.3, -1.6],
    mark: 2,
  },
  {
    title: 'Conectar',
    text: 'Tres discos a la altura de la mano: fauna, vegetación y agua. Cuando los tres símbolos coinciden bajo las flechas, una compuerta de madera sube y revela la relación escrita detrás.',
    pose: () => focusPose('wheel'),
    feet: [1.15, 2.3],
    mark: 3,
  },
  {
    title: 'Contemplar',
    text: 'Bancas con espaldar y apoyabrazos, frente a una baranda de vidrio limpio. Sobre el pasamanos, una guía panorámica nombra lo que ves. Aquí no hay nada que resolver.',
    pose: () => seatPose(0),
    feet: [-2.9, 0.95],
    mark: 4,
  },
  {
    title: 'Elevar la mirada',
    text: 'En el centro del deck, un espejo a la altura de una mesa refleja el techo: el bosque aparece abajo, y tú dentro de él. Elevar la mirada sin tener que levantar la cabeza.',
    pose: () => focusPose('espejo'),
    feet: [0.9, 2.15],
    mark: 5,
  },
  {
    title: 'Ver desde la torre',
    text: 'Para quien no sube a la torre: una maqueta táctil muestra la laguna vista desde arriba, y unos binoculares a la altura de una persona sentada acercan las garzas de la orilla.',
    pose: () => focusPose('maqueta'),
    feet: [2.2, -1.25],
  },
  {
    title: 'Llegada a la torre',
    text: 'El sendero de tablones lleva a la torre de observación: tres niveles de madera y una rampa accesible. El primer nivel se recorre completo sin escaleras.',
    pose: () => lookPose(new THREE.Vector3(TW.x - 4.5, heightAt(TW.x - 4.5, TW.z - 13) + EYE, TW.z - 13), new THREE.Vector3(TW.x, B() + 4.5, TW.z)),
    feet: [TW.x - 1.5, TW.z - 11.5],
  },
  {
    title: 'Nivel 1 · Descubrir',
    text: '«Cada sombra revela una forma de vida.» Los paneles perforados giran sobre un eje: al moverlos, el sol —o de noche un proyector LED— dibuja hojas de yuca, fríjol y forrajes sobre el piso.',
    pose: () => focusPose('sombra-1'),
    feet: [TW.x + 1.2, TW.z + 4.4, B() + LEVEL.l1],
  },
  {
    title: 'Nivel 2 · Conectar',
    text: '«Todo está conectado.» Cinco capas transparentes —vegetación, agua, ganado, insectos y aves— se deslizan dentro de un marco. Con tres capas correctas, la frase de la relación se completa. Se maneja desde los dos lados, entre dos personas.',
    pose: () => focusPose('muro'),
    feet: [TW.x, TW.z + 1.0, B() + LEVEL.l2],
  },
  {
    title: 'Nivel 3 · Elevar',
    text: 'Desde la plataforma, unas láminas verticales parecen fragmentos sueltos. Solo desde el punto marcado en el piso se alinean en una imagen: agua, vegetación, aves, insectos y ganado en un mismo paisaje.',
    pose: () => { const e = anaEye(); return { pos: e, yaw: 0, pitch: -0.02 }; },
    feet: [TW.x + 0.3, TW.z + 2.7, B() + LEVEL.l3],
  },
  {
    title: 'Elevar la mirada, conectar la vida',
    text: 'El visor gira hacia la laguna, el deck, el túnel y el corral, y nombra lo que señalas. Al bajar, el muro de salida repite la idea del recorrido: cambiar de perspectiva revela las conexiones.',
    pose: () => focusPose('visor'),
    feet: [TW.x - 2.0, TW.z - 2.0, B() + LEVEL.l3],
  },
];

const lerpAngle = (a: number, b: number, t: number) => {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
};
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function CameraRig() {
  const { camera, gl, scene } = useThree();
  const mode = useStore((s) => s.mode);
  const seat = useStore((s) => s.seat);
  const focus = useStore((s) => s.focus);
  const tourStep = useStore((s) => s.tourStep);
  const [orbitReady, setOrbitReady] = useState(false);

  const feet = useRef(new THREE.Vector3(START.x, groundY(START.x, START.z), START.z));
  const look = useRef({ yaw: START.yaw, pitch: -0.04 });
  const vel = useRef(new THREE.Vector3());
  const keys = useRef<Record<string, boolean>>({});
  const bob = useRef(0);
  const intro = useRef(0.6);
  const fixed = useRef<Pose | null>(null);
  const deckTime = useRef(0);
  const visitedDeck = useRef(false);
  const summaryShown = useRef(false);
  const seatTime = useRef(0);
  const trans = useRef<null | { t: number; dur: number; p0: THREE.Vector3; p1: THREE.Vector3; y0: number; y1: number; q0: number; q1: number; done?: () => void }>(null);
  const euler = useMemo(() => new THREE.Euler(0, 0, 0, 'YXZ'), []);
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const drag = useRef<{ x: number; y: number; moved: number; active: boolean }>({ x: 0, y: 0, moved: 0, active: false });

  const startTransition = (to: Pose, dur = 1.3, done?: () => void) => {
    euler.setFromQuaternion(camera.quaternion, 'YXZ');
    trans.current = { t: 0, dur, p0: camera.position.clone(), p1: to.pos.clone(), y0: euler.y, y1: to.yaw, q0: euler.x, q1: to.pitch, done };
  };

  // ---- respond to mode changes
  const prevMode = useRef(mode);
  useEffect(() => {
    const prev = prevMode.current;
    prevMode.current = mode;
    if (mode !== 'orbit') setOrbitReady(false);
    sound.setFocus(mode === 'seated' ? 1 : 0);
    if (mode !== 'walk' && document.pointerLockElement && mode !== 'seated') document.exitPointerLock();
    if (mode === 'walk') {
      if (prev === 'tour') {
        const st = TOUR[useStore.getState().tourStep];
        feet.current.set(st.feet[0], groundY(st.feet[0], st.feet[1], (st.feet as number[])[2]), st.feet[1]);
      }
      euler.setFromQuaternion(camera.quaternion, 'YXZ');
      look.current.yaw = prev === 'intro' ? START.yaw : euler.y;
      look.current.pitch = prev === 'intro' ? -0.02 : THREE.MathUtils.clamp(euler.x, -0.5, 0.5) * 0.4;
      const to = { pos: feet.current.clone().add(new THREE.Vector3(0, EYE, 0)), yaw: look.current.yaw, pitch: look.current.pitch };
      startTransition(to, prev === 'intro' ? 2.4 : prev === 'orbit' ? 1.6 : 1.0);
      fixed.current = null;
    } else if (mode === 'seated' && seat !== null) {
      const p = seatPose(seat);
      fixed.current = p;
      look.current.yaw = p.yaw; look.current.pitch = p.pitch;
      startTransition(p, 1.6);
    } else if (mode === 'focus' && focus) {
      const p = focusPose(focus);
      fixed.current = p;
      look.current.yaw = p.yaw; look.current.pitch = p.pitch;
      startTransition(p, 1.1);
    } else if (mode === 'orbit') {
      fixed.current = null;
      startTransition(lookPose(new THREE.Vector3(9.5, 6.2, -10.5), new THREE.Vector3(0, 1.2, 0)), 1.6, () => setOrbitReady(true));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, seat, focus]);

  useEffect(() => {
    if (mode !== 'tour') return;
    const p = TOUR[tourStep].pose();
    fixed.current = p;
    look.current.yaw = p.yaw; look.current.pitch = p.pitch;
    startTransition(p, 2.0);
    sound.setFocus(TOUR[tourStep].title === 'Contemplar' ? 1 : 0);
    const st = useStore.getState();
    const mk = (TOUR[tourStep] as { mark?: number }).mark;
    if (mk !== undefined) st.mark(mk);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, tourStep]);

  // ---- input
  useEffect(() => {
    const el = gl.domElement;
    const kd = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      keys.current[k] = true;
      const st = useStore.getState();
      if (k === 'e') {
        if (st.mode === 'walk' && st.hovered) activate(st.hovered);
        else if (st.mode === 'seated') st.stand();
        else if (st.mode === 'focus') st.exitFocus();
      }
      if (k === 'escape') {
        if (st.mode === 'seated') st.stand();
        else if (st.mode === 'focus') st.exitFocus();
        else if (st.mode === 'tour' || st.mode === 'orbit') st.setMode('walk');
      }
      if (k === 'n') st.setNight(!st.night);
      if (k === 'v' && (st.mode === 'walk' || st.mode === 'orbit')) st.setMode(st.mode === 'orbit' ? 'walk' : 'orbit');
    };
    const ku = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    const blur = () => { keys.current = {}; };
    const lockChange = () => useStore.getState().setLocked(document.pointerLockElement === el);
    const pd = (e: PointerEvent) => {
      if (e.button !== 0) return;
      drag.current = { x: e.clientX, y: e.clientY, moved: 0, active: true };
      const st = useStore.getState();
      if (document.pointerLockElement === el && st.mode === 'walk' && st.hovered) activate(st.hovered);
    };
    const pm = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      env.mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      const st = useStore.getState();
      const canLook = st.mode === 'walk' || st.mode === 'seated' || st.mode === 'tour' || (st.mode === 'focus' && (st.focus === 'binoc' || st.focus === 'torre' || st.focus === 'visor'));
      if (!canLook || trans.current) return;
      let dx = 0, dy = 0;
      if (document.pointerLockElement === el) { dx = e.movementX; dy = e.movementY; }
      else if (drag.current.active) {
        dx = e.clientX - drag.current.x; dy = e.clientY - drag.current.y;
        drag.current.x = e.clientX; drag.current.y = e.clientY;
        drag.current.moved += Math.abs(dx) + Math.abs(dy);
        dx *= 1.6; dy *= 1.6;
      }
      if (st.mode === 'focus' && st.focus === 'binoc') {
        // binoculars swivel on their post: limited arc, slow (narrow field of view)
        const p = focusPose('binoc');
        look.current.yaw = THREE.MathUtils.clamp(look.current.yaw - dx * 0.0006, p.yaw - 0.6, p.yaw + 0.6);
        look.current.pitch = THREE.MathUtils.clamp(look.current.pitch - dy * 0.0006, -0.25, 0.25);
        return;
      }
      look.current.yaw -= dx * 0.0022;
      look.current.pitch = THREE.MathUtils.clamp(look.current.pitch - dy * 0.0022, -1.35, 1.35);
    };
    const pu = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const wasDrag = drag.current.moved > 6;
      drag.current.active = false;
      if (wasDrag || document.pointerLockElement === el) return;
      const st = useStore.getState();
      if (e.target !== el) return;
      if (st.mode === 'walk') {
        if (st.hovered) activate(st.hovered);
        else el.requestPointerLock?.();
      } else if (st.mode === 'seated') el.requestPointerLock?.();
    };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    window.addEventListener('blur', blur);
    document.addEventListener('pointerlockchange', lockChange);
    el.addEventListener('pointerdown', pd);
    window.addEventListener('pointermove', pm);
    window.addEventListener('pointerup', pu);
    return () => {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      window.removeEventListener('blur', blur);
      document.removeEventListener('pointerlockchange', lockChange);
      el.removeEventListener('pointerdown', pd);
      window.removeEventListener('pointermove', pm);
      window.removeEventListener('pointerup', pu);
    };
  }, [gl]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as any).__rig = { feet: feet.current, look: look.current, camera, gl, scene, store: useStore };
    (window as any).__exportOBJ = () => import('../lib/exportObj').then((m) => m.exportOBJ(scene));
    (window as any).__exportTunnelOBJ = () => import('../lib/exportObj').then((m) => m.exportOBJ(scene, 'tunel_ciat', { owners: /^(Tunel|Gradas|Sendero|Establo|Vacas|Torre)/ }));
  }, [camera, gl, scene]);
  const center = useMemo(() => new THREE.Vector2(0, 0), []);
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const st = useStore.getState();
    // binoculars: narrow field of view
    const pc = camera as THREE.PerspectiveCamera;
    const wantFov = st.mode === 'focus' && !trans.current ? (st.focus === 'binoc' ? BINOC_FOV : st.focus === 'visor' ? 30 : 62) : 62;
    if (Math.abs(pc.fov - wantFov) > 0.05) { pc.fov += (wantFov - pc.fov) * (1 - Math.exp(-rawDt * 6)); pc.updateProjectionMatrix(); }
    const tr = trans.current;
    if (tr) {
      tr.t = Math.min(1, tr.t + Math.min(rawDt, 0.3) / tr.dur);
      const e = ease(tr.t);
      camera.position.lerpVectors(tr.p0, tr.p1, e);
      euler.set(THREE.MathUtils.lerp(tr.q0, tr.q1, e), lerpAngle(tr.y0, tr.y1, e), 0, 'YXZ');
      camera.quaternion.setFromEuler(euler);
      if (tr.t >= 1) { trans.current = null; tr.done?.(); }
      if (st.hovered) st.setHovered(null, null);
      return;
    }
    if (st.mode === 'intro') {
      intro.current += Math.min(rawDt, 0.1);
      const a = -Math.PI / 2 + Math.sin(intro.current * 0.045) * 0.75;
      camera.position.set(Math.cos(a) * 14 + 1.5, 4.6 + Math.sin(intro.current * 0.07) * 0.5, Math.sin(a) * 12 - 0.5);
      camera.lookAt(-0.5, 1.2, 0.5);
      return;
    }
    if (st.mode === 'orbit') return;

    if (st.mode === 'walk') {
      const k = keys.current;
      const f = (k['w'] || k['arrowup'] ? 1 : 0) - (k['s'] || k['arrowdown'] ? 1 : 0);
      const r = (k['d'] || k['arrowright'] ? 1 : 0) - (k['a'] || k['arrowleft'] ? 1 : 0);
      const yaw = look.current.yaw;
      const dir = new THREE.Vector3(-Math.sin(yaw) * f + Math.cos(yaw) * r, 0, -Math.cos(yaw) * f - Math.sin(yaw) * r);
      if (dir.lengthSq() > 0) dir.normalize();
      const speed = k['shift'] ? 3.0 : 1.45;
      vel.current.lerp(dir.multiplyScalar(speed), 1 - Math.exp(-dt * 7));
      const [nx, nz] = moveWithCollision(feet.current.x, feet.current.z, vel.current.x * dt, vel.current.z * dt, feet.current.y);
      const moved = Math.hypot(nx - feet.current.x, nz - feet.current.z);
      feet.current.x = nx; feet.current.z = nz;
      const gy = groundY(nx, nz, feet.current.y);
      feet.current.y += (gy - feet.current.y) * (1 - Math.exp(-dt * 12));
      bob.current += moved * 5.2;
      const sp = Math.min(1, vel.current.length() / 1.45);
      camera.position.set(nx, feet.current.y + EYE + Math.sin(bob.current) * 0.022 * sp, nz);
      euler.set(look.current.pitch, look.current.yaw, 0, 'YXZ');
      camera.quaternion.setFromEuler(euler);

      // journey tracking
      if (!st.journey[0] && (() => { const td = tunnelDist(nx, nz); return td.d < 2 && td.s > 3; })()) {
        st.mark(0);
      }
      if (inDeck(nx, nz)) {
        deckTime.current += Math.min(rawDt, 0.5);
        if (deckTime.current > 2.5 && !visitedDeck.current) {
          visitedDeck.current = true;
          if (!st.journey[1]) {
            st.mark(1);
            if (st.night) st.showToast('De noche, la luz cálida se dirige solo al piso: proyecta la vegetación sin deslumbrar a las aves que duermen en la orilla.', 'Mirar abajo', 'info', 9000);
            else st.showToast('Cada mancha de luz es una hoja o un ave recortada en el techo, como bajo un dosel. Frente a las bancas, un solo punto de sol recorre la línea de bronce: es el reloj de luz.', 'Mirar abajo', 'info', 9500);
          }
        }
      }
      if (visitedDeck.current && !summaryShown.current && nz > 9.5) {
        summaryShown.current = true;
        st.setSummary(true);
      }

      // hover detection: centre ray when locked, mouse pointer otherwise
      ray.setFromCamera(st.locked ? center : env.mouse, camera);
      const objs = Array.from(registry.values());
      const hits = ray.intersectObjects(objs.map((o) => o.obj), true);
      let found: string | null = null, label: string | null = null;
      for (const h of hits) {
        let o: THREE.Object3D | null = h.object;
        const it = objs.find((x) => { let p: THREE.Object3D | null = o; while (p) { if (p === x.obj) return true; p = p.parent; } return false; });
        o = null;
        if (it && h.distance <= it.maxDist) { found = it.id; label = it.label; }
        break;
      }
      st.setHovered(found, label);
    } else if (fixed.current) {
      const p = fixed.current;
      camera.position.copy(p.pos);
      const free = st.mode === 'seated' || st.mode === 'tour' || (st.mode === 'focus' && (st.focus === 'binoc' || st.focus === 'torre' || st.focus === 'visor'));
      if (free) euler.set(look.current.pitch, look.current.yaw, 0, 'YXZ');
      else euler.set(p.pitch, p.yaw, 0, 'YXZ');
      camera.quaternion.setFromEuler(euler);
      if (st.hovered) st.setHovered(null, null);
      if (st.mode === 'seated') {
        seatTime.current += Math.min(rawDt, 0.5);
        if (seatTime.current > 3 && !st.journey[4]) {
          st.mark(4);
          st.showToast('Frente a ti, la guía panorámica del pasamanos nombra lo que ves. No hay nada que resolver: solo mirar.', 'Contemplar', 'link', 7000);
        }
      }
    }
    if (st.mode !== 'seated') seatTime.current = 0;
  });

  return orbitReady && mode === 'orbit' ? (
    <OrbitControls makeDefault target={[0, 1.4, 0]} minDistance={3} maxDistance={350} maxPolarAngle={Math.PI * 0.49} enableDamping dampingFactor={0.08} />
  ) : null;
}
