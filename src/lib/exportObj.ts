// Dev-only OBJ/MTL exporter for Blender. Exports the deck (not the landscape) in world coordinates (metres, Y up),
// merging coplanar triangle pairs back into quads, grouped by named component, with canvas textures as PNG.
import * as THREE from 'three';

const REGION = { x0: -4.8, x1: 4.8, z0: -3.8, z1: 8.4, y0: -2.5, y1: 4 };

function inRegion(box: THREE.Box3) {
  const s = box.getSize(new THREE.Vector3());
  if (Math.max(s.x, s.y, s.z) > 10) return false;
  return box.min.x > REGION.x0 && box.max.x < REGION.x1 && box.min.z > REGION.z0 && box.max.z < REGION.z1 && box.min.y > REGION.y0 && box.max.y < REGION.y1;
}

function ownerName(o: THREE.Object3D) {
  let p: THREE.Object3D | null = o;
  while (p) { if (p.name) return p.name; p = p.parent; }
  return 'Mobiliario_sendero';
}

const safe = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '_').replace(/^_|_$/g, '');

/** opts.owners: export only groups whose name matches (ignores the deck region and size limit). */
export async function exportOBJ(scene: THREE.Scene, base = 'deck_ciat', opts: { owners?: RegExp } = {}) {
  const keep = (box: THREE.Box3, owner: string) => (opts.owners ? opts.owners.test(owner) : inRegion(box));
  scene.updateMatrixWorld(true);
  const items: { mesh: THREE.Mesh; matrix: THREE.Matrix4; owner: string }[] = [];
  const box = new THREE.Box3();
  scene.traverse((o) => {
    if (!(o as THREE.Mesh).isMesh) return;
    let vis = true; let p: THREE.Object3D | null = o;
    while (p) { if (!p.visible) vis = false; p = p.parent; }
    if (!vis) return;
    const mesh = o as THREE.Mesh;
    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    if ((mat as THREE.ShaderMaterial).isShaderMaterial && !(mat as THREE.MeshStandardMaterial).isMeshStandardMaterial && mat.type === 'ShaderMaterial') return;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    if ((mesh as THREE.InstancedMesh).isInstancedMesh) {
      const im = mesh as THREE.InstancedMesh;
      const m = new THREE.Matrix4();
      const owner = ownerName(im);
      for (let i = 0; i < im.count; i++) {
        im.getMatrixAt(i, m);
        const w = new THREE.Matrix4().multiplyMatrices(im.matrixWorld, m);
        box.copy(mesh.geometry.boundingBox!).applyMatrix4(w);
        if (!keep(box, owner) || (!opts.owners && owner === 'Mobiliario_sendero')) continue;
        items.push({ mesh, matrix: w, owner });
      }
      return;
    }
    box.copy(mesh.geometry.boundingBox!).applyMatrix4(mesh.matrixWorld);
    const owner = ownerName(mesh);
    if (!keep(box, owner)) return;
    items.push({ mesh, matrix: mesh.matrixWorld, owner });
  });
  items.sort((a, b) => a.owner.localeCompare(b.owner));

  // ---- materials + textures
  const matNames = new Map<THREE.Material, string>();
  const texNames = new Map<THREE.Texture, string>();
  const pngs: { name: string; data: string }[] = [];
  const mtl: string[] = ['# Deck de descanso · CIAT — materiales'];
  const matName = (m: THREE.Material) => {
    let n = matNames.get(m);
    if (n) return n;
    n = `mat_${matNames.size}${m.name ? '_' + safe(m.name) : ''}`;
    matNames.set(m, n);
    const sm = m as THREE.MeshStandardMaterial;
    const c = sm.color ?? new THREE.Color('#cccccc');
    mtl.push('', `newmtl ${n}`, `Kd ${c.r.toFixed(4)} ${c.g.toFixed(4)} ${c.b.toFixed(4)}`, 'Ks 0.04 0.04 0.04');
    if (sm.roughness !== undefined) mtl.push(`Pr ${sm.roughness.toFixed(3)}`, `Pm ${(sm.metalness ?? 0).toFixed(3)}`, `Ns ${Math.round((1 - sm.roughness) * 900 + 10)}`);
    if (sm.emissive && sm.emissiveIntensity > 0 && !sm.emissiveMap) mtl.push(`Ke ${(sm.emissive.r * sm.emissiveIntensity).toFixed(3)} ${(sm.emissive.g * sm.emissiveIntensity).toFixed(3)} ${(sm.emissive.b * sm.emissiveIntensity).toFixed(3)}`);
    if (m.transparent) mtl.push(`d ${(m.opacity ?? 1).toFixed(3)}`);
    const tex = sm.map;
    let img = tex?.image as HTMLCanvasElement | undefined;
    // signage artwork is loaded as an image: copy it to a canvas so it can be written out as PNG
    if (img && typeof img.toDataURL !== 'function' && (img as unknown as HTMLImageElement).naturalWidth) {
      const im = img as unknown as HTMLImageElement, cv = document.createElement('canvas');
      cv.width = im.naturalWidth; cv.height = im.naturalHeight; cv.getContext('2d')!.drawImage(im, 0, 0); img = cv;
    }
    if (tex && img && typeof img.toDataURL === 'function') {
      let tn = texNames.get(tex);
      if (!tn) {
        tn = `${base}_tex_${texNames.size}.png`;
        texNames.set(tex, tn);
        pngs.push({ name: tn, data: img.toDataURL('image/png').split(',')[1] });
      }
      mtl.push(`map_Kd textures/${tn}`);
      if (m.transparent) mtl.push(`map_d textures/${tn}`);
    }
    if (m.type.includes('Reflector') || (m as unknown as { mirror?: number }).mirror) mtl.push('# espejo: en Blender pon Metallic 1, Roughness 0');
    return n;
  };

  // ---- geometry
  const out: string[] = [`# Deck de descanso · CIAT — exportado desde la experiencia 3D`, `# Unidades: metros. Eje Y arriba (opción por defecto del importador OBJ de Blender).`, `mtllib ${base}.mtl`];
  let vBase = 1, quads = 0, tris = 0;
  let currentOwner = '';
  const p = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3();
  const pa = new THREE.Vector3(), pb = new THREE.Vector3(), pc = new THREE.Vector3(), fn1 = new THREE.Vector3(), fn2 = new THREE.Vector3();

  for (const it of items) {
    const g = it.mesh.geometry;
    const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
    if (!pos) continue;
    if (it.owner !== currentOwner) { currentOwner = it.owner; out.push(`o ${safe(it.owner) || 'Deck'}`); }
    nm.getNormalMatrix(it.matrix);
    // weld vertices (needed for non-indexed geometry so triangle pairs can be detected)
    const keyOf = (i: number) => `${pos.getX(i).toFixed(5)},${pos.getY(i).toFixed(5)},${pos.getZ(i).toFixed(5)}|${uv ? uv.getX(i).toFixed(4) + ',' + uv.getY(i).toFixed(4) : ''}|${nor ? nor.getX(i).toFixed(3) + ',' + nor.getY(i).toFixed(3) + ',' + nor.getZ(i).toFixed(3) : ''}`;
    const remap = new Int32Array(pos.count);
    const uniq: number[] = [];
    if (g.index) { for (let i = 0; i < pos.count; i++) { remap[i] = uniq.length; uniq.push(i); } }
    else {
      const seen = new Map<string, number>();
      for (let i = 0; i < pos.count; i++) { const k = keyOf(i); let w = seen.get(k); if (w === undefined) { w = uniq.length; seen.set(k, w); uniq.push(i); } remap[i] = w; }
    }
    const mats = Array.isArray(it.mesh.material) ? it.mesh.material : [it.mesh.material];
    const tex0 = (mats[0] as THREE.MeshStandardMaterial).map;
    for (const i of uniq) {
      p.fromBufferAttribute(pos, i).applyMatrix4(it.matrix);
      out.push(`v ${p.x.toFixed(5)} ${p.y.toFixed(5)} ${p.z.toFixed(5)}`);
    }
    for (const i of uniq) {
      let u = uv ? uv.getX(i) : 0, w = uv ? uv.getY(i) : 0;
      if (tex0) { u = u * tex0.repeat.x + tex0.offset.x; w = w * tex0.repeat.y + tex0.offset.y; }
      out.push(`vt ${u.toFixed(5)} ${w.toFixed(5)}`);
    }
    for (const i of uniq) {
      if (nor) n.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize(); else n.set(0, 1, 0);
      out.push(`vn ${n.x.toFixed(4)} ${n.y.toFixed(4)} ${n.z.toFixed(4)}`);
    }
    const idx = (k: number) => (g.index ? remap[g.index.getX(k)] : remap[k]);
    const total = g.index ? g.index.count : pos.count;
    const groups = g.groups.length ? g.groups : [{ start: 0, count: total, materialIndex: 0 }];
    const flip = it.matrix.determinant() < 0;
    const face = (vs: number[]) => {
      const o = flip ? vs.slice().reverse() : vs;
      out.push('f ' + o.map((v) => { const a = v + vBase; return `${a}/${a}/${a}`; }).join(' '));
    };
    const world = (v: number, t: THREE.Vector3) => t.fromBufferAttribute(pos, uniq[v]).applyMatrix4(it.matrix);
    const fnormal = (a: number, b: number, c: number, t: THREE.Vector3) => { world(a, pa); world(b, pb); world(c, pc); return t.subVectors(pc, pb).cross(pa.clone().sub(pb)).normalize(); };
    for (const gr of groups) {
      const m = mats[gr.materialIndex ?? 0] ?? mats[0];
      out.push(`usemtl ${matName(m)}`);
      const end = Math.min(total, gr.start + gr.count);
      for (let k = gr.start; k + 2 < end + 0; k += 3) {
        const t1 = [idx(k), idx(k + 1), idx(k + 2)];
        if (t1[0] === t1[1] || t1[1] === t1[2] || t1[0] === t1[2]) continue;
        if (k + 5 < end) {
          const t2 = [idx(k + 3), idx(k + 4), idx(k + 5)];
          const shared = t1.filter((v) => t2.includes(v));
          if (shared.length === 2) {
            fnormal(t1[0], t1[1], t1[2], fn1); fnormal(t2[0], t2[1], t2[2], fn2);
            if (fn1.dot(fn2) > 0.999) {
              // rotate t1 so its unshared vertex comes first: (u0, s_a, s_b); quad = (u0, s_a, u1, s_b)
              const r = t1.findIndex((v) => !t2.includes(v));
              const a = t1[r], b = t1[(r + 1) % 3], d = t1[(r + 2) % 3];
              const u1 = t2.find((v) => !t1.includes(v))!;
              face([a, b, u1, d]); quads++; k += 3; continue;
            }
          }
        }
        face(t1); tris++;
      }
    }
    vBase += uniq.length;
  }

  const post = (file: string, body: string, b64 = false) => fetch(`/__export?file=${encodeURIComponent(file)}${b64 ? '&b64=1' : ''}`, { method: 'POST', body });
  await post(`${base}.obj`, out.join('\n'));
  await post(`${base}.mtl`, mtl.join('\n'));
  for (const t of pngs) await post(`textures__${t.name}`, t.data, true);
  return { objects: new Set(items.map((i) => i.owner)).size, meshes: items.length, quads, tris, textures: pngs.length };
}
