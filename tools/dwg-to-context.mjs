// Converts the CIAT DWG into scene-space context data for the 3D experience.
// Placement: the deck sits at the user's "deck" pin; the scene is rotated so the tower, the tunnel entrance and the
// lagoon point toward the user's tower / entrance / lagoon pins. Scene: x right, z = south, y up; plan: X east, Y north.
import { readFileSync, writeFileSync } from 'node:fs';
const { entities } = JSON.parse(readFileSync('ciat.json', 'utf8'));
const out = process.argv[2];

// user's pins in plan coordinates (average of the two screenshots)
const PIN = { deck: [878, 347], torre: [869, 375], entrada: [929.5, 314.6], laguna: [891, 302] }; // block east of the two large square buildings (user's reference screenshot)
// the same elements in scene space (x, z)
const SCENE = { deck: [0, 0], torre: [-1.6, 16.8], entrada: [-10.36, -31.4], laguna: [8.5, -10] };
const ang = (x, y) => Math.atan2(y, x);
const diffs = Object.keys(SCENE).filter((k) => k !== 'deck').map((k) => {
  const r = [PIN[k][0] - PIN.deck[0], PIN[k][1] - PIN.deck[1]];
  const m = [SCENE[k][0], -SCENE[k][1]];
  let d = ang(r[0], r[1]) - ang(m[0], m[1]);
  while (d < 0) d += Math.PI * 2;
  return d;
});
const theta = Math.atan2(diffs.reduce((s, d) => s + Math.sin(d), 0), diffs.reduce((s, d) => s + Math.cos(d), 0));
console.log('rotation (deg)', ((theta * 180) / Math.PI).toFixed(1), 'per element', diffs.map((d) => ((d * 180) / Math.PI).toFixed(1)));
// Final placement, from the user's marked top view (lagoon / deck / tower / entrance trail): a second frame applied on
// top of the pin fit. LOCAL_D is the deck in the pin-fit frame, LOCAL_X / LOCAL_Z the scene axes in that frame.
const LOCAL_D = [33.94, -4.12], LOCAL_X = [0.3481, -0.9375], LOCAL_Z = [0.9375, 0.348];
// LOCAL_SHIFT: the whole experience moved ~6.6 m toward the south road so the tunnel entrance meets it (user request)
const LOCAL_SHIFT = [0, 6.6];
const toLocal = (x, z) => { const dx = x - LOCAL_D[0], dz = z - LOCAL_D[1]; return [dx * LOCAL_X[0] + dz * LOCAL_X[1] + LOCAL_SHIFT[0], dx * LOCAL_Z[0] + dz * LOCAL_Z[1] + LOCAL_SHIFT[1]]; };
const fromLocal = (x0, z0) => { const x = x0 - LOCAL_SHIFT[0], z = z0 - LOCAL_SHIFT[1]; return [LOCAL_D[0] + x * LOCAL_X[0] + z * LOCAL_Z[0], LOCAL_D[1] + x * LOCAL_X[1] + z * LOCAL_Z[1]]; };
// best-fit translation (rotation fixed): the scene origin (deck) is placed so that all four elements sit as close as
// possible to their pins on average (the modelled composition is more compact than the real distances)
const cI = Math.cos(theta), sI = Math.sin(theta);
const K = Object.keys(SCENE);
const ORIGIN = [0, 1].map((a) => K.reduce((t, k) => { const [x, z] = SCENE[k]; const rel = [x * cI + z * sI, x * sI - z * cI]; return t + PIN[k][a] - rel[a]; }, 0) / K.length);
console.log('scene origin on plan', ORIGIN.map((v) => v.toFixed(1)));
const c = Math.cos(-theta), s = Math.sin(-theta);
const toScene = (X, Y) => {
  const rx = X - ORIGIN[0], ry = Y - ORIGIN[1];
  const mx = rx * c - ry * s, my = rx * s + ry * c;
  const [lx, lz] = toLocal(mx, -my);
  return [+lx.toFixed(2), +lz.toFixed(2)];
};
// inverse, for drawing our layout on the plan
const toPlan = (x0, z0) => { const [x, z] = fromLocal(x0, z0); const mx = x, my = -z; return [ORIGIN[0] + mx * cI - my * sI, ORIGIN[1] + mx * sI + my * cI]; };

const KEEP_OUT = 78; // our own modelled site (terrain, forest, tunnel, tower) — no plan trees inside this radius
const pts = (e) => (e.vertices ?? []).map((v) => toScene(v.x, v.y));
const roads = [], buildings = [], trees = [], green = [], water = [], rail = [];
const heights = entities.filter((e) => e.layer === 'TPX_BUILDING_HEIGHTS_TEXT').map((t) => ({ p: [t.startPoint?.x ?? t.insertionPoint?.x, t.startPoint?.y ?? t.insertionPoint?.y], h: parseFloat(/([\d.]+)/.exec(t.text)?.[1] ?? '6') }));
const inside = (p, poly) => { let r = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) r = !r; } return r; };
for (const e of entities) {
  if (e.layer === 'TPX_ROADS_AXES') { const v = e.vertices ?? (e.startPoint ? [e.startPoint, e.endPoint] : []); roads.push(v.map((p) => toScene(p.x, p.y))); }
  else if (e.layer === 'TPX_RAILWAYS_AXES') { const v = e.vertices ?? (e.startPoint ? [e.startPoint, e.endPoint] : []); rail.push(v.map((p) => toScene(p.x, p.y))); }
  else if (e.layer === 'TPX_BUILDINGS' && e.vertices) {
    const planPoly = e.vertices.map((v) => [v.x, v.y]);
    const hit = heights.find((t) => t.p[0] !== undefined && inside(t.p, planPoly));
    let h = hit?.h;
    if (!h) { const cx = planPoly.reduce((a, p) => a + p[0], 0) / planPoly.length, cy = planPoly.reduce((a, p) => a + p[1], 0) / planPoly.length; h = heights.reduce((b, t) => (Math.hypot(t.p[0] - cx, t.p[1] - cy) < b.d ? { d: Math.hypot(t.p[0] - cx, t.p[1] - cy), h: t.h } : b), { d: 1e9, h: 6 }).h; }
    const sp = pts(e), scx = sp.reduce((a, q) => a + q[0], 0) / sp.length, scz = sp.reduce((a, q) => a + q[1], 0) / sp.length;
    if (scx > -22 && scx < 50 && scz > -51 && scz < 2) continue; // nothing built inside the modelled lagoon
    buildings.push({ p: sp, h });
  }
  else if (e.layer === 'TPX_VEGETATION_TREES_INDIVIDUAL' && e.insertionPoint) {
    const p = toScene(e.insertionPoint.x, e.insertionPoint.y);
    if (Math.hypot(p[0], p[1]) < KEEP_OUT) continue;
    const m = /CR(\d+)/.exec(e.name ?? '');
    trees.push([p[0], p[1], +(m ? Number(m[1]) / 20 : 3).toFixed(1)]);
  }
  else if (e.layer === 'TPX_VEGETATION_GREEN_SPACES' && e.vertices) green.push(pts(e));
  else if (e.layer === 'TPX_WATERWAYS' && e.vertices) water.push(pts(e));
}
const data = { source: 'CIAT PLANTAAA.dwg (TPX / CADMAPPER layers), meters', rotationDeg: (() => { const o = toScene(ORIGIN[0], ORIGIN[1]), e = toScene(ORIGIN[0] + 100, ORIGIN[1]); return +((-Math.atan2(-(e[1] - o[1]), e[0] - o[0]) * 180) / Math.PI).toFixed(2); })(), deckPlan: ORIGIN.map((v) => +v.toFixed(2)), keepOut: KEEP_OUT, roads, rail, buildings, trees, green, water };
writeFileSync(out, JSON.stringify(data));
console.log('roads', roads.length, 'buildings', buildings.length, 'trees', trees.length, 'green', green.length, 'water', water.length);
// export our layout in plan coordinates (for the verification drawing)
const lay = {
  deck: [[-4, -3], [4, -3], [4, 3], [-4, 3]].map(([x, z]) => toPlan(x, z)),
  torre: [[-5.45, 13.65], [5.5, 13.65], [5.5, 26.3], [-5.45, 26.3]].map(([x, z]) => toPlan(x, z)),
  tunel: [[-20.6, -61], [-20.8, -51], [-21.1, -40], [-21.3, -28], [-21.3, -16], [-21.1, -5], [-20.9, 2.5], [-20.2, 6.4], [-17.8, 8.6], [-14.5, 9]].map(([x, z]) => toPlan(x, z)),
  laguna: Array.from({ length: 80 }, (_, i) => { const a = (i / 80) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a), k = Math.pow(Math.abs(c) ** 3 + Math.abs(sn) ** 3, -1 / 3); return toPlan(16 + c * k * 32, -26 + sn * k * 23); }),
  entrada: toPlan(-20.62, -59.4),
};
writeFileSync('layout_plan.json', JSON.stringify(lay));
