// Global architectural layout (meters). +Y up, lagoon lies toward -Z (north) and +X (east).

export const PALETTE = {
  forest: '#103C2F',
  olive: '#718C3A',
  lime: '#D6E65A',
  cream: '#F4F0E3',
  wood: '#9A6238',
  woodDark: '#6B4024',
  steel: '#2B2F2C',
};

/** The deck sits on a low mound (m above the surrounding ground); the stepped zone climbs it from the tunnel. */
export const MOUND = 0.5;
export const FLOOR_Y = MOUND + 0.32; // top of the deck boards
export const WATER_Y = -0.35;
export const DECK = { x0: -4, x1: 4, z0: -3, z1: 3 };
export const EDGE_X = 3.92; // railing / structural line
export const EDGE_Z = 2.92;
export const ROOF_Y = FLOOR_Y + 2.78; // top of main beams = underside of perforated ceiling
export const ROOF = { x0: -4.5, x1: 4.5, z0: -3.5, z1: 3.5 };
export const ROOF_X_LINES = [-4.5, -2.25, 0, 2.25, 4.5];
export const ROOF_Z_LINES = [-3.5, -7 / 6, 7 / 6, 3.5];

export const RAMP = { x0: -2.4, x1: -0.6, z0: 3, z1: 3 + (FLOOR_Y - MOUND) * 12 }; // 1:12 accessible slope down the mound

export const STRUCT_POSTS: [number, number][] = [
  [-EDGE_X, -EDGE_Z], [0, -EDGE_Z], [EDGE_X, -EDGE_Z],
  [-EDGE_X, EDGE_Z], [0, EDGE_Z], [EDGE_X, EDGE_Z],
];

export interface BenchDef { id: string; x: number; z: number; len: number; depth: number; rot: number; name: string }
// rot = yaw the seated visitor faces (0 = toward -Z / lagoon).
// Zones: WEST = rest (benches facing the clear railing), EAST = activity (layers, model, binoculars, wheel),
// CENTRE = canopy mirror, SOUTH = arrival. A third bench by the mural faces the lagoon diagonally (conversation bench).
export const BENCHES: BenchDef[] = [
  { id: 'bench-0', x: -2.9, z: 0.2, len: 1.6, depth: 0.64, rot: 0, name: 'Banca oeste' },
  { id: 'bench-1', x: -0.4, z: 0.2, len: 1.6, depth: 0.64, rot: 0, name: 'Banca central' },
  { id: 'bench-2', x: -2.75, z: 1.95, len: 1.6, depth: 0.64, rot: -Math.PI / 4, name: 'Banca del mural' },
];

// Wheel: three discs side by side at 0.85–1.25 m (reachable seated or standing), in the south-east corner,
// facing west so the lagoon is behind it; a reveal window opens mechanically when the three symbols line up.
export const WHEEL = { x: 3.2, z: 2.05, rot: -Math.PI / 2, width: 1.6 };

// "Elevar la mirada" without tilting the head back: a table-height mirror under the perforated ceiling.
// Looking down into it you see the canopy… and yourself in it.
export const MIRROR = { x: 0.9, z: 1.3, w: 1.0, d: 0.7, top: 0.78 };

export interface SliderDef { id: string; x: number; z: number; rot: number; len: number; variant: 0 | 1; title: string }
export const SLIDERS: SliderDef[] = [
  { id: 'slider-a', x: 1.3, z: -EDGE_Z, rot: 0, len: 2.6, variant: 0, title: 'Capas del ecosistema' },
  { id: 'slider-b', x: EDGE_X, z: 0.1, rot: -Math.PI / 2, len: 2.6, variant: 1, title: 'Aves de la laguna' },
];
/** Sliding layers sit 0.85–1.45 m: inside the sightline of a seated visitor or wheelchair user (eye ≈ 1.15–1.25 m). */
export const SLIDE_Y0 = 0.85;
export const SLIDE_Y1 = 1.45;
export const SLIDE_OFFSET = 0.13; // mounted on the deck side of the handrail

// Night projection control post, at the arrival, facing into the deck (visitor stands north of it).
export const SELECTOR = { x: 0.35, z: 2.62, rot: Math.PI };
/** Night gobo projectors hanging from the central beam (x = 0), aimed only at the floor. */
export const GOBOS: { pos: [number, number, number]; target: [number, number, number]; zone: string }[] = [
  { pos: [-0.14, 0, -1.6], target: [-1.75, 0, -1.35], zone: 'frente a las bancas' },
  { pos: [0.14, 0, -1.2], target: [1.3, 0, -1.2], zone: 'zona de las capas' },
  { pos: [-0.14, 0, 1.9], target: [-0.9, 0, 1.9], zone: 'llegada desde la rampa' },
];
export const SIGN = { x: 0.35, z: 7.7, rot: 0 };

// "Lo que se ve desde la torre", at ground level: tactile relief model + fixed binoculars at seated eye height.
export const MAQUETA = { x: 3.0, z: -1.25, w: 0.9, d: 0.7, top: 0.8 }; // w along z, d along x; visitor stands on the west side
export const BINOC = { x: 3.25, z: -2.66, eye: 1.18 };
/** Observation tower, south of the deck at the end of the plank path (as marked on the site sketch). */
export const TOWER = { x: -0.7, z: 18.4 }; // its ramp starts where the deck ramp ends
// Shadow clock: a single 14 cm oculus in the perforated ceiling whose light spot crosses hour marks on the floor.
export const OCULUS = { x: -0.2, z: -0.75, r: 0.07 }; // calibrated for the real orientation of the site: the spot runs from the gap between the benches toward the lagoon
export const CLOCK_HOURS = [10, 11, 12, 13, 14];

// Rubbing plates for the visitor's paper passport: one per node of the "Red de la vida", all at 0.75–1.1 m.
export type PlateNode = 'agua' | 'veg' | 'aves' | 'ins' | 'luz' | 'tu';
export interface PlateDef { node: PlateNode; x: number; y: number; z: number; rot: number; tilt: number; where: string }
export const PLATES: PlateDef[] = [
  { node: 'luz', x: -0.1, y: 0.95, z: -EDGE_Z, rot: -Math.PI / 2, tilt: 0, where: 'en el poste frente al reloj de luz' },
  { node: 'veg', x: -3.84, y: 0.95, z: -0.42, rot: Math.PI / 2, tilt: 0, where: 'en la celosía de guadua, junto a la banca oeste' },
  { node: 'aves', x: BINOC.x, y: 0.82, z: BINOC.z + 0.065, rot: 0, tilt: 0, where: 'bajo los binoculares' },
  { node: 'ins', x: 2.86, y: 1.12, z: -EDGE_Z + 0.02, rot: 0, tilt: -1.1, where: 'en la baranda, junto a la capa del ecosistema' },
  { node: 'agua', x: MAQUETA.x - MAQUETA.d / 2 - 0.02, y: 0.7, z: MAQUETA.z + 0.28, rot: -Math.PI / 2, tilt: 0, where: 'en el borde de la maqueta táctil' },
  { node: 'tu', x: MIRROR.x + 0.3, y: 0.66, z: MIRROR.z + MIRROR.d / 2 + 0.02, rot: 0, tilt: 0, where: 'en el borde del espejo del dosel' },
];

// Railing segments: [x1, z1, x2, z2, graphicVariant]. Sliding-panel segments get extra hardware.
export const SLIDE_BAY = -10;
export const RAILINGS: [number, number, number, number, number][] = [
  // front (lagoon). -1..-3 = clear bird-safe glass at 1.0 m + panoramic guide, in front of the benches.
  // SLIDE_BAY = glass guard up to 1.47 m with no handrail crossing the sliding layer (its frame is the top rail).
  [-EDGE_X, -EDGE_Z, -2.6, -EDGE_Z, -1],
  [-2.6, -EDGE_Z, -1.3, -EDGE_Z, -2],
  [-1.3, -EDGE_Z, 0, -EDGE_Z, -3],
  [0, -EDGE_Z, 1.3, -EDGE_Z, SLIDE_BAY],
  [1.3, -EDGE_Z, 2.6, -EDGE_Z, SLIDE_BAY],
  [2.6, -EDGE_Z, EDGE_X, -EDGE_Z, 0],
  // east (lagoon)
  [EDGE_X, -EDGE_Z, EDGE_X, -1.2, 2],
  [EDGE_X, -1.2, EDGE_X, 0.1, SLIDE_BAY],
  [EDGE_X, 0.1, EDGE_X, 1.4, SLIDE_BAY],
  [EDGE_X, 1.4, EDGE_X, EDGE_Z, 1],
  // west, toward lagoon
  [-EDGE_X, -EDGE_Z, -EDGE_X, -1.75, 3],
  [-EDGE_X, -1.75, -EDGE_X, -0.62, 2],
  // back (path side), entry gap between RAMP.x0 and RAMP.x1
  [-EDGE_X, EDGE_Z, RAMP.x0, EDGE_Z, 0],
  [RAMP.x1, EDGE_Z, 0.85, EDGE_Z, 1],
  [0.85, EDGE_Z, 2.4, EDGE_Z, 2],
  [2.4, EDGE_Z, EDGE_X, EDGE_Z, 3],
];

export const WALL = { x: -EDGE_X, z0: 0.22, z1: EDGE_Z, h: 2.5 };
export const SLATS = { x: -EDGE_X, z0: -0.62, z1: 0.22 };

export const EYE = 1.62;
export const SEAT_EYE = 1.17;

/** The visit begins at the north entrance of the guadua tunnel, looking down the trail (cows on the right). */
export const START = { x: -20.62, z: -60.0, yaw: 3.13 };
