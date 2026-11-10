import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { env, useStore } from '../store';
import { FLOOR_Y, ROOF_Y, BENCHES, GOBOS } from '../lib/layout';
import { goboTexture } from '../lib/textures';
import { sound } from '../lib/audio';
import { sunDirAt } from '../lib/sun';

const skyVert = /* glsl */ `
varying vec3 vDir;
void main(){
  vDir = normalize((modelMatrix * vec4(position,1.0)).xyz - cameraPosition);
  vec4 p = projectionMatrix * viewMatrix * modelMatrix * vec4(position,1.0);
  gl_Position = p.xyww;
}`;
const skyFrag = /* glsl */ `
uniform vec3 uSun; uniform vec3 uMoon; uniform float uNight; uniform float uTime; uniform float uElev;
varying vec3 vDir;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float n2(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),u.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*n2(p); p*=2.02; a*=.5;} return s; }
void main(){
  vec3 d = normalize(vDir);
  float y = max(d.y, 0.0);
  float warm = 1.0 - smoothstep(0.05, 0.45, uElev);
  vec3 dayTop = mix(vec3(0.20,0.45,0.82), vec3(0.30,0.42,0.70), warm);
  vec3 dayHor = mix(vec3(0.74,0.85,0.92), vec3(0.98,0.74,0.52), warm);
  vec3 nightTop = vec3(0.025,0.045,0.13);
  vec3 nightHor = vec3(0.16,0.22,0.40);
  vec3 top = mix(dayTop, nightTop, uNight);
  vec3 hor = mix(dayHor, nightHor, uNight);
  vec3 col = mix(hor, top, pow(y, 0.55));
  // below horizon: dark ground haze
  col = mix(col, hor * 0.7, smoothstep(0.0, -0.08, d.y));
  // sun
  float sd = max(dot(d, uSun), 0.0);
  col += (1.0-uNight) * (vec3(1.0,0.86,0.6) * pow(sd, 380.0) * 18.0 + vec3(1.0,0.75,0.45) * pow(sd, 8.0) * 0.28 * (0.4+warm));
  // clouds
  vec2 cuv = d.xz / (d.y + 0.12) * 1.3 + vec2(uTime*0.006, 0.0);
  float c = smoothstep(0.52, 0.82, fbm(cuv * 1.4));
  vec3 cloudCol = mix(mix(vec3(1.0), vec3(1.0,0.82,0.68), warm), vec3(0.10,0.13,0.22), uNight);
  col = mix(col, cloudCol, c * smoothstep(0.02, 0.25, d.y) * (0.85 - 0.45*uNight));
  // stars
  vec2 suv = vec2(atan(d.z, d.x), asin(clamp(d.y,-1.,1.))) * 160.0;
  vec2 id = floor(suv); vec2 f = fract(suv) - 0.5;
  float star = step(0.986, h(id)) * smoothstep(0.16, 0.0, length(f)) * (0.6 + 0.4*sin(uTime*2.0 + h(id+3.1)*30.0));
  col += vec3(0.9,0.95,1.0) * star * uNight * smoothstep(0.05, 0.3, d.y) * (1.0 - c);
  // moon
  float md = dot(d, uMoon);
  col += uNight * (vec3(0.95,0.96,1.0) * smoothstep(0.99955, 0.9997, md) * 1.6 + vec3(0.3,0.38,0.6) * pow(max(md,0.), 60.0) * 0.25);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

export function SkyDome() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: skyVert,
        fragmentShader: skyFrag,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uSun: { value: new THREE.Vector3(0, 1, 0) },
          uMoon: { value: new THREE.Vector3(-0.4, 0.6, -0.65).normalize() },
          uNight: { value: 0 },
          uTime: { value: 0 },
          uElev: { value: 1 },
        },
      }),
    [],
  );
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ camera }) => {
    mat.uniforms.uSun.value.copy(env.sunDir);
    mat.uniforms.uNight.value = env.nightMix;
    mat.uniforms.uTime.value = env.elapsed;
    mat.uniforms.uElev.value = env.sunElev;
    ref.current?.position.copy(camera.position);
  });
  return (
    <mesh ref={ref} material={mat} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[500, 32, 16]} />
    </mesh>
  );
}

// Gobo projectors: LED source + metal gobo disc + lens. They hang 10 cm below the central beam and aim only at the floor.
const GOBO_Y = ROOF_Y - 0.34;
const GOBO_POS = GOBOS.map((g) => [g.pos[0], GOBO_Y, g.pos[2]] as [number, number, number]);
const GOBO_TGT = GOBOS.map((g) => [g.target[0], FLOOR_Y, g.target[2]] as [number, number, number]);

/** The physical fixtures: bracket on the beam, IP65 body, lens that glows warm at night. */
function GoboFixtures() {
  const lens = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2218', emissive: '#ffcf94', emissiveIntensity: 0 }), []);
  const body = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1f2421', metalness: 0.6, roughness: 0.45 }), []);
  useFrame(() => { lens.emissiveIntensity = env.nightMix * 2.5; });
  return (
    <>
      {GOBO_POS.map((p, i) => (
        <group key={i} name={`Proyector_gobo_${i + 1}`}>
          {/* bracket up to the beam underside */}
          <mesh position={[p[0], (p[1] + ROOF_Y - 0.24) / 2, p[2]]} material={body}><boxGeometry args={[0.03, ROOF_Y - 0.24 - p[1], 0.06]} /></mesh>
          <group position={p} ref={(g) => { if (g) g.lookAt(...GOBO_TGT[i]); }}>
            <mesh rotation-x={Math.PI / 2} material={body} castShadow><cylinderGeometry args={[0.055, 0.065, 0.24, 20]} /></mesh>
            <mesh position={[0, 0, 0.125]} rotation-x={Math.PI / 2} material={lens}><cylinderGeometry args={[0.045, 0.045, 0.01, 20]} /></mesh>
          </group>
        </group>
      ))}
    </>
  );
}

export function Lighting() {
  const { scene } = useThree();
  const night = useStore((s) => s.night);
  const time = useStore((s) => s.time);
  const pattern = useStore((s) => s.pattern);
  const sun = useRef<THREE.DirectionalLight>(null);
  const moon = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const spots = useRef<(THREE.SpotLight | null)[]>([]);
  const warm = useRef<(THREE.PointLight | null)[]>([]);
  const fade = useRef({ pattern, k: 1 });
  const goboTargets = useMemo(() => GOBO_TGT.map((t) => { const o = new THREE.Object3D(); o.position.set(...t); return o; }), []);
  const fog = useMemo(() => new THREE.FogExp2('#c9dceb', 0.0016), []);

  useEffect(() => {
    scene.fog = fog;
    goboTargets.forEach((t) => scene.add(t));
    return () => { goboTargets.forEach((t) => scene.remove(t)); scene.fog = null; };
  }, [scene, fog, goboTargets]);

  useEffect(() => {
    spots.current.forEach((s, i) => { if (s) s.target = goboTargets[i]; });
  }, [goboTargets]);

  const fwd = useMemo(() => new THREE.Vector3(), []);
  const tmpA = useMemo(() => new THREE.Color(), []);
  const tmpB = useMemo(() => new THREE.Color(), []);

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.1);
    env.elapsed += d;
    const target = night ? 1 : 0;
    env.nightMix += (target - env.nightMix) * (1 - Math.exp(-d * 1.6));
    if (Math.abs(target - env.nightMix) < 0.001) env.nightMix = target;
    const m = env.nightMix;
    sound.setNight(m);

    sunDirAt(time, env.sunDir);
    env.sunElev = Math.asin(env.sunDir.y);
    const elevK = THREE.MathUtils.smoothstep(env.sunElev, 0.02, 0.5);
    if (sun.current) {
      // the 22 m shadow box follows the visitor (snapped to 1 m to avoid shimmer), so the tunnel lattices cast shadows too
      // centre on what is being looked at: the deck in orbit view, otherwise ~7 m ahead of the visitor
      const cam = state.camera.position;
      state.camera.getWorldDirection(fwd);
      fwd.y = 0; if (fwd.lengthSq() > 1e-6) fwd.normalize();
      const orbit = useStore.getState().mode === 'orbit' || useStore.getState().mode === 'intro';
      const cx = orbit ? 0 : Math.round(cam.x + fwd.x * 7), cz = orbit ? 0 : Math.round(cam.z + fwd.z * 7);
      sun.current.target.position.set(cx, 0, cz);
      sun.current.target.updateMatrixWorld();
      sun.current.position.copy(env.sunDir).multiplyScalar(30).add(sun.current.target.position);
      sun.current.intensity = (1 - m) * (1.4 + 3.4 * elevK);
      tmpA.set('#ffb070'); tmpB.set('#fff4e2');
      sun.current.color.copy(tmpA).lerp(tmpB, elevK);
      sun.current.shadow.autoUpdate = m < 0.98;
    }
    if (moon.current) moon.current.intensity = m * 0.85;
    if (hemi.current) {
      hemi.current.intensity = (1 - m) * (0.9 + 0.6 * elevK) + m * 0.42;
      tmpA.set('#bcd8f0'); tmpB.set('#4a64a0');
      hemi.current.color.copy(tmpA).lerp(tmpB, m);
      tmpA.set('#5b5a3a'); tmpB.set('#1a2420');
      hemi.current.groundColor.copy(tmpA).lerp(tmpB, m);
    }
    // gobo pattern cross-fade
    const f = fade.current;
    if (f.pattern !== pattern) {
      f.k -= d * 3;
      if (f.k <= 0) {
        f.k = 0; f.pattern = pattern;
        const t = goboTexture(pattern);
        spots.current.forEach((s) => { if (s) s.map = t; });
      }
    } else f.k = Math.min(1, f.k + d * 2);
    spots.current.forEach((s) => {
      if (!s) return;
      s.intensity = m * 48 * f.k;
      s.shadow.autoUpdate = m > 0.02;
    });
    warm.current.forEach((p, i) => { if (p) p.intensity = m * (i < 2 ? 1.8 : 0.9); });
    fog.color.copy(tmpA.set('#c9dceb')).lerp(tmpB.set('#1c2b4c'), m);
    fog.density = 0.0016 + m * 0.0025; // light haze: the CIAT campus stays readable a few hundred metres away
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={['#bcd8f0', '#5b5a3a', 0.9]} />
      <directionalLight
        ref={sun}
        castShadow
        intensity={3}
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.025}
        shadow-radius={2}
      >
        <orthographicCamera attach="shadow-camera" args={[-14, 14, 14, -14, 1, 70]} />
      </directionalLight>
      <directionalLight ref={moon} position={[-12, 22, -18]} intensity={0} color="#9fb4e0" />
      <GoboFixtures />
      {GOBO_POS.map((p, i) => (
        <spotLight
          key={i}
          ref={(el) => { spots.current[i] = el; }}
          position={[p[0], p[1] - 0.13, p[2]]}
          angle={0.62}
          penumbra={0.35}
          decay={2}
          distance={9}
          color="#ffcf94"
          intensity={0}
          castShadow
          map={goboTexture('hojas')}
          shadow-mapSize={[512, 512]}
          shadow-bias={-0.0004}
        />
      ))}
      {/* warm wash under the perforated ceiling + low bench glows (aimed down, away from the lagoon) */}
      <pointLight ref={(el) => { warm.current[0] = el; }} position={[-2, ROOF_Y - 0.55, 0]} distance={5} decay={2} color="#ffbe7a" intensity={0} />
      <pointLight ref={(el) => { warm.current[1] = el; }} position={[2, ROOF_Y - 0.55, 0]} distance={5} decay={2} color="#ffbe7a" intensity={0} />
      {BENCHES.map((b, i) => (
        <pointLight key={b.id} ref={(el) => { warm.current[2 + i] = el; }} position={[b.x, FLOOR_Y + 0.12, b.z]} distance={1.8} decay={2} color="#ffb366" intensity={0} />
      ))}
    </>
  );
}
