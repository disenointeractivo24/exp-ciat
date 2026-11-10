import { create } from 'zustand';
import * as THREE from 'three';

export type Mode = 'intro' | 'walk' | 'orbit' | 'seated' | 'focus' | 'tour';
export type NightPattern = 'hojas' | 'aves' | 'agua';
export type FocusId = 'slider-a' | 'slider-b' | 'wheel' | 'binoc' | 'maqueta' | 'espejo' | 'torre' | 'muro' | 'visor' | 'sombra-0' | 'sombra-1' | 'sombra-2';

/** The six "miradas" of the visit. */
export const JOURNEY = ['El túnel', 'Mirar abajo', 'Mirar a través', 'Conectar', 'Contemplar', 'Elevar la mirada'] as const;

// ---------------------------------------------------------------- Red de la vida
export type NodeId = 'agua' | 'veg' | 'aves' | 'ins' | 'luz' | 'tu';
export const NODES: { id: NodeId; label: string; x: number; y: number }[] = [
  { id: 'agua', label: 'Agua', x: 36, y: 86 },
  { id: 'veg', label: 'Vegetación', x: 16, y: 50 },
  { id: 'aves', label: 'Aves', x: 84, y: 50 },
  { id: 'ins', label: 'Insectos', x: 80, y: 82 },
  { id: 'luz', label: 'Luz', x: 26, y: 12 },
  { id: 'tu', label: 'Tú', x: 74, y: 12 },
];
export type LinkId = 'luz-veg' | 'veg-aves' | 'agua-aves' | 'agua-ins' | 'agua-veg' | 'veg-ins' | 'tu-agua' | 'tu-veg';
export const LINKS: { id: LinkId; a: NodeId; b: NodeId; text: string; hint: string }[] = [
  { id: 'luz-veg', a: 'luz', b: 'veg', text: 'La luz que atraviesa el follaje alimenta a las plantas y dibuja el sotobosque.', hint: 'Mueve la hora del día bajo la pérgola.' },
  { id: 'agua-veg', a: 'agua', b: 'veg', text: 'El agua sostiene la vegetación y los hábitats que rodean la laguna.', hint: 'Une en la rueda: pez · raíces · profundidad.' },
  { id: 'veg-aves', a: 'veg', b: 'aves', text: 'La vegetación ofrece refugio, nido y alimento a las aves.', hint: 'Explora el dosel en la capa transparente, o une colibrí · árbol · lluvia.' },
  { id: 'agua-aves', a: 'agua', b: 'aves', text: 'Las garzas cazan en la orilla; la laguna es su despensa.', hint: 'Une garza · juncos · orilla en la rueda.' },
  { id: 'agua-ins', a: 'agua', b: 'ins', text: 'Las libélulas nacen bajo el agua y viven sobre ella.', hint: 'Une libélula · nenúfar · superficie en la rueda.' },
  { id: 'veg-ins', a: 'veg', b: 'ins', text: 'Las plantas acuáticas son la percha y el vivero de los insectos.', hint: 'Desliza la capa hasta la superficie del agua.' },
  { id: 'tu-agua', a: 'tu', b: 'agua', text: 'Detenerte a observar también es una forma de cuidar la laguna.', hint: 'Siéntate en una banca y quédate un momento.' },
  { id: 'tu-veg', a: 'tu', b: 'veg', text: 'Al elevar la mirada, descubres que también haces parte de la red.', hint: 'Bajo la pérgola, mira hacia el techo.' },
];

// ---------------------------------------------------------------- time of day narrative
export const TIME_BANDS = [
  { until: 8, title: 'Amanecer', text: 'El coro de las aves despierta la laguna; las garzas salen de sus dormideros.' },
  { until: 11, title: 'Mañana', text: 'El sol calienta el agua y las libélulas empiezan a patrullar la orilla.' },
  { until: 14, title: 'Mediodía', text: 'El sol cae casi vertical sobre Palmira: las sombras se recogen, como bajo la copa de un samán.' },
  { until: 16.5, title: 'Tarde', text: 'El viento mueve la guadua; las plantas acuáticas dan sombra a los peces.' },
  { until: 99, title: 'Atardecer', text: 'Las garzas regresan en bandada a sus dormideros. La luz rasante alarga las sombras.' },
];
export const bandOf = (t: number) => TIME_BANDS.findIndex((b) => t < b.until);
export const NIGHT_TEXT = 'Ranas y grillos toman la palabra. La luz del deck apunta al piso: la laguna y los árboles-dormidero permanecen a oscuras.';
export const PATTERN_TEXT: Record<NightPattern, string> = {
  hojas: 'Hojas: la vegetación que filtra la luz y da refugio.',
  aves: 'Aves: las que duermen y anidan alrededor de la laguna.',
  agua: 'Agua: el origen de todas las conexiones.',
};

interface Toast { id: number; title?: string; text: string; tone?: 'info' | 'success' | 'final' | 'link' }

interface State {
  mode: Mode;
  prevMode: Mode;
  night: boolean;
  time: number; // 6..18 h
  pattern: NightPattern;
  hovered: string | null;
  hoverLabel: string | null;
  seat: number | null;
  focus: FocusId | null;
  tourStep: number;
  locked: boolean;
  sound: boolean;
  observe: boolean;
  journey: boolean[];
  /** Rubbings collected in the paper passport, one per node. A link of the net is drawn when both its nodes are stamped. */
  stamps: Record<string, boolean>;
  links: Record<string, boolean>;
  lastLink: LinkId | null;
  bands: boolean[];
  patternsSeen: Record<string, boolean>;
  wheelFound: boolean[];
  showNet: boolean;
  summary: boolean;
  toast: Toast | null;
  info: string | null;
  setNight: (n: boolean) => void;
  setTime: (t: number) => void;
  setPattern: (p: NightPattern) => void;
  setHovered: (id: string | null, label: string | null) => void;
  setMode: (m: Mode) => void;
  sit: (i: number) => void;
  stand: () => void;
  enterFocus: (f: FocusId) => void;
  exitFocus: () => void;
  setTourStep: (i: number) => void;
  setLocked: (l: boolean) => void;
  setSound: (s: boolean) => void;
  setObserve: (o: boolean) => void;
  mark: (i: number) => void;
  stamp: (node: NodeId) => LinkId[];
  setShowNet: (b: boolean) => void;
  setSummary: (b: boolean) => void;
  showToast: (text: string, title?: string, tone?: Toast['tone'], ms?: number) => void;
  setInfo: (s: string | null) => void;
}

let toastTimer: number | undefined;
let linkTimer: number | undefined;

export const useStore = create<State>((set, get) => ({
  mode: 'intro',
  prevMode: 'walk',
  night: false,
  time: 10.5,
  pattern: 'hojas',
  hovered: null,
  hoverLabel: null,
  seat: null,
  focus: null,
  tourStep: 0,
  locked: false,
  sound: true,
  observe: true,
  journey: [false, false, false, false, false, false],
  stamps: {},
  links: {},
  lastLink: null,
  bands: [false, false, false, false, false],
  patternsSeen: {},
  wheelFound: [false, false, false, false],
  showNet: false,
  summary: false,
  toast: null,
  info: null,
  setNight: (night) => {
    set({ night });
    if (night) set({ patternsSeen: { ...get().patternsSeen, [get().pattern]: true } });
  },
  setTime: (time) => {
    set({ time });
    const b = bandOf(time);
    const bands = get().bands;
    if (b >= 0 && !bands[b]) {
      const n = bands.slice(); n[b] = true;
      set({ bands: n });
      if (n.filter(Boolean).length >= 3) get().mark(1);
    }
  },
  setPattern: (pattern) => {
    set({ pattern });
    if (get().night) set({ patternsSeen: { ...get().patternsSeen, [pattern]: true } });
  },
  setHovered: (hovered, hoverLabel) => { if (get().hovered !== hovered) set({ hovered, hoverLabel }); },
  setMode: (mode) => set({ prevMode: get().mode, mode, hovered: null, hoverLabel: null, seat: mode === 'seated' ? get().seat : null, focus: mode === 'focus' ? get().focus : null, info: null }),
  sit: (seat) => set({ prevMode: get().mode, mode: 'seated', seat, hovered: null, hoverLabel: null }),
  stand: () => set({ mode: 'walk', seat: null }),
  enterFocus: (focus) => set({ prevMode: get().mode, mode: 'focus', focus, hovered: null, hoverLabel: null }),
  exitFocus: () => set({ mode: 'walk', focus: null, info: null }),
  setTourStep: (tourStep) => set({ tourStep }),
  setLocked: (locked) => set({ locked }),
  setSound: (sound) => set({ sound }),
  setObserve: (observe) => set({ observe }),
  mark: (i) => {
    const j = get().journey;
    if (j[i]) return;
    const n = j.slice();
    n[i] = true;
    set({ journey: n });
  },
  stamp: (node) => {
    if (get().stamps[node]) return [];
    const stamps = { ...get().stamps, [node]: true };
    const links = { ...get().links };
    const fresh: LinkId[] = [];
    for (const l of LINKS) if (!links[l.id] && stamps[l.a] && stamps[l.b]) { links[l.id] = true; fresh.push(l.id); }
    set({ stamps, links, lastLink: fresh[0] ?? get().lastLink });
    if (fresh.length) {
      window.clearTimeout(linkTimer);
      linkTimer = window.setTimeout(() => set({ lastLink: null }), 6500);
    }
    return fresh;
  },
  setShowNet: (showNet) => set({ showNet }),
  setSummary: (summary) => set({ summary }),
  showToast: (text, title, tone = 'info', ms = 6500) => {
    window.clearTimeout(toastTimer);
    set({ toast: { id: Date.now(), text, title, tone } });
    toastTimer = window.setTimeout(() => set({ toast: null }), ms);
  },
  setInfo: (info) => { if (get().info !== info) set({ info }); },
}));

/** Per-frame mutable environment shared by scene components (no React re-render). */
export const env = {
  nightMix: 0,
  sunDir: new THREE.Vector3(0.3, 0.9, 0.2).normalize(),
  sunElev: 1,
  elapsed: 0,
  mouse: new THREE.Vector2(0, 0),
  wheelGlow: 0,
};
