// Official signage pieces that did not replace an existing sign: wayfinding boards (Túnel, Laguna, Regreso),
// place icons on posts, the animal cut-outs that point the way (focha «Túnel», vaca «Establo», pato «Laguna»,
// urutau «Deck», garza «Regreso»), and the bird silhouettes that the tunnel roof casts as shadows.
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { heightAt } from '../lib/terrain';
import { OPEN_FROM, PADDOCK, TUNNEL_H, frameAt, widthAt } from '../lib/tunnel';
import { WATER_Y } from '../lib/layout';
import { ASPECT, SIGNAGE, signTex } from '../lib/signage';
import { MAT } from './materials';
import { T } from './Deck';
import { Culms, culm } from './Guadua';

// ---------------------------------------------------------------- animal cut-outs (wayfinding)
type AnimalKey = keyof typeof SIGNAGE.animales;
/** Laser-cut board in the animal's outline, printed on the front, plain dark on the back, on a guadua post. */
/** The urutau «Deck» art has its arrow pointing right (↗); here the deck is to the left, so only the arrow is
 *  mirrored (↖) — the lettering stays as drawn. Pixel box of the arrow in the 900 × 1362 artwork. */
const ARROW_BOX = { x: 418, y: 204, w: 108, h: 110 };
const flippedCache = new Map<string, THREE.Texture>();
function arrowFlipped(url: string) {
  let t = flippedCache.get(url);
  if (t) return t;
  const cv = document.createElement('canvas');
  cv.width = 900; cv.height = 1362; // final size up front: the GPU texture is allocated once
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const img = new Image();
  img.onload = () => {
    const g = cv.getContext('2d')!;
    g.drawImage(img, 0, 0, cv.width, cv.height);
    const k = 1, { x, y, w, h } = ARROW_BOX;
    const part = g.getImageData(x * k, y * k, w * k, h * k);
    const tmp = document.createElement('canvas'); tmp.width = part.width; tmp.height = part.height;
    tmp.getContext('2d')!.putImageData(part, 0, 0);
    g.clearRect(x * k, y * k, w * k, h * k);
    g.save(); g.translate((x + w) * k, y * k); g.scale(-1, 1); g.drawImage(tmp, 0, 0); g.restore();
    tex.needsUpdate = true;
  };
  img.src = url;
  flippedCache.set(url, tex);
  t = tex;
  return t;
}

function AnimalCutout({ k, height, pos, yaw, y, lift = 0.3, post = true }: { k: AnimalKey; height: number; pos: [number, number]; yaw: number; y?: number; lift?: number; post?: boolean }) {
  const a = SIGNAGE.animales[k];
  const mats = useMemo(() => {
    const t = k === 'urutau' ? arrowFlipped(a.url) : signTex(a.url);
    return {
      front: new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.5, roughness: 0.55 }),
      back: new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.5, roughness: 0.65, color: '#33463a', side: THREE.BackSide }),
    };
  }, [a.url]);
  const w = height * a.aspect, gy = y ?? heightAt(pos[0], pos[1]);
  const posts = useMemo(() => [culm([0, 0, -0.05], [0, lift + height * 0.7, -0.05], 0.04)], [lift, height]);
  return (
    <group position={[pos[0], gy, pos[1]]} rotation-y={yaw}>
      {post && <Culms culms={posts} name={'Senal_' + k + '_poste'} />}
      <mesh position={[0, lift + height / 2, 0.006]} material={mats.front} castShadow><planeGeometry args={[w, height]} /></mesh>
      <mesh position={[0, lift + height / 2, -0.006]} material={mats.back}><planeGeometry args={[w, height]} /></mesh>
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
    const f = new THREE.MeshStandardMaterial({ map: signTex(url), roughness: 0.6, alphaTest: 0.5 });
    const b = back ? new THREE.MeshStandardMaterial({ map: signTex(back), roughness: 0.6, alphaTest: 0.5 }) : MAT.forest;
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
  const mats = useMemo(() => urls.map((u) => { const m = new THREE.MeshStandardMaterial({ map: signTex(u), roughness: 0.6, alphaTest: 0.5 }); return [MAT.forest, MAT.forest, MAT.forest, MAT.forest, m, m]; }), [urls]);
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
    const s = OPEN_FROM - 4, f1 = frameAt(s), fs = frameAt(OPEN_FROM - 16); // before the bend; square to the straight run of the tunnel
    const lag = f1.p.clone().addScaledVector(f1.r, -(widthAt(s) / 2 + 0.7));
    const fulicaAt = f0.p.clone().addScaledVector(f0.r, w0 / 2 + 1.5).addScaledVector(f0.t, -0.8); // beside the portal, past the icon post
    return { header, headerYaw: yawFacing(out.x, out.z), iconAt, fulicaAt, lag, lagYaw: yawFacing(-fs.t.x, -fs.t.z) };
  }, []);
  const headerMat = useMemo(() => [MAT.forest, MAT.forest, MAT.forest, MAT.forest, new THREE.MeshStandardMaterial({ map: signTex(SIGNAGE.hTunel), roughness: 0.6, alphaTest: 0.5 }), MAT.forest], []);
  const HW = 1.5, HH = HW / ASPECT.horizontal;
  return (
    <group name="Senaletica">
      {/* tunnel entrance */}
      <group position={tunnel.header} rotation-y={tunnel.headerYaw}>
        <mesh material={headerMat} castShadow><boxGeometry args={[HW, HH, 0.04]} /></mesh>
        {[-1, 1].map((sx) => <T key={sx} s={[0.06, 0.6, 0.06]} p={[sx * 0.55, -HH / 2 - 0.15, -0.04]} m={MAT.woodWarm} />)}
      </group>
      <IconPost urls={[SIGNAGE.iconos.tunel]} pos={[tunnel.iconAt.x, tunnel.iconAt.z]} yaw={tunnel.headerYaw} />
      {/* focha «Túnel filtros de luz ↑» at the entrance, facing the road */}
      <AnimalCutout k="fulica" height={1.0} pos={[tunnel.fulicaAt.x, tunnel.fulicaAt.z]} yaw={tunnel.headerYaw} />
      {/* stable: icon on the paddock corner next to the entrance, facing the road */}
      <IconPost urls={[SIGNAGE.iconos.establo]} pos={[PADDOCK.x1 - 0.8, PADDOCK.z0 - 0.6]} yaw={Math.PI} />
      <AnimalCutout k="vaca" height={0.95} pos={[PADDOCK.x1 - 3.2, PADDOCK.z0 - 0.7]} yaw={Math.PI} lift={0.2} />
      {/* lagoon: board where the tunnel opens, the duck «Laguna» cut-out floating in front of the deck, icon post */}
      <PostBoard url={SIGNAGE.hLaguna} aspect={ASPECT.horizontal} width={0.9} y={1.25} pos={[tunnel.lag.x, tunnel.lag.z]} yaw={tunnel.lagYaw} />
      <AnimalCutout k="pato" height={0.6} pos={[1.8, -11]} y={WATER_Y - 0.12} lift={0} post={false} yaw={-0.1} />
      <IconPost urls={[SIGNAGE.iconos.laguna]} pos={[-10.4, -3.2]} yaw={0.4} />
      {/* urutau «Deck ↗» where the steps start climbing, facing whoever comes out of the tunnel */}
      <AnimalCutout k="urutau" height={1.25} pos={[-13.6, 10.25]} yaw={-Math.PI / 2} />
      {/* deck junction at the end of the stepped zone */}
      <IconPost urls={[SIGNAGE.iconos.deck]} pos={[-3.0, 10.05]} yaw={-Math.PI / 2} />
      {/* «Regreso ←»: heron cut-out beside the steps, parallel to them, so its arrow points west, back toward the tunnel;
          and the board on the landing at the foot of the deck ramp */}
      <AnimalCutout k="garza" height={1.5} pos={[-5.6, 6.3]} yaw={0} lift={0.15} />
      <PostBoard url={SIGNAGE.hRegreso} aspect={ASPECT.horizontal} width={0.9} y={1.25} pos={[-1.55, 10.05]} yaw={0} />
    </group>
  );
}
