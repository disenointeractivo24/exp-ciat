import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GRASS, LILIES, PLANTS, REEDS, TREES, type TreeDef } from '../lib/vegData';
import { heightAt } from '../lib/terrain';
import { WATER_Y } from '../lib/layout';
import { barkTexture, grassTexture, leafCardTexture } from '../lib/textures';
import { leafOutline, mulberry32 } from '../lib/shapes';

const windTime = { value: 0 };

function addWind(mat: THREE.Material, strength: number, heightBased: boolean) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = windTime;
    shader.vertexShader = 'uniform float uWindTime;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 ip = instanceMatrix[3].xyz;
      #else
        vec3 ip = vec3(0.0);
      #endif
      float wk = ${heightBased ? 'max(position.y, 0.0)' : '1.0'};
      transformed.x += (sin(uWindTime * 1.35 + ip.x * 0.37 + ip.z * 0.21) + 0.4 * sin(uWindTime * 3.1 + ip.y * 2.0)) * ${strength.toFixed(3)} * wk;
      transformed.z += cos(uWindTime * 1.05 + ip.z * 0.31 + ip.x * 0.1) * ${(strength * 0.6).toFixed(3)} * wk;`,
    );
  };
  mat.customProgramCacheKey = () => 'wind' + strength + heightBased;
}

const up = new THREE.Vector3(0, 1, 0);
function limb(a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, seg = 7) {
  const len = a.distanceTo(b);
  const g = new THREE.CylinderGeometry(r1, r0, len, seg, 1, true);
  g.translate(0, len / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(up, b.clone().sub(a).normalize());
  g.applyQuaternion(q);
  g.translate(a.x, a.y, a.z);
  return g;
}

interface Card { p: THREE.Vector3; s: number; c: THREE.Color }

/** Palm frond: an arching ribbon, wide in the middle, split look via a zig-zag edge. */
function frond(base: THREE.Vector3, a: number, L: number, elev: number, droop: number, w: number) {
  const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
  const side = new THREE.Vector3(-dir.z, 0, dir.x);
  const pos: number[] = [], idx: number[] = [];
  const N = 10;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const c = base.clone().addScaledVector(dir, u * L * Math.cos(elev)).add(new THREE.Vector3(0, u * L * Math.sin(elev) - droop * u * u * L, 0));
    const hw = w * Math.sin(Math.PI * Math.pow(u, 0.7)) * (i % 2 ? 0.75 : 1);
    const l = c.clone().addScaledVector(side, -hw).add(new THREE.Vector3(0, -hw * 0.25, 0)), r = c.clone().addScaledVector(side, hw).add(new THREE.Vector3(0, -hw * 0.25, 0));
    pos.push(l.x, l.y, l.z, c.x, c.y + 0.02, c.z, r.x, r.y, r.z);
    if (i < N) { const k = i * 3; idx.push(k, k + 3, k + 1, k + 1, k + 3, k + 4, k + 1, k + 4, k + 2, k + 2, k + 4, k + 5); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function buildTree(t: TreeDef, trunks: THREE.BufferGeometry[], culms: THREE.BufferGeometry[], cards: Card[], bamboo: Card[], fronds: THREE.BufferGeometry[] = [], dry: THREE.BufferGeometry[] = []) {
  const rnd = mulberry32(t.seed + 99);
  const y0 = heightAt(t.x, t.z) - 0.1;
  const base = new THREE.Vector3(t.x, y0, t.z);
  const green = (k: number) => new THREE.Color().setHSL(0.24 + rnd() * 0.06, 0.45 + rnd() * 0.2, (0.42 + rnd() * 0.25) * k);
  if (t.kind === 'guadua') {
    const n = t.far ? 10 : 24;
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, r = rnd() * 0.7;
      const lean = 0.12 + rnd() * 0.25;
      const h = t.h * (0.7 + rnd() * 0.3);
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 5; k++) {
        const u = k / 5;
        const out = r + Math.pow(u, 1.8) * h * lean * 1.4;
        pts.push(new THREE.Vector3(t.x + Math.cos(a) * out, y0 + u * h, t.z + Math.sin(a) * out));
      }
      for (let k = 0; k < 5; k++) culms.push(limb(pts[k], pts[k + 1], 0.05 * (1 - k * 0.15), 0.05 * (1 - (k + 1) * 0.15), 6));
      for (let k = 0; k < (t.far ? 6 : 14); k++) {
        const u = 0.45 + rnd() * 0.55;
        const fi = Math.min(4, Math.floor(u * 5));
        const p = pts[fi].clone().lerp(pts[fi + 1], u * 5 - fi);
        p.x += (rnd() - 0.5) * 1.2; p.y += (rnd() - 0.5) * 0.8; p.z += (rnd() - 0.5) * 1.2;
        bamboo.push({ p, s: 0.9 + rnd() * 0.6, c: green(1.05) });
      }
    }
    return;
  }
  if (t.kind === 'palma') {
    // slender, slightly curved trunk; a crown of green fronds and a skirt of dry ones (as in the site photo)
    const lean = new THREE.Vector3((rnd() - 0.5) * 0.9, 0, (rnd() - 0.5) * 0.9);
    const mid = base.clone().add(new THREE.Vector3(0, t.h * 0.5, 0)).addScaledVector(lean, 0.35);
    const top = base.clone().add(new THREE.Vector3(0, t.h, 0)).add(lean);
    trunks.push(limb(base, mid, 0.2, 0.17, 8));
    trunks.push(limb(mid, top, 0.17, 0.14, 8));
    const n = 13 + Math.floor(rnd() * 4);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rnd() * 0.3;
      fronds.push(frond(top, a, 2.4 + rnd() * 0.8, 0.5 + rnd() * 0.5, 0.55 + rnd() * 0.25, 0.32));
    }
    for (let i = 0; i < 7; i++) {
      const a = rnd() * Math.PI * 2;
      dry.push(frond(top.clone().add(new THREE.Vector3(0, -0.3, 0)), a, 1.8 + rnd() * 0.6, -1.1 - rnd() * 0.3, 0.05, 0.22));
    }
    return;
  }
  const saman = t.kind === 'saman';
  const fork = base.clone().add(new THREE.Vector3((rnd() - 0.5) * 0.4, t.h * (saman ? 0.32 : 0.42), (rnd() - 0.5) * 0.4));
  const r0 = 0.18 + t.h * 0.025;
  trunks.push(limb(base, fork, r0, r0 * 0.75));
  const nb = saman ? 5 + Math.floor(rnd() * 2) : 4;
  const clumps: { c: THREE.Vector3; r: number }[] = [];
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * Math.PI * 2 + rnd() * 0.6;
    const spread = t.r * (saman ? 0.72 : 0.5) * (0.75 + rnd() * 0.3);
    const top = fork.clone().add(new THREE.Vector3(Math.cos(a) * spread, t.h * (saman ? 0.42 : 0.4) * (0.8 + rnd() * 0.3), Math.sin(a) * spread));
    const mid = fork.clone().lerp(top, 0.5).add(new THREE.Vector3(0, saman ? -0.4 : 0.3, 0));
    trunks.push(limb(fork, mid, r0 * 0.55, r0 * 0.38));
    trunks.push(limb(mid, top, r0 * 0.38, r0 * 0.16));
    clumps.push({ c: top.clone().add(new THREE.Vector3(0, 0.4, 0)), r: t.r * (saman ? 0.5 : 0.55) * (0.8 + rnd() * 0.35) });
  }
  clumps.push({ c: fork.clone().add(new THREE.Vector3(0, t.h * 0.5, 0)), r: t.r * 0.55 });
  const dens = t.far ? 3.2 : 15;
  for (const cl of clumps) {
    const n = Math.round(dens * cl.r * cl.r * (t.far ? 0.8 : 1));
    for (let i = 0; i < n; i++) {
      const th = rnd() * Math.PI * 2, ph = Math.acos(2 * rnd() - 1);
      const rr = cl.r * (0.45 + 0.55 * Math.sqrt(rnd()));
      const p = new THREE.Vector3(Math.sin(ph) * Math.cos(th) * rr, Math.cos(ph) * rr * (saman ? 0.48 : 0.75), Math.sin(ph) * Math.sin(th) * rr).add(cl.c);
      const shade = 0.75 + 0.35 * ((p.y - cl.c.y) / cl.r + 0.5);
      cards.push({ p, s: (t.far ? 3.0 : 1.3) * (0.8 + rnd() * 0.5), c: green(Math.min(1.15, shade)) });
    }
  }
}

function useInstances(ref: React.RefObject<THREE.InstancedMesh | null>, cards: Card[], seed: number, flat = false) {
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const rnd = mulberry32(seed);
    const o = new THREE.Object3D();
    cards.forEach((c, i) => {
      o.position.copy(c.p);
      if (flat) o.rotation.set(0, rnd() * Math.PI * 2, 0);
      else o.rotation.set(rnd() * Math.PI, rnd() * Math.PI * 2, rnd() * Math.PI);
      o.scale.setScalar(c.s);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, c.c);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [ref, cards, seed, flat]);
}

export function Trees() {
  const data = useMemo(() => {
    const trunks: THREE.BufferGeometry[] = [], culms: THREE.BufferGeometry[] = [], cards: Card[] = [], bamboo: Card[] = [], fronds: THREE.BufferGeometry[] = [], dry: THREE.BufferGeometry[] = [];
    for (const t of TREES) buildTree(t, trunks, culms, cards, bamboo, fronds, dry);
    return { trunk: mergeGeometries(trunks), culm: culms.length ? mergeGeometries(culms) : null, cards, bamboo, frond: fronds.length ? mergeGeometries(fronds) : null, dry: dry.length ? mergeGeometries(dry) : null };
  }, []);
  const leafMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ map: leafCardTexture('canopy'), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 });
    addWind(m, 0.05, false);
    return m;
  }, []);
  const bambooMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ map: leafCardTexture('bamboo'), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 });
    addWind(m, 0.08, false);
    return m;
  }, []);
  const barkMat = useMemo(() => new THREE.MeshStandardMaterial({ map: barkTexture(), roughness: 0.95, color: '#9c8a78' }), []);
  const frondMat = useMemo(() => { const m = new THREE.MeshStandardMaterial({ color: '#4f7a2e', roughness: 0.7, side: THREE.DoubleSide }); addWind(m, 0.04, false); return m; }, []);
  const card = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const leaves = useRef<THREE.InstancedMesh>(null);
  const bleaves = useRef<THREE.InstancedMesh>(null);
  useInstances(leaves, data.cards, 5);
  useInstances(bleaves, data.bamboo, 6);
  useFrame((_, dt) => { windTime.value += dt; });
  return (
    <group>
      <mesh geometry={data.trunk} material={barkMat} castShadow receiveShadow />
      {data.culm && (
        <mesh geometry={data.culm} castShadow>
          <meshStandardMaterial color="#7b9640" roughness={0.45} />
        </mesh>
      )}
      {data.frond && <mesh geometry={data.frond} material={frondMat} castShadow receiveShadow />}
      {data.dry && <mesh geometry={data.dry} castShadow><meshStandardMaterial color="#8a7350" roughness={0.95} side={THREE.DoubleSide} /></mesh>}
      <instancedMesh ref={leaves} args={[card, leafMat, data.cards.length]} castShadow receiveShadow frustumCulled={false} />
      <instancedMesh ref={bleaves} args={[card, bambooMat, data.bamboo.length]} castShadow frustumCulled={false} />
    </group>
  );
}

function crossQuads(w: number, h: number) {
  const parts = [0, 1, 2].map((i) => {
    const g = new THREE.PlaneGeometry(w, h);
    g.translate(0, h / 2, 0);
    g.rotateY((i * Math.PI) / 3);
    return g;
  });
  return mergeGeometries(parts);
}

export function GroundCover() {
  const grassGeo = useMemo(() => crossQuads(0.7, 0.55), []);
  const reedGeo = useMemo(() => crossQuads(0.55, 1.7), []);
  const grassMat = useMemo(() => { const m = new THREE.MeshStandardMaterial({ map: grassTexture('grass'), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.9 }); addWind(m, 0.08, true); return m; }, []);
  const reedMat = useMemo(() => { const m = new THREE.MeshStandardMaterial({ map: grassTexture('reed'), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85 }); addWind(m, 0.05, true); return m; }, []);
  const grass = useMemo(() => {
    const rnd = mulberry32(4);
    return GRASS.map((g) => ({ p: new THREE.Vector3(g.x, heightAt(g.x, g.z) - 0.02, g.z), s: g.s, c: new THREE.Color().setHSL(0.2 + rnd() * 0.06, 0.4, 0.4 + rnd() * 0.2) }));
  }, []);
  const reeds = useMemo(() => {
    const rnd = mulberry32(8);
    return REEDS.map((g) => ({ p: new THREE.Vector3(g.x, Math.max(heightAt(g.x, g.z), WATER_Y - 0.3) - 0.05, g.z), s: g.s, c: new THREE.Color().setHSL(0.18 + rnd() * 0.07, 0.42, 0.42 + rnd() * 0.15) }));
  }, []);
  const gref = useRef<THREE.InstancedMesh>(null);
  const rref = useRef<THREE.InstancedMesh>(null);
  useInstances(gref, grass, 1, true);
  useInstances(rref, reeds, 2, true);
  return (
    <group>
      <instancedMesh ref={gref} args={[grassGeo, grassMat, grass.length]} receiveShadow frustumCulled={false} />
      <instancedMesh ref={rref} args={[reedGeo, reedMat, reeds.length]} castShadow receiveShadow frustumCulled={false} />
      <Lilies />
      <Shrubs />
    </group>
  );
}

function Lilies() {
  const geo = useMemo(() => { const g = new THREE.CircleGeometry(0.22, 18, 0.35, Math.PI * 2 - 0.7); g.rotateX(-Math.PI / 2); return g; }, []);
  const ref = useRef<THREE.InstancedMesh>(null);
  const fref = useRef<THREE.InstancedMesh>(null);
  const flowers = useMemo(() => LILIES.filter((_, i) => i % 9 === 0), []);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    const rnd = mulberry32(12);
    LILIES.forEach((l, i) => {
      o.position.set(l.x, WATER_Y + 0.012 + (i % 3) * 0.002, l.z);
      o.rotation.set(0, l.rot, 0);
      o.scale.setScalar(l.s);
      o.updateMatrix();
      ref.current!.setMatrixAt(i, o.matrix);
      ref.current!.setColorAt(i, c.setHSL(0.24 + rnd() * 0.05, 0.5, 0.17 + rnd() * 0.08));
    });
    ref.current!.instanceMatrix.needsUpdate = true;
    if (ref.current!.instanceColor) ref.current!.instanceColor.needsUpdate = true;
    flowers.forEach((l, i) => {
      o.position.set(l.x + 0.05, WATER_Y + 0.05, l.z);
      o.rotation.set(Math.PI, 0, 0);
      o.scale.setScalar(1);
      o.updateMatrix();
      fref.current!.setMatrixAt(i, o.matrix);
    });
    fref.current!.instanceMatrix.needsUpdate = true;
  }, [flowers]);
  return (
    <group>
      <instancedMesh ref={ref} args={[geo, undefined, LILIES.length]} receiveShadow frustumCulled={false}>
        <meshStandardMaterial side={THREE.DoubleSide} roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={fref} args={[undefined, undefined, flowers.length]} frustumCulled={false}>
        <coneGeometry args={[0.07, 0.09, 7, 1, true]} />
        <meshStandardMaterial color="#f3e6ef" emissive="#f7d6e6" emissiveIntensity={0.1} side={THREE.DoubleSide} />
      </instancedMesh>
    </group>
  );
}

function Shrubs() {
  const data = useMemo(() => {
    const rnd = mulberry32(17);
    const leafM: THREE.Matrix4[] = [], petM: THREE.Matrix4[] = [], col: THREE.Color[] = [], kinds: number[] = [];
    const o = new THREE.Object3D();
    for (const p of PLANTS) {
      const y = heightAt(p.x, p.z) - 0.02;
      const n = p.kind === 'oreja' ? 6 + Math.floor(rnd() * 3) : 7;
      for (let k = 0; k < n; k++) {
        const yaw = p.rot + (k / n) * Math.PI * 2 + (rnd() - 0.5) * 0.5;
        const tilt = p.kind === 'oreja' ? 0.25 + rnd() * 0.35 : 0.12 + rnd() * 0.2;
        const len = p.s * (p.kind === 'oreja' ? 0.6 + rnd() * 0.5 : 0.9 + rnd() * 0.6);
        const dir = new THREE.Vector3(Math.sin(yaw) * Math.sin(tilt), Math.cos(tilt), Math.cos(yaw) * Math.sin(tilt));
        const top = new THREE.Vector3(p.x, y, p.z).addScaledVector(dir, len);
        // petiole
        o.position.set(p.x, y, p.z);
        o.quaternion.setFromUnitVectors(up, dir);
        o.scale.set(1, len, 1);
        o.updateMatrix();
        petM.push(o.matrix.clone());
        // blade
        o.position.copy(top);
        o.rotation.set(-(p.kind === 'oreja' ? 0.35 + rnd() * 0.5 : 0.9 + rnd() * 0.4), yaw, 0, 'YXZ');
        o.scale.setScalar(p.s * (p.kind === 'oreja' ? 0.75 + rnd() * 0.3 : 0.9 + rnd() * 0.3));
        o.updateMatrix();
        leafM.push(o.matrix.clone());
        col.push(new THREE.Color().setHSL(0.27 + rnd() * 0.05, 0.55, 0.16 + rnd() * 0.1));
        kinds.push(p.kind === 'oreja' ? 0 : 1);
      }
    }
    return { leafM, petM, col, kinds };
  }, []);
  const bladeGeo = (width: number) => {
    const outline = leafOutline(1, width, 16);
    const g = new THREE.ShapeGeometry(new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y + 0.5))), 1);
    // leaf axis +Y -> +Z, add droop and cupping
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      pos.setXYZ(i, x, -0.38 * y * y + 0.12 * x * x * 4, y);
    }
    g.computeVertexNormals();
    return g;
  };
  const geos = useMemo(() => [bladeGeo(0.7), bladeGeo(0.3)], []);
  const pet = useMemo(() => { const g = new THREE.CylinderGeometry(0.008, 0.014, 1, 5); g.translate(0, 0.5, 0); return g; }, []);
  const mats = useMemo(() => { const m = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.6 }); addWind(m, 0.03, true); return m; }, []);
  const refs = [useRef<THREE.InstancedMesh>(null), useRef<THREE.InstancedMesh>(null)];
  const pref = useRef<THREE.InstancedMesh>(null);
  const counts = [data.kinds.filter((k) => k === 0).length, data.kinds.filter((k) => k === 1).length];
  useLayoutEffect(() => {
    const idx = [0, 0];
    data.leafM.forEach((m, i) => {
      const k = data.kinds[i];
      refs[k].current!.setMatrixAt(idx[k], m);
      refs[k].current!.setColorAt(idx[k], data.col[i]);
      idx[k]++;
    });
    refs.forEach((r) => { r.current!.instanceMatrix.needsUpdate = true; if (r.current!.instanceColor) r.current!.instanceColor.needsUpdate = true; });
    data.petM.forEach((m, i) => pref.current!.setMatrixAt(i, m));
    pref.current!.instanceMatrix.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);
  return (
    <group>
      <instancedMesh ref={refs[0]} args={[geos[0], mats, counts[0]]} castShadow receiveShadow frustumCulled={false} />
      <instancedMesh ref={refs[1]} args={[geos[1], mats, counts[1]]} castShadow receiveShadow frustumCulled={false} />
      <instancedMesh ref={pref} args={[pet, undefined, data.petM.length]} frustumCulled={false}>
        <meshStandardMaterial color="#5f7a34" roughness={0.7} />
      </instancedMesh>
    </group>
  );
}
