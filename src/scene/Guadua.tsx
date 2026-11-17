// Instanced guadua (bamboo) culms, shared by the tunnel, the stable fences and the deck.
import { useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { bambooTexture } from '../lib/tunnelTextures';

const UP = new THREE.Vector3(0, 1, 0);

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

/** Culm between two points given as [x, y, z]. */
export const culm = (a: [number, number, number], b: [number, number, number], r: number): Culm => ({ a: new THREE.Vector3(...a), b: new THREE.Vector3(...b), r });
