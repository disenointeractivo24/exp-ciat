// Official signage pieces that did not replace an existing sign: wayfinding boards (Túnel, Laguna, Regreso),
// place icons on posts, and the extruded cut-outs (garza «Regreso», pato «Laguna», and the bird silhouettes that
// the tunnel roof casts as shadows — «¿Quién proyecta esta silueta?»).
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { heightAt } from '../lib/terrain';
import { OPEN_FROM, PADDOCK, TUNNEL_H, frameAt, widthAt } from '../lib/tunnel';
import { WATER_Y } from '../lib/layout';
import { ASPECT, SIGNAGE, signTex } from '../lib/signage';
import { MAT } from './materials';
import { T } from './Deck';

// ---------------------------------------------------------------- SVG → extruded cut-out (+ printed face)
interface SvgData { shapes: { shape: THREE.Shape; color: THREE.Color }[]; w: number; h: number; face: THREE.Texture | null }
const svgCache = new Map<string, Promise<SvgData>>();
function loadSvg(url: string, withFace: boolean): Promise<SvgData> {
  const key = url + withFace;
  let p = svgCache.get(key);
  if (!p) {
    p = fetch(url).then((r) => r.text()).then(async (text) => {
      const data = new SVGLoader().parse(text);
      const vb = (/viewBox="([^"]+)"/.exec(text)?.[1] ?? '0 0 100 100').split(/\s+/).map(Number);
      const shapes: SvgData['shapes'] = [];
      for (const path of data.paths) {
        const c = path.color;
        if (c.r > 0.97 && c.g > 0.97 && c.b > 0.97) continue; // white inner graphics go on the printed face
        for (const s of SVGLoader.createShapes(path)) shapes.push({ shape: s, color: c.clone() });
      }
      let face: THREE.Texture | null = null;
      if (withFace) {
        // print the artwork on the front face; the fabrication font (Sora) is replaced by a common sans-serif
        const svg = text.replace(/font-family:[^;]+;/g, 'font-family: Arial, Helvetica, sans-serif;');
        const img = new Image();
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        await img.decode();
        const k = 2048 / Math.max(vb[2], vb[3]);
        const cv = document.createElement('canvas');
        cv.width = Math.round(vb[2] * k); cv.height = Math.round(vb[3] * k);
        cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height);
        face = new THREE.CanvasTexture(cv);
        face.colorSpace = THREE.SRGBColorSpace; face.anisotropy = 8;
      }
      return { shapes, w: vb[2], h: vb[3], face };
    });
    svgCache.set(key, p);
  }
  return p;
}
function useSvg(url: string, withFace: boolean) {
  const [d, setD] = useState<SvgData | null>(null);
  useEffect(() => { let on = true; loadSvg(url, withFace).then((v) => on && setD(v)); return () => { on = false; }; }, [url, withFace]);
  return d;
}

/** Upright cut-out: base at y = 0, centred on x, front face toward +z. `height` in metres. */
function SvgCutout({ url, height, depth = 0.05, face = false, color }: { url: string; height: number; depth?: number; face?: boolean; color?: string }) {
  const d = useSvg(url, face);
  const built = useMemo(() => {
    if (!d) return null;
    const s = height / d.h;
    const groups = new Map<string, THREE.Shape[]>();
    for (const { shape, color: c } of d.shapes) { const k = color ?? '#' + c.getHexString(); if (!groups.has(k)) groups.set(k, []); groups.get(k)!.push(shape); }
    const meshes = [...groups].map(([col, shapes]) => {
      const g = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: false, curveSegments: 10 });
      // SVG y runs down: flip, scale to metres, base on the ground, centred
      g.applyMatrix4(new THREE.Matrix4().makeScale(s, -s, 1));
      g.translate(-(d.w * s) / 2, height, -depth / 2);
      g.computeVertexNormals();
      return { g, m: new THREE.MeshStandardMaterial({ color: col, roughness: 0.55, metalness: 0.1, side: THREE.DoubleSide }) };
    });
    const faceMat = d.face ? new THREE.MeshStandardMaterial({ map: d.face, transparent: true, alphaTest: 0.4, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2 }) : null;
    return { meshes, faceMat, w: d.w * s };
  }, [d, height, depth, color]);
  if (!built) return null;
  return (
    <group>
      {built.meshes.map(({ g, m }, i) => <mesh key={i} geometry={g} material={m} castShadow receiveShadow />)}
      {built.faceMat && <mesh position={[0, height / 2, depth / 2 + 0.002]} material={built.faceMat}><planeGeometry args={[built.w, height]} /></mesh>}
    </group>
  );
}

/** Flat cut-out lying in the tunnel roof (bird silhouettes): its shadow draws the bird on the plank floor. */
// Laser-cut sheet: the SVG is rasterised and cut with an alpha test (the shadow pass uses the same cut-out).
const rasterCache = new Map<string, Promise<{ tex: THREE.Texture; aspect: number }>>();
function rasterSvg(url: string) {
  let p = rasterCache.get(url);
  if (!p) {
    p = (async () => {
      const text = await (await fetch(url)).text();
      const vb = (/viewBox="([^"]+)"/.exec(text)?.[1] ?? '0 0 60 100').split(/\s+/).map(Number);
      const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(text); await img.decode();
      const H = 1024, aspect = vb[2] / vb[3];
      const cv = document.createElement('canvas'); cv.height = H; cv.width = Math.round(H * aspect);
      cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height);
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
      return { tex, aspect };
    })();
    rasterCache.set(url, p);
  }
  return p;
}
export function RoofSilhouette({ k, pos, yaw }: { k: number; pos: THREE.Vector3; yaw: number }) {
  const url = [SIGNAGE.svg.siluetaUrutau, SIGNAGE.svg.siluetaGarza][k % 2];
  const [r, setR] = useState<{ tex: THREE.Texture; aspect: number } | null>(null);
  useEffect(() => { let on = true; rasterSvg(url).then((v) => on && setR(v)); return () => { on = false; }; }, [url]);
  const mat = useMemo(() => r && new THREE.MeshStandardMaterial({ map: r.tex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.5 }), [r]);
  if (!r || !mat) return null;
  const L = 1.35; // bird length along the tunnel (m)
  return (
    <group position={pos} rotation-y={yaw}>
      {/* lying flat in the open roof bay; at midday its shadow draws the bird on the planks */}
      <mesh rotation-x={-Math.PI / 2} material={mat} castShadow><planeGeometry args={[L * r.aspect, L]} /></mesh>
    </group>
  );
}

// ---------------------------------------------------------------- boards and posts
function PostBoard({ url, aspect, width, y, pos, yaw, back }: { url: string; aspect: number; width: number; y: number; pos: [number, number]; yaw: number; back?: string }) {
  const mats = useMemo(() => {
    const f = new THREE.MeshStandardMaterial({ map: signTex(url), roughness: 0.6 });
    const b = back ? new THREE.MeshStandardMaterial({ map: signTex(back), roughness: 0.6 }) : MAT.forest;
    return [MAT.forest, MAT.forest, MAT.forest, MAT.forest, f, b];
  }, [url, back]);
  const h = width / aspect, gy = heightAt(pos[0], pos[1]);
  return (
    <group position={[pos[0], gy, pos[1]]} rotation-y={yaw}>
      {[-1, 1].map((sx) => <T key={sx} s={[0.09, y + h / 2, 0.09]} p={[sx * (width / 2 + 0.05), (y + h / 2) / 2, 0]} m={MAT.woodWarm} />)}
      <mesh position={[0, y, 0]} material={mats} castShadow><boxGeometry args={[width, h, 0.04]} /></mesh>
    </group>
  );
}

/** Square place icon(s) on a single post, printed on both faces. */
function IconPost({ urls, pos, yaw, gy }: { urls: string[]; pos: [number, number]; yaw: number; gy?: number }) {
  const mats = useMemo(() => urls.map((u) => { const m = new THREE.MeshStandardMaterial({ map: signTex(u), roughness: 0.6 }); return [MAT.forest, MAT.forest, MAT.forest, MAT.forest, m, m]; }), [urls]);
  const S = 0.42, top = 1.55;
  const y0 = gy ?? heightAt(pos[0], pos[1]);
  return (
    <group position={[pos[0], y0, pos[1]]} rotation-y={yaw}>
      <T s={[0.08, top + S / 2, 0.08]} p={[0, (top + S / 2) / 2, -0.045]} m={MAT.woodWarm} />
      {mats.map((m, i) => <mesh key={i} position={[0, top - i * (S + 0.06), 0]} material={m} castShadow><boxGeometry args={[S, S, 0.03]} /></mesh>)}
    </group>
  );
}

const yawFacing = (dx: number, dz: number) => Math.atan2(dx, dz); // rotation-y that turns +z toward (dx, dz)

export function SignageExtras() {
  const tunnel = useMemo(() => {
    // entrance portal: «Túnel» board on the first frame, facing the road; place icon beside the portal
    const f0 = frameAt(0.05), w0 = widthAt(0);
    const fy = heightAt(f0.p.x, f0.p.z) + 0.05;
    const out = f0.t.clone().negate();
    const header = f0.p.clone().addScaledVector(f0.t, -0.12).setY(fy + TUNNEL_H + 0.5);
    const iconAt = f0.p.clone().addScaledVector(f0.r, w0 / 2 + 0.4).addScaledVector(f0.t, -0.3); // right of the portal (the mupi stands on the left)
    // where the tunnel opens onto the lagoon: «Laguna» board on the lagoon (left) side, facing the walker
    const s = OPEN_FROM - 3, f1 = frameAt(s);
    const lag = f1.p.clone().addScaledVector(f1.r, -(widthAt(s) / 2 + 0.7));
    return { header, headerYaw: yawFacing(out.x, out.z), iconAt, lag, lagYaw: yawFacing(-f1.t.x, -f1.t.z) };
  }, []);
  const headerMat = useMemo(() => [MAT.forest, MAT.forest, MAT.forest, MAT.forest, new THREE.MeshStandardMaterial({ map: signTex(SIGNAGE.hTunel), roughness: 0.6 }), MAT.forest], []);
  const HW = 1.5, HH = HW / ASPECT.horizontal;
  return (
    <group name="Senaletica">
      {/* tunnel entrance */}
      <group position={tunnel.header} rotation-y={tunnel.headerYaw}>
        <mesh material={headerMat} castShadow><boxGeometry args={[HW, HH, 0.04]} /></mesh>
        {[-1, 1].map((sx) => <T key={sx} s={[0.06, 0.6, 0.06]} p={[sx * 0.55, -HH / 2 - 0.15, -0.04]} m={MAT.woodWarm} />)}
      </group>
      <IconPost urls={[SIGNAGE.iconos.tunel]} pos={[tunnel.iconAt.x, tunnel.iconAt.z]} yaw={tunnel.headerYaw} />
      {/* stable: icon on the paddock corner next to the entrance, facing the road */}
      <IconPost urls={[SIGNAGE.iconos.establo]} pos={[PADDOCK.x1 - 0.8, PADDOCK.z0 - 0.6]} yaw={Math.PI} />
      {/* lagoon: board where the tunnel opens, the duck «Laguna» cut-out floating in front of the deck, icon post */}
      <PostBoard url={SIGNAGE.hLaguna} aspect={ASPECT.horizontal} width={0.9} y={1.25} pos={[tunnel.lag.x, tunnel.lag.z]} yaw={tunnel.lagYaw} />
      <group position={[1.8, WATER_Y - 0.08, -11]} rotation-y={-0.1}><SvgCutout url={SIGNAGE.svg.pato} height={1.1} depth={0.1} face /></group>
      <IconPost urls={[SIGNAGE.iconos.laguna]} pos={[-10.4, -3.2]} yaw={0.4} />
      {/* deck / tower junction at the end of the stepped zone */}
      <IconPost urls={[SIGNAGE.iconos.deck, SIGNAGE.iconos.torre]} pos={[-2.25, 12.15]} yaw={-Math.PI / 2} />
      {/* «Regreso»: heron cut-out at the deck / tower junction, facing the way back along the steps, and the board at the foot of the tower ramp */}
      <group position={[-3.7, heightAt(-3.7, 12.9), 12.9]} rotation-y={Math.PI / 2}><SvgCutout url={SIGNAGE.svg.garza} height={1.9} depth={0.07} face /></group>
      <PostBoard url={SIGNAGE.hRegreso} aspect={ASPECT.horizontal} width={0.9} y={1.25} pos={[2.1, 10.2]} yaw={0} />
    </group>
  );
}
