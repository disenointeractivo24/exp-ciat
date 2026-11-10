import { Suspense, useState } from 'react';
import { PerformanceMonitor } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, ToneMapping, SMAA } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { useStore } from '../store';
import { Lighting, SkyDome } from './Atmosphere';
import { EcoPath, Lagoon, Terrain } from './Landscape';
import { Deck } from './Deck';
import { Roof } from './Roof';
import { Benches, BiodiversityWheel, PatternSelector, SignInteract, SlidingPanels } from './Interactives';
import { GroundCover, Trees } from './Vegetation';
import { Dragonflies, Fireflies, FlyingBirds, Herons } from './Wildlife';
import { CameraRig } from './Controls';
import { Binoculars, CanopyMirror, Plates, ShadowClock, TactileModel } from './Extras';
import { GuaduaTunnel } from './Tunnel';
import { Stable } from './TunnelSite';
import { ObservationTower } from './Tower';
import { CiatContext } from './CiatContext';
import { SignageExtras } from './SignageExtras';

function Effects() {
  const night = useStore((s) => s.night);
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom mipmapBlur intensity={night ? 0.9 : 0.25} luminanceThreshold={night ? 0.55 : 0.92} luminanceSmoothing={0.2} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.3} darkness={0.45} />
      <SMAA />
    </EffectComposer>
  );
}

export function Scene() {
  const [dpr, setDpr] = useState(1.25);
  return (
    <Canvas
      shadows="soft"
      dpr={dpr}
      gl={{ antialias: false, powerPreference: 'high-performance', toneMapping: THREE.NoToneMapping }}
      camera={{ fov: 62, near: 0.05, far: 900, position: [14, 5, 12] }}
      onCreated={({ gl }) => { gl.toneMappingExposure = 1; }}
    >
      <PerformanceMonitor bounds={() => [36, 58]} flipflops={4} onDecline={() => setDpr((d) => Math.max(0.75, d - 0.25))} onIncline={() => setDpr((d) => Math.min(1.5, d + 0.25))} />
      <Suspense fallback={null}>
        <SkyDome />
        <Lighting />
        <Terrain />
        <Lagoon />
        <EcoPath />
        <Deck />
        <Roof />
        <Benches />
        <BiodiversityWheel />
        <SlidingPanels />
        <PatternSelector />
        <SignInteract />
        <Trees />
        <GroundCover />
        <Herons />
        <FlyingBirds />
        <Dragonflies />
        <Fireflies />
        <ShadowClock />
        <TactileModel />
        <Binoculars />
        <CanopyMirror />
        <Plates />
        <GuaduaTunnel />
        <Stable />
        <ObservationTower />
        <CiatContext />
        <SignageExtras />
        <CameraRig />
        <Effects />
      </Suspense>
    </Canvas>
  );
}
