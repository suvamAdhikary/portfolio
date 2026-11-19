// Living karesansui (dry rock garden). Plain Canvas 2D, no dependencies.
// Loaded on demand by ZenGarden.astro once the section nears the viewport.

type RGB = [number, number, number];
type V3 = [number, number, number];
type Pt = [number, number];
type Ctx = CanvasRenderingContext2D;
type StoneId = 'pay' | 'gql' | 'kafka' | 'cons' | 'mongo';
type Side = 'b' | 't';
type Box = [number, number, number, number]; // x0, y0, x1, y1 in CSS px

interface Theme {
  name: 'light' | 'dark';
  gravel: string;
  glow: string;
  glowAt: Pt;
  vignette: string;
  gSh: string;
  gHi: string;
  grain: [RGB, RGB, RGB];
  L: V3;
  shadow: string;
  shLen: number;
  rockLit: RGB;
  rockDark: RGB;
  lichen: string;
  moss: string[];
  mossBase: string;
  clay: string;
  clayStain: [string, string];
  coping: string;
  copingLine: string;
  wood: [string, string, string];
  woodGrain: string;
  woodHi: string;
  pebble: [RGB, RGB, RGB, RGB];
  primary: RGB;
  warm: RGB;
  leaves: string[];
  branch: string;
  lantern: RGB;
  glowLantern: string | null;
}

interface Rock {
  outerV: V3[];
  mid: V3[];
  peak: V3;
  tone: number;
  speck: [number, number, number, number][];
  cracks: Pt[][];
  lichen: V3[];
}

/** Anything with an island outline: stones and the moss cushion under the lantern. */
interface Island {
  a: number[];
  h: number[];
  ecc: number;
  rot: number;
  seed: number;
  x: number;
  y: number;
  IR: number;
}

interface StoneDef {
  id: StoneId;
  name: string;
  size: number;
  rate: number;
  seed: number;
  moss: number;
  rocks: [number, number, number, number][];
}

interface Stone extends StoneDef, Island {
  rk: Rock[];
  phase: number;
  R: number;
  rings: number;
  side: Side;
  down: boolean;
  downAt: number;
  upAt: number;
  boost: number;
  acc: number;
  fAcc: number;
  pAcc: number;
  buffer: number;
  pulse: number;
  holdStart: number;
  queue: number;
  pending: number;
  dAcc: number;
  rAcc: number;
  surge: number;
}

interface GPath {
  i: number;
  a: Stone;
  b: Stone;
  bend: number;
  heat: number;
  n: number;
  chan: Pt[];
  trav: Pt[];
  len: number;
}

interface Msg {
  p: GPath;
  t: number;
  dir: number;
  kind: 'msg' | 'retry' | 'resp';
  v: number;
}

interface Ripple {
  s: Stone;
  born: number;
  color: RGB;
  a: number;
  big: boolean;
}

interface Maple {
  segs: { pts: Pt[]; w0: number; w1: number }[];
  leaves: [number, number, number, number, number][];
  sz: number;
  tip: Pt;
  box: Box;
}

interface Layer {
  c: HTMLCanvasElement;
  x0: number;
  y0: number;
}

interface Scene {
  sand: HTMLCanvasElement;
  front: Layer;
  maple: Maple;
}

const TAU = Math.PI * 2;
const HOLD_MS = 600;
const DOWN_S = 4.5;

const STONE_DEFS: StoneDef[] = [
  {
    id: 'pay',
    name: 'Payments',
    size: 0.86,
    rate: 0.85,
    seed: 3,
    moss: 1.45,
    rocks: [[0, 0, 1.08, 1.15]],
  },
  {
    id: 'gql',
    name: 'GraphQL gateway',
    size: 0.84,
    rate: 1.0,
    seed: 17,
    moss: 0,
    rocks: [[0, 0, 1, 0.95]],
  },
  {
    id: 'kafka',
    name: 'Event pipeline (Kafka)',
    size: 1.0,
    rate: 0,
    seed: 11,
    moss: 1.75,
    rocks: [
      [0.05, -0.1, 1.12, 1.7],
      [-0.98, 0.45, 0.56, 0.8],
      [0.92, 0.42, 0.46, 0.65],
    ],
  },
  {
    id: 'cons',
    name: 'Consumers',
    size: 0.95,
    rate: 0,
    seed: 5,
    moss: 1.35,
    rocks: [
      [-0.55, -0.1, 0.62, 0.5],
      [0.48, -0.38, 0.5, 0.42],
      [0.18, 0.52, 0.55, 0.45],
    ],
  },
  {
    id: 'mongo',
    name: 'MongoDB',
    size: 0.95,
    rate: 0,
    seed: 29,
    moss: 1.4,
    rocks: [[0, 0, 1.08, 0.6]],
  },
];

type LayoutSpec = Record<StoneId, [number, number, Side]> & { lantern: Pt | null };
// positions are fractions of the gravel bed: [x, y, label side]
const LAYOUTS: Record<'wide' | 'tall', LayoutSpec> = {
  wide: {
    pay: [0.12, 0.3, 'b'],
    gql: [0.2, 0.76, 'b'],
    kafka: [0.45, 0.42, 'b'],
    cons: [0.72, 0.62, 'b'],
    mongo: [0.9, 0.3, 'b'],
    lantern: [0.035, 0.94],
  },
  tall: {
    pay: [0.3, 0.12, 'b'],
    gql: [0.78, 0.29, 'b'],
    kafka: [0.44, 0.49, 'b'],
    cons: [0.26, 0.8, 'b'],
    mongo: [0.77, 0.84, 't'],
    lantern: null,
  },
};
const PATHS: [StoneId, StoneId, number][] = [
  ['pay', 'kafka', 0.1],
  ['gql', 'kafka', -0.12],
  ['kafka', 'cons', 0.1],
  ['cons', 'mongo', -0.14],
  ['gql', 'mongo', 0.12],
];

const THEMES: Record<'light' | 'dark', Theme> = {
  light: {
    name: 'light',
    gravel: '#e6e1d5',
    glow: 'rgba(255,250,236,0.75)',
    glowAt: [0.1, -0.2],
    vignette: 'rgba(90,72,45,0.16)',
    gSh: 'rgba(104,92,72,0.27)',
    gHi: 'rgba(255,255,250,0.62)',
    grain: [
      [88, 80, 70],
      [255, 255, 255],
      [40, 38, 36],
    ],
    L: [-0.5, -0.62, 0.6],
    shadow: 'rgba(58,44,26,0.42)',
    shLen: 0.85,
    rockLit: [178, 172, 160],
    rockDark: [58, 54, 48],
    lichen: 'rgba(150,160,120,0.22)',
    moss: ['#3a5420', '#465f28', '#566f30', '#68833a', '#2a3d17', '#7d9446'],
    mossBase: '#40572a',
    clay: '#b88b5c',
    clayStain: ['rgba(150,96,50,0.18)', 'rgba(205,150,95,0.16)'],
    coping: '#6a5d50',
    copingLine: 'rgba(40,32,26,0.35)',
    wood: ['#8e6c4b', '#7c5d40', '#6c4f35'],
    woodGrain: 'rgba(52,34,18,0.22)',
    woodHi: 'rgba(255,236,205,0.18)',
    pebble: [
      [110, 106, 99],
      [86, 83, 77],
      [134, 129, 120],
      [70, 67, 62],
    ],
    primary: [40, 132, 225],
    warm: [206, 102, 24],
    leaves: ['#b8352a', '#c9441f', '#d65e22', '#9c2a1f', '#de7d2a', '#ad3020'],
    branch: '#4a3426',
    lantern: [168, 162, 150],
    glowLantern: null,
  },
  dark: {
    name: 'dark',
    gravel: '#323a49',
    glow: 'rgba(160,180,220,0.26)',
    glowAt: [0.9, -0.25],
    vignette: 'rgba(0,0,6,0.55)',
    gSh: 'rgba(6,9,16,0.55)',
    gHi: 'rgba(196,212,245,0.22)',
    grain: [
      [10, 14, 22],
      [150, 165, 200],
      [0, 0, 0],
    ],
    L: [0.62, -0.5, 0.5],
    shadow: 'rgba(4,7,14,0.62)',
    shLen: 1.0,
    rockLit: [122, 132, 152],
    rockDark: [20, 24, 32],
    lichen: 'rgba(120,140,130,0.14)',
    moss: ['#1e3326', '#27402d', '#305036', '#3c5f40', '#15251a', '#4a6e4a'],
    mossBase: '#22392a',
    clay: '#5a4a3b',
    clayStain: ['rgba(20,14,8,0.25)', 'rgba(120,96,70,0.12)'],
    coping: '#2b2e35',
    copingLine: 'rgba(0,0,0,0.45)',
    wood: ['#3e352b', '#342c24', '#2b241d'],
    woodGrain: 'rgba(0,0,0,0.3)',
    woodHi: 'rgba(170,190,230,0.10)',
    pebble: [
      [40, 44, 52],
      [30, 33, 40],
      [52, 57, 66],
      [22, 24, 30],
    ],
    primary: [130, 188, 255],
    warm: [251, 150, 64],
    leaves: ['#922b22', '#a63c1e', '#b9541f', '#7c2119', '#c46c24', '#8c281c'],
    branch: '#1f1914',
    lantern: [120, 126, 138],
    glowLantern: 'rgba(255,184,104,0.34)',
  },
};

const FAIL_MSG: Record<StoneId, string> = {
  pay: 'Payments is down. Its events stop; everything else keeps flowing.',
  gql: 'The GraphQL gateway is down. Its events and queries pause; Payments keeps flowing.',
  kafka: 'Kafka is down. Producers retry and buffer events locally, so nothing is lost.',
  cons: 'Consumers are down. Kafka holds the events, so lag grows instead of data being lost.',
  mongo: 'MongoDB is down. Writes back off and retry, and consumers slow down to match.',
};
const UP_MSG: Record<StoneId, string> = {
  pay: 'Payments recovered.',
  gql: 'The GraphQL gateway recovered; queued queries retry.',
  kafka: 'Kafka recovered. Producers flush their buffered events.',
  cons: 'Consumers rejoined and rebalanced. Working through the lag.',
  mongo: 'MongoDB recovered. Retried writes go through.',
};

const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const rgb = (c: RGB) => `rgb(${c[0]},${c[1]},${c[2]})`;
const mix = (a: RGB, b: RGB, k: number): RGB => [
  Math.round(a[0] + (b[0] - a[0]) * k),
  Math.round(a[1] + (b[1] - a[1]) * k),
  Math.round(a[2] + (b[2] - a[2]) * k),
];

function rng(seed: number): () => number {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function get2d(c: HTMLCanvasElement): Ctx {
  const x = c.getContext('2d');
  if (!x) throw new Error('Canvas 2D is not available');
  return x;
}

// a faceted rock: outer ring, shoulder ring, and a peak, all in unit coordinates
function makeRock(seed: number): Rock {
  const r = rng(seed);
  const n = 9 + Math.floor(r() * 5);
  const rot = r() * TAU;
  const ecc = 0.12 + r() * 0.25;
  const outerV: V3[] = [];
  const mid: V3[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + (r() - 0.5) * (TAU / n) * 0.6;
    const e = 1 + ecc * Math.cos(2 * (a - rot));
    outerV.push([Math.cos(a) * (0.78 + r() * 0.3) * e, Math.sin(a) * (0.78 + r() * 0.3) * e, 0]);
    const am = a + (r() - 0.5) * 0.5;
    const rm = (0.42 + r() * 0.25) * e;
    mid.push([Math.cos(am) * rm, Math.sin(am) * rm, 0.55 + r() * 0.3]);
  }
  const pa = r() * TAU;
  const pr = r() * 0.25;
  return {
    outerV,
    mid,
    peak: [Math.cos(pa) * pr, Math.sin(pa) * pr, 1],
    tone: r() * 0.12 - 0.06,
    speck: Array.from({ length: 150 }, () => [r() * 2 - 1, r() * 2 - 1, r(), r()]),
    cracks: Array.from({ length: 2 + Math.floor(r() * 2) }, () => {
      const p: Pt[] = [[r() * 1.2 - 0.6, r() * 1.2 - 0.6]];
      let a = r() * TAU;
      for (let k = 0; k < 5; k++) {
        a += (r() - 0.5) * 1.2;
        const q = p[p.length - 1];
        p.push([q[0] + Math.cos(a) * 0.12, q[1] + Math.sin(a) * 0.12]);
      }
      return p;
    }),
    lichen: Array.from({ length: 3 }, () => [r() * 1.2 - 0.6, r() * 1.2 - 0.6, 0.08 + r() * 0.12]),
  };
}

// island outline: smooth ovoid that becomes rounder further out
const blob = (o: Island, th: number) => {
  const e = 1 + o.ecc * Math.cos(2 * (th - o.rot));
  return (
    e *
    (1 +
      o.a[0] * Math.sin(2 * th + o.h[0]) +
      o.a[1] * Math.sin(3 * th + o.h[1]) +
      o.a[2] * Math.sin(5 * th + o.h[2]))
  );
};
function blobPath(
  c: Ctx,
  o: Island,
  cx: number,
  cy: number,
  R: number,
  grow = 0,
  decay = 1,
  wob = 0
) {
  c.beginPath();
  for (let i = 0; i <= 120; i++) {
    const th = (i / 120) * TAU;
    const w = wob ? Math.sin(th * 9 + grow) * wob + Math.sin(th * 23 + grow * 2) * wob * 0.5 : 0;
    const rr = R + (blob(o, th) - 1) * R * decay + grow + w;
    const x = cx + Math.cos(th) * rr;
    const y = cy + Math.sin(th) * rr;
    if (i) c.lineTo(x, y);
    else c.moveTo(x, y);
  }
  c.closePath();
}
function mossPath(c: Ctx, o: Island, cx: number, cy: number, R: number) {
  c.beginPath();
  for (let i = 0; i <= 160; i++) {
    const th = (i / 160) * TAU;
    const rr =
      R *
      blob(o, th) *
      (1 +
        0.035 * Math.sin(th * 7 + o.h[3]) +
        0.02 * Math.sin(th * 13 + o.h[0]) +
        0.012 * Math.sin(th * 29));
    const x = cx + Math.cos(th) * rr;
    const y = cy + Math.sin(th) * rr;
    if (i) c.lineTo(x, y);
    else c.moveTo(x, y);
  }
  c.closePath();
}
function polyPath(c: Ctx, pts: Pt[]) {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
}
function rockPoly(rk: Rock, cx: number, cy: number, R: number): Pt[] {
  return rk.outerV.map(([x, y]) => [cx + x * R, cy + y * R]);
}
function leafPath(c: Ctx, x: number, y: number, sz: number, rot: number) {
  const lobes = [-1.95, -1.25, -0.62, 0, 0.62, 1.25, 1.95];
  const lens = [0.5, 0.78, 0.95, 1, 0.95, 0.78, 0.5];
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.beginPath();
  c.moveTo(0, 0);
  for (let k = 0; k < 7; k++) {
    const a = lobes[k] - Math.PI / 2;
    const va = (k ? (lobes[k - 1] + lobes[k]) / 2 : lobes[0] - 0.4) - Math.PI / 2;
    const L = lens[k] * sz;
    const V = sz * 0.3;
    c.lineTo(Math.cos(va) * V, Math.sin(va) * V);
    c.quadraticCurveTo(
      Math.cos(a - 0.22) * L * 0.72,
      Math.sin(a - 0.22) * L * 0.72,
      Math.cos(a) * L,
      Math.sin(a) * L
    );
    c.quadraticCurveTo(
      Math.cos(a + 0.22) * L * 0.72,
      Math.sin(a + 0.22) * L * 0.72,
      Math.cos(a + 0.31) * V * 1.1,
      Math.sin(a + 0.31) * V * 1.1
    );
  }
  c.closePath();
  c.restore();
}
function drawLeaf(c: Ctx, x: number, y: number, sz: number, rot: number, col: string) {
  leafPath(c, x, y, sz, rot);
  c.fillStyle = col;
  c.fill();
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.strokeStyle = 'rgba(70,10,0,0.35)';
  c.lineWidth = 0.5;
  c.beginPath();
  for (const a of [-1.95, -1.25, -0.62, 0, 0.62, 1.25, 1.95]) {
    c.moveTo(0, 0);
    c.lineTo(Math.cos(a - Math.PI / 2) * sz * 0.8, Math.sin(a - Math.PI / 2) * sz * 0.8);
  }
  c.moveTo(0, 0);
  c.lineTo(0, sz * 0.55);
  c.stroke();
  c.restore();
}
function ellipseAt(c: Ctx, x: number, y: number, rx: number, ry: number, ro: number) {
  c.moveTo(x + Math.cos(ro) * rx, y + Math.sin(ro) * rx);
  c.ellipse(x, y, rx, ry, ro, 0, TAU);
}

export interface GardenHandle {
  destroy: () => void;
}

/**
 * Mounts the garden into `root` (the figure that holds the canvas). Stone buttons and labels
 * are added as real DOM elements; `statusEl` is the aria-live region for announcements.
 */
export function mountGarden(
  root: HTMLElement,
  statusEl: HTMLElement | null,
  hintId: string
): GardenHandle {
  const startMark = performance.now();
  const canvasEl = root.querySelector('canvas');
  if (!canvasEl) throw new Error('Garden canvas missing');
  const canvas: HTMLCanvasElement = canvasEl;
  const ctx = get2d(canvas);
  const html = document.documentElement;
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');

  let T: Theme = THEMES.light;
  const lightVec = (): V3 => {
    const [a, b, c] = T.L;
    const n = Math.hypot(a, b, c);
    return [a / n, b / n, c / n];
  };

  // ---------- stones ----------
  const STONES: Stone[] = STONE_DEFS.map((d, si) => {
    const r = rng(d.seed);
    return {
      ...d,
      h: [r() * TAU, r() * TAU, r() * TAU, r() * TAU],
      a: [0.05 + r() * 0.04, 0.03 + r() * 0.03, 0.015 + r() * 0.012, 0.02 + r() * 0.015],
      rot: r() * TAU,
      ecc: 0.1 + r() * 0.1,
      rk: d.rocks.map((_, i) => makeRock(d.seed * 31 + i * 7)),
      phase: si * 1.3,
      x: 0,
      y: 0,
      R: 0,
      IR: 0,
      rings: 0,
      side: 'b',
      down: false,
      downAt: 0,
      upAt: -9,
      boost: 0,
      acc: Math.random(),
      fAcc: 0,
      pAcc: 0,
      buffer: 0,
      pulse: -9,
      holdStart: 0,
      queue: 0,
      pending: 0,
      dAcc: 0,
      rAcc: 0,
      surge: -9,
    };
  });
  const S = Object.fromEntries(STONES.map((s) => [s.id, s])) as Record<StoneId, Stone>;
  const { kafka, cons, mongo, pay, gql } = S;

  // ---------- geometry ----------
  let W = 0;
  let H = 0;
  let DPR = 1;
  let unit = 0;
  let gap = 6;
  let layout: 'wide' | 'tall' = 'wide';
  let chanW = 14;
  let G = { x0: 0, y0: 0, x1: 0, y1: 0 }; // gravel bed
  const F = { wall: 0, side: 0, eng: 0, peb: 0, lantern: null as Pt | null };
  let scene: Scene | null = null;
  const sceneCache = new Map<string, Scene>();
  const outer = (s: Stone) => s.IR + s.rings * gap;

  const paths: GPath[] = PATHS.map(([a, b, bend], i) => ({
    i,
    a: S[a],
    b: S[b],
    bend,
    heat: 0,
    n: 0,
    chan: [],
    trav: [
      [0, 0],
      [1, 1],
    ],
    len: 1,
  }));

  function layoutAll() {
    layout = W / H < 1.05 ? 'tall' : 'wide';
    unit = Math.min(W, H);
    F.wall = Math.max(12, Math.min(28, H * 0.045));
    F.side = Math.max(9, Math.min(20, W * 0.02));
    F.eng = Math.max(22, Math.min(52, H * 0.085));
    F.peb = Math.max(7, Math.min(14, unit * 0.026));
    G = {
      x0: F.peb,
      y0: F.wall + F.peb * 0.8,
      x1: W - F.side - F.peb * 0.8,
      y1: H - F.eng - F.peb,
    };
    const gw = G.x1 - G.x0;
    const gh = G.y1 - G.y0;
    const gu = Math.min(gw, gh);
    const base = layout === 'tall' ? Math.min(gw * 0.062, gh * 0.05) : gu * 0.066;
    gap = Math.max(4.4, Math.min(7.5, unit * 0.016));
    chanW = gap * 2;
    for (const s of STONES) {
      const [x, y, side] = LAYOUTS[layout][s.id];
      s.x = G.x0 + x * gw;
      s.y = G.y0 + y * gh;
      s.side = side;
      s.R = base * s.size;
      s.IR = s.moss ? s.R * s.moss : s.R * 1.18;
      s.rings = (layout === 'tall' ? 3 : 4) + (s.id === 'kafka' ? 1 : 0);
    }
    const lp = LAYOUTS[layout].lantern;
    F.lantern = lp ? [G.x0 + lp[0] * gw, G.y0 + lp[1] * gh] : null;
    for (const p of paths) buildPath(p);
  }

  function resample(pts: Pt[], cum: number[], l0: number, l1: number, N: number): Pt[] {
    const out: Pt[] = [];
    let j = 0;
    for (let k = 0; k <= N; k++) {
      const L = l0 + ((l1 - l0) * k) / N;
      while (j < cum.length - 2 && cum[j + 1] < L) j++;
      const f = (L - cum[j]) / (cum[j + 1] - cum[j] || 1);
      out.push([
        pts[j][0] + (pts[j + 1][0] - pts[j][0]) * f,
        pts[j][1] + (pts[j + 1][1] - pts[j][1]) * f,
      ]);
    }
    return out;
  }
  function buildPath(p: GPath) {
    const { a, b } = p;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    const cx = (a.x + b.x) / 2 - (dy / len) * p.bend * len;
    const cy = (a.y + b.y) / 2 + (dx / len) * p.bend * len;
    const pts: Pt[] = [];
    const cum = [0];
    for (let i = 0; i <= 300; i++) {
      const t = i / 300;
      const u = 1 - t;
      pts.push([
        u * u * a.x + 2 * u * t * cx + t * t * b.x,
        u * u * a.y + 2 * u * t * cy + t * t * b.y,
      ]);
      if (i)
        cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    const first = (s: Stone, r: number, from: boolean) => {
      let k = from ? 0 : pts.length - 1;
      const stepK = from ? 1 : -1;
      const inside = (q: Pt) =>
        Math.hypot(q[0] - s.x, q[1] - s.y) < r * blob(s, Math.atan2(q[1] - s.y, q[0] - s.x));
      while (k >= 0 && k <= pts.length - 1 && inside(pts[k])) k += stepK;
      return cum[Math.max(0, Math.min(pts.length - 1, k))];
    };
    const c0 = first(a, outer(a) + gap * 0.2, true);
    const c1 = first(b, outer(b) + gap * 0.2, false);
    const t0 = first(a, a.IR * 0.98, true);
    const t1 = first(b, b.IR * 0.98, false);
    p.chan = c1 > c0 ? resample(pts, cum, c0, c1, 64) : [];
    p.trav = resample(pts, cum, t0, Math.max(t0 + 1, t1), 120);
    p.len = Math.max(1, t1 - t0);
  }
  function at(p: GPath, t: number): Pt {
    const f = Math.max(0, Math.min(1, t)) * (p.trav.length - 1);
    const i = Math.min(p.trav.length - 2, f | 0);
    const k = f - i;
    const A = p.trav[i];
    const B = p.trav[i + 1];
    return [A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k];
  }
  function offsetLine(c: Ctx, pts: Pt[], off: number, wob = 0) {
    c.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const A = pts[Math.max(0, i - 1)];
      const B = pts[Math.min(pts.length - 1, i + 1)];
      const dx = B[0] - A[0];
      const dy = B[1] - A[1];
      const l = Math.hypot(dx, dy) || 1;
      const o = off + (wob ? Math.sin(i * 0.7 + off) * wob : 0);
      const x = pts[i][0] - (dy / l) * o;
      const y = pts[i][1] + (dx / l) * o;
      if (i) c.lineTo(x, y);
      else c.moveTo(x, y);
    }
  }

  // ---------- offscreen helpers ----------
  // where each offscreen layer sits in the scene, so layers can be composited into each other
  const origins = new WeakMap<Ctx, Pt>();
  const devicePos = (x: Ctx, l: Layer): Pt => {
    const [ox, oy] = origins.get(x) ?? [0, 0];
    return [Math.round((l.x0 - ox) * DPR), Math.round((l.y0 - oy) * DPR)];
  };
  /** A canvas covering only `box` (CSS px), snapped to the device-pixel grid, drawn in scene coordinates. */
  function layer(box: Box): [Layer, Ctx] {
    const x0 = Math.floor(Math.max(0, box[0]) * DPR) / DPR;
    const y0 = Math.floor(Math.max(0, box[1]) * DPR) / DPR;
    const x1 = Math.min(W, box[2]);
    const y1 = Math.min(H, box[3]);
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil((x1 - x0) * DPR));
    c.height = Math.max(1, Math.ceil((y1 - y0) * DPR));
    const x = get2d(c);
    x.setTransform(DPR, 0, 0, DPR, -x0 * DPR, -y0 * DPR);
    origins.set(x, [x0, y0]);
    return [{ c, x0, y0 }, x];
  }
  function blit(x: Ctx, l: Layer) {
    x.save();
    x.setTransform(1, 0, 0, 1, 0, 0);
    const [dx, dy] = devicePos(x, l);
    x.drawImage(l.c, dx, dy);
    x.restore();
  }
  /**
   * Draw a layer blurred, cheaply: scale it down, then back up with smoothing. This avoids
   * ctx.filter (slow in software raster, missing in older Safari) and works everywhere.
   */
  function blitBlur(x: Ctx, l: Layer, blurPx: number, alpha: number) {
    const [dx, dy] = devicePos(x, l);
    const k = Math.max(1, Math.min(8, blurPx * DPR * 0.75));
    const s = document.createElement('canvas');
    s.width = Math.max(1, Math.round(l.c.width / k));
    s.height = Math.max(1, Math.round(l.c.height / k));
    const sx = get2d(s);
    sx.imageSmoothingQuality = 'high';
    sx.drawImage(l.c, 0, 0, s.width, s.height);
    x.save();
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalAlpha = alpha;
    x.imageSmoothingQuality = 'high';
    x.drawImage(s, dx, dy, l.c.width, l.c.height);
    x.restore();
  }
  function softShadow(x: Ctx, box: Box, draw: (lx: Ctx) => void, alpha: number, blurPx: number) {
    const pad = blurPx * 3 + 2;
    const [l, lx] = layer([box[0] - pad, box[1] - pad, box[2] + pad, box[3] + pad]);
    lx.fillStyle = '#000';
    draw(lx);
    blitBlur(x, l, blurPx, alpha);
  }
  const boxAround = (cx: number, cy: number, r: number): Box => [cx - r, cy - r, cx + r, cy + r];

  // a raked groove: shadowed wall toward the light, lit wall away from it
  function groove(c: Ctx, drawPath: () => void, w = 1) {
    const [lx, ly] = lightVec();
    const o = gap * 0.16 * w;
    c.lineWidth = gap * 0.3 * w;
    c.save();
    c.translate(lx * o, ly * o);
    c.strokeStyle = T.gSh;
    drawPath();
    c.stroke();
    c.restore();
    c.save();
    c.translate(-lx * o, -ly * o);
    c.strokeStyle = T.gHi;
    drawPath();
    c.stroke();
    c.restore();
  }

  function grainTile(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = c.height = 192;
    const x = get2d(c);
    const img = x.createImageData(192, 192);
    const r = rng(99);
    const [d, l, k] = T.grain;
    const d8 = img.data;
    for (let i = 0; i < d8.length; i += 4) {
      const v = r();
      let col: RGB | null = null;
      let a = 0;
      if (v < 0.22) {
        col = d;
        a = 0.1 + r() * 0.16;
      } else if (v < 0.34) {
        col = l;
        a = 0.25 + r() * 0.3;
      } else if (v < 0.352) {
        col = k;
        a = 0.35 + r() * 0.3;
      }
      if (col) {
        d8[i] = col[0];
        d8[i + 1] = col[1];
        d8[i + 2] = col[2];
        d8[i + 3] = a * 255;
      }
    }
    x.putImageData(img, 0, 0);
    return c;
  }

  // Rocks are painted into a canvas the size of the rock, then composited into the scene.
  function drawRock(dst: Ctx, rk: Rock, cx: number, cy: number, R: number, h: number) {
    const Lv = lightVec();
    const P = (v: V3): V3 => [cx + v[0] * R, cy + v[1] * R, v[2] * R * h];
    const O = rk.outerV.map(P);
    const M = rk.mid.map(P);
    const K = P(rk.peak);
    const n = O.length;
    const O2: Pt[] = O.map(([a, b]) => [a, b]);
    const box = boxAround(cx, cy, R * 1.65 + 3);
    const [facetL, fx] = layer(box);
    const tri = (a: V3, b: V3, c: V3) => {
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      let nx = u[1] * v[2] - u[2] * v[1];
      let ny = u[2] * v[0] - u[0] * v[2];
      let nz = u[0] * v[1] - u[1] * v[0];
      const nl = Math.hypot(nx, ny, nz) || 1;
      if (nz < 0) {
        nx = -nx;
        ny = -ny;
        nz = -nz;
      }
      const lit = Math.max(0, (nx * Lv[0] + ny * Lv[1] + nz * Lv[2]) / nl);
      const tone = 0.26 + lit * 0.72 + rk.tone + ((a[0] * 13 + b[1] * 7) % 1) * 0.04;
      const col = rgb(mix(T.rockDark, T.rockLit, Math.max(0, Math.min(1, tone))));
      fx.fillStyle = col;
      fx.strokeStyle = col;
      fx.lineWidth = 0.6;
      fx.beginPath();
      fx.moveTo(a[0], a[1]);
      fx.lineTo(b[0], b[1]);
      fx.lineTo(c[0], c[1]);
      fx.closePath();
      fx.fill();
      fx.stroke();
    };
    // subdivide each facet with jittered midpoints so the surface reads as weathered stone, not a gem
    const jr = rng(Math.round(cx * 7 + cy * 13));
    const midp = (a: V3, b: V3): V3 => [
      (a[0] + b[0]) / 2 + (jr() - 0.5) * R * 0.06,
      (a[1] + b[1]) / 2 + (jr() - 0.5) * R * 0.06,
      (a[2] + b[2]) / 2 + (jr() - 0.5) * R * h * 0.22,
    ];
    const sub = (a: V3, b: V3, c: V3, d: number) => {
      if (!d) return tri(a, b, c);
      const ab = midp(a, b);
      const bc = midp(b, c);
      const ca = midp(c, a);
      sub(a, ab, ca, d - 1);
      sub(ab, b, bc, d - 1);
      sub(ca, bc, c, d - 1);
      sub(ab, bc, ca, d - 1);
    };
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      sub(O[i], O[j], M[j], 1);
      sub(O[i], M[j], M[i], 1);
      sub(M[i], M[j], K, 1);
    }

    const [rockL, x] = layer(box);
    x.save();
    polyPath(x, O2);
    x.clip();
    // soften facet edges with a half-pixel offset second pass (cheaper than a blur filter)
    blit(x, facetL);
    x.save();
    x.globalAlpha = 0.5;
    x.drawImage(
      facetL.c,
      facetL.x0 + 0.5,
      facetL.y0 + 0.5,
      facetL.c.width / DPR,
      facetL.c.height / DPR
    );
    x.restore();
    for (const [a, b, s, l] of rk.speck) {
      x.fillStyle = l > 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.14)';
      x.fillRect(cx + a * R, cy + b * R, 0.6 + s * 1.1, 0.6 + s * 1.1);
    }
    for (const [a, b, s] of rk.lichen) {
      x.fillStyle = T.lichen;
      x.beginPath();
      x.ellipse(cx + a * R, cy + b * R, s * R, s * R * 0.7, a * 3, 0, TAU);
      x.fill();
    }
    x.strokeStyle = 'rgba(0,0,0,0.28)';
    x.lineWidth = 0.7;
    for (const cr of rk.cracks) {
      x.beginPath();
      cr.forEach(([a, b], i) =>
        i ? x.lineTo(cx + a * R, cy + b * R) : x.moveTo(cx + a * R, cy + b * R)
      );
      x.stroke();
    }
    const ug = x.createRadialGradient(
      cx + Lv[0] * R * 0.5,
      cy + Lv[1] * R * 0.5,
      0,
      cx,
      cy,
      R * 1.2
    );
    ug.addColorStop(0, 'rgba(255,255,255,0.10)');
    ug.addColorStop(0.6, 'rgba(0,0,0,0)');
    ug.addColorStop(1, 'rgba(0,0,0,0.28)');
    x.fillStyle = ug;
    x.fillRect(cx - R * 1.5, cy - R * 1.5, R * 3, R * 3);
    // ridge highlights on the lit side
    x.strokeStyle = 'rgba(255,255,255,0.10)';
    x.lineWidth = 0.7;
    for (let i = 0; i < n; i++) {
      if ((M[i][0] - cx) * Lv[0] + (M[i][1] - cy) * Lv[1] <= 0) continue;
      x.beginPath();
      x.moveTo(M[i][0], M[i][1]);
      x.lineTo(K[0], K[1]);
      x.stroke();
    }
    x.restore();
    x.strokeStyle = 'rgba(0,0,0,0.35)';
    x.lineWidth = 0.8;
    polyPath(x, O2);
    x.stroke();
    blit(dst, rockL);
  }

  function rockShadow(lx: Ctx, rk: Rock, cx: number, cy: number, R: number, h: number) {
    const Lv = lightVec();
    const k = (R * h * T.shLen) / Math.max(0.3, Lv[2]);
    const sx = -Lv[0] * k * 0.8;
    const sy = -Lv[1] * k * 0.8;
    for (let t = 0; t <= 1.0001; t += 0.1) {
      polyPath(lx, rockPoly(rk, cx + sx * t, cy + sy * t, R * (1 - t * 0.25)));
      lx.fill();
    }
  }
  const rockShadowReach = (R: number, h: number) =>
    R * 1.6 + ((R * h * T.shLen) / Math.max(0.3, lightVec()[2])) * 0.8;

  // Moss cushions are painted into a canvas the size of the island; dots are batched by colour.
  function drawMoss(dst: Ctx, s: Island) {
    const r = rng(s.seed + 500);
    const reach = s.IR * 1.5 + 4;
    softShadow(
      dst,
      boxAround(s.x + 1, s.y + 1.5, reach),
      (lx) => {
        mossPath(lx, s, s.x + 1, s.y + 1.5, s.IR * 1.02);
        lx.fill();
      },
      0.35,
      2.5
    );
    const [l, x] = layer(boxAround(s.x, s.y, reach));
    mossPath(x, s, s.x, s.y, s.IR);
    x.fillStyle = T.mossBase;
    x.fill();
    x.save();
    x.clip();
    const n = Math.min(9000, Math.PI * s.IR * s.IR * 0.9);
    const Lv = lightVec();
    const order = [4, 0, 1, 2, 3, 5];
    // three interleaved passes keep the speckled look while each colour is a single fill call
    const passes = 3;
    const per = Math.ceil(n / passes);
    for (let p = 0; p < passes; p++) {
      const buckets: number[][] = [[], [], [], [], [], []];
      for (let i = p * per; i < Math.min(n, (p + 1) * per); i++) {
        const a = r() * TAU;
        const d = Math.sqrt(r()) * s.IR * 1.1;
        const px = s.x + Math.cos(a) * d;
        const py = s.y + Math.sin(a) * d;
        const lit = -(Math.cos(a) * Lv[0] + Math.sin(a) * Lv[1]) * (d / s.IR); // domed cushion
        const idx = Math.max(0, Math.min(5, Math.floor(2.5 + lit * 1.6 + (r() - 0.5) * 2.6)));
        buckets[idx].push(px, py, 0.7 + r() * 1.3);
      }
      buckets.forEach((b, idx) => {
        if (!b.length) return;
        x.fillStyle = T.moss[order[idx]];
        x.beginPath();
        for (let k = 0; k < b.length; k += 3) x.rect(b[k], b[k + 1], b[k + 2], b[k + 2]);
        x.fill();
      });
    }
    const g = x.createRadialGradient(s.x, s.y, s.IR * 0.6, s.x, s.y, s.IR * 1.1);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.22)');
    x.fillStyle = g;
    x.fillRect(s.x - s.IR * 1.3, s.y - s.IR * 1.3, s.IR * 2.6, s.IR * 2.6);
    x.restore();
    blit(dst, l);
  }

  // the maple: branch from the top-right corner, leaves in clusters
  function buildMaple(): Maple {
    const r = rng(77);
    const sz = Math.max(5, unit * 0.017);
    const reach = layout === 'tall' ? W * 0.42 : W * 0.26;
    const p0: Pt = [W + 6, -6];
    const p1: Pt = [W - reach * 0.45, F.wall + sz * 2.5];
    const p2: Pt = [W - reach, F.wall + sz * (layout === 'tall' ? 5.5 : 6)];
    const segs: Maple['segs'] = [];
    const leaves: Maple['leaves'] = [];
    const bez = (a: Pt, b: Pt, c: Pt, t: number): Pt => [
      (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * b[0] + t * t * c[0],
      (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * b[1] + t * t * c[1],
    ];
    const leaf = (x: number, y: number, s: number): Maple['leaves'][number] => [
      x,
      y,
      s,
      r() * TAU,
      Math.floor(r() * 6),
    ];
    const main = Array.from({ length: 21 }, (_, i) => bez(p0, p1, p2, i / 20));
    segs.push({ pts: main, w0: sz * 0.55, w1: sz * 0.12 });
    for (let k = 0; k < 6; k++) {
      const base = bez(p0, p1, p2, 0.25 + k * 0.13);
      const dir = (k % 2 ? 1 : -1) * (0.7 + r() * 0.6) + Math.PI * 0.85;
      const len = sz * (3 + r() * 3);
      const end: Pt = [base[0] + Math.cos(dir) * len, base[1] + Math.sin(dir) * len * 0.8 + sz];
      const midPt: Pt = [(base[0] + end[0]) / 2 + r() * sz, (base[1] + end[1]) / 2];
      segs.push({ pts: [base, midPt, end], w0: sz * 0.18, w1: sz * 0.06 });
      const nL = 5 + Math.floor(r() * 4);
      for (let j = 0; j < nL; j++) {
        const lx = end[0] + (r() - 0.5) * sz * 2.6;
        const ly = end[1] + (r() - 0.5) * sz * 2.2;
        leaves.push(leaf(lx, ly, sz * (0.75 + r() * 0.5)));
      }
    }
    const tip = main[main.length - 1];
    for (let j = 0; j < 5; j++) {
      const lx = tip[0] + (r() - 0.6) * sz * 3;
      const ly = tip[1] + (r() - 0.4) * sz * 2.4;
      leaves.push(leaf(lx, ly, sz * (0.8 + r() * 0.4)));
    }
    for (let j = 0; j < 7; j++) {
      const q = main[3 + Math.floor(r() * 14)];
      const lx = q[0] + (r() - 0.5) * sz * 3;
      const ly = q[1] + (r() - 0.3) * sz * 2.6;
      leaves.push(leaf(lx, ly, sz * (0.7 + r() * 0.5)));
    }
    const box: Box = [W, H, 0, 0];
    const grow = (px: number, py: number, pad: number) => {
      box[0] = Math.min(box[0], px - pad);
      box[1] = Math.min(box[1], py - pad);
      box[2] = Math.max(box[2], px + pad);
      box[3] = Math.max(box[3], py + pad);
    };
    for (const [lx, ly, ls] of leaves) grow(lx, ly, ls * 1.2);
    for (const s of segs) for (const [px, py] of s.pts) grow(px, py, sz);
    return { segs, leaves, sz, tip, box };
  }
  function paintMaple(c: Ctx, m: Maple, flat: boolean) {
    c.lineCap = 'round';
    for (const s of m.segs)
      for (let i = 1; i < s.pts.length; i++) {
        c.lineWidth = s.w0 + (s.w1 - s.w0) * (i / (s.pts.length - 1));
        if (!flat) c.strokeStyle = T.branch;
        c.beginPath();
        c.moveTo(s.pts[i - 1][0], s.pts[i - 1][1]);
        c.lineTo(s.pts[i][0], s.pts[i][1]);
        c.stroke();
      }
    for (const [x, y, sz, rot, ci] of m.leaves) {
      if (flat) {
        leafPath(c, x, y, sz, rot);
        c.fill();
      } else drawLeaf(c, x, y, sz, rot, T.leaves[ci]);
    }
  }

  // River pebbles: painted once into a small seamless tile, then repeated along the band, so
  // the cost no longer grows with the garden's width. Each colour layer is a single fill.
  function pebbleBand(x: Ctx, x0: number, y0: number, x1: number, y1: number, seed: number) {
    const bw = x1 - x0;
    const bh = y1 - y0;
    if (bw <= 0 || bh <= 0) return;
    const horiz = bw >= bh;
    const TILE = 180;
    const snap = (v: number) => Math.max(1, Math.round(v * DPR)) / DPR;
    const tw = horiz ? snap(Math.min(bw, TILE)) : snap(bw + 1);
    const th = horiz ? snap(bh + 1) : snap(Math.min(bh, TILE));
    const tile = document.createElement('canvas');
    tile.width = Math.round(tw * DPR);
    tile.height = Math.round(th * DPR);
    const t = get2d(tile);
    t.setTransform(DPR, 0, 0, DPR, 0, 0);
    t.fillStyle = rgb(T.pebble[3]);
    t.fillRect(0, 0, tw, th);
    const r = rng(seed);
    const Lv = lightVec();
    const span = horiz ? tw : th;
    const pebbles: number[][] = [];
    for (let i = 0; i < (tw * th) / 7; i++) {
      const px = r() * tw;
      const py = r() * th;
      const rx = 1.6 + r() * 2.6;
      const ry = rx * (0.65 + r() * 0.3);
      const ro = r() * Math.PI;
      const bi = Math.floor(r() * 3);
      const along = horiz ? px : py;
      // copies across the repeat seam keep the tile seamless
      const shifts = [0];
      if (along < 6) shifts.push(span);
      if (along > span - 6) shifts.push(-span);
      for (const d of shifts)
        pebbles.push([horiz ? px + d : px, horiz ? py : py + d, rx, ry, ro, bi]);
    }
    for (let bi = 0; bi < 3; bi++) {
      t.fillStyle = rgb(mix(T.pebble[bi], [0, 0, 0], 0.35));
      t.beginPath();
      for (const [px, py, rx, ry, ro, b] of pebbles)
        if (b === bi) ellipseAt(t, px - Lv[0] * 0.8, py - Lv[1] * 0.8, rx, ry, ro);
      t.fill();
      t.fillStyle = rgb(T.pebble[bi]);
      t.beginPath();
      for (const [px, py, rx, ry, ro, b] of pebbles) if (b === bi) ellipseAt(t, px, py, rx, ry, ro);
      t.fill();
    }
    t.fillStyle = 'rgba(255,255,255,0.16)';
    t.beginPath();
    for (const [px, py, rx, ry, ro] of pebbles)
      ellipseAt(t, px + Lv[0] * rx * 0.35, py + Lv[1] * ry * 0.35, rx * 0.4, ry * 0.35, ro);
    t.fill();
    const pattern = x.createPattern(tile, horiz ? 'repeat-x' : 'repeat-y');
    if (!pattern) return;
    pattern.setTransform(new DOMMatrix([1 / DPR, 0, 0, 1 / DPR, x0, y0]));
    x.fillStyle = pattern;
    x.fillRect(x0, y0, bw, bh);
  }

  function drawFrame0(x: Ctx) {
    const r = rng(321);
    const Lv = lightVec();
    // walls cast shadows onto the gravel
    const sh = T.shadow;
    let g = x.createLinearGradient(0, F.wall, 0, F.wall + F.wall * 1.6 * T.shLen);
    g.addColorStop(0, sh);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(0, F.wall, W, F.wall * 1.6 * T.shLen);
    if (Lv[0] > 0) {
      g = x.createLinearGradient(W - F.side, 0, W - F.side - F.side * 2.2 * T.shLen, 0);
      g.addColorStop(0, sh);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g;
      x.fillRect(W - F.side - F.side * 2.2 * T.shLen, 0, F.side * 2.2 * T.shLen, H - F.eng);
    }
    // river-pebble drip lines
    pebbleBand(x, 0, F.wall, W - F.side, G.y0, 11);
    pebbleBand(x, 0, G.y1, W - F.side, H - F.eng, 12);
    pebbleBand(x, 0, G.y0, G.x0, G.y1, 13);
    pebbleBand(x, G.x1, G.y0, W - F.side, G.y1, 14);
    // inner edge stones (a thin curb) to seat the gravel
    x.strokeStyle = 'rgba(0,0,0,0.18)';
    x.lineWidth = 1;
    x.strokeRect(G.x0, G.y0, G.x1 - G.x0, G.y1 - G.y0);
    // clay wall with oil stains, cedar-shingle coping
    const wallFace = (x0: number, y0: number, w: number, h: number) => {
      x.fillStyle = T.clay;
      x.fillRect(x0, y0, w, h);
      for (let i = 0; i < (w * h) / 60; i++) {
        x.fillStyle = T.clayStain[i % 2];
        x.beginPath();
        x.ellipse(x0 + r() * w, y0 + r() * h, 2 + r() * 10, 1 + r() * 4, 0, 0, TAU);
        x.fill();
      }
    };
    wallFace(0, F.wall * 0.62, W, F.wall * 0.38);
    wallFace(W - F.side, F.wall, F.side * 0.38, H - F.eng - F.wall);
    x.fillStyle = T.coping;
    x.fillRect(0, 0, W, F.wall * 0.64);
    x.fillRect(W - F.side * 0.64, 0, F.side * 0.64, H - F.eng);
    x.strokeStyle = T.copingLine;
    x.lineWidth = 0.6;
    for (let y = 2; y < F.wall * 0.64; y += 2.4) {
      x.beginPath();
      x.moveTo(0, y);
      x.lineTo(W - F.side * 0.64, y);
      x.stroke();
    }
    for (let X = W - F.side * 0.64 + 2; X < W; X += 2.4) {
      x.beginPath();
      x.moveTo(X, F.wall * 0.64);
      x.lineTo(X, H - F.eng);
      x.stroke();
    }
    x.fillStyle = 'rgba(255,255,255,0.10)';
    x.fillRect(0, 0, W, F.wall * 0.18);
    x.fillStyle = 'rgba(0,0,0,0.22)';
    x.fillRect(0, F.wall * 0.6, W - F.side * 0.62, 1.2);
    x.fillRect(W - F.side * 0.66, F.wall * 0.62, 1.2, H - F.eng - F.wall * 0.62);
    // engawa veranda: an edge beam, then long planks
    const ey = H - F.eng;
    const beam = F.eng * 0.24;
    x.fillStyle = 'rgba(0,0,0,0.30)';
    x.fillRect(0, ey - 2, W, 2);
    x.fillStyle = T.wood[2];
    x.fillRect(0, ey, W, beam);
    x.fillStyle = T.woodHi;
    x.fillRect(0, ey, W, 1.2);
    const ph = (F.eng - beam) / 3;
    for (let k = 0; k < 3; k++) {
      const y0 = ey + beam + k * ph;
      x.fillStyle = T.wood[k % 2];
      x.fillRect(0, y0, W, ph);
      x.strokeStyle = T.woodGrain;
      x.lineWidth = 0.6;
      for (let j = 0; j < 4; j++) {
        const yy = y0 + ph * (0.2 + j * 0.2) + (r() - 0.5);
        const ph2 = r() * TAU;
        x.beginPath();
        for (let X = 0; X <= W; X += 12) {
          const v = yy + Math.sin(X / (40 + j * 13) + ph2) * 0.7;
          if (X) x.lineTo(X, v);
          else x.moveTo(X, v);
        }
        x.stroke();
      }
      x.fillStyle = 'rgba(0,0,0,0.35)';
      x.fillRect(0, y0, W, 0.8);
      for (let X = r() * 160; X < W; X += 150 + r() * 120) x.fillRect(X, y0, 0.9, ph);
      x.fillStyle = T.woodHi;
      x.fillRect(0, y0 + 0.8, W, 0.6);
    }
    // corner post where the wall meets the veranda
    x.fillStyle = T.wood[2];
    x.fillRect(W - F.side - 2, ey - F.peb * 0.6, F.side + 2, F.eng * 0.4);
  }

  function drawLantern(x: Ctx, pos: Pt) {
    const [cx, cy] = pos;
    const L = Math.max(7, unit * 0.026);
    const Lv = lightVec();
    const sl = (L * 2.4 * T.shLen) / Math.max(0.3, Lv[2]);
    if (T.glowLantern) {
      const g = x.createRadialGradient(cx, cy, L * 0.5, cx, cy, L * 7);
      g.addColorStop(0, T.glowLantern);
      g.addColorStop(1, 'rgba(255,184,104,0)');
      x.fillStyle = g;
      x.fillRect(cx - L * 8, cy - L * 8, L * 16, L * 16);
    }
    softShadow(
      x,
      boxAround(cx, cy, L + sl),
      (lx) => {
        for (let t = 0; t <= 1; t += 0.1) {
          lx.beginPath();
          lx.arc(cx - Lv[0] * sl * t, cy - Lv[1] * sl * t, L * (1 - t * 0.4), 0, TAU);
          lx.fill();
        }
      },
      0.75,
      3
    );
    // hexagonal roof, shaded per facet, with the hoju knob
    for (let i = 0; i < 6; i++) {
      const a0 = (i / 6) * TAU + 0.3;
      const a1 = ((i + 1) / 6) * TAU + 0.3;
      const am = (a0 + a1) / 2;
      const lit = Math.max(
        0,
        Math.cos(am) * Lv[0] * 0.8 + Math.sin(am) * Lv[1] * 0.8 + Lv[2] * 0.6
      );
      x.fillStyle = rgb(mix(T.rockDark, T.lantern, 0.25 + lit * 0.8));
      x.beginPath();
      x.moveTo(cx, cy);
      x.lineTo(cx + Math.cos(a0) * L, cy + Math.sin(a0) * L);
      x.lineTo(cx + Math.cos(a1) * L, cy + Math.sin(a1) * L);
      x.closePath();
      x.fill();
      x.strokeStyle = 'rgba(0,0,0,0.25)';
      x.lineWidth = 0.6;
      x.stroke();
    }
    if (T.glowLantern) {
      x.strokeStyle = 'rgba(255,190,110,0.55)';
      x.lineWidth = 1;
      x.beginPath();
      for (let i = 0; i <= 6; i++) {
        const a = (i / 6) * TAU + 0.3;
        x.lineTo(cx + Math.cos(a) * (L + 0.8), cy + Math.sin(a) * (L + 0.8));
      }
      x.stroke();
    }
    const k = x.createRadialGradient(
      cx + Lv[0] * L * 0.12,
      cy + Lv[1] * L * 0.12,
      0,
      cx,
      cy,
      L * 0.3
    );
    k.addColorStop(0, rgb(T.lantern));
    k.addColorStop(1, rgb(mix(T.rockDark, T.lantern, 0.4)));
    x.fillStyle = k;
    x.beginPath();
    x.arc(cx, cy, L * 0.28, 0, TAU);
    x.fill();
  }

  function buildScene(): Scene {
    const key = `${T.name}|${W}x${H}@${DPR}`;
    const hit = sceneCache.get(key);
    if (hit) return hit;
    const [sandL, x] = layer([0, 0, W, H]);
    const Lv = lightVec();
    x.fillStyle = T.gravel;
    x.fillRect(0, 0, W, H);
    const r = rng(5);
    for (let i = 0; i < 24; i++) {
      x.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.025)' : 'rgba(255,255,255,0.04)';
      x.beginPath();
      x.ellipse(r() * W, r() * H, 20 + r() * unit * 0.25, 10 + r() * unit * 0.12, r() * 3, 0, TAU);
      x.fill();
    }
    const gx = W * T.glowAt[0];
    const gy = H * T.glowAt[1];
    const g = x.createRadialGradient(gx, gy, 0, gx, gy, Math.max(W, H) * 1.15);
    g.addColorStop(0, T.glow);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);

    // raked layer: long straight lines, ripples around islands, a few dry streams between them
    const [rakeL, lx] = layer([G.x0, G.y0, G.x1, G.y1]);
    lx.lineCap = 'round';
    lx.lineJoin = 'round';
    const rr = rng(8);
    for (let y = G.y0 + gap * 0.6; y < G.y1; y += gap * (0.96 + rr() * 0.08)) {
      const p1 = rr() * TAU;
      const p2 = rr() * TAU;
      const amp = 0.25 + rr() * 0.35;
      groove(lx, () => {
        lx.beginPath();
        for (let X = G.x0 - 4; X <= G.x1 + 4; X += 6) {
          const yy = y + Math.sin(X / 37 + p1) * amp + Math.sin(X / 190 + p2) * amp * 1.6;
          if (X > G.x0 - 4) lx.lineTo(X, yy);
          else lx.moveTo(X, yy);
        }
      });
    }
    lx.globalCompositeOperation = 'destination-out';
    for (const s of STONES) {
      blobPath(lx, s, s.x, s.y, s.IR, s.rings * gap + gap * 0.55, Math.pow(0.8, s.rings));
      lx.fill();
    }
    lx.lineWidth = chanW + gap * 0.95;
    lx.strokeStyle = '#000';
    for (const p of paths) {
      if (!p.chan.length) continue;
      offsetLine(lx, p.chan, 0);
      lx.stroke();
    }
    lx.globalCompositeOperation = 'source-over';
    for (const s of STONES)
      for (let i = 1; i <= s.rings; i++)
        groove(lx, () => blobPath(lx, s, s.x, s.y, s.IR, i * gap, Math.pow(0.8, i), 0.35));
    for (const p of paths) {
      if (!p.chan.length) continue;
      for (const o of [-chanW / 2, 0, chanW / 2]) groove(lx, () => offsetLine(lx, p.chan, o, 0.25));
    }
    lx.globalCompositeOperation = 'destination-in';
    lx.fillStyle = '#000';
    lx.fillRect(G.x0, G.y0, G.x1 - G.x0, G.y1 - G.y0);
    blit(x, rakeL);
    const pattern = x.createPattern(grainTile(), 'repeat');
    if (pattern) {
      x.save();
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.fillStyle = pattern;
      x.fillRect(0, 0, sandL.c.width, sandL.c.height);
      x.restore();
    }

    // fallen leaves resting on the gravel
    const fr = rng(61);
    const fsz = Math.max(5, unit * 0.017);
    let placed = 0;
    for (let tries = 0; tries < 60 && placed < 3; tries++) {
      const px = G.x0 + (0.45 + fr() * 0.5) * (G.x1 - G.x0);
      const py = G.y0 + fr() * (G.y1 - G.y0) * 0.7;
      if (STONES.some((s) => Math.hypot(px - s.x, py - s.y) < outer(s) + fsz * 2)) continue;
      const draw = (q: Ctx) => {
        leafPath(q, px - Lv[0] * 1.2, py - Lv[1] * 1.2, fsz, tries);
        q.fill();
      };
      softShadow(x, boxAround(px, py, fsz * 1.5), draw, 0.35, 1);
      drawLeaf(x, px, py, fsz, tries, T.leaves[(placed * 2 + 1) % 6]);
      placed++;
    }

    for (const s of STONES) if (s.moss) drawMoss(x, s);
    for (const s of STONES) {
      const reach = Math.max(
        ...s.rocks.map(([ox, oy, k, h]) => Math.hypot(ox, oy) * s.R + rockShadowReach(s.R * k, h))
      );
      const draw = (q: Ctx) =>
        s.rocks.forEach(([ox, oy, k, h], i) =>
          rockShadow(q, s.rk[i], s.x + ox * s.R, s.y + oy * s.R, s.R * k, h)
        );
      softShadow(x, boxAround(s.x, s.y, reach), draw, 0.5, 2.2);
    }
    for (const s of STONES) {
      const order = s.rocks.map((_, i) => i).sort((a, b) => s.rocks[a][1] - s.rocks[b][1]);
      for (const i of order) {
        const [ox, oy, k, h] = s.rocks[i];
        drawRock(x, s.rk[i], s.x + ox * s.R, s.y + oy * s.R, s.R * k, h);
      }
    }

    drawFrame0(x);
    if (F.lantern) {
      // a small moss cushion under the lantern
      const [cx, cy] = F.lantern;
      drawMoss(x, {
        a: [0.08, 0.05, 0.03, 0.03],
        h: [1, 2, 3, 4],
        ecc: 0.2,
        rot: 0.4,
        seed: 404,
        x: cx,
        y: cy,
        IR: Math.max(10, unit * 0.05),
      });
      drawLantern(x, F.lantern);
    }
    // maple shadow falls across the corner
    const maple = buildMaple();
    const off = maple.sz * 3 * T.shLen;
    const ox = Math.abs(Lv[0] * off);
    const oy = Math.abs(Lv[1] * off);
    const [mx0, my0, mx1, my1] = maple.box;
    softShadow(
      x,
      [mx0 - ox, my0 - oy, mx1 + ox, my1 + oy],
      (q) => {
        q.save();
        q.translate(-Lv[0] * off, -Lv[1] * off);
        q.strokeStyle = '#000';
        paintMaple(q, maple, true);
        q.restore();
      },
      T.name === 'dark' ? 0.3 : 0.16,
      maple.sz * 0.6
    );

    const vr = Math.hypot(W, H) * 0.62;
    const v = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, vr);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, T.vignette);
    x.fillStyle = v;
    x.fillRect(0, 0, W, H);

    const [front, fx] = layer(maple.box);
    paintMaple(fx, maple, false);
    const built: Scene = { sand: sandL.c, front, maple };
    sceneCache.set(key, built);
    return built;
  }

  // ---------- simulation ----------
  let now = 0;
  const msgs: Msg[] = [];
  let ripples: Ripple[] = [];
  const CONS_RATE = 2.6;
  const MAX_MSGS = 240;
  let lagPeak = 0;

  function spawn(pi: number, dir = 1, kind: Msg['kind'] = 'msg') {
    if (msgs.length >= MAX_MSGS) return false;
    msgs.push({ p: paths[pi], t: dir > 0 ? 0 : 1, dir, kind, v: 0.92 + Math.random() * 0.16 });
    return true;
  }
  function ripple(s: Stone, color: RGB, a = 0.5, big = false) {
    ripples.push({ s, born: now, color, a, big });
    if (ripples.length > 60) ripples.shift();
  }

  // returns true when the message keeps travelling (bounced or turned into a response)
  function arrive(m: Msg): boolean {
    const pi = m.p.i;
    const fwd = m.dir > 0;
    const P = T.primary;
    const Wm = T.warm;
    const bounce = () => {
      m.dir = -m.dir;
      m.kind = 'retry';
      m.t = fwd ? 1 : 0;
      return true;
    };
    if (pi === 0 || pi === 1) {
      const src = pi === 0 ? pay : gql;
      if (fwd) {
        if (kafka.down) return bounce();
        kafka.queue++;
        ripple(kafka, P, 0.35);
        return false;
      }
      src.buffer++;
      ripple(src, Wm, 0.35);
      return false;
    }
    if (pi === 2) {
      if (fwd) {
        if (cons.down) return bounce();
        ripple(cons, P, 0.3);
        if (!spawn(3)) cons.pending++;
        return false;
      }
      kafka.queue++;
      return false;
    }
    if (pi === 3) {
      if (fwd) {
        if (mongo.down) return bounce();
        ripple(mongo, P, 0.3);
        return false;
      }
      cons.pending++;
      ripple(cons, Wm, 0.3);
      return false;
    }
    if (pi === 4) {
      if (fwd) {
        if (mongo.down) return bounce();
        m.dir = -1;
        m.kind = 'resp';
        m.t = 1;
        return true;
      }
      if (m.kind === 'retry') gql.pending++;
      return false;
    }
    return false;
  }

  const anyDown = () => STONES.some((s) => s.down);

  function step(dt: number) {
    now += dt;
    for (const s of STONES) {
      s.boost *= Math.exp(-dt / 2.6);
      if (s.down && now - s.downAt > DOWN_S) recover(s);
    }
    const producers: [Stone, number][] = [
      [pay, 0],
      [gql, 1],
    ];
    for (const [s, pi] of producers) {
      if (s.down) continue;
      s.acc += s.rate * (1 + s.boost) * dt;
      while (s.acc >= 1) {
        s.acc--;
        spawn(pi);
      }
      if (s.buffer > 0 && !kafka.down) {
        s.fAcc += 5 * dt;
        while (s.fAcc >= 1 && s.buffer > 0) {
          s.fAcc--;
          if (spawn(pi)) s.buffer--;
          else break;
        }
      }
    }
    if (!gql.down) {
      gql.rAcc += 0.5 * (1 + gql.boost * 0.5) * dt;
      while (gql.rAcc >= 1) {
        gql.rAcc--;
        spawn(4);
      }
      if (gql.pending > 0 && !mongo.down) {
        gql.pAcc += 2.5 * dt;
        while (gql.pAcc >= 1 && gql.pending > 0) {
          gql.pAcc--;
          if (spawn(4)) gql.pending--;
          else break;
        }
      }
    }
    // consumer group pulls from Kafka; slows to a trickle while MongoDB is down (backpressure)
    if (!kafka.down && !cons.down) {
      const rate = CONS_RATE * (now - cons.surge < 3.5 ? 1.9 : 1) * (mongo.down ? 0.15 : 1);
      if (kafka.queue > 0) {
        cons.dAcc += rate * dt;
        while (cons.dAcc >= 1 && kafka.queue > 0) {
          cons.dAcc--;
          if (spawn(2)) kafka.queue--;
          else break;
        }
      } else cons.dAcc = Math.min(cons.dAcc, 1);
    }
    if (cons.pending > 0 && !mongo.down && !cons.down) {
      cons.pAcc += 4 * dt;
      while (cons.pAcc >= 1 && cons.pending > 0) {
        cons.pAcc--;
        if (spawn(3)) cons.pending--;
        else break;
      }
    }

    for (const p of paths) p.n = 0;
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i];
      const speed = (70 + unit * 0.14) * m.v * (m.kind === 'retry' ? 0.8 : 1);
      m.t += (m.dir * speed * dt) / m.p.len;
      const done = (m.dir > 0 && m.t >= 1) || (m.dir < 0 && m.t <= 0);
      if (done && !arrive(m)) {
        msgs.splice(i, 1);
        continue;
      }
      m.p.n++;
    }
    for (const p of paths) p.heat += (Math.min(1, p.n / 6) - p.heat) * Math.min(1, dt * 2.2);
    ripples = ripples.filter((r) => now - r.born < (r.big ? 2.2 : 1.3));

    const lag = kafka.queue;
    lagPeak = Math.max(lagPeak, lag);
    if (lag === 0 && lagPeak >= 6 && !anyDown()) {
      lagPeak = 0;
      say('Consumers caught up. Lag is back to zero.');
    }
  }

  function addLoad(s: Stone) {
    s.pulse = now;
    ripple(s, T.primary, 0.6, true);
    if (s === pay || s === gql) s.boost = Math.min(7, s.boost + 3.2);
    else {
      pay.boost = Math.min(7, pay.boost + 2.2);
      gql.boost = Math.min(7, gql.boost + 2.2);
    }
    say(`Load spike through ${s.name}. Consumers are catching up.`);
    kick();
  }
  function fail(s: Stone) {
    if (s.down) return;
    s.down = true;
    s.downAt = now;
    s.boost = 0;
    say(FAIL_MSG[s.id]);
    kick();
  }
  function recover(s: Stone) {
    s.down = false;
    s.upAt = now;
    ripple(s, T.primary, 0.55, true);
    if (s === cons) cons.surge = now;
    say(UP_MSG[s.id]);
    kick();
  }
  let lastSay = '';
  function say(t: string) {
    if (t === lastSay || !statusEl) return;
    lastSay = t;
    statusEl.textContent = t;
  }

  // ---------- drawing ----------
  interface LabelRec {
    btn: HTMLButtonElement;
    label: HTMLSpanElement;
    html: string;
  }
  const labels = new Map<StoneId, LabelRec>();

  function drawFrame() {
    if (!scene) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(scene.sand, 0, 0);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const P = T.primary;
    const Wm = T.warm;
    const dark = T.name === 'dark';
    const Lv = lightVec();
    const sheen: RGB = dark ? [205, 222, 255] : [255, 255, 255];
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.save();
    ctx.beginPath();
    ctx.rect(G.x0, G.y0, G.x1 - G.x0, G.y1 - G.y0);
    ctx.clip();

    // load: a water-like shimmer running down the stream grooves
    for (const p of paths) {
      if (!p.chan.length || p.heat < 0.03) continue;
      ctx.strokeStyle = rgba(P, p.heat * (dark ? 0.14 : 0.12));
      ctx.lineWidth = chanW * 1.2;
      offsetLine(ctx, p.chan, 0);
      ctx.stroke();
      ctx.setLineDash([gap * 0.7, gap * 3.4]);
      ctx.lineWidth = gap * 0.22;
      [-chanW / 2, 0, chanW / 2].forEach((o, i) => {
        ctx.lineDashOffset = -now * gap * 6 - i * gap * 1.3;
        ctx.strokeStyle = rgba(i === 1 ? sheen : P, p.heat * (dark ? 0.5 : 0.42));
        offsetLine(ctx, p.chan, o, 0.25);
        ctx.stroke();
      });
      ctx.setLineDash([]);
    }
    // idle: a slow light moving outward through each island's ripples; stills when the stone fails
    for (const s of STONES) {
      if (s.down) continue;
      const k = (now * 0.16 + s.phase) % 1.8;
      if (k > 1) continue;
      ctx.strokeStyle = rgba(sheen, Math.sin(Math.PI * k) * (dark ? 0.22 : 0.4));
      ctx.lineWidth = gap * 0.3;
      const grow = gap * 0.5 + k * s.rings * gap;
      blobPath(ctx, s, s.x, s.y, s.IR, grow, Math.pow(0.8, 1 + k * s.rings), 0.35);
      ctx.stroke();
    }
    // arrivals and taps: tiny water ripples
    for (const r of ripples) {
      const k = (now - r.born) / (r.big ? 2.2 : 1.3);
      const s = r.s;
      for (let j = 0; j < (r.big ? 3 : 1); j++) {
        const kk = k - j * 0.18;
        if (kk <= 0 || kk >= 1) continue;
        ctx.strokeStyle = rgba(r.color, r.a * (1 - kk) * (1 - kk));
        ctx.lineWidth = r.big ? 1.3 : 0.9;
        const grow = gap * 0.4 + kk * (s.rings + (r.big ? 2 : 0.8)) * gap;
        blobPath(ctx, s, s.x, s.y, s.IR, grow, Math.pow(0.8, 1 + kk * 3), 0.3);
        ctx.stroke();
      }
    }
    // lag: a gentle ripple ring that grows around the consumers
    const lag = kafka.queue;
    const lk = Math.min(1, lag / 40);
    if (lag > 0) {
      const g0 = outer(cons) - cons.IR + gap * (0.7 + lk * 2.6) + Math.sin(now * 2.2) * gap * 0.12;
      const rings: Pt[] = [
        [0, 0.3 + 0.45 * lk],
        [-gap * 0.55, 0.12 + 0.2 * lk],
      ];
      for (const [d, a] of rings) {
        ctx.strokeStyle = rgba(P, a);
        ctx.lineWidth = gap * 0.32;
        blobPath(ctx, cons, cons.x, cons.y, cons.IR, g0 + d, 0.4, 0.35);
        ctx.stroke();
      }
    }
    // messages: glints travelling in the grooves
    const dr = Math.max(1.5, Math.min(2.5, unit * 0.0048));
    for (const m of msgs) {
      const retry = m.kind === 'retry';
      const col = retry ? Wm : P;
      const core = retry ? Wm : sheen;
      for (let k = 4; k >= 1; k--) {
        const [tx, ty] = at(m.p, m.t - m.dir * k * (6 / m.p.len));
        ctx.fillStyle = rgba(core, (0.16 * (5 - k)) / 4);
        ctx.beginPath();
        ctx.arc(tx, ty, dr * 0.7, 0, TAU);
        ctx.fill();
      }
      const [x, y] = at(m.p, m.t);
      ctx.fillStyle = rgba(col, dark ? 0.14 : 0.16);
      ctx.beginPath();
      ctx.arc(x, y, dr * 3.2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = rgba(col, dark ? 0.32 : 0.38);
      ctx.beginPath();
      ctx.arc(x, y, dr * 1.7, 0, TAU);
      ctx.fill();
      ctx.fillStyle = rgba(core, m.kind === 'resp' ? 0.75 : 1);
      ctx.beginPath();
      ctx.arc(x, y, dr * (m.kind === 'resp' ? 0.7 : 0.95), 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // failure: the stones darken, an amber thread counts down to recovery
    for (const s of STONES) {
      const o = outer(s);
      if (s.down) {
        ctx.fillStyle = dark ? 'rgba(4,6,12,0.55)' : 'rgba(20,18,16,0.42)';
        s.rocks.forEach(([ox, oy, k], i) => {
          polyPath(ctx, rockPoly(s.rk[i], s.x + ox * s.R, s.y + oy * s.R, s.R * k + 0.5));
          ctx.fill();
        });
        if (s.moss) {
          ctx.fillStyle = 'rgba(10,10,14,0.22)';
          mossPath(ctx, s, s.x, s.y, s.IR);
          ctx.fill();
        }
        const left = 1 - (now - s.downAt) / DOWN_S;
        ctx.strokeStyle = rgba(Wm, 0.75);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(s.x, s.y, o + gap * 0.5, -Math.PI / 2, -Math.PI / 2 + TAU * left);
        ctx.stroke();
      }
      if (s.holdStart) {
        const k = Math.min(1, (performance.now() - s.holdStart) / HOLD_MS);
        ctx.strokeStyle = rgba(Wm, 0.3 + 0.6 * k);
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(s.x, s.y, o + gap * 0.5, -Math.PI / 2, -Math.PI / 2 + TAU * k);
        ctx.stroke();
      }
    }

    // the overhanging maple, and one leaf drifting down
    blit(ctx, scene.front);
    const maple = scene.maple;
    const LT = 28;
    const lt = reduced ? 0.45 : (now % LT) / LT;
    const t0 = maple.tip;
    const sz = maple.sz * 0.95;
    const lx = t0[0] - lt * W * 0.38 + Math.sin(lt * 10) * unit * 0.035;
    const ly = t0[1] + lt * (G.y1 - t0[1]) * 0.85;
    const hgt = 1 - lt;
    const fade = Math.min(1, lt * 25, (1 - lt) * 12);
    ctx.globalAlpha = fade * 0.16;
    ctx.fillStyle = '#000';
    leafPath(ctx, lx - Lv[0] * hgt * sz * 5, ly - Lv[1] * hgt * sz * 5, sz, lt * 7);
    ctx.fill();
    ctx.globalAlpha = fade;
    drawLeaf(ctx, lx, ly, sz * (1 + hgt * 0.15), lt * 7 + Math.sin(lt * 14) * 0.4, T.leaves[2]);
    ctx.globalAlpha = 1;
    updateLabels(lag);
  }

  function updateLabels(lag: number) {
    for (const s of STONES) {
      const rec = labels.get(s.id);
      if (!rec) continue;
      let extra = '';
      if (s.down) extra = '<span class="zg-st">down</span>';
      else if (s === cons && (lag > 0 || now - cons.surge < 3.5))
        extra = `<span class="zg-lag">lag ${lag}</span>`;
      else if ((s === pay || s === gql) && s.buffer > 0)
        extra = `<span class="zg-st">retry ${s.buffer}</span>`;
      const h = `<b>${s.name}</b>${extra}`;
      if (rec.html === h) continue;
      rec.html = h;
      rec.label.innerHTML = h;
      placeLabel(s);
    }
  }

  function placeLabel(s: Stone) {
    const rec = labels.get(s.id);
    if (!rec) return;
    const { label, btn } = rec;
    const o = outer(s);
    const lw = label.offsetWidth || 80;
    const lh = label.offsetHeight || 16;
    const x = Math.max(G.x0 + lw / 2 + 2, Math.min(G.x1 - lw / 2 - 2, s.x));
    const top = s.side === 't' ? s.y - o - lh + 1 : s.y + o - 1;
    label.style.left = `${x}px`;
    label.style.top = `${Math.max(G.y0 + 2, Math.min(G.y1 - lh - 2, top))}px`;
    const b = Math.max(44, s.IR * 2);
    btn.style.left = `${s.x}px`;
    btn.style.top = `${s.y}px`;
    btn.style.width = `${b}px`;
    btn.style.height = `${b}px`;
  }

  // ---------- DOM: labels + real buttons ----------
  const cleanups: (() => void)[] = [];
  for (const s of STONES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'zg-stone';
    btn.setAttribute('aria-label', `${s.name}: add load`);
    btn.setAttribute('aria-describedby', hintId);
    btn.setAttribute('aria-keyshortcuts', 'F');
    btn.title = `${s.name}: tap to add load, hold (or press F) to simulate a failure`;
    const label = document.createElement('span');
    label.className = 'zg-label';
    label.setAttribute('aria-hidden', 'true');
    root.append(btn, label);
    labels.set(s.id, { btn, label, html: '' });
    cleanups.push(() => {
      btn.remove();
      label.remove();
    });

    let timer = 0;
    let held = false;
    const cancel = () => {
      clearTimeout(timer);
      s.holdStart = 0;
    };
    btn.addEventListener('pointerdown', (e) => {
      if (e.button > 0) return;
      held = false;
      s.holdStart = performance.now();
      timer = window.setTimeout(() => {
        held = true;
        s.holdStart = 0;
        fail(s);
        if (navigator.vibrate) navigator.vibrate(12);
      }, HOLD_MS);
      kick();
    });
    btn.addEventListener('pointerup', () => {
      const tap = s.holdStart && !held;
      cancel();
      if (tap) addLoad(s);
    });
    btn.addEventListener('pointercancel', cancel);
    btn.addEventListener('pointerleave', cancel);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
    btn.addEventListener('click', (e) => {
      if (e.detail === 0) addLoad(s); // keyboard activation
    });
    btn.addEventListener('keydown', (e) => {
      if (e.key !== 'f' && e.key !== 'F') return;
      e.preventDefault();
      fail(s);
    });
  }

  // ---------- loop, sizing, visibility ----------
  let raf = 0;
  let last = 0;
  let onScreen = true;
  let reduced = reduceMQ.matches;
  function loop(ts: number) {
    raf = requestAnimationFrame(loop);
    if (ts - last < 1000 / 60 - 2) return; // cap ~60fps on high-refresh screens
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    step(dt);
    drawFrame();
  }
  function start() {
    if (raf || reduced || !onScreen || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }
  // reduced motion: advance the simulation off-screen, then show one still frame
  function still() {
    for (let i = 0; i < 40; i++) step(0.03);
    drawFrame();
  }
  let stillTimer = 0;
  function kick() {
    if (!reduced) return;
    clearTimeout(stillTimer);
    still();
    // one more still frame once a failure has resolved
    if (!anyDown()) return;
    stillTimer = window.setTimeout(
      () => {
        for (let i = 0; i < 160; i++) step(0.03);
        drawFrame();
      },
      DOWN_S * 1000 + 100
    );
  }

  function resize() {
    const r = root.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const nextDPR = Math.min(2, window.devicePixelRatio || 1);
    if (scene && r.width === W && r.height === H && nextDPR === DPR) return;
    W = r.width;
    H = r.height;
    DPR = nextDPR;
    sceneCache.clear();
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    layoutAll();
    scene = buildScene();
    for (const s of STONES) placeLabel(s);
    for (const rec of labels.values()) rec.html = '';
    drawFrame();
  }
  const themeOf = () => (html.classList.contains('dark') ? THEMES.dark : THEMES.light);
  function applyTheme() {
    const next = themeOf();
    if (next === T) return;
    T = next;
    if (!W) return;
    scene = buildScene();
    drawFrame();
  }

  T = themeOf();
  const ro = new ResizeObserver(() => resize());
  ro.observe(root);
  const mo = new MutationObserver(applyTheme);
  mo.observe(html, { attributes: true, attributeFilter: ['class'] });
  const io = new IntersectionObserver(
    ([e]) => {
      onScreen = e.isIntersecting;
      if (onScreen) start();
      else stop();
    },
    { rootMargin: '80px' }
  );
  io.observe(root);
  const onVis = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVis);
  const onReduce = () => {
    reduced = reduceMQ.matches;
    if (!reduced) return start();
    stop();
    still();
  };
  reduceMQ.addEventListener('change', onReduce);

  resize();
  // warm up so the first frame already shows a few messages in flight
  for (let i = 0; i < 120; i++) step(1 / 60);
  say('All systems steady.');
  if (reduced) still();
  else drawFrame();
  const firstDraw = performance.now() - startMark;
  root.dataset.firstDrawMs = firstDraw.toFixed(1);
  try {
    performance.measure('zen-garden:first-draw', { start: startMark, duration: firstDraw });
  } catch {
    // older browsers without the options form of measure()
  }
  start();

  return {
    destroy() {
      stop();
      clearTimeout(stillTimer);
      ro.disconnect();
      mo.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      reduceMQ.removeEventListener('change', onReduce);
      cleanups.forEach((f) => f());
      sceneCache.clear();
    },
  };
}
