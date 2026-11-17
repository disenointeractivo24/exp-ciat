// Carved bird inside each rotating prism: the official silhouette (SVG) cut from solid timber with rounded edges,
// painted in the colour of its sign, standing on a small round pedestal. It is seen through the prism's empty frame.
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { MAT } from './materials';

type Parsed = { shapes: THREE.Shape[]; color: THREE.Color; w: number; h: number };
const cache = new Map<string, Promise<Parsed>>();
function parse(url: string) {
  let p = cache.get(url);
  if (!p) {
    p = fetch(url).then((r) => r.text()).then((text) => {
      const data = new SVGLoader().parse(text);
      const vb = (/viewBox="([^"]+)"/.exec(text)?.[1] ?? '0 0 100 100').split(/\s+/).map(Number);
      const shapes: THREE.Shape[] = [];
      let color = new THREE.Color('#8bd0c0');
      for (const path of data.paths) {
        color = path.color.clone();
        shapes.push(...SVGLoader.createShapes(path));
      }
      return { shapes, color, w: vb[2], h: vb[3] };
    });
    cache.set(url, p);
  }
  return p;
}

/**
 * Upright sculpture, base at y = 0, centred on x, front toward +z.
 * Scaled to fit maxW × maxH (metres) so it never touches the prism faces.
 */
export function BirdSculpture({ url, maxW, maxH, depth = 0.045 }: { url: string; maxW: number; maxH: number; depth?: number }) {
  const [d, setD] = useState<Parsed | null>(null);
  useEffect(() => { let on = true; parse(url).then((v) => on && setD(v)); return () => { on = false; }; }, [url]);
  const built = useMemo(() => {
    if (!d) return null;
    const bev = 0.01;
    // measure the real outline (the SVG paths do not always match its viewBox)
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const sh of d.shapes) for (const p of sh.getPoints(8)) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
    const s = Math.min((maxW - 2 * bev) / (x1 - x0), (maxH - 2 * bev) / (y1 - y0));
    // extrude in SVG units (depth and bevel converted), then scale everything uniformly to metres
    const g = new THREE.ExtrudeGeometry(d.shapes, { depth: depth / s, bevelEnabled: true, bevelThickness: bev / s, bevelSize: (bev * 0.8) / s, bevelSegments: 3, curveSegments: 12 });
    // SVG y runs down: flip, scale to metres, base on y = 0, centred in x and z
    g.applyMatrix4(new THREE.Matrix4().makeScale(s, -s, -s)); // z also flipped so the winding (and normals) stay outward
    g.computeBoundingBox();
    const bb = g.boundingBox!;
    g.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
    g.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color: d.color, roughness: 0.6, metalness: 0 });
    return { g, mat };
  }, [d, maxW, maxH, depth]);
  if (!built) return null;
  const PED = 0.1;
  return (
    <group>
      {/* small round timber pedestal */}
      <mesh position={[0, PED / 2, 0]} material={MAT.woodDark} castShadow receiveShadow><cylinderGeometry args={[0.07, 0.085, PED, 20]} /></mesh>
      <mesh geometry={built.g} material={built.mat} position={[0, PED, 0]} castShadow receiveShadow />
    </group>
  );
}
