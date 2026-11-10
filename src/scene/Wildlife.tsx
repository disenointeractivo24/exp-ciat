import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HERONS } from '../lib/vegData';
import { heightAt, LAGOON, isWater } from '../lib/terrain';
import { WATER_Y } from '../lib/layout';
import { mulberry32 } from '../lib/shapes';
import { env, useStore } from '../store';

const white = new THREE.MeshStandardMaterial({ color: '#f4f2ea', roughness: 0.75 });
const beakMat = new THREE.MeshStandardMaterial({ color: '#d9a723', roughness: 0.5 });
const legMat = new THREE.MeshStandardMaterial({ color: '#1c1c18', roughness: 0.6 });
const darkBird = new THREE.MeshStandardMaterial({ color: '#2a2c33', roughness: 0.6, side: THREE.DoubleSide });

function StandingEgret({ x, z, rot, seed }: { x: number; z: number; rot: number; seed: number }) {
  const head = useRef<THREE.Group>(null);
  const neckGeo = useMemo(() => {
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.13, 0.04, 0), new THREE.Vector3(0.2, 0.18, 0), new THREE.Vector3(0.12, 0.32, 0), new THREE.Vector3(0.2, 0.46, 0),
    ]);
    return new THREE.TubeGeometry(c, 16, 0.028, 6, false);
  }, []);
  const rnd = useMemo(() => mulberry32(seed), [seed]);
  const state = useRef({ next: 2 + rnd() * 4, peck: 0, turn: 0, tgtTurn: 0 });
  const y = Math.max(heightAt(x, z), WATER_Y - 0.25);
  useFrame((_, dt) => {
    const s = state.current;
    s.next -= dt;
    if (s.next < 0) {
      s.next = 3 + rnd() * 6;
      if (rnd() < 0.4) s.peck = 1; else s.tgtTurn = (rnd() - 0.5) * 1.4;
    }
    s.turn += (s.tgtTurn - s.turn) * dt * 2;
    s.peck = Math.max(0, s.peck - dt * 0.9);
    if (head.current) {
      head.current.rotation.y = s.turn * 0.5;
      head.current.rotation.z = -Math.sin(s.peck * Math.PI) * 1.1;
    }
  });
  return (
    <group position={[x, y, z]} rotation-y={rot} scale={1.15}>
      {[-0.035, 0.035].map((dz) => (
        <mesh key={dz} position={[0, 0.2, dz]} material={legMat}><cylinderGeometry args={[0.008, 0.008, 0.42, 4]} /></mesh>
      ))}
      <group position={[0, 0.48, 0]}>
        <mesh material={white} scale={[0.21, 0.11, 0.1]} rotation-z={0.35} castShadow><sphereGeometry args={[1, 14, 10]} /></mesh>
        <mesh position={[-0.2, -0.06, 0]} rotation-z={0.6} material={white}><coneGeometry args={[0.06, 0.16, 6]} /></mesh>
        <group ref={head}>
          <mesh geometry={neckGeo} material={white} castShadow />
          <group position={[0.2, 0.48, 0]}>
            <mesh material={white} scale={[0.055, 0.042, 0.04]}><sphereGeometry args={[1, 10, 8]} /></mesh>
            <mesh position={[0.1, -0.005, 0]} rotation-z={-Math.PI / 2} material={beakMat}><coneGeometry args={[0.014, 0.14, 6]} /></mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

function wingGeo(span: number, chord: number) {
  const s = new THREE.Shape();
  s.moveTo(0, -chord * 0.5);
  s.quadraticCurveTo(span * 0.5, -chord * 0.55, span, -chord * 0.1);
  s.quadraticCurveTo(span * 0.55, chord * 0.25, 0, chord * 0.5);
  s.closePath();
  const g = new THREE.ShapeGeometry(s, 6);
  g.rotateX(-Math.PI / 2); // wing lies in XZ, extends along +X
  g.rotateY(Math.PI / 2); // extends along -Z (left side), chord along X
  return g;
}

interface Flyer { r: number; rz: number; h: number; speed: number; phase: number; flap: number; size: number; small: boolean; bob: number }

export function FlyingBirds() {
  const birds = useMemo<Flyer[]>(() => {
    const rnd = mulberry32(55);
    const out: Flyer[] = [];
    for (let i = 0; i < 6; i++) out.push({ r: 11 + rnd() * 10, rz: 7 + rnd() * 6, h: 5 + rnd() * 9, speed: 4 + rnd() * 2, phase: rnd() * 6.28, flap: 3 + rnd(), size: 1, small: false, bob: rnd() * 6 });
    for (let i = 0; i < 9; i++) out.push({ r: 6 + rnd() * 12, rz: 4 + rnd() * 6, h: 1.2 + rnd() * 2.5, speed: 8 + rnd() * 4, phase: rnd() * 6.28, flap: 9 + rnd() * 3, size: 0.32, small: true, bob: rnd() * 6 });
    return out;
  }, []);
  const groups = useRef<(THREE.Group | null)[]>([]);
  const wingsL = useRef<(THREE.Mesh | null)[]>([]);
  const wingsR = useRef<(THREE.Mesh | null)[]>([]);
  const geoL = useMemo(() => wingGeo(0.75, 0.32), []);
  const geoR = useMemo(() => { const g = wingGeo(0.75, 0.32); g.scale(1, 1, -1); return g; }, []);
  const root = useRef<THREE.Group>(null);
  useFrame(() => {
    const t = env.elapsed;
    const vis = 1 - THREE.MathUtils.smoothstep(env.nightMix, 0.3, 0.7);
    if (root.current) root.current.visible = vis > 0.01;
    // daily rhythm: egrets leave and return to their roosts at dawn and dusk
    const h = useStore.getState().time;
    const g = (c: number, w: number) => Math.exp(-((h - c) ** 2) / (2 * w * w));
    const activity = 0.3 + 0.7 * Math.max(g(7, 1.2), g(17.2, 1.0));
    birds.forEach((b, i) => {
      const g = groups.current[i];
      if (!g) return;
      const w = b.speed / b.r;
      const a = b.phase + t * w * (i % 2 ? 1 : -1);
      const x = LAGOON.cx + Math.cos(a) * b.r * (LAGOON.rx / 17.5) + Math.sin(a * 2.3 + b.bob) * 2;
      const z = LAGOON.cz + Math.sin(a) * b.rz * (LAGOON.rz / 8.5);
      const y = WATER_Y + b.h + Math.sin(t * 0.6 + b.bob) * (b.small ? 0.8 : 1.5);
      const dx = -Math.sin(a) * b.r * (i % 2 ? 1 : -1), dz = Math.cos(a) * b.rz * (i % 2 ? 1 : -1);
      g.position.set(x, y, z);
      g.rotation.set(0, Math.atan2(-dz, dx), 0);
      const share = b.small ? Math.min(1, activity + 0.35) : activity;
      const on = THREE.MathUtils.smoothstep(share * birds.length - i * (b.small ? 0.5 : 1.6), 0, 1);
      g.scale.setScalar(b.size * vis * on);
      const glide = !b.small && Math.sin(t * 0.4 + b.bob) > 0.5;
      const f = glide ? 0.08 : Math.sin(t * b.flap + b.bob) * 0.65;
      if (wingsL.current[i]) wingsL.current[i]!.rotation.x = f;
      if (wingsR.current[i]) wingsR.current[i]!.rotation.x = -f;
    });
  });
  return (
    <group ref={root}>
      {birds.map((b, i) => (
        <group key={i} ref={(el) => { groups.current[i] = el; }}>
          <mesh material={b.small ? darkBird : white} scale={[0.3, 0.07, 0.07]} castShadow><sphereGeometry args={[1, 10, 8]} /></mesh>
          {!b.small && <mesh position={[0.3, 0.03, 0]} material={white} scale={[0.07, 0.05, 0.05]}><sphereGeometry args={[1, 8, 6]} /></mesh>}
          {!b.small && <mesh position={[0.4, 0.03, 0]} rotation-z={-Math.PI / 2} material={beakMat}><coneGeometry args={[0.013, 0.13, 5]} /></mesh>}
          {!b.small && <mesh position={[-0.45, -0.01, 0]} rotation-z={Math.PI / 2} material={legMat}><cylinderGeometry args={[0.006, 0.006, 0.35, 4]} /></mesh>}
          <mesh ref={(el) => { wingsL.current[i] = el; }} geometry={geoL} material={b.small ? darkBird : white} />
          <mesh ref={(el) => { wingsR.current[i] = el; }} geometry={geoR} material={b.small ? darkBird : white} />
        </group>
      ))}
    </group>
  );
}

export function Herons() {
  return (
    <>
      {HERONS.map(([x, z], i) => (
        <StandingEgret key={i} x={x} z={z} rot={Math.atan2(z - 0, -(x - 0)) + Math.PI * 0.3 * (i % 2 ? 1 : -1)} seed={i * 7 + 1} />
      ))}
    </>
  );
}

export function Dragonflies() {
  const anchors = useMemo(() => {
    const rnd = mulberry32(66);
    const out: THREE.Vector3[] = [];
    let k = 0;
    while (out.length < 7 && k++ < 500) {
      const x = -6 + rnd() * 16, z = -9 + rnd() * 6;
      if (!isWater(x, z)) continue;
      out.push(new THREE.Vector3(x, WATER_Y + 0.5 + rnd() * 0.6, z));
    }
    return out;
  }, []);
  const refs = useRef<(THREE.Group | null)[]>([]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2f6f8a', metalness: 0.6, roughness: 0.3 }), []);
  const wing = useMemo(() => new THREE.MeshStandardMaterial({ color: '#dfeef0', transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }), []);
  useFrame(() => {
    const t = env.elapsed;
    const vis = env.nightMix < 0.5;
    refs.current.forEach((g, i) => {
      if (!g) return;
      g.visible = vis;
      const a = anchors[i];
      const dart = Math.floor(t * 0.5 + i * 0.37);
      const ox = Math.sin(dart * 12.9898 + i) * 1.2, oz = Math.cos(dart * 78.233 + i) * 1.2;
      g.position.x += (a.x + ox + Math.sin(t * 7 + i) * 0.03 - g.position.x) * 0.06;
      g.position.z += (a.z + oz - g.position.z) * 0.06;
      g.position.y = a.y + Math.sin(t * 3 + i) * 0.08;
      g.rotation.y = Math.atan2(-(a.z + oz - g.position.z), a.x + ox - g.position.x);
      g.children[1].rotation.x = Math.sin(t * 60) * 0.5;
      g.children[2].rotation.x = -Math.sin(t * 60) * 0.5;
    });
  });
  return (
    <>
      {anchors.map((a, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el; }} position={a}>
          <mesh material={mat} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.006, 0.004, 0.09, 4]} /></mesh>
          <mesh material={wing} position={[0.01, 0.005, 0]}><boxGeometry args={[0.025, 0.002, 0.13]} /></mesh>
          <mesh material={wing} position={[-0.012, 0.005, 0]}><boxGeometry args={[0.022, 0.002, 0.11]} /></mesh>
        </group>
      ))}
    </>
  );
}

export function Fireflies() {
  const { geo, mat } = useMemo(() => {
    const rnd = mulberry32(77);
    const pos: number[] = [], ph: number[] = [];
    let k = 0;
    while (ph.length < 160 && k++ < 4000) {
      const x = -18 + rnd() * 30, z = -4 + rnd() * 26;
      const h = heightAt(x, z);
      if (isWater(x, z) || h < WATER_Y + 0.25) continue;
      if (x > -4.3 && x < 4.3 && z > -3.3 && z < 3.3) continue;
      pos.push(x, h + 0.3 + rnd() * 2.2, z);
      ph.push(rnd() * 100);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('phase', new THREE.Float32BufferAttribute(ph, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uNight: { value: 0 } },
      vertexShader: `attribute float phase; uniform float uTime; varying float vA;
        void main(){ vec3 p = position + vec3(sin(uTime*0.5+phase)*0.4, sin(uTime*0.7+phase*1.3)*0.25, cos(uTime*0.4+phase)*0.4);
          vec4 mv = modelViewMatrix * vec4(p,1.0); gl_Position = projectionMatrix * mv;
          vA = pow(max(0.0, sin(uTime*1.3 + phase)), 6.0);
          gl_PointSize = (2.0 + 9.0*vA) * (8.0 / -mv.z); }`,
      fragmentShader: `uniform float uNight; varying float vA;
        void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d) * vA * uNight;
          gl_FragColor = vec4(vec3(0.85,1.0,0.45) * a * 2.0, a); }`,
    });
    return { geo: g, mat: m };
  }, []);
  useFrame(() => {
    mat.uniforms.uTime.value = env.elapsed;
    mat.uniforms.uNight.value = env.nightMix;
  });
  return <points geometry={geo} material={mat} frustumCulled={false} />;
}
