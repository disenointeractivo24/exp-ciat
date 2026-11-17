// Photo frames around the tunnel windows that look onto the cow paddock: a printed timber border with leaves in the
// corners and a short caption, so the window becomes a frame for a souvenir photo of the moment.
import { useMemo } from 'react';
import * as THREE from 'three';
import { PALETTE } from '../lib/layout';
import { canvas, memo, tex } from '../lib/textures';

export type Rect = { x0: number; x1: number; y0: number; y1: number };
export type FrameSpot = { pos: THREE.Vector3; yaw: number; rect: Rect; layer: number };

/** Border widths (m): sides/top, and a wider bottom band for the caption. */
const B = 0.065, BB = 0.1;
const PX = 900; // texture pixels per metre

function leaf(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, ang: number, color: string) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.5, -len * 0.32, len, 0);
  ctx.quadraticCurveTo(len * 0.5, len * 0.32, 0, 0);
  ctx.fill();
  ctx.strokeStyle = 'rgba(16,60,47,0.55)'; ctx.lineWidth = Math.max(1, len * 0.04);
  ctx.beginPath(); ctx.moveTo(len * 0.08, 0); ctx.lineTo(len * 0.9, 0); ctx.stroke();
  ctx.restore();
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function frameTexture(w: number, h: number) {
  return memo(`photoframe${w.toFixed(3)}x${h.toFixed(3)}`, () => {
    const W = Math.round((w + 2 * B) * PX), H = Math.round((h + B + BB) * PX);
    const { c, ctx } = canvas(W, H);
    const b = B * PX, bb = BB * PX, iw = w * PX, ih = h * PX;
    // cream timber band with rounded outer corners
    rr(ctx, 0, 0, W, H, b * 0.9);
    ctx.fillStyle = PALETTE.cream; ctx.fill();
    // forest outline + lime inner line
    ctx.lineWidth = b * 0.12; ctx.strokeStyle = PALETTE.forest; rr(ctx, b * 0.12, b * 0.12, W - b * 0.24, H - b * 0.24, b * 0.8); ctx.stroke();
    ctx.lineWidth = b * 0.1; ctx.strokeStyle = PALETTE.olive; rr(ctx, b - b * 0.22, b - b * 0.22, iw + b * 0.44, ih + b * 0.44, b * 0.45); ctx.stroke();
    // window opening (transparent) with rounded corners, like the cut in the lattice
    ctx.globalCompositeOperation = 'destination-out';
    rr(ctx, b, b, iw, ih, 0.06 * PX); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    // leaves sprouting from the four corners
    const L = b * 1.25;
    const corners: [number, number, number][] = [[b * 0.55, b * 0.55, 0], [W - b * 0.55, b * 0.55, Math.PI / 2], [W - b * 0.55, H - bb * 0.55, Math.PI], [b * 0.55, H - bb * 0.55, -Math.PI / 2]];
    for (const [x, y, a] of corners) {
      leaf(ctx, x, y, L, a - 0.25, PALETTE.lime);
      leaf(ctx, x, y, L * 0.8, a + 0.55, PALETTE.olive);
    }
    // little dots along the top band
    ctx.fillStyle = PALETTE.olive;
    for (let x = b * 2.2; x < W - b * 2.2; x += b * 0.9) { ctx.beginPath(); ctx.arc(x, b * 0.5, b * 0.07, 0, Math.PI * 2); ctx.fill(); }
    // caption on the bottom band
    ctx.fillStyle = PALETTE.forest; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const fs = Math.min(bb * 0.36, W * 0.07);
    ctx.font = `700 ${fs}px Arial, Helvetica, sans-serif`;
    ctx.fillText('Recuerda este momento', W / 2, H - bb * 0.58);
    ctx.font = `400 ${fs * 0.62}px Arial, Helvetica, sans-serif`;
    ctx.fillStyle = PALETTE.olive;
    ctx.fillText('Remember this moment · CIAT Palmira', W / 2, H - bb * 0.22);
    return tex(c);
  });
}

/** One printed frame on each face of the panel around every window that looks onto the cows. */
export function PhotoFrames({ spots }: { spots: FrameSpot[] }) {
  const items = useMemo(() => spots.map((s) => {
    const w = s.rect.x1 - s.rect.x0, h = s.rect.y1 - s.rect.y0;
    const map = frameTexture(w, h);
    const mat = new THREE.MeshStandardMaterial({ map, alphaTest: 0.5, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -1 - s.layer });
    const cx = (s.rect.x0 + s.rect.x1) / 2, cy = (s.rect.y0 + s.rect.y1) / 2 - (BB - B) / 2;
    return { s, mat, w: w + 2 * B, h: h + B + BB, cx, cy };
  }), [spots]);
  return (
    <group name="Tunel_marcos_fotos_establo">
      {items.map(({ s, mat, w, h, cx, cy }, i) => (
        <group key={i} position={s.pos} rotation-y={s.yaw}>
          {[1, -1].map((f) => (
            <mesh key={f} position={[cx, cy, f * (0.0115 + s.layer * 0.002)]} rotation-y={f > 0 ? 0 : Math.PI} material={mat}>
              <planeGeometry args={[w, h]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
