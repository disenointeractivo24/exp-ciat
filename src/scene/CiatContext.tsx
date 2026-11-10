// Real surroundings of the site, from the CIAT DWG plan ("CIAT PLANTAAA.dwg"): roads, buildings at their recorded
// footprints and heights (drawn in the project palette), green areas and other bodies of water, in scene space.
// The plan's individual trees are added to the scene's own tree system (lib/vegData.ts), so they share its style
// (see src/data/ciatContext.json). The modelled site (terrain, lagoon, tunnel, deck, tower) sits at the user's pins.
import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import ctx from '../data/ciatContext.json';
import { PALETTE } from '../lib/layout';
import { heightAt } from '../lib/terrain';
import { groundTexture } from '../lib/textures';

type P = [number, number];
const SITE = 98; // half-size of the modelled terrain square: the plan ground starts outside it

/** Plan elements follow the modelled terrain where they cross it, and sit at 0 outside. */
const groundAt = (x: number, z: number) => {
  if (Math.abs(x) >= SITE + 2 || Math.abs(z) >= SITE + 2) return 0;
  // highest terrain point around, plus a small lift, so the coarser terrain mesh never pokes through a road
  let h = 0;
  for (const [dx, dz] of [[0, 0], [1.2, 0], [-1.2, 0], [0, 1.2], [0, -1.2]]) h = Math.max(h, heightAt(x + dx, z + dz));
  return h + 0.08;
};

/** Resample a polyline every 2 m so ribbons follow the terrain. */
function densify(line: P[]) { const out: P[] = []; for (let i = 0; i < line.length - 1; i++) { const [ax, az] = line[i], [bx, bz] = line[i + 1]; const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 1)); for (let k = 0; k < n; k++) out.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]); } out.push(line[line.length - 1]); return out; }

function ribbon(lineIn: P[], width: number, y: number) {
  const line = densify(lineIn);
  const pos: number[] = [], idx: number[] = [];
  for (let i = 0; i < line.length; i++) {
    const a = line[Math.max(0, i - 1)], b = line[Math.min(line.length - 1, i + 1)];
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
    const nx = -dz / l, nz = dx / l;
    const ax = line[i][0] + nx * width / 2, az = line[i][1] + nz * width / 2, bx = line[i][0] - nx * width / 2, bz = line[i][1] - nz * width / 2;
    pos.push(ax, groundAt(ax, az) + y, az, bx, groundAt(bx, bz) + y, bz);
    if (i < line.length - 1) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Vertical wall band along a footprint, UVs in metres (u along the perimeter, v up) for the facade texture. */
function walls(poly: P[], y0: number, y1: number) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  let acc = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const k = pos.length / 3;
    pos.push(a[0], y0, a[1], b[0], y0, b[1], b[0], y1, b[1], a[0], y1, a[1]);
    uv.push(acc / 3, y0 / 3, (acc + len) / 3, y0 / 3, (acc + len) / 3, y1 / 3, acc / 3, y1 / 3);
    idx.push(k, k + 1, k + 2, k, k + 2, k + 3);
    acc += len;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** One 3 × 3 m facade module: cream render, a dark window with a forest-green frame and a lime sill. */
function facadeTexture() {
  const S = 256, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ece5d3'; g.fillRect(0, 0, S, S);
  const wx0 = (0.55 / 3) * S, wx1 = (2.45 / 3) * S, wy0 = ((3 - 2.35) / 3) * S, wy1 = ((3 - 0.95) / 3) * S;
  g.fillStyle = PALETTE.forest; g.fillRect(wx0 - 5, wy0 - 5, wx1 - wx0 + 10, wy1 - wy0 + 10);
  g.fillStyle = '#2f3d37'; g.fillRect(wx0, wy0, wx1 - wx0, wy1 - wy0);
  g.fillStyle = 'rgba(214,230,240,0.18)'; g.fillRect(wx0, wy0, (wx1 - wx0) * 0.45, wy1 - wy0);
  g.fillStyle = PALETTE.forest; g.fillRect((wx0 + wx1) / 2 - 2, wy0, 4, wy1 - wy0);
  g.fillStyle = PALETTE.lime; g.fillRect(wx0 - 8, wy1 + 4, wx1 - wx0 + 16, 5);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}

function flatPoly(poly: P[], y: number) {
  const shape = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  return g;
}

export function CiatContext() {
  const geo = useMemo(() => {
    const roads = mergeGeometries((ctx.roads as P[][]).filter((l) => l.length > 1).map((l) => ribbon(l, 6, 0.12)));
    const rail = (ctx.rail as P[][]).length ? mergeGeometries((ctx.rail as P[][]).filter((l) => l.length > 1).map((l) => ribbon(l, 1.6, 0.05))) : null;
    const green = (ctx.green as P[][]).length ? mergeGeometries((ctx.green as P[][]).map((p) => flatPoly(p, 0.02))) : null;
    const water = (ctx.water as P[][]).length ? mergeGeometries((ctx.water as P[][]).map((p) => flatPoly(p, 0.03))) : null;
    const B = ctx.buildings as { p: P[]; h: number }[];
    const facade = mergeGeometries(B.map(({ p, h }) => walls(p, 0.6, h)));
    const plinth = mergeGeometries(B.map(({ p }) => walls(p, 0, 0.6)));
    const parapet = mergeGeometries(B.map(({ p, h }) => walls(p, h, h + 0.45)));
    const roofs = mergeGeometries(B.map(({ p, h }) => { const g = flatPoly(p, h + 0.05); g.deleteAttribute('uv'); return g; }));
    return { roads, rail, green, water, facade, plinth, parapet, roofs };
  }, []);
  const facadeMat = useMemo(() => { const t = facadeTexture(); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.8, side: THREE.DoubleSide }); }, []);
  // same grass texture and tint as the modelled terrain, so the edge of the site does not show
  const groundMat = useMemo(() => {
    const t = groundTexture().clone();
    t.needsUpdate = true;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(t.repeat.x / 200, t.repeat.y / 200); // ShapeGeometry UVs are in metres; the terrain maps its texture over 200 m
    return new THREE.MeshStandardMaterial({ map: t, color: '#7f9a52', roughness: 0.95 });
  }, []);
  // ground of the plan: a large field around the modelled site (a square hole so it never covers the terrain)
  const ground = useMemo(() => {
    const S = 1600;
    const outer = new THREE.Shape([new THREE.Vector2(-S, -S), new THREE.Vector2(S, -S), new THREE.Vector2(S, S), new THREE.Vector2(-S, S)]);
    outer.holes.push(new THREE.Path([new THREE.Vector2(-SITE, -SITE), new THREE.Vector2(-SITE, SITE), new THREE.Vector2(SITE, SITE), new THREE.Vector2(SITE, -SITE)]));
    const g = new THREE.ShapeGeometry(outer);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  return (
    <group name="Contexto_CIAT_plano">
      <mesh geometry={ground} position={[0, -0.01, 0]} material={groundMat} receiveShadow />
      <mesh geometry={geo.roads} receiveShadow><meshStandardMaterial color="#8d8b83" roughness={0.95} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-2} /></mesh>
      {geo.rail && <mesh geometry={geo.rail}><meshStandardMaterial color="#5a4c42" roughness={0.9} side={THREE.DoubleSide} /></mesh>}
      {geo.green && <mesh geometry={geo.green}><meshStandardMaterial color="#8fb45e" roughness={1} /></mesh>}
      {geo.water && <mesh geometry={geo.water}><meshStandardMaterial color="#4f8f97" roughness={0.2} metalness={0.1} /></mesh>}
      {/* CIAT buildings: plan footprints and heights, in the project palette (cream walls, timber plinth, green parapet) */}
      <group name="Contexto_edificios">
        <mesh geometry={geo.facade} material={facadeMat} castShadow receiveShadow />
        <mesh geometry={geo.plinth} castShadow><meshStandardMaterial color="#8a5a33" roughness={0.8} side={THREE.DoubleSide} /></mesh>
        <mesh geometry={geo.parapet} castShadow><meshStandardMaterial color={PALETTE.forest} roughness={0.6} side={THREE.DoubleSide} /></mesh>
        <mesh geometry={geo.roofs} receiveShadow><meshStandardMaterial color="#b9b4a6" roughness={0.9} side={THREE.DoubleSide} /></mesh>
      </group>
    </group>
  );
}
