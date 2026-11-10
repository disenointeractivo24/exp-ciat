import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DECK, EDGE_X, EDGE_Z, FLOOR_Y, PALETTE, RAILINGS, SLIDE_BAY, RAMP, ROOF, ROOF_X_LINES, ROOF_Y, ROOF_Z_LINES, SIGN, SLATS, STRUCT_POSTS, WALL } from '../lib/layout';
import { acrylicTexture, deckFloorTextures, muralTexture } from '../lib/textures';
import { heightAt } from '../lib/terrain';
import { birdSafeGlassTexture, panoramaTexture } from '../lib/realTextures';
import { MAT, NIGHT_EMISSIVE, timberGeo } from './materials';
import { env } from '../store';
import { ASPECT, SIGNAGE, signTex } from '../lib/signage';

type V3 = [number, number, number];

export function T({ s, p, r, m = MAT.wood, cast = true }: { s: V3; p: V3; r?: V3; m?: THREE.Material; cast?: boolean }) {
  return <mesh geometry={timberGeo(...s)} material={m} position={p} rotation={r} castShadow={cast} receiveShadow />;
}

function Floor() {
  const { map, normalMap, emissiveMap } = deckFloorTextures();
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ map, normalMap, normalScale: new THREE.Vector2(0.8, 0.8), emissiveMap, emissive: new THREE.Color('#d6e65a'), emissiveIntensity: 0, roughness: 0.72 }),
    [map, normalMap, emissiveMap],
  );
  useFrame(() => { mat.emissiveIntensity = env.nightMix * 0.1; });
  const W = DECK.x1 - DECK.x0, D = DECK.z1 - DECK.z0;
  return (
    <group name="Piso_y_estructura_inferior">
      <mesh rotation-x={-Math.PI / 2} position={[0, FLOOR_Y, 0]} material={mat} receiveShadow>
        <planeGeometry args={[W, D]} />
      </mesh>
      {/* fascia boards */}
      <T s={[W + 0.06, 0.24, 0.04]} p={[0, FLOOR_Y - 0.12, DECK.z0 - 0.02]} m={MAT.woodDark} />
      <T s={[W + 0.06, 0.24, 0.04]} p={[0, FLOOR_Y - 0.12, DECK.z1 + 0.02]} m={MAT.woodDark} />
      <T s={[0.04, 0.24, D]} p={[DECK.x0 - 0.02, FLOOR_Y - 0.12, 0]} m={MAT.woodDark} />
      <T s={[0.04, 0.24, D]} p={[DECK.x1 + 0.02, FLOOR_Y - 0.12, 0]} m={MAT.woodDark} />
      {/* substructure: bearers + piles into the lagoon bed */}
      {[-2.9, -0.95, 1.0, 2.9].map((z) => (
        <T key={z} s={[W, 0.2, 0.12]} p={[0, FLOOR_Y - 0.16, z]} m={MAT.woodDark} cast={false} />
      ))}
      {[-3.85, -1.3, 1.3, 3.85].flatMap((x) =>
        [-2.9, -0.95, 1.0, 2.9].map((z) => <T key={`${x}${z}`} s={[0.18, 2.2, 0.18]} p={[x, FLOOR_Y - 1.3, z]} m={MAT.woodDark} cast={false} />),
      )}
    </group>
  );
}

function Structure() {
  const postH = ROOF_Y - 0.28 - FLOOR_Y;
  return (
    <group name="Estructura_y_pergola">
      {STRUCT_POSTS.map(([x, z]) => (
        <group key={`${x}${z}`}>
          <T s={[0.16, postH, 0.16]} p={[x, FLOOR_Y + postH / 2, z]} m={MAT.woodWarm} />
          <mesh position={[x, FLOOR_Y + 0.12, z]} material={MAT.steel} castShadow>
            <boxGeometry args={[0.2, 0.24, 0.2]} />
          </mesh>
        </group>
      ))}
      {/* main beams along X and cross beams along Z */}
      {[-EDGE_Z, EDGE_Z].map((z) => <T key={z} s={[ROOF.x1 - ROOF.x0 + 0.1, 0.28, 0.16]} p={[0, ROOF_Y - 0.14, z]} m={MAT.woodWarm} />)}
      {[-EDGE_X, 0, EDGE_X].map((x) => <T key={x} s={[0.14, 0.24, ROOF.z1 - ROOF.z0]} p={[x, ROOF_Y - 0.12, 0]} m={MAT.woodWarm} />)}
      {/* rafter grid framing the perforated bays */}
      {ROOF_X_LINES.map((x) => <T key={'rx' + x} s={[0.07, 0.2, ROOF.z1 - ROOF.z0]} p={[x, ROOF_Y + 0.1, 0]} m={MAT.woodWarm} />)}
      {ROOF_Z_LINES.map((z) => <T key={'rz' + z} s={[ROOF.x1 - ROOF.x0, 0.2, 0.07]} p={[0, ROOF_Y + 0.1, z]} m={MAT.woodWarm} />)}
      {/* fascia */}
      {[ROOF.z0 - 0.025, ROOF.z1 + 0.025].map((z) => <T key={'fz' + z} s={[ROOF.x1 - ROOF.x0 + 0.1, 0.3, 0.05]} p={[0, ROOF_Y + 0.12, z]} m={MAT.woodDark} />)}
      {[ROOF.x0 - 0.025, ROOF.x1 + 0.025].map((x) => <T key={'fx' + x} s={[0.05, 0.3, ROOF.z1 - ROOF.z0]} p={[x, ROOF_Y + 0.12, 0]} m={MAT.woodDark} />)}
      {/* clear polycarbonate rain cover: lets sunlight through to the perforated ceiling */}
      <mesh position={[0, ROOF_Y + 0.215, 0]} rotation-x={-Math.PI / 2} material={MAT.polycarb}>
        <planeGeometry args={[ROOF.x1 - ROOF.x0, ROOF.z1 - ROOF.z0]} />
      </mesh>
    </group>
  );
}

function acrylicMat(variant: number) {
  const { map, emissiveMap } = acrylicTexture(variant);
  return new THREE.MeshStandardMaterial({
    map, emissiveMap, emissive: new THREE.Color('#fff0c4'), emissiveIntensity: 0, transparent: true, depthWrite: false,
    side: THREE.DoubleSide, roughness: 0.25, metalness: 0,
  });
}

const isStruct = (x: number, z: number) => STRUCT_POSTS.some(([a, b]) => Math.abs(a - x) < 0.05 && Math.abs(b - z) < 0.05);

function Railings() {
  const mats = useMemo(() => [0, 1, 2, 3].map(acrylicMat), []);
  // In front of the benches: clear glass with a bird-safe frit, a lower handrail (1.0 m) and a panoramic guide on top,
  // so the horizon stays above the handrail for a seated eye (≈1.17 m).
  const glass = useMemo(() => new THREE.MeshStandardMaterial({ map: birdSafeGlassTexture(), transparent: true, depthWrite: false, side: THREE.DoubleSide, roughness: 0.05, metalness: 0 }), []);
  const panos = useMemo(() => [0, 1, 2].map((k) => { const t = panoramaTexture(k); return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0, roughness: 0.55 }); }), []);
  useFrame(() => {
    mats.forEach((m) => { m.emissiveIntensity = env.nightMix * 0.75; });
    panos.forEach((m) => { m.emissiveIntensity = env.nightMix * 0.2; });
  });
  return (
    <group name="Barandas">
      {RAILINGS.map(([x1, z1, x2, z2, v], i) => {
        const len = Math.hypot(x2 - x1, z2 - z1);
        const rot = Math.atan2(-(z2 - z1), x2 - x1);
        if (v === SLIDE_BAY) {
          // sliding-layer bay: bird-safe glass up to 1.47 m, steel top rail, nothing crossing the layer
          return (
            <group key={i} position={[(x1 + x2) / 2, FLOOR_Y, (z1 + z2) / 2]} rotation-y={rot}>
              {!isStruct(x1, z1) && <T s={[0.09, 1.48, 0.09]} p={[-len / 2, 0.74, 0]} />}
              {!isStruct(x2, z2) && <T s={[0.09, 1.48, 0.09]} p={[len / 2, 0.74, 0]} />}
              <T s={[len, 0.06, 0.06]} p={[0, 0.1, 0]} />
              <mesh position={[0, 1.47, 0]} material={MAT.steel}><boxGeometry args={[len, 0.04, 0.05]} /></mesh>
              <mesh position={[0, 0.8, 0]} material={glass}><planeGeometry args={[len - 0.1, 1.28]} /></mesh>
            </group>
          );
        }
        const clear = v < 0;
        const capY = clear ? 0.995 : 1.075;
        return (
          <group key={i} position={[(x1 + x2) / 2, FLOOR_Y, (z1 + z2) / 2]} rotation-y={rot}>
            {!isStruct(x1, z1) && <T s={[0.09, capY, 0.09]} p={[-len / 2, capY / 2, 0]} />}
            {!isStruct(x2, z2) && <T s={[0.09, capY, 0.09]} p={[len / 2, capY / 2, 0]} />}
            <T s={[len + 0.09, 0.05, 0.15]} p={[0, capY, 0]} m={MAT.woodWarm} />
            <T s={[len, 0.06, 0.06]} p={[0, 0.1, 0]} />
            <mesh position={[0, capY - 0.085, 0]} material={MAT.steel}><boxGeometry args={[len - 0.06, 0.025, 0.035]} /></mesh>
            <mesh position={[0, 0.15, 0]} material={MAT.steel}><boxGeometry args={[len - 0.06, 0.025, 0.035]} /></mesh>
            <mesh position={[0, clear ? 0.53 : 0.57, 0]} material={clear ? glass : mats[v]} castShadow={!clear}>
              <planeGeometry args={[len - 0.12, clear ? 0.72 : 0.8]} />
            </mesh>
            {clear && (
              // sloped reading strip sitting ON the handrail (its lower edge stays above the cap, so nothing is hidden)
              <group position={[0, capY + 0.1, 0.0]} rotation-x={-0.95}>
                <mesh position={[0, 0, -0.008]} material={MAT.forest} castShadow><boxGeometry args={[len - 0.04, 0.2, 0.014]} /></mesh>
                <mesh material={panos[-v - 1]}><planeGeometry args={[len - 0.08, 0.18]} /></mesh>
              </group>
            )}
            {/* soft LED line under the handrail, pointing down onto the deck */}
            <mesh position={[0, capY - 0.03, 0.05]} material={MAT.led}><boxGeometry args={[len - 0.1, 0.012, 0.02]} /></mesh>
          </group>
        );
      })}
    </group>
  );
}

function HeronWall() {
  const mural = muralTexture();
  const mats = useMemo(() => {
    const front = new THREE.MeshStandardMaterial({ map: mural, emissiveMap: mural, emissive: new THREE.Color('#ffd9a0'), emissiveIntensity: 0, roughness: 0.6 });
    return { front, list: [front, MAT.forest, MAT.forest, MAT.forest, MAT.forest, MAT.forest] };
  }, [mural]);
  useFrame(() => { mats.front.emissiveIntensity = env.nightMix * 0.28; });
  const len = WALL.z1 - WALL.z0;
  return (
    <group name="Muro_mural_garzas_y_celosia">
      <mesh position={[WALL.x, FLOOR_Y + WALL.h / 2, (WALL.z0 + WALL.z1) / 2]} material={mats.list} castShadow receiveShadow>
        <boxGeometry args={[0.1, WALL.h, len]} />
      </mesh>
      {/* slatted timber screen */}
      {Array.from({ length: 9 }, (_, i) => SLATS.z0 + 0.05 + i * ((SLATS.z1 - SLATS.z0 - 0.1) / 8)).map((z) => (
        <T key={z} s={[0.09, WALL.h, 0.045]} p={[SLATS.x, FLOOR_Y + WALL.h / 2, z]} m={MAT.woodWarm} />
      ))}
      <T s={[0.12, 0.08, SLATS.z1 - SLATS.z0 + len]} p={[WALL.x, FLOOR_Y + WALL.h + 0.04, (SLATS.z0 + WALL.z1) / 2]} m={MAT.woodDark} />
      {/* grazing uplight strip at mural base */}
      <mesh position={[WALL.x + 0.09, FLOOR_Y + 0.03, (WALL.z0 + WALL.z1) / 2]} material={MAT.led}><boxGeometry args={[0.04, 0.03, len - 0.2]} /></mesh>
    </group>
  );
}

function Ramp() {
  const Lh = RAMP.z1 - RAMP.z0;
  const gEnd = Math.max(0, heightAt(-1.5, RAMP.z1));
  const rise = FLOOR_Y - gEnd;
  const a = Math.atan2(rise, Lh);
  const L = Math.hypot(Lh, rise);
  const W = RAMP.x1 - RAMP.x0;
  const cy = (FLOOR_Y + gEnd) / 2;
  const cz = (RAMP.z0 + RAMP.z1) / 2;
  const posts = [0.15, 0.38, 0.62, 0.86];
  return (
    <group name="Rampa_accesible" position={[(RAMP.x0 + RAMP.x1) / 2, cy, cz]}>
      <group rotation-x={a}>
        {/* deck boards across the ramp */}
        {Array.from({ length: Math.floor(L / 0.15) }, (_, i) => -L / 2 + 0.075 + i * 0.15).map((z) => (
          <T key={z} s={[W, 0.05, 0.14]} p={[0, -0.025, z]} cast={false} />
        ))}
        <T s={[W, 0.2, L]} p={[0, -0.16, 0]} m={MAT.woodDark} cast={false} />
        {/* curbs + LED step light line */}
        {[-W / 2 + 0.04, W / 2 - 0.04].map((x) => (
          <group key={x}>
            <T s={[0.08, 0.12, L]} p={[x, 0.06, 0]} m={MAT.woodDark} />
            <mesh position={[x + (x < 0 ? 0.045 : -0.045), 0.03, 0]} material={MAT.ledLime}><boxGeometry args={[0.01, 0.015, L - 0.1]} /></mesh>
          </group>
        ))}
        {/* double handrails (0.9 m and 0.7 m) */}
        {[-W / 2 + 0.04, W / 2 - 0.04].map((x) => (
          <group key={'h' + x}>
            {posts.map((t) => <T key={t} s={[0.07, 0.95, 0.07]} p={[x, 0.47, -L / 2 + t * L]} r={[-a, 0, 0]} />)}
            <T s={[0.07, 0.05, L]} p={[x, 0.92, 0]} m={MAT.woodWarm} />
            <mesh position={[x, 0.7, 0]} material={MAT.steel}><boxGeometry args={[0.035, 0.035, L]} /></mesh>
            <mesh position={[x, 0.895, 0]} material={MAT.led}><boxGeometry args={[0.03, 0.01, L - 0.1]} /></mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

function ArrivalSign() {
  const mats = useMemo(() => {
    const f = new THREE.MeshStandardMaterial({ map: signTex(SIGNAGE.hDeck), roughness: 0.6 }); // arriving: DECK
    const b = new THREE.MeshStandardMaterial({ map: signTex(SIGNAGE.hTorre), roughness: 0.6 }); // leaving: on to the tower
    return [MAT.forest, MAT.forest, MAT.forest, MAT.forest, f, b];
  }, []);
  const y = heightAt(SIGN.x, SIGN.z);
  return (
    <group name="Letrero_llegada" position={[SIGN.x, y, SIGN.z]} rotation-y={SIGN.rot}>
      <T s={[0.1, 1.6, 0.1]} p={[-0.55, 0.8, 0]} m={MAT.woodWarm} />
      <T s={[0.1, 1.6, 0.1]} p={[0.55, 0.8, 0]} m={MAT.woodWarm} />
      <mesh position={[0, 1.3, 0]} material={mats} castShadow receiveShadow>
        <boxGeometry args={[1.0, 1.0 / ASPECT.horizontal, 0.04]} />
      </mesh>
    </group>
  );
}

function NightEmissives() {
  useFrame(() => {
    for (const [m, n, d] of NIGHT_EMISSIVE) m.emissiveIntensity = d + (n - d) * env.nightMix;
  });
  return null;
}

export function Deck() {
  return (
    <group>
      <Floor />
      <Structure />
      <Railings />
      <HeronWall />
      <Ramp />
      <ArrivalSign />
      <NightEmissives />
      <mesh position={[0, FLOOR_Y, 0]} visible={false}><boxGeometry args={[0.01, 0.01, 0.01]} /><meshBasicMaterial color={PALETTE.lime} /></mesh>
    </group>
  );
}
