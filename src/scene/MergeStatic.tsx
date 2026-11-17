// Runtime static batching: inside the named groups, meshes that never move and share a material are merged into
// one mesh (keeping castShadow / receiveShadow), so dozens of small boards, posts and brackets become a few draws.
// Interactive pieces (pointer handlers), instanced, multi-material and transparent meshes are left untouched.
import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

function hasHandlers(o: THREE.Object3D) {
  const h = (o as unknown as { __r3f?: { handlers?: Record<string, unknown> } }).__r3f?.handlers;
  return !!h && Object.keys(h).length > 0;
}

function mergeGroup(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map<string, { mat: THREE.Material; cast: boolean; recv: boolean; geos: THREE.BufferGeometry[]; src: THREE.Mesh[] }>();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || (m as THREE.InstancedMesh).isInstancedMesh || Array.isArray(m.material) || !m.visible) return;
    const mat = m.material as THREE.Material;
    if (mat.transparent || hasHandlers(m) || m.userData.noMerge) return;
    for (let p: THREE.Object3D | null = m; p && p !== root; p = p.parent) if (hasHandlers(p) || p.userData.noMerge) return;
    const attrs = Object.keys(m.geometry.attributes).filter((a) => a === 'position' || a === 'normal' || a === 'uv').sort().join(',');
    if (!attrs.includes('normal')) return;
    const key = `${mat.uuid}|${attrs}|${m.castShadow}|${m.receiveShadow}`;
    if (!buckets.has(key)) buckets.set(key, { mat, cast: m.castShadow, recv: m.receiveShadow, geos: [], src: [] });
    const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone());
    for (const a of Object.keys(g.attributes)) if (!attrs.split(',').includes(a)) g.deleteAttribute(a);
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
    const b = buckets.get(key)!;
    b.geos.push(g); b.src.push(m);
  });
  let saved = 0;
  for (const b of buckets.values()) {
    if (b.geos.length < 2) continue;
    const merged = mergeGeometries(b.geos);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, b.mat);
    mesh.castShadow = b.cast; mesh.receiveShadow = b.recv;
    mesh.name = 'merged';
    mesh.userData.noMerge = true;
    root.add(mesh);
    for (const s of b.src) s.visible = false;
    saved += b.src.length - 1;
  }
  return saved;
}

/** Merge the static parts of the named groups once the scene has mounted. */
export function MergeStatic({ names }: { names: string[] }) {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const id = window.setTimeout(() => {
      let saved = 0;
      for (const n of names) scene.traverse((o) => { if (o.name === n) saved += mergeGroup(o); });
      (window as unknown as { __merged?: number }).__merged = saved;
    }, 1500);
    return () => window.clearTimeout(id);
  }, [scene, names]);
  return null;
}
