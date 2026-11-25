/**
 * Zen garden: a seasonal Japanese garden drawn with plain Canvas 2D.
 * Each moss island is a system (Payments, GraphQL, Kafka, Consumers, MongoDB);
 * lanterns floating down the streams are events. Visitors rake the sand, tap
 * stones to add load, hold one to break it, feed the koi and shake the tree.
 */
type Ctx = CanvasRenderingContext2D;
type Rand = () => number;
type Pt = [number, number];
interface XY {
  x: number;
  y: number;
}
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
type NodeId = 'pay' | 'gql' | 'kafka' | 'cons' | 'mongo';
type StoneDef = [number, number, number, number, string];
type PKind = 'petal' | 'leaf' | 'maple' | 'snow' | 'fly';
interface Palette {
  sand: string;
  gsh: string;
  moss: string[];
  canopy: string[] | null;
  bush: string[];
  bloom: string[];
  water: string[];
  particle: PKind;
  pcol: string[];
  rate: number;
  pads: number;
  snow?: number;
}
interface GNode extends XY {
  id: NodeId;
  name: string;
  prod: number;
  r: number;
  wob: number;
  down: number;
  glint: number;
  pending: number;
  holdT: number;
  pt: number;
  // Kafka's irregular pond (set in layout for every node, used for kafka)
  rIn: (a: number) => number;
  rOut: (a: number) => number;
  rMid: (a: number) => number;
  outer: number;
  shape: (grow: number) => Path2D;
  midPath: Path2D;
  inPts: Pt[];
  exitA: number;
  r0: number;
}
interface Seg {
  from: NodeId;
  to: NodeId | 'pond';
  pts: XY[];
  cum: number[];
  len: number;
  path: Path2D;
  A: XY;
  B: XY;
  poly: (sc: number) => Path2D;
  side: (k: number, sc: number) => Pt[];
}
interface Lantern extends XY {
  s: 'flow' | 'orbit' | 'proc' | 'pond';
  seg: number;
  d: number;
  ph: number;
  t: number;
  ang: number;
  dur: number;
  fx: number;
  fy: number;
  tx: number;
  ty: number;
  held: number;
  rel: boolean;
}
interface Part extends XY {
  k: PKind;
  z: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  fl: number;
  sz: number;
  col: string;
  ph: number;
  life: number;
  land: boolean;
  wet: boolean;
}
interface Ripple extends XY {
  w: number;
  max: number;
  a: number;
  life: number;
  r0: number;
}
interface Spark extends XY {
  vx: number;
  vy: number;
  a: number;
  life: number;
  c: string;
}
interface Koi {
  p: XY[];
  len: number;
  N: number;
  ang: number;
  kind: KoiKind;
  tx: number;
  ty: number;
  tt: number;
  ph: number;
  wp: number;
  feed: number;
}
type KoiKind = 'kohaku' | 'ogon' | 'showa' | 'tancho';
interface Ghost {
  pts: XY[];
  i: number;
  t: number;
}
interface Press {
  id: number;
  x0: number;
  y0: number;
  node: GNode | null;
  t0: number;
  mode: 'node' | 'maybe' | 'rake' | 'water';
  failed: boolean;
  timer?: ReturnType<typeof setTimeout>;
  lr?: number;
}
interface StoneSprite {
  c: HTMLCanvasElement;
  sz: number;
  b: HTMLCanvasElement;
}
interface State {
  lan: Lantern[];
  parts: Part[];
  rip: Ripple[];
  sparks: Spark[];
  koi: Koi[];
  load: number;
  stored: number;
  t: number;
  emitT: number;
  emitI: number;
  relT: number;
  shake: number;
  lanternOn: boolean;
  lastRake: number;
  ghost: Ghost | null;
  fly: number;
  fadeT: number;
}
interface Layout {
  nodes: Record<NodeId, GNode>;
  pond: Pond;
  tree: Tree;
  lant: Lamp;
  W: number;
  H: number;
  portrait: boolean;
}
interface Pond extends XY {
  rx: number;
  ry: number;
}
interface Tree extends XY {
  R: number;
  sz: number;
  tips: [number, number, number][];
}
interface Lamp extends XY {
  h: number;
  wx: number;
  wy: number;
}
interface Bridge extends XY {
  a: number;
  len: number;
  w: number;
}
interface Bush extends XY {
  r: number;
}
interface MountOpts {
  season?: Season;
  dark?: boolean;
  reduced?: boolean;
  ghost?: boolean;
  onStatus?: (text: string) => void;
  onLayout?: (l: Layout) => void;
  onFrame?: (st: State) => void;
}
interface Engine {
  nodes: Record<NodeId, GNode>;
  st: State;
  reduced: boolean;
  render: () => void;
  readonly season: Season;
  readonly dark: boolean;
  setSeason: (s: Season) => void;
  setDark: (d: boolean) => void;
  setReduced: (r: boolean) => void;
  tap: (id: NodeId) => void;
  fail: (id: NodeId) => void;
  feed: () => void;
  shake: () => void;
  rake: () => void;
  toggleLantern: () => void;
  destroy: () => void;
}

const TAU = Math.PI * 2,
  PI = Math.PI;
const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const hyp = Math.hypot;
const wrapA = (a: number): number => {
  while (a > PI) a -= TAU;
  while (a < -PI) a += TAU;
  return a;
};
const rnd =
  (seed: number): Rand =>
  () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
const mk = (w: number, h: number): HTMLCanvasElement => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
};
const rgb = (h: string): number[] => {
  const n = parseInt(h.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
};
const rgba = (h: string, a: number): string => {
  const c = rgb(h);
  return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
};
const shade = (h: string, t: number): string => {
  const c = rgb(h),
    f = t < 0 ? 0 : 255,
    k = Math.abs(t);
  return 'rgb(' + c.map((v) => Math.round(v + (f - v) * k)).join(',') + ')';
};
const pick = <T>(r: Rand, a: readonly T[]): T => a[(r() * a.length) | 0];
const NC: Record<string, string> = {};
const night = (h: string): string =>
  NC[h] ||
  (NC[h] =
    'rgb(' +
    rgb(h)
      .map((v, i) => Math.round((v * [96, 106, 160][i]) / 255))
      .join(',') +
    ')');

const SEASONS: Record<Season, Palette> = {
  spring: {
    sand: '#ece5d4',
    gsh: 'rgba(96,74,44,.24)',
    moss: ['#7ea640', '#97bb55', '#5f8a33', '#b0cc6e'],
    canopy: ['#f8c9d7', '#f2abc2', '#fde2ea', '#e991ad', '#fff2f5'],
    bush: ['#3f6c30', '#527f3a'],
    bloom: ['#df4f97', '#ef80b6', '#c83a7e', '#f5a3c8'],
    water: ['#67b2ae', '#3a8288', '#21595f'],
    particle: 'petal',
    pcol: ['#f8c4d3', '#f3a7c0', '#fde1e9', '#ee9fb8'],
    rate: 5,
    pads: 1,
  },
  summer: {
    sand: '#ebe3cc',
    gsh: 'rgba(96,78,40,.24)',
    moss: ['#4f912f', '#66a73c', '#3d7a25', '#86bd4f'],
    canopy: ['#5f9c40', '#4b8a34', '#76b04e', '#3a7329', '#8cc05d'],
    bush: ['#3c6d2e', '#4c8038'],
    bloom: ['#5a7fd8', '#8aa3e8', '#9b7bd6', '#70a3e3', '#c9b2ef'],
    water: ['#45a89c', '#24786f', '#14514c'],
    particle: 'leaf',
    pcol: ['#5f9a3e', '#7cb350', '#4c8532', '#a2c45a'],
    rate: 0.7,
    pads: 2,
  },
  autumn: {
    sand: '#ebe0c8',
    gsh: 'rgba(100,70,36,.25)',
    moss: ['#87933f', '#9ca24b', '#6f7f35', '#b6a44f'],
    canopy: ['#d93b1f', '#e9622a', '#f28d2f', '#b9271b', '#f4b53e', '#cc4a1f'],
    bush: ['#a8391d', '#c4511f'],
    bloom: ['#e46b26', '#f39b36', '#d2401f', '#f6c04a'],
    water: ['#5a9597', '#2f6b74', '#1c4c56'],
    particle: 'maple',
    pcol: ['#d93b1f', '#e9622a', '#f28d2f', '#f4b53e', '#b9271b'],
    rate: 2.4,
    pads: 0,
  },
  winter: {
    sand: '#e4e9ef',
    gsh: 'rgba(60,78,104,.26)',
    moss: ['#7b8b69', '#8d9a7a', '#66765a', '#9ea88d'],
    canopy: null,
    bush: ['#2d5537', '#3a6644'],
    bloom: ['#c8243a', '#e2384c'],
    water: ['#93b9c4', '#5f909e', '#3d6c7b'],
    particle: 'snow',
    pcol: ['#ffffff'],
    rate: 9,
    pads: 0,
    snow: 1,
  },
};
const NODES: [NodeId, string, number][] = [
  ['pay', 'Payments', 1],
  ['gql', 'GraphQL gateway', 1],
  ['kafka', 'Event pipeline (Kafka)', 0],
  ['cons', 'Consumers', 0],
  ['mongo', 'MongoDB', 0],
];
const STONES: Record<NodeId, StoneDef[]> = {
  pay: [
    [-0.12, -0.08, 0.44, 0.82, '#8f9296'],
    [0.36, 0.26, 0.22, 0.8, '#a19d96'],
  ],
  gql: [
    [0.02, -0.06, 0.42, 0.62, '#7f858c'],
    [-0.34, 0.3, 0.2, 0.85, '#9e9a92'],
  ],
  kafka: [
    [0.02, -0.14, 0.44, 0.78, '#6f747b'],
    [-0.38, 0.2, 0.3, 0.8, '#8b8e92'],
    [0.36, 0.22, 0.27, 0.86, '#9a978f'],
  ],
  cons: [
    [-0.16, 0.02, 0.36, 0.8, '#8a8d90'],
    [0.28, -0.12, 0.28, 0.84, '#a3a09a'],
  ],
  mongo: [[0, -0.04, 0.6, 0.7, '#80858a']],
};

export function autoSeason(d?: Date): Season {
  const m = (d || new Date()).getMonth();
  return m >= 2 && m <= 4
    ? 'spring'
    : m >= 5 && m <= 7
      ? 'summer'
      : m >= 8 && m <= 10
        ? 'autumn'
        : 'winter';
}

function blobPts(
  x: number,
  y: number,
  r: number,
  ry: number,
  R: Rand,
  n: number,
  amp: number
): Pt[] {
  const p: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU,
      k = 1 + (R() - 0.5) * 2 * amp;
    p.push([x + Math.cos(a) * r * k, y + Math.sin(a) * ry * k]);
  }
  return p;
}
function trace(g: Ctx, p: Pt[]) {
  const n = p.length,
    m = (i: number): Pt => [
      (p[i % n][0] + p[(i + 1) % n][0]) / 2,
      (p[i % n][1] + p[(i + 1) % n][1]) / 2,
    ];
  let s = m(0);
  g.beginPath();
  g.moveTo(s[0], s[1]);
  for (let i = 1; i <= n; i++) {
    const c = p[i % n],
      e = m(i);
    g.quadraticCurveTo(c[0], c[1], e[0], e[1]);
  }
  g.closePath();
}
function petalPath(g: Ctx, s: number) {
  g.beginPath();
  g.moveTo(-s * 0.5, 0);
  g.bezierCurveTo(-s * 0.2, -s * 0.55, s * 0.4, -s * 0.5, s * 0.5, -s * 0.14);
  g.lineTo(s * 0.36, 0);
  g.lineTo(s * 0.5, s * 0.14);
  g.bezierCurveTo(s * 0.4, s * 0.5, -s * 0.2, s * 0.55, -s * 0.5, 0);
  g.closePath();
}
function maplePath(g: Ctx, s: number) {
  const L = [1, 0.92, 0.92, 0.72, 0.72, 0.42, 0.42],
    A = [0, -0.72, 0.72, -1.42, 1.42, -2.1, 2.1];
  const ord = [5, 3, 1, 0, 2, 4, 6];
  g.beginPath();
  g.moveTo(0, s * 0.18);
  ord.forEach((k, i) => {
    const a = A[k] - PI / 2,
      a0 = a - 0.32,
      a1 = a + 0.32;
    if (i) {
      const sa = (A[ord[i - 1]] + A[k]) / 2 - PI / 2;
      g.lineTo(Math.cos(sa) * s * 0.26, Math.sin(sa) * s * 0.26);
    } else g.lineTo(Math.cos(a0) * s * 0.2, Math.sin(a0) * s * 0.2);
    g.lineTo(Math.cos(a - 0.12) * s * L[k] * 0.7, Math.sin(a - 0.12) * s * L[k] * 0.7);
    g.lineTo(Math.cos(a) * s * L[k], Math.sin(a) * s * L[k]);
    g.lineTo(Math.cos(a + 0.12) * s * L[k] * 0.7, Math.sin(a + 0.12) * s * L[k] * 0.7);
    if (i === 6) g.lineTo(Math.cos(a1) * s * 0.2, Math.sin(a1) * s * 0.2);
  });
  g.closePath();
}
function blossomPath(g: Ctx, s: number) {
  g.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU - PI / 2;
    g.moveTo(0, 0);
    g.ellipse(Math.cos(a) * s * 0.5, Math.sin(a) * s * 0.5, s * 0.42, s * 0.3, a, 0, TAU);
  }
}
function leafPath(g: Ctx, s: number) {
  g.beginPath();
  g.moveTo(-s * 0.5, 0);
  g.quadraticCurveTo(0, -s * 0.42, s * 0.5, 0);
  g.quadraticCurveTo(0, s * 0.42, -s * 0.5, 0);
  g.closePath();
}
function glowSprite(col: string) {
  const c = mk(64, 64),
    g = c.getContext('2d')!,
    gr = g.createRadialGradient(32, 32, 0, 32, 32, 32),
    k = rgb(col);
  gr.addColorStop(0, 'rgba(' + k + ',1)');
  gr.addColorStop(0.25, 'rgba(' + k + ',.55)');
  gr.addColorStop(0.6, 'rgba(' + k + ',.14)');
  gr.addColorStop(1, 'rgba(' + k + ',0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  return c;
}

function mount(root: HTMLElement, opts: MountOpts = {}): Engine {
  const cvs = root.querySelector('canvas') as HTMLCanvasElement,
    ctx = cvs.getContext('2d')!;
  const reduceInit: boolean =
    opts.reduced != null ? opts.reduced : matchMedia('(prefers-reduced-motion: reduce)').matches;
  const onStatus = opts.onStatus || (() => {});
  let season: Season = opts.season || autoSeason(),
    dark = !!opts.dark;
  let reduce = reduceInit;
  let W = 0,
    H = 0,
    S = 0,
    dpr = 1,
    gap = 7,
    sw = 10,
    portrait = false;
  let ground!: HTMLCanvasElement,
    over!: HTMLCanvasElement,
    mask!: HTMLCanvasElement,
    sandBase!: HTMLCanvasElement;
  let treeC: HTMLCanvasElement | null = null,
    rake!: HTMLCanvasElement,
    rakeG!: Ctx,
    active!: HTMLCanvasElement,
    activeG!: Ctx;
  let sandPat!: CanvasPattern;
  let sprites = {} as Record<NodeId, { s: StoneDef; sp: StoneSprite }[]>;
  let pond!: Pond,
    tree!: Tree,
    lant!: Lamp,
    bridge!: Bridge,
    bushes!: Bush[],
    segs: Seg[] = [],
    rakeW = 28;
  const GLOW = {
    warm: glowSprite('#ffb04a'),
    cool: glowSprite('#c9dcff'),
    fly: glowSprite('#dfff7a'),
    red: glowSprite('#ff5a3c'),
    white: glowSprite('#fff6dd'),
  };
  const nodes = {} as Record<NodeId, GNode>;
  const ring = (a: number) => a * 0;
  NODES.forEach(
    ([id, name, prod]) =>
      (nodes[id] = {
        id,
        name,
        prod,
        x: 0,
        y: 0,
        r: 0,
        wob: 9,
        down: 0,
        glint: 0,
        pending: 0,
        holdT: 0,
        pt: 0,
        rIn: ring,
        rOut: ring,
        rMid: ring,
        outer: 0,
        shape: () => new Path2D(),
        midPath: new Path2D(),
        inPts: [],
        exitA: 0,
        r0: 0,
      })
  );
  const ids = NODES.map((d) => d[0]);
  const st = {
    lan: [],
    parts: [],
    rip: [],
    sparks: [],
    koi: [],
    load: 0,
    stored: 0,
    t: 0,
    emitT: 0.4,
    emitI: 0,
    relT: 0,
    shake: 0,
    lanternOn: true,
    lastRake: -99,
    ghost: null,
    fly: 0,
    fadeT: 0,
  } as State;
  const ptr = { x: -999, y: -999, vx: 0, vy: 0, t: 0, inside: false };
  let press: Press | null = null,
    running = false,
    visible = true,
    raf = 0,
    last = 0,
    R = rnd(1);
  const strokePts: XY[] = [];

  /* ---------------- layout ---------------- */
  function layout() {
    portrait = W < H * 1.05;
    S = Math.min(W, H);
    gap = clamp(S * 0.0155, 5, 8);
    sw = clamp(S * 0.03, 7, 15);
    rakeW = gap * 4;
    const D: Record<NodeId | 'pond' | 'tree' | 'lant', number[]> & { bushes: number[][] } = portrait
      ? {
          pay: [0.2, 0.13, 0.11],
          gql: [0.8, 0.37, 0.1],
          kafka: [0.4, 0.42, 0.115],
          cons: [0.2, 0.69, 0.105],
          pond: [0.63, 0.86, 0.33, 0.115],
          mongo: [0.7, 0.87, 0.058],
          tree: [1.04, -0.04, 0.46],
          lant: [0.91, 0.66],
          bushes: [
            [-0.02, 0.4, 0.1],
            [1.01, 0.76, 0.07],
            [0.0, 1.0, 0.1],
            [0.55, -0.015, 0.065],
          ],
        }
      : {
          pay: [0.12, 0.26, 0.115],
          gql: [0.15, 0.76, 0.1],
          kafka: [0.365, 0.5, 0.13],
          cons: [0.585, 0.26, 0.105],
          pond: [0.8, 0.705, 0.17, 0.245],
          mongo: [0.835, 0.72, 0.068],
          tree: [1.03, -0.07, 0.52],
          lant: [0.565, 0.88],
          bushes: [
            [0.0, 0.0, 0.12],
            [1.0, 1.01, 0.1],
            [0.3, 1.02, 0.085],
            [0.47, -0.015, 0.075],
            [0.0, 0.52, 0.07],
          ],
        };
    for (const id of ids) {
      const n = nodes[id],
        d = D[id];
      n.x = d[0] * W;
      n.y = d[1] * H;
      n.r = d[2] * S;
    }
    const K = nodes.kafka;
    K.rIn = (a) => K.r * (1 + 0.07 * Math.sin(3 * a + 1.3) + 0.04 * Math.sin(5 * a + 0.4));
    K.rOut = (a) =>
      K.rIn(a) +
      sw *
        (1.05 + 0.95 * (0.5 + 0.5 * Math.sin(2 * a + 2.1)) * (0.65 + 0.35 * Math.sin(3 * a + 0.7)));
    K.rMid = (a) => K.rIn(a) + (K.rOut(a) - K.rIn(a)) * 0.5;
    K.outer = 0;
    for (let a = 0; a < TAU; a += 0.05) K.outer = Math.max(K.outer, K.rOut(a));
    K.shape = (grow) => {
      const q = new Path2D();
      for (let i = 0; i <= 96; i++) {
        const a = (i / 96) * TAU,
          r = K.rOut(a) + grow;
        if (i) q.lineTo(K.x + Math.cos(a) * r, K.y + Math.sin(a) * r);
        else q.moveTo(K.x + Math.cos(a) * r, K.y + Math.sin(a) * r);
      }
      q.closePath();
      return q;
    };
    K.midPath = new Path2D();
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * TAU,
        r = K.rMid(a);
      if (i) K.midPath.lineTo(K.x + Math.cos(a) * r, K.y + Math.sin(a) * r);
      else K.midPath.moveTo(K.x + Math.cos(a) * r, K.y + Math.sin(a) * r);
    }
    K.inPts = [];
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * TAU,
        r = K.rIn(a);
      K.inPts.push([K.x + Math.cos(a) * r, K.y + Math.sin(a) * r]);
    }
    pond = { x: D.pond[0] * W, y: D.pond[1] * H, rx: D.pond[2] * W, ry: D.pond[3] * H };
    tree = { x: D.tree[0] * W, y: D.tree[1] * H, R: D.tree[2] * S, sz: 0, tips: [] };
    lant = { x: D.lant[0] * W, y: D.lant[1] * H, h: clamp(S * 0.17, 46, 112), wx: 0, wy: 0 };
    bushes = D.bushes.map((b: number[]) => ({ x: b[0] * W, y: b[1] * H, r: b[2] * S }));
    const edgeR = (n: GNode, a: number): number => (n.id === 'kafka' ? n.rOut(a) - 2 : n.r * 0.9);
    const plan: [NodeId, NodeId | 'pond', number][] = [
      ['pay', 'kafka', 1],
      ['gql', 'kafka', -1],
      ['kafka', 'cons', 1],
      ['cons', 'pond', -1],
    ];
    segs = plan.map(([f, t, sg]): Seg => {
      const a = nodes[f];
      let B: XY;
      if (t === 'pond') {
        const ang = Math.atan2((a.y - pond.y) / pond.ry, (a.x - pond.x) / pond.rx);
        B = {
          x: pond.x + Math.cos(ang) * pond.rx * 0.96,
          y: pond.y + Math.sin(ang) * pond.ry * 0.96,
        };
      } else {
        const b = nodes[t],
          dx = b.x - a.x,
          dy = b.y - a.y,
          l = hyp(dx, dy),
          e = edgeR(b, Math.atan2(-dy, -dx));
        B = { x: b.x - (dx / l) * e, y: b.y - (dy / l) * e };
      }
      const dx = B.x - a.x,
        dy = B.y - a.y,
        l = hyp(dx, dy),
        ea = edgeR(a, Math.atan2(dy, dx)),
        A = { x: a.x + (dx / l) * ea, y: a.y + (dy / l) * ea };
      const L0 = hyp(B.x - A.x, B.y - A.y),
        C = {
          x: (A.x + B.x) / 2 - (dy / l) * L0 * 0.2 * sg,
          y: (A.y + B.y) / 2 + (dx / l) * L0 * 0.2 * sg,
        };
      const pts: XY[] = [],
        cum = [0],
        N = 40,
        path = new Path2D();
      for (let i = 0; i <= N; i++) {
        const u = i / N,
          v = 1 - u;
        pts.push({
          x: v * v * A.x + 2 * v * u * C.x + u * u * B.x,
          y: v * v * A.y + 2 * v * u * C.y + u * u * B.y,
        });
        if (i) cum.push(cum[i - 1] + hyp(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
      }
      path.moveTo(A.x, A.y);
      path.quadraticCurveTo(C.x, C.y, B.x, B.y);
      const ph = [sg * 1.7 + pts.length, sg * 2.9 + 1.1, f.length * 0.7, t.length * 1.3],
        wv = (d: number, k: number) =>
          1 + 0.22 * Math.sin(d * 0.045 + ph[k]) + 0.14 * Math.sin(d * 0.12 + ph[k + 2]);
      const side = (k: number, sc: number): Pt[] =>
        pts.map((p, i) => {
          const q = pts[Math.min(N, i + 1)],
            o = pts[Math.max(0, i - 1)],
            ax = q.x - o.x,
            ay = q.y - o.y,
            al = hyp(ax, ay) || 1,
            d = cum[i],
            ww = (sw / 2) * wv(d, k) * sc * (k ? -1 : 1);
          return [p.x - (ay / al) * ww, p.y + (ax / al) * ww];
        });
      const poly = (sc: number) => {
        const L1 = side(0, sc),
          R1 = side(1, sc),
          q = new Path2D(),
          ux = pts[1].x - pts[0].x,
          uy = pts[1].y - pts[0].y,
          ul = hyp(ux, uy) || 1,
          vx = pts[N].x - pts[N - 1].x,
          vy = pts[N].y - pts[N - 1].y,
          vl = hyp(vx, vy) || 1;
        q.moveTo(pts[0].x - (ux / ul) * sw, pts[0].y - (uy / ul) * sw);
        L1.forEach((p) => q.lineTo(p[0], p[1]));
        q.lineTo(pts[N].x + (vx / vl) * sw, pts[N].y + (vy / vl) * sw);
        for (let i = N; i >= 0; i--) q.lineTo(R1[i][0], R1[i][1]);
        q.closePath();
        return q;
      };
      return { from: f, to: t, pts, cum, len: cum[N], path, A, B, poly, side };
    });
    const s3 = segs[2],
      s4 = segs[3],
      bs = s4.len > s3.len * 0.8 ? s4 : s3,
      bp = posAt(bs, bs.len * 0.5);
    bridge = {
      x: bp.x,
      y: bp.y,
      a: bp.a,
      len: Math.max(sw * 3 + 22, S * 0.15),
      w: clamp(S * 0.048, 13, 20),
    };
    K.exitA = Math.atan2(s3.A.y - K.y, s3.A.x - K.x);
    K.r0 = K.r;
  }
  function posAt(sg: Seg, d: number) {
    d = clamp(d, 0, sg.len);
    let i = 1;
    const c = sg.cum;
    while (i < c.length - 1 && c[i] < d) i++;
    const p = sg.pts[i - 1],
      q = sg.pts[i],
      u = (d - c[i - 1]) / (c[i] - c[i - 1] || 1);
    return { x: lerp(p.x, q.x, u), y: lerp(p.y, q.y, u), a: Math.atan2(q.y - p.y, q.x - p.x) };
  }
  const inPond = (x: number, y: number, k?: number) => {
    const ex = (x - pond.x) / pond.rx,
      ey = (y - pond.y) / pond.ry;
    return ex * ex + ey * ey < (k || 1);
  };

  /* ---------------- static layers ---------------- */
  function layer(): [HTMLCanvasElement, Ctx] {
    const c = mk(W * dpr, H * dpr),
      g = c.getContext('2d')!;
    g.scale(dpr, dpr);
    return [c, g];
  }
  function grain(pal: Palette) {
    const c = mk(128, 128),
      g = c.getContext('2d')!,
      im = g.createImageData(128, 128),
      r = rnd(9),
      d = im.data,
      sh = pal.snow ? [80, 95, 120] : [110, 86, 52];
    for (let i = 0; i < d.length; i += 4) {
      const v = r();
      if (v < 0.22) {
        d[i] = sh[0];
        d[i + 1] = sh[1];
        d[i + 2] = sh[2];
        d[i + 3] = 18 + r() * 40;
      } else if (v > 0.9) {
        d[i] = d[i + 1] = d[i + 2] = 255;
        d[i + 3] = 40 + r() * 60;
      }
    }
    g.putImageData(im, 0, 0);
    return c;
  }
  let GSH = '',
    GHI = 'rgba(255,255,250,.62)',
    RHI = GHI;
  function ringDisk(g: Ctx, cx: number, cy: number, rx: number, ry: number, ks: number[]) {
    const e = (k: number, ox: number, oy: number) => {
      g.beginPath();
      g.ellipse(cx + ox, cy + oy, rx + k, ry + k, 0, 0, TAU);
    };
    g.fillStyle = sandPat;
    e(ks[0] + 3, 0, 0);
    g.fill();
    for (const k of ks) {
      e(k + 0.7, -0.55, -0.55);
      g.fillStyle = GSH;
      g.fill();
      e(k + 0.7, 0.6, 0.6);
      g.fillStyle = GHI;
      g.fill();
      e(k - 0.75, 0, 0);
      g.fillStyle = sandPat;
      g.fill();
    }
  }
  function ringStroke(g: Ctx, path: Path2D, ks: number[]) {
    const s = (w: number, ox: number, oy: number, c: string | CanvasPattern) => {
      g.save();
      g.translate(ox, oy);
      g.lineWidth = w;
      g.strokeStyle = c;
      g.stroke(path);
      g.restore();
    };
    g.lineCap = 'round';
    g.lineJoin = 'round';
    s(ks[0] * 2 + 6, 0, 0, sandPat);
    for (const k of ks) {
      s(k * 2 + 1.4, -0.55, -0.55, GSH);
      s(k * 2 + 1.4, 0.6, 0.6, GHI);
      s(k * 2 - 1.5, 0, 0, sandPat);
    }
  }

  function stoneSprite(
    sr: number,
    el: number,
    base: string,
    seed: number,
    snow?: number
  ): StoneSprite {
    const pad = sr * 0.35,
      sz = sr * 2 + pad * 2,
      c = mk(sz * dpr, sz * dpr),
      g = c.getContext('2d')!,
      r = rnd(seed);
    g.scale(dpr, dpr);
    g.translate(sz / 2, sz / 2);
    const p = blobPts(0, 0, sr, sr * el, r, 11, 0.15);
    trace(g, p);
    const gr = g.createRadialGradient(
      -sr * 0.4,
      -sr * 0.5,
      sr * 0.05,
      -sr * 0.1,
      -sr * 0.1,
      sr * 1.35
    );
    gr.addColorStop(0, shade(base, 0.5));
    gr.addColorStop(0.4, base);
    gr.addColorStop(1, shade(base, -0.55));
    g.fillStyle = gr;
    g.fill();
    g.save();
    trace(g, p);
    g.clip();
    for (let i = 0; i < sr * 3; i++) {
      g.fillStyle = r() < 0.5 ? 'rgba(30,30,35,.18)' : 'rgba(255,255,255,.16)';
      g.beginPath();
      g.arc((r() - 0.5) * sr * 2, (r() - 0.5) * sr * 2, 0.4 + r() * 1.1, 0, TAU);
      g.fill();
    }
    g.strokeStyle = 'rgba(30,30,35,.16)';
    g.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const y = (r() - 0.3) * sr;
      g.beginPath();
      g.moveTo(-sr, y);
      g.bezierCurveTo(-sr * 0.3, y - sr * 0.25, sr * 0.3, y + sr * 0.2, sr, y - sr * 0.1);
      g.stroke();
    }
    g.translate(-1, -1.2);
    trace(g, p);
    g.strokeStyle = 'rgba(255,255,255,.4)';
    g.lineWidth = 1.6;
    g.stroke();
    g.translate(1, 1.2);
    if (snow) {
      const sg = g.createRadialGradient(-sr * 0.2, -sr * 0.45, 0, -sr * 0.2, -sr * 0.45, sr * 0.85);
      sg.addColorStop(0, '#ffffff');
      sg.addColorStop(0.75, 'rgba(250,252,255,.95)');
      sg.addColorStop(1, 'rgba(240,246,255,0)');
      g.fillStyle = sg;
      g.beginPath();
      g.ellipse(-sr * 0.15, -sr * 0.4, sr * 0.95, sr * 0.6 * el, -0.1, 0, TAU);
      g.fill();
    }
    g.restore();
    trace(g, p);
    g.strokeStyle = 'rgba(25,25,30,.45)';
    g.lineWidth = 1;
    g.stroke();
    const b = mk(c.width, c.height),
      bg = b.getContext('2d')!,
      cr: Pt[] = [];
    for (let i = 0; i <= 6; i++)
      cr.push([
        (i % 2 ? 1 : -1) * sr * (0.08 + r() * 0.12) + sr * 0.05,
        -sr * 1.25 + (i / 6) * sr * 2.5,
      ]);
    const half = (sd: number) => {
      bg.beginPath();
      bg.moveTo(sd * sz, -sz);
      cr.forEach((q) => bg.lineTo(q[0], q[1]));
      bg.lineTo(sd * sz, sz);
      bg.closePath();
    };
    bg.scale(dpr, dpr);
    bg.translate(sz / 2, sz / 2);
    const gapW = sr * 0.13;
    bg.fillStyle = 'rgba(15,10,8,.55)';
    bg.beginPath();
    cr.forEach((q, i) => (i ? bg.lineTo(q[0] - gapW, q[1] - 1) : bg.moveTo(q[0] - gapW, q[1] - 1)));
    for (let i = cr.length - 1; i >= 0; i--) bg.lineTo(cr[i][0] + gapW, cr[i][1] + 1);
    bg.closePath();
    bg.fill();
    for (const sd of [-1, 1]) {
      bg.save();
      bg.translate(sd * gapW, sd * sr * 0.02);
      bg.rotate(sd * 0.07);
      half(sd);
      bg.clip();
      bg.drawImage(c, -sz / 2, -sz / 2, sz, sz);
      bg.strokeStyle = sd < 0 ? 'rgba(20,14,10,.8)' : 'rgba(225,215,200,.75)';
      bg.lineWidth = 1.6;
      bg.beginPath();
      cr.forEach((q, i) => (i ? bg.lineTo(q[0], q[1]) : bg.moveTo(q[0], q[1])));
      bg.stroke();
      bg.restore();
    }
    for (let i = 0; i < 6; i++) {
      const x = cr[6][0] + (r() - 0.5) * sr * 0.9,
        y = sr * (0.75 + r() * 0.35),
        q = blobPts(x, y, sr * (0.05 + r() * 0.06), sr * (0.04 + r() * 0.05), r, 5, 0.3);
      trace(bg, q);
      bg.fillStyle = shade(base, -0.1 - r() * 0.3);
      bg.fill();
    }
    return { c, sz, b };
  }

  function mossIsland(
    g: Ctx,
    x: number,
    y: number,
    r: number,
    pal: Palette,
    seed: number,
    pts?: Pt[]
  ) {
    const rr = rnd(seed),
      p = pts || blobPts(x, y, r, r * 0.92, rr, 14, 0.12);
    g.save();
    g.shadowColor = 'rgba(40,30,10,.3)';
    g.shadowBlur = 6;
    g.shadowOffsetX = 2;
    g.shadowOffsetY = 3;
    trace(g, p);
    g.fillStyle = pal.moss[2];
    g.fill();
    g.restore();
    const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r * 1.1);
    gr.addColorStop(0, pal.moss[3]);
    gr.addColorStop(0.5, pal.moss[0]);
    gr.addColorStop(1, pal.moss[2]);
    trace(g, p);
    g.fillStyle = gr;
    g.fill();
    g.save();
    trace(g, p);
    g.clip();
    for (let i = 0; i < r * r * 0.045; i++) {
      const a = rr() * TAU,
        d = Math.sqrt(rr()) * r;
      g.fillStyle = rgba(pick(rr, pal.moss), 0.55);
      g.beginPath();
      g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 0.8 + rr() * 2, 0, TAU);
      g.fill();
    }
    if (pal.snow) {
      const sg = g.createRadialGradient(
        x - r * 0.3,
        y - r * 0.35,
        0,
        x - r * 0.2,
        y - r * 0.25,
        r * 1.05
      );
      sg.addColorStop(0, 'rgba(252,253,255,.97)');
      sg.addColorStop(0.55, 'rgba(246,249,253,.88)');
      sg.addColorStop(1, 'rgba(240,245,250,0)');
      g.fillStyle = sg;
      g.fillRect(x - r * 1.2, y - r * 1.2, r * 2.4, r * 2.4);
      for (let i = 0; i < r * r * 0.03; i++) {
        const a = rr() * TAU,
          d = Math.sqrt(rr()) * r;
        g.fillStyle = rgba(pick(rr, pal.moss), 0.35 + rr() * 0.3);
        g.beginPath();
        g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 0.6 + rr() * 1.4, 0, TAU);
        g.fill();
      }
    }
    g.restore();
    trace(g, p);
    g.strokeStyle = rgba('#2e3a14', 0.35);
    g.lineWidth = 1;
    g.stroke();
  }

  function pebbles(g: Ctx, sg: Seg, r: Rand) {
    const L1 = sg.side(0, 1.12),
      R1 = sg.side(1, 1.12);
    for (const sd of [L1, R1])
      for (let i = 0; i < sd.length; i++)
        for (let k = 0; k < 2; k++) {
          if (r() < 0.35) continue;
          const j = Math.min(sd.length - 1, i + 1),
            x = lerp(sd[i][0], sd[j][0], r()) + (r() - 0.5) * 2.5,
            y = lerp(sd[i][1], sd[j][1], r()) + (r() - 0.5) * 2.5,
            q = r() < 0.08 ? 2.2 : 1;
          g.fillStyle = 'rgba(20,20,20,.18)';
          g.beginPath();
          g.ellipse(x + 0.6, y + 0.8, (1.3 + r() * 1.5) * q, (1 + r()) * q, 0, 0, TAU);
          g.fill();
          g.fillStyle = pick(r, ['#8b8780', '#a39f97', '#6f6b65', '#b7b2a9']);
          g.beginPath();
          g.ellipse(x, y, (1.3 + r() * 1.5) * q, (1 + r()) * q, r() * 3, 0, TAU);
          g.fill();
          g.fillStyle = 'rgba(255,255,255,.3)';
          g.beginPath();
          g.arc(x - 0.5, y - 0.5, 0.6 * q, 0, TAU);
          g.fill();
        }
  }
  function buildTree(pal: Palette): HTMLCanvasElement {
    const T = tree,
      r = rnd(42),
      Rr = T.R,
      sz = Rr * 2.2,
      c = mk(sz * dpr, sz * dpr),
      g = c.getContext('2d')!;
    g.scale(dpr, dpr);
    g.translate(sz / 2, sz / 2);
    const dir = Math.atan2(H * 0.55 - T.y, W * 0.5 - T.x),
      br: number[][] = [],
      tips: [number, number, number][] = [];
    (function grow(x: number, y: number, a: number, len: number, w: number, d: number): void {
      const x2 = x + Math.cos(a) * len,
        y2 = y + Math.sin(a) * len;
      br.push([x, y, x2, y2, w, d]);
      if (d >= (pal.canopy ? 5 : 6) || len < 4) {
        tips.push([x2, y2, d]);
        return;
      }
      if (d >= 2) tips.push([lerp(x, x2, 0.6), lerp(y, y2, 0.6), d]);
      const k = d < 1 ? 3 : r() < 0.35 ? 3 : 2;
      for (let i = 0; i < k; i++)
        grow(
          x2,
          y2,
          a + (i - (k - 1) / 2) * (0.55 + r() * 0.35) + (r() - 0.5) * 0.3,
          len * (0.66 + r() * 0.14),
          w * 0.64,
          d + 1
        );
    })(0, 0, dir, Rr * 0.3, Rr * 0.075, 0);
    T.tips = tips;
    T.sz = sz;
    g.lineCap = 'round';
    for (const b of br) {
      g.strokeStyle = b[5] < 2 ? '#3d2c22' : '#4a372b';
      g.lineWidth = Math.max(0.7, b[4]);
      g.beginPath();
      g.moveTo(b[0], b[1]);
      g.lineTo(b[2], b[3]);
      g.stroke();
    }
    for (const b of br) {
      g.strokeStyle = 'rgba(255,240,220,.18)';
      g.lineWidth = Math.max(0.4, b[4] * 0.3);
      g.beginPath();
      g.moveTo(b[0] - b[4] * 0.25, b[1] - b[4] * 0.25);
      g.lineTo(b[2] - b[4] * 0.25, b[3] - b[4] * 0.25);
      g.stroke();
    }
    if (!pal.canopy) {
      for (const b of br)
        if (b[5] < 6) {
          g.strokeStyle = 'rgba(255,255,255,.92)';
          g.lineWidth = Math.max(0.6, b[4] * 0.45);
          g.beginPath();
          g.moveTo(b[0] - b[4] * 0.3, b[1] - b[4] * 0.35);
          g.lineTo(b[2] - b[4] * 0.3, b[3] - b[4] * 0.35);
          g.stroke();
        }
      return c;
    }
    const cl: number[][] = [];
    for (const t of tips) {
      if (r() < 0.3) continue;
      const n = 2 + ((r() * 3) | 0);
      for (let k = 0; k < n; k++)
        cl.push([
          t[0] + (r() - 0.5) * Rr * 0.17,
          t[1] + (r() - 0.5) * Rr * 0.17,
          Rr * (0.04 + r() * 0.045),
          r(),
        ]);
    }
    cl.sort((a, b) => a[3] - b[3]);
    const kind = pal.particle,
      base = pal.canopy;
    const es = clamp(Rr * (kind === 'maple' ? 0.026 : 0.022), 4.5, 8.5),
      spr: Record<string, HTMLCanvasElement> = {};
    const sprite = (col: string, sh: number) => {
      const key = col + sh;
      if (spr[key]) return spr[key];
      const z = Math.ceil(es * 2.4 * dpr),
        cc = mk(z, z),
        sg = cc.getContext('2d')!;
      sg.scale(dpr, dpr);
      sg.translate(es * 1.2, es * 1.2);
      sg.fillStyle = shade(col, sh);
      if (kind === 'petal') {
        blossomPath(sg, es);
        sg.fill();
        sg.fillStyle = shade('#d4547c', sh);
        sg.beginPath();
        sg.arc(0, 0, es * 0.14, 0, TAU);
        sg.fill();
      } else if (kind === 'maple') {
        maplePath(sg, es);
        sg.fill();
        sg.strokeStyle = 'rgba(80,20,10,.25)';
        sg.lineWidth = 0.4;
        sg.stroke();
      } else {
        leafPath(sg, es * 1.3);
        sg.fill();
      }
      return (spr[key] = cc);
    };
    for (const q of cl) {
      const hs = (q[3] - 0.6) * 0.3;
      g.setTransform(dpr, 0, 0, dpr, (sz / 2) * dpr, (sz / 2) * dpr);
      g.fillStyle = 'rgba(30,15,10,' + (kind === 'petal' ? 0.18 : 0.28) + ')';
      trace(
        g,
        blobPts(q[0] + q[2] * 0.25, q[1] + q[2] * 0.35, q[2] * 1.05, q[2] * 0.95, r, 8, 0.3)
      );
      g.fill();
      for (const pass of [0, 1, 2]) {
        const n = Math.round(
          ((PI * q[2] * q[2]) / (es * es)) * (pass === 1 ? 0.9 : pass === 0 ? 0.5 : 0.3)
        );
        for (let k = 0; k < n; k++) {
          const a = r() * TAU,
            d = Math.sqrt(r()) * q[2] * (pass === 2 ? 0.75 : 1.12),
            dx = Math.cos(a) * d - (pass === 2 ? q[2] * 0.3 : pass === 0 ? -q[2] * 0.2 : 0),
            dy = Math.sin(a) * d - (pass === 2 ? q[2] * 0.3 : pass === 0 ? -q[2] * 0.2 : 0);
          const sc = 0.7 + r() * 0.6,
            im = sprite(
              pick(r, base),
              Math.round(((pass === 0 ? -0.26 : pass === 2 ? 0.16 : (r() - 0.5) * 0.1) + hs) * 20) /
                20
            ),
            rot = r() * TAU,
            c0 = Math.cos(rot) * sc,
            s0 = Math.sin(rot) * sc;
          g.setTransform(
            dpr * c0,
            dpr * s0,
            -dpr * s0,
            dpr * c0,
            dpr * (sz / 2 + q[0] + dx),
            dpr * (sz / 2 + q[1] + dy)
          );
          g.drawImage(im, -es * 1.2, -es * 1.2, es * 2.4, es * 2.4);
        }
      }
    }
    g.setTransform(dpr, 0, 0, dpr, (sz / 2) * dpr, (sz / 2) * dpr);
    return c;
  }

  function drawBush(g: Ctx, b: Bush, pal: Palette, r: Rand) {
    g.fillStyle = 'rgba(30,25,10,.22)';
    g.beginPath();
    g.ellipse(b.x + b.r * 0.15, b.y + b.r * 0.2, b.r * 1.05, b.r * 0.85, 0, 0, TAU);
    g.fill();
    const lobes = [];
    for (let i = 0; i < 8; i++) {
      const a = r() * TAU,
        d = r() * b.r * 0.5;
      lobes.push([b.x + Math.cos(a) * d, b.y + Math.sin(a) * d * 0.85, b.r * (0.42 + r() * 0.25)]);
    }
    for (const l of lobes) {
      g.fillStyle = shade(pal.bush[0], -0.25);
      g.beginPath();
      g.arc(l[0] + 1, l[1] + 1.5, l[2], 0, TAU);
      g.fill();
    }
    for (const l of lobes) {
      const gr = g.createRadialGradient(l[0] - l[2] * 0.4, l[1] - l[2] * 0.4, 0, l[0], l[1], l[2]);
      gr.addColorStop(0, shade(pal.bush[1], 0.25));
      gr.addColorStop(1, pal.bush[0]);
      g.fillStyle = gr;
      g.beginPath();
      g.arc(l[0], l[1], l[2], 0, TAU);
      g.fill();
    }
    for (let i = 0; i < b.r * b.r * 0.06; i++) {
      const l = pick(r, lobes),
        a = r() * TAU,
        d = r() * l[2];
      g.fillStyle = r() < 0.5 ? 'rgba(10,30,5,.2)' : 'rgba(220,255,180,.14)';
      g.beginPath();
      g.arc(l[0] + Math.cos(a) * d, l[1] + Math.sin(a) * d, 0.7 + r(), 0, TAU);
      g.fill();
    }
    const bl = pal.particle;
    if (bl === 'petal')
      for (let i = 0; i < b.r * 3; i++) {
        const l = pick(r, lobes),
          a = r() * TAU,
          d = r() * l[2] * 0.9;
        g.fillStyle = pick(r, pal.bloom);
        g.beginPath();
        g.arc(l[0] + Math.cos(a) * d, l[1] + Math.sin(a) * d, 1 + r() * 1.6, 0, TAU);
        g.fill();
      }
    if (bl === 'leaf')
      for (let k = 0; k < 4; k++) {
        const l = pick(r, lobes),
          cx = l[0] + (r() - 0.5) * l[2],
          cy = l[1] + (r() - 0.5) * l[2],
          col = pick(r, pal.bloom);
        for (let i = 0; i < 26; i++) {
          const a = r() * TAU,
            d = r() * b.r * 0.2;
          g.fillStyle = r() < 0.3 ? shade(col, 0.4) : col;
          g.beginPath();
          g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1 + r() * 1.3, 0, TAU);
          g.fill();
        }
      }
    if (bl === 'maple')
      for (let i = 0; i < b.r * 2.2; i++) {
        const l = pick(r, lobes),
          a = r() * TAU,
          d = r() * l[2];
        g.fillStyle = pick(r, pal.bloom);
        g.beginPath();
        g.arc(l[0] + Math.cos(a) * d, l[1] + Math.sin(a) * d, 1 + r() * 1.5, 0, TAU);
        g.fill();
      }
    if (bl === 'snow') {
      for (const l of lobes) {
        g.fillStyle = 'rgba(252,253,255,.95)';
        g.beginPath();
        g.ellipse(l[0] - l[2] * 0.2, l[1] - l[2] * 0.3, l[2] * 0.75, l[2] * 0.5, 0, 0, TAU);
        g.fill();
      }
      for (let i = 0; i < b.r * 0.6; i++) {
        const l = pick(r, lobes),
          a = r() * TAU,
          d = r() * l[2];
        g.fillStyle = pick(r, pal.bloom);
        g.beginPath();
        g.arc(l[0] + Math.cos(a) * d, l[1] + Math.sin(a) * d * 0.6 + l[2] * 0.3, 1.2 + r(), 0, TAU);
        g.fill();
      }
    }
  }

  function drawStoneLantern(g: Ctx, pal: Palette) {
    const { x, h } = lant,
      y = lant.y,
      cyl = (cx: number, w: number, base: string) => {
        const gr = g.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
        gr.addColorStop(0, shade(base, 0.35));
        gr.addColorStop(0.45, base);
        gr.addColorStop(1, shade(base, -0.45));
        return gr;
      };
    const stone = '#9b9c98';
    g.fillStyle = 'rgba(30,25,15,.22)';
    g.beginPath();
    g.moveTo(x - h * 0.22, y);
    g.lineTo(x + h * 0.5, y + h * 0.22);
    g.lineTo(x + h * 0.62, y + h * 0.14);
    g.lineTo(x + h * 0.22, y - h * 0.02);
    g.closePath();
    g.fill();
    g.beginPath();
    g.ellipse(x + h * 0.04, y, h * 0.28, h * 0.07, 0, 0, TAU);
    g.fill();
    const box = (w: number, y0: number, y1: number) => {
      g.fillStyle = cyl(x, w, stone);
      g.fillRect(x - w / 2, y0, w, y1 - y0);
      g.fillStyle = shade(stone, 0.3);
      g.fillRect(x - w / 2, y0, w, Math.min(2, y1 - y0));
    };
    box(h * 0.46, y - h * 0.1, y);
    box(h * 0.16, y - h * 0.5, y - h * 0.1);
    box(h * 0.44, y - h * 0.57, y - h * 0.5);
    box(h * 0.3, y - h * 0.77, y - h * 0.57);
    g.fillStyle = '#2b2622';
    g.fillRect(x - h * 0.07, y - h * 0.725, h * 0.14, h * 0.11);
    lant.wx = x;
    lant.wy = y - h * 0.67;
    g.fillStyle = cyl(x, h * 0.74, stone);
    g.beginPath();
    g.moveTo(x - h * 0.4, y - h * 0.79);
    g.quadraticCurveTo(x - h * 0.3, y - h * 0.8, x - h * 0.12, y - h * 0.9);
    g.lineTo(x + h * 0.12, y - h * 0.9);
    g.quadraticCurveTo(x + h * 0.3, y - h * 0.8, x + h * 0.4, y - h * 0.79);
    g.lineTo(x + h * 0.36, y - h * 0.755);
    g.lineTo(x - h * 0.36, y - h * 0.755);
    g.closePath();
    g.fill();
    g.fillStyle = cyl(x, h * 0.1, stone);
    g.beginPath();
    g.arc(x, y - h * 0.94, h * 0.05, 0, TAU);
    g.fill();
    g.beginPath();
    g.moveTo(x - h * 0.02, y - h * 0.98);
    g.lineTo(x, y - h * 1.03);
    g.lineTo(x + h * 0.02, y - h * 0.98);
    g.fill();
    g.fillStyle = rgba(pal.moss[2], 0.8);
    for (let i = 0; i < 14; i++) {
      g.beginPath();
      g.arc(x - h * 0.22 + i * h * 0.033, y - h * 0.01 - (i % 3), 1.2 + (i % 2), 0, TAU);
      g.fill();
    }
    if (pal.snow) {
      g.fillStyle = '#fbfcff';
      g.beginPath();
      g.ellipse(x, y - h * 0.86, h * 0.36, h * 0.07, 0, 0, TAU);
      g.fill();
      g.beginPath();
      g.ellipse(x, y - h * 0.57, h * 0.22, h * 0.03, 0, 0, TAU);
      g.fill();
      g.beginPath();
      g.ellipse(x, y - h * 0.1, h * 0.23, h * 0.03, 0, 0, TAU);
      g.fill();
    }
  }

  function drawBridge(g: Ctx, pal: Palette) {
    const b = bridge,
      L = b.len,
      w = b.w;
    g.save();
    g.translate(b.x, b.y);
    g.rotate(b.a + PI / 2);
    g.save();
    g.translate(2, 4);
    g.fillStyle = 'rgba(10,20,25,.28)';
    g.fillRect(-L / 2, -w / 2, L, w);
    g.restore();
    const gr = g.createLinearGradient(-L / 2, 0, L / 2, 0);
    gr.addColorStop(0, '#5b3a24');
    gr.addColorStop(0.5, '#a0714a');
    gr.addColorStop(1, '#5b3a24');
    g.fillStyle = gr;
    g.fillRect(-L / 2, -w / 2, L, w);
    g.strokeStyle = 'rgba(40,22,10,.45)';
    g.lineWidth = 0.7;
    for (let x = -L / 2 + 3; x < L / 2; x += 3) {
      g.beginPath();
      g.moveTo(x, -w / 2);
      g.lineTo(x, w / 2);
      g.stroke();
    }
    if (pal.snow) {
      g.fillStyle = 'rgba(250,252,255,.85)';
      g.fillRect(-L / 2 + 2, -w / 2 + 2, L - 4, w - 4);
    }
    for (const s of [-1, 1]) {
      g.fillStyle = '#c8352a';
      g.fillRect(-L / 2, (s * w) / 2 - 1.6, L, 3.2);
      g.fillStyle = 'rgba(255,200,170,.5)';
      g.fillRect(-L / 2, (s * w) / 2 - 1.6, L, 1);
      for (let i = 0; i <= 4; i++) {
        const x = -L / 2 + (i / 4) * L;
        g.fillStyle = '#9f2a1f';
        g.fillRect(x - 2, (s * w) / 2 - 2.2, 4, 4.4);
      }
      for (const e of [-1, 1]) {
        g.fillStyle = '#e0ab43';
        g.beginPath();
        g.arc((e * L) / 2, (s * w) / 2, 2.6, 0, TAU);
        g.fill();
        g.fillStyle = 'rgba(255,240,200,.8)';
        g.beginPath();
        g.arc((e * L) / 2 - 0.7, (s * w) / 2 - 0.7, 0.9, 0, TAU);
        g.fill();
      }
    }
    g.restore();
  }

  const tint = (c: HTMLCanvasElement, col?: string | null, keep?: boolean) => {
    let k;
    if (keep) {
      k = mk(c.width, c.height);
      k.getContext('2d')!.drawImage(c, 0, 0);
    }
    const t = c.getContext('2d')!;
    t.save();
    t.setTransform(1, 0, 0, 1, 0, 0);
    t.globalCompositeOperation = 'multiply';
    if (col) t.fillStyle = col;
    else {
      const ng = t.createRadialGradient(
        W * 0.15 * dpr,
        H * 0.05 * dpr,
        0,
        W * 0.4 * dpr,
        H * 0.4 * dpr,
        hyp(W, H) * 0.8 * dpr
      );
      ng.addColorStop(0, '#8b96c4');
      ng.addColorStop(0.55, '#4c5585');
      ng.addColorStop(1, '#272c4c');
      t.fillStyle = ng;
    }
    t.fillRect(0, 0, c.width, c.height);
    if (k) {
      t.globalCompositeOperation = 'destination-in';
      t.drawImage(k, 0, 0);
    }
    t.restore();
  };
  let treeToken = 0;
  function growTree() {
    const pal = SEASONS[season];
    treeC = buildTree(pal);
    const tmp = mk(treeC.width, treeC.height),
      tg = tmp.getContext('2d')!;
    tg.drawImage(treeC, 0, 0);
    tg.globalCompositeOperation = 'source-in';
    tg.fillStyle = 'rgb(30,36,20)';
    tg.fillRect(0, 0, tmp.width, tmp.height);
    const g = ground.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalAlpha = dark ? 0.35 : 0.2;
    g.drawImage(
      tmp,
      tree.x - tree.sz / 2 + tree.R * 0.05,
      tree.y - tree.sz / 2 + tree.R * 0.09,
      tree.sz,
      tree.sz
    );
    g.globalAlpha = 1;
    if (dark) tint(treeC, '#454d7c', true);
  }
  function scheduleTree() {
    const tk = ++treeToken;
    if (reduce) {
      growTree();
      return;
    }
    const run = () => {
      if (tk !== treeToken) return;
      growTree();
      if (!running) render();
    };
    if (window.requestIdleCallback) window.requestIdleCallback(run, { timeout: 400 });
    else setTimeout(run, 30);
  }
  function build() {
    const pal = SEASONS[season],
      r = rnd(11);
    GSH = pal.gsh;
    let g: Ctx;
    [sandBase, g] = layer();
    g.fillStyle = pal.sand;
    g.fillRect(0, 0, W, H);
    const lg = g.createRadialGradient(W * 0.2, H * 0.05, 0, W * 0.45, H * 0.45, hyp(W, H) * 0.85);
    lg.addColorStop(0, 'rgba(255,252,240,.4)');
    lg.addColorStop(1, pal.snow ? 'rgba(90,110,140,.14)' : 'rgba(120,96,60,.14)');
    g.fillStyle = lg;
    g.fillRect(0, 0, W, H);
    const gp = g.createPattern(grain(pal), 'repeat')!;
    gp.setTransform(new DOMMatrix([1 / dpr, 0, 0, 1 / dpr, 0, 0]));
    g.fillStyle = gp;
    g.fillRect(0, 0, W, H);
    [ground, g] = layer();
    g.drawImage(sandBase, 0, 0, W, H);
    sandPat = g.createPattern(sandBase, 'no-repeat')!;
    sandPat.setTransform(new DOMMatrix([1 / dpr, 0, 0, 1 / dpr, 0, 0]));
    const lines = new Path2D();
    for (let y = gap * 0.8; y < H; y += gap) {
      lines.moveTo(0, y);
      for (let x = 0; x <= W + 12; x += 12)
        lines.lineTo(x, y + Math.sin(x * 0.011 + y * 0.03) * 1.1);
    }
    g.lineWidth = 1.05;
    g.save();
    g.translate(0, -0.55);
    g.strokeStyle = GSH;
    g.stroke(lines);
    g.restore();
    g.save();
    g.translate(0, 0.65);
    g.strokeStyle = GHI;
    g.stroke(lines);
    g.restore();
    for (const s of segs) ringStroke(g, s.path, [sw * 0.8 + gap * 2, sw * 0.8 + gap]);
    ringDisk(g, pond.x, pond.y, pond.rx, pond.ry, [gap * 2.4, gap * 1.4]);
    for (const id of ['pay', 'gql', 'cons'] as const) {
      const n = nodes[id];
      ringDisk(g, n.x, n.y, n.r, n.r, [gap * 3.2, gap * 2.2, gap * 1.2]);
    }
    const K = nodes.kafka;
    g.fillStyle = sandPat;
    g.fill(K.shape(gap * 3.2 + 3));
    for (const k of [gap * 3.2, gap * 2.2, gap * 1.2]) {
      g.save();
      g.translate(-0.55, -0.55);
      g.fillStyle = GSH;
      g.fill(K.shape(k + 0.7));
      g.restore();
      g.save();
      g.translate(0.6, 0.6);
      g.fillStyle = GHI;
      g.fill(K.shape(k + 0.7));
      g.restore();
      g.fillStyle = sandPat;
      g.fill(K.shape(k - 0.75));
    }
    const water = (shape: (sc: number) => Path2D) => {
      g.fillStyle = pal.snow ? 'rgba(150,165,182,.35)' : 'rgba(110,92,62,.2)';
      g.fill(shape(1.9));
      g.fill(shape(1.45));
      g.fillStyle = pal.water[1];
      g.fill(shape(1));
      g.save();
      g.clip(shape(1));
      g.fillStyle = rgba(pal.water[2], 0.45);
      g.fill(shape(0.45));
      g.translate(1.5, 1.8);
      g.strokeStyle = 'rgba(0,18,24,.3)';
      g.lineWidth = 2.5;
      g.stroke(shape(1));
      g.translate(-3, -3.4);
      g.strokeStyle = rgba(pal.water[0], 0.55);
      g.lineWidth = 1.2;
      g.stroke(shape(1));
      g.restore();
    };
    for (const sg of segs) water((sc) => sg.poly(sc));
    water((sc) => {
      const q = K.shape((sc - 1) * sw * 0.9);
      q.moveTo(K.x + K.rIn(0), K.y);
      for (let i = 96; i >= 0; i--) {
        const a = (i / 96) * TAU,
          rr = K.rIn(a) - (sc - 1) * sw * 0.6;
        q.lineTo(K.x + Math.cos(a) * rr, K.y + Math.sin(a) * rr);
      }
      q.closePath();
      return q;
    });
    for (const sg of segs) pebbles(g, sg, r);
    for (const k of [0, 1])
      for (let a = 0; a < TAU; a += 0.04 + r() * 0.07) {
        if (r() < 0.3) continue;
        const o = k ? K.rOut(a) + 1.5 + r() * 2.5 : K.rIn(a) - 1 - r() * 2,
          q = r() < 0.1 ? 1.9 : 1;
        g.fillStyle = pick(r, ['#8b8780', '#a39f97', '#6f6b65', '#b7b2a9']);
        g.beginPath();
        g.ellipse(
          K.x + Math.cos(a) * o,
          K.y + Math.sin(a) * o,
          (1.3 + r() * 1.6) * q,
          (1 + r()) * q,
          r() * 3,
          0,
          TAU
        );
        g.fill();
      }
    // pond
    g.fillStyle = pal.snow ? '#c3cad2' : shade(pal.sand, -0.25);
    g.beginPath();
    g.ellipse(pond.x, pond.y, pond.rx + 6, pond.ry + 6, 0, 0, TAU);
    g.fill();
    g.save();
    g.translate(pond.x, pond.y);
    g.scale(1, pond.ry / pond.rx);
    const wg = g.createRadialGradient(-pond.rx * 0.15, -pond.rx * 0.2, 0, 0, 0, pond.rx * 1.05);
    wg.addColorStop(0, pal.water[2]);
    wg.addColorStop(0.65, pal.water[1]);
    wg.addColorStop(1, pal.water[0]);
    g.fillStyle = wg;
    g.beginPath();
    g.arc(0, 0, pond.rx, 0, TAU);
    g.fill();
    g.clip();
    g.strokeStyle = 'rgba(5,20,25,.3)';
    g.lineWidth = 9;
    g.beginPath();
    g.arc(4, 5, pond.rx + 2, 0, TAU);
    g.stroke();
    for (let i = 0; i < 7; i++) {
      g.fillStyle = 'rgba(10,30,30,.16)';
      g.beginPath();
      g.arc(
        (r() - 0.5) * pond.rx * 1.4,
        (r() - 0.5) * pond.rx * 1.4,
        pond.rx * (0.06 + r() * 0.1),
        0,
        TAU
      );
      g.fill();
    }
    g.restore();
    const mouthA = Math.atan2((segs[3].B.y - pond.y) / pond.ry, (segs[3].B.x - pond.x) / pond.rx);
    for (let a = 0; a < TAU; a += 0.09 + r() * 0.06) {
      if (Math.abs(wrapA(a - mouthA)) < 0.22) continue;
      const k = 1.02 + r() * 0.05,
        s = S * (0.01 + r() * 0.014) * (r() < 0.08 ? 2 : 1),
        x = pond.x + Math.cos(a) * pond.rx * k,
        y = pond.y + Math.sin(a) * pond.ry * k,
        sp = blobPts(x, y, s, s * 0.8, r, 7, 0.2);
      g.fillStyle = 'rgba(20,20,20,.25)';
      g.save();
      g.translate(1, 1.5);
      trace(g, sp);
      g.fill();
      g.restore();
      trace(g, sp);
      g.fillStyle = pick(r, ['#8e8b85', '#a29f98', '#7a7872', '#b5b0a6']);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,.25)';
      g.beginPath();
      g.arc(x - s * 0.3, y - s * 0.3, s * 0.35, 0, TAU);
      g.fill();
      if (pal.snow && r() < 0.7) {
        g.fillStyle = '#fbfcff';
        g.beginPath();
        g.ellipse(x - s * 0.1, y - s * 0.3, s * 0.7, s * 0.4, 0, 0, TAU);
        g.fill();
      }
    }
    let seed = 3;
    for (const id of ids)
      mossIsland(
        g,
        nodes[id].x,
        nodes[id].y,
        id === 'mongo' ? nodes[id].r * 1.05 : nodes[id].r,
        pal,
        seed++,
        id === 'kafka'
          ? K.inPts.map((q): Pt => [
              nodes.kafka.x + (q[0] - nodes.kafka.x) * 0.97,
              nodes.kafka.y + (q[1] - nodes.kafka.y) * 0.97,
            ])
          : undefined
      );
    for (const id of ids)
      for (const s of STONES[id]) {
        const n = nodes[id],
          sr = s[2] * n.r;
        g.fillStyle = 'rgba(25,30,10,.35)';
        g.beginPath();
        g.ellipse(
          n.x + s[0] * n.r + sr * 0.22,
          n.y + s[1] * n.r + sr * 0.3,
          sr * 1.02,
          sr * s[3] * 1.02,
          0,
          0,
          TAU
        );
        g.fill();
      }
    for (let i = 0; i < (pal.snow ? 0 : pal.particle === 'leaf' ? 6 : 34); i++) {
      const x = r() * W,
        y = r() * H;
      if (inPond(x, y, 1.1)) continue;
      g.save();
      g.translate(x, y);
      g.rotate(r() * TAU);
      g.fillStyle = rgba(pick(r, pal.pcol), pal.snow ? 0.9 : 0.85);
      const s = S * (0.008 + r() * 0.008);
      if (pal.particle === 'petal') petalPath(g, s * 1.3);
      else if (pal.particle === 'maple') maplePath(g, s * 1.3);
      else if (pal.particle === 'leaf') leafPath(g, s * 1.6);
      else {
        g.beginPath();
        g.ellipse(0, 0, s * 3, s * 1.8, 0, 0, TAU);
      }
      g.fill();
      g.restore();
    }
    treeC = null;
    tree.tips = [];
    const bw = clamp(S * 0.022, 6, 13);
    g.save();
    g.beginPath();
    g.rect(0, 0, W, H);
    g.rect(bw, bw, W - bw * 2, H - bw * 2);
    g.clip('evenodd');
    g.fillStyle = '#6f6a62';
    g.fillRect(0, 0, W, H);
    const tile = mk(64 * dpr, 64 * dpr),
      tl = tile.getContext('2d')!;
    tl.scale(dpr, dpr);
    for (let i = 0; i < 260; i++) {
      const x = r() * 64,
        y = r() * 64,
        c = pick(r, ['#8d8880', '#a7a198', '#5d5952', '#bbb4a8', '#7a756d']),
        rx = 1.4 + r() * 2,
        ry = 1.1 + r() * 1.5,
        ro = r() * 3;
      for (const ox of [-64, 0, 64])
        for (const oy of [-64, 0, 64]) {
          tl.fillStyle = c;
          tl.beginPath();
          tl.ellipse(x + ox, y + oy, rx, ry, ro, 0, TAU);
          tl.fill();
        }
    }
    const pp = g.createPattern(tile, 'repeat')!;
    pp.setTransform(new DOMMatrix([1 / dpr, 0, 0, 1 / dpr, 0, 0]));
    g.fillStyle = pp;
    g.fillRect(0, 0, W, H);
    g.restore();
    g.strokeStyle = 'rgba(40,32,22,.45)';
    g.lineWidth = 1.5;
    g.strokeRect(bw, bw, W - bw * 2, H - bw * 2);
    if (pal.snow) {
      g.strokeStyle = 'rgba(255,255,255,.7)';
      g.lineWidth = bw * 0.5;
      g.strokeRect(bw * 0.4, bw * 0.4, W - bw * 0.8, H - bw * 0.8);
    }
    const vg = g.createRadialGradient(W / 2, H / 2, S * 0.4, W / 2, H / 2, hyp(W, H) * 0.62);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(40,28,10,.18)');
    g.fillStyle = vg;
    g.fillRect(0, 0, W, H);

    [over, g] = layer();
    g.save();
    g.beginPath();
    g.ellipse(pond.x, pond.y, pond.rx, pond.ry, 0, 0, TAU);
    g.clip();
    if (pal.pads)
      for (let i = 0; i < 6; i++) {
        const a = r() * TAU,
          d = 0.45 + r() * 0.4,
          x = pond.x + Math.cos(a) * pond.rx * d,
          y = pond.y + Math.sin(a) * pond.ry * d;
        if (hyp(x - nodes.mongo.x, y - nodes.mongo.y) < nodes.mongo.r * 1.6) continue;
        const s = S * (0.018 + r() * 0.014),
          rot = r() * TAU;
        g.fillStyle = 'rgba(10,30,20,.25)';
        g.beginPath();
        g.arc(x + 1.5, y + 2, s, rot + 0.3, rot + TAU - 0.3);
        g.lineTo(x + 1.5, y + 2);
        g.fill();
        g.fillStyle = r() < 0.5 ? '#4f8f3a' : '#5d9e43';
        g.beginPath();
        g.arc(x, y, s, rot + 0.3, rot + TAU - 0.3);
        g.lineTo(x, y);
        g.fill();
        g.strokeStyle = 'rgba(200,240,170,.35)';
        g.lineWidth = 0.7;
        g.stroke();
        if (pal.pads === 2 && i % 2 === 0) {
          for (let k = 0; k < 6; k++) {
            g.save();
            g.translate(x + s * 0.2, y - s * 0.1);
            g.rotate((k / 6) * TAU);
            g.fillStyle = k % 2 ? '#f6b9cf' : '#fbe1ea';
            g.beginPath();
            g.ellipse(s * 0.32, 0, s * 0.34, s * 0.16, 0, 0, TAU);
            g.fill();
            g.restore();
          }
          g.fillStyle = '#f2c94c';
          g.beginPath();
          g.arc(x + s * 0.2, y - s * 0.1, s * 0.13, 0, TAU);
          g.fill();
        }
      }
    if (pal.snow) {
      g.fillStyle = 'rgba(235,243,250,.55)';
      g.strokeStyle = 'rgba(255,255,255,.7)';
      for (let i = 0; i < 5; i++) {
        const a = r() * TAU,
          p = blobPts(
            pond.x + Math.cos(a) * pond.rx * 0.95,
            pond.y + Math.sin(a) * pond.ry * 0.95,
            pond.rx * (0.18 + r() * 0.15),
            pond.ry * (0.18 + r() * 0.15),
            r,
            9,
            0.25
          );
        trace(g, p);
        g.fill();
        g.lineWidth = 0.8;
        g.stroke();
      }
    }
    g.restore();
    drawBridge(g, pal);
    for (const b of bushes) drawBush(g, b, pal, r);
    drawStoneLantern(g, pal);

    sprites = {} as typeof sprites;
    let ss = 20;
    for (const id of ids)
      sprites[id] = STONES[id].map((s) => ({
        s,
        sp: stoneSprite(s[2] * nodes[id].r, s[3], s[4], ss++, pal.snow),
      }));

    RHI = dark ? 'rgba(200,210,255,.22)' : GHI;
    if (dark) {
      tint(ground);
      tint(sandBase);
      tint(over, null, true);
      for (const id of ids)
        for (const o of sprites[id]) {
          tint(o.sp.c, '#5d679c', true);
          tint(o.sp.b, '#5d679c', true);
        }
      sandPat = ground.getContext('2d')!.createPattern(sandBase, 'no-repeat')!;
      sandPat.setTransform(new DOMMatrix([1 / dpr, 0, 0, 1 / dpr, 0, 0]));
    }
    let mg;
    [mask, mg] = layer();
    mg.fillStyle = '#000';
    mg.strokeStyle = '#000';
    mg.lineCap = 'round';
    for (const id of ids) {
      const n = nodes[id];
      if (id === 'kafka') {
        mg.fill(n.shape(3));
        continue;
      }
      mg.beginPath();
      mg.arc(n.x, n.y, n.r + 2, 0, TAU);
      mg.fill();
    }
    for (const sg of segs) mg.fill(sg.poly(1.6));
    mg.beginPath();
    mg.ellipse(pond.x, pond.y, pond.rx + 7, pond.ry + 7, 0, 0, TAU);
    mg.fill();
    mg.lineWidth = bw * 2 + 2;
    mg.strokeRect(0, 0, W, H);
    for (const b of bushes) {
      mg.beginPath();
      mg.arc(b.x, b.y, b.r * 1.05, 0, TAU);
      mg.fill();
    }
    mg.fillRect(lant.x - lant.h * 0.25, lant.y - lant.h * 0.14, lant.h * 0.5, lant.h * 0.16);

    scheduleTree();
    if (!rake || rake.width !== Math.ceil(W * dpr) || rake.height !== Math.ceil(H * dpr)) {
      [rake, rakeG] = layer();
      [active, activeG] = layer();
    } else {
      rakeG.setTransform(1, 0, 0, 1, 0, 0);
      rakeG.clearRect(0, 0, rake.width, rake.height);
      rakeG.setTransform(dpr, 0, 0, dpr, 0, 0);
      replayRake();
    }
  }
  function replayRake() {
    const keep = strokePts.slice();
    for (const k of strokes) {
      const age = st.t - k.t;
      if (age > 40) continue;
      strokePts.length = 0;
      strokePts.push(...k.pts);
      renderActive();
      rakeG.setTransform(1, 0, 0, 1, 0, 0);
      rakeG.globalAlpha = Math.pow(1 - 0.022, age * 2);
      rakeG.drawImage(active, 0, 0);
      rakeG.globalAlpha = 1;
      rakeG.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    strokePts.length = 0;
    strokePts.push(...keep);
    renderActive();
  }

  /* ---------------- koi ---------------- */
  function randInPond(k: number): XY {
    for (let i = 0; i < 20; i++) {
      const a = R() * TAU,
        d = Math.sqrt(R()) * k,
        x = pond.x + Math.cos(a) * pond.rx * d,
        y = pond.y + Math.sin(a) * pond.ry * d;
      if (hyp(x - nodes.mongo.x, y - nodes.mongo.y) > nodes.mongo.r * 1.8) return { x, y };
    }
    return { x: pond.x - pond.rx * 0.4, y: pond.y };
  }
  const KOI: Record<KoiKind, [string, [number, number, number, string][]]> = {
    kohaku: [
      '#f7f2ea',
      [
        [0.12, 0, 0.9, '#d8402a'],
        [0.42, 0.3, 1.1, '#d8402a'],
        [0.68, -0.4, 0.8, '#d8402a'],
      ],
    ],
    ogon: [
      '#eaa938',
      [
        [0.3, 0, 1.2, '#f6cf72'],
        [0.6, 0.1, 0.9, '#f6cf72'],
      ],
    ],
    showa: [
      '#f3efe8',
      [
        [0.18, 0.2, 0.9, '#d4452c'],
        [0.45, -0.3, 0.8, '#26262a'],
        [0.62, 0.35, 0.9, '#d4452c'],
        [0.78, 0, 0.6, '#26262a'],
      ],
    ],
    tancho: ['#f8f5ef', [[0.08, 0, 0.75, '#e0352a']]],
  };
  function initKoi() {
    const len = clamp(S * 0.08, 16, 42),
      N = 9,
      kinds: KoiKind[] = ['kohaku', 'ogon', 'showa', 'tancho'];
    st.koi = kinds.slice(0, portrait ? 3 : 4).map((kind) => {
      const c = randInPond(0.55),
        a = R() * TAU,
        p: XY[] = [];
      for (let i = 0; i < N; i++)
        p.push({ x: c.x - (Math.cos(a) * i * len) / N, y: c.y - (Math.sin(a) * i * len) / N });
      return { p, len, N, ang: a, kind, tx: c.x, ty: c.y, tt: 0, ph: R() * TAU, wp: 0, feed: 0 };
    });
  }
  function stepKoi(f: Koi, dt: number) {
    const h = f.p[0],
      M = nodes.mongo;
    f.tt -= dt;
    if (hyp(f.tx - h.x, f.ty - h.y) < f.len * 0.4 || f.tt < 0) {
      if (f.feed) {
        addRip(f.tx, f.ty, 1, S * 0.05);
        f.feed = 0;
      }
      const q = randInPond(0.7);
      f.tx = q.x;
      f.ty = q.y;
      f.tt = 4 + R() * 5;
    }
    let des = Math.atan2(f.ty - h.y, f.tx - h.x);
    if (hyp(h.x - M.x, h.y - M.y) < M.r * 1.7) des = Math.atan2(h.y - M.y, h.x - M.x) + 0.6;
    const ex = (h.x - pond.x) / pond.rx,
      ey = (h.y - pond.y) / pond.ry;
    if (ex * ex + ey * ey > 0.7) des = Math.atan2(pond.y - h.y, pond.x - h.x);
    const turn = (f.feed ? 3.4 : 1.5) * dt;
    f.ang += clamp(wrapA(des - f.ang), -turn, turn);
    const sp = f.len * (f.feed ? 2 : 0.5) * (1 + 0.25 * Math.sin(st.t * 0.9 + f.ph));
    h.x += Math.cos(f.ang) * sp * dt;
    h.y += Math.sin(f.ang) * sp * dt;
    f.wp += dt * (3 + (sp / f.len) * 6);
    const seg = f.len / f.N;
    for (let i = 1; i < f.N; i++) {
      const a = f.p[i - 1],
        b = f.p[i],
        dx = b.x - a.x,
        dy = b.y - a.y,
        l = hyp(dx, dy) || 1;
      b.x = a.x + (dx / l) * seg;
      b.y = a.y + (dy / l) * seg;
    }
  }
  function drawKoi(g: Ctx, f: Koi) {
    const P = f.p,
      N = f.N,
      L = f.len,
      pts: (XY & { nx: number; ny: number; fx: number; fy: number })[] = [];
    for (let i = 0; i < N; i++) {
      const a = P[Math.max(0, i - 1)],
        b = P[Math.max(1, i)],
        dx = a.x - b.x,
        dy = a.y - b.y,
        l = hyp(dx, dy) || 1,
        nx = -dy / l,
        ny = dx / l,
        w = Math.sin(f.wp - i * 0.8) * L * 0.04 * (i / N);
      pts.push({ x: P[i].x + nx * w, y: P[i].y + ny * w, nx, ny, fx: dx / l, fy: dy / l });
    }
    const wd = (i: number) =>
      L * 0.125 * Math.pow(Math.sin(PI * Math.min(0.98, (i + 0.9) / (N + 0.2))), 0.75);
    const body = new Path2D();
    pts.forEach((p, i) => {
      const w = wd(i);
      if (i) body.lineTo(p.x + p.nx * w, p.y + p.ny * w);
      else body.moveTo(p.x + p.nx * w, p.y + p.ny * w);
    });
    for (let i = N - 1; i >= 0; i--) {
      const p = pts[i],
        w = wd(i);
      body.lineTo(p.x - p.nx * w, p.y - p.ny * w);
    }
    body.closePath();
    const t = pts[N - 1],
      tl = L * 0.24,
      tw = Math.sin(f.wp - N * 0.8) * 0.5,
      tx = t.x - t.fx * tl,
      ty = t.y - t.fy * tl;
    const [b0, patches] = KOI[f.kind],
      base = dark ? night(b0) : b0;
    g.save();
    g.translate(3, 5);
    g.fillStyle = 'rgba(0,15,20,.22)';
    g.fill(body);
    g.restore();
    g.fillStyle = base;
    g.globalAlpha *= 0.55;
    const fin = pts[2];
    for (const s of [-1, 1]) {
      g.beginPath();
      g.ellipse(
        fin.x + fin.nx * s * L * 0.16 - fin.fx * L * 0.04,
        fin.y + fin.ny * s * L * 0.16 - fin.fy * L * 0.04,
        L * 0.1,
        L * 0.045,
        Math.atan2(fin.fy, fin.fx) + s * 0.8,
        0,
        TAU
      );
      g.fill();
    }
    g.beginPath();
    g.moveTo(t.x, t.y);
    g.quadraticCurveTo(
      tx + t.nx * L * (0.14 + tw * 0.1),
      ty + t.ny * L * (0.14 + tw * 0.1),
      tx - t.fx * 2 + t.nx * L * 0.12,
      ty - t.fy * 2 + t.ny * L * 0.12
    );
    g.lineTo(tx + t.fx * L * 0.05, ty + t.fy * L * 0.05);
    g.lineTo(tx - t.fx * 2 - t.nx * L * 0.12, ty - t.fy * 2 - t.ny * L * 0.12);
    g.quadraticCurveTo(
      tx - t.nx * L * (0.14 - tw * 0.1),
      ty - t.ny * L * (0.14 - tw * 0.1),
      t.x,
      t.y
    );
    g.fill();
    g.globalAlpha /= 0.55;
    g.fillStyle = base;
    g.fill(body);
    g.save();
    g.clip(body);
    for (const q of patches) {
      const i = Math.min(N - 1, Math.round(q[0] * N)),
        p = pts[i],
        w = wd(i);
      g.fillStyle = dark ? night(q[3]) : q[3];
      g.beginPath();
      g.ellipse(
        p.x + p.nx * q[1] * w,
        p.y + p.ny * q[1] * w,
        L * 0.1 * q[2],
        L * 0.08 * q[2],
        Math.atan2(p.fy, p.fx),
        0,
        TAU
      );
      g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,.28)';
    g.beginPath();
    g.ellipse(
      pts[1].x - 1,
      pts[1].y - 1,
      L * 0.08,
      L * 0.04,
      Math.atan2(pts[1].fy, pts[1].fx),
      0,
      TAU
    );
    g.fill();
    g.restore();
  }

  /* ---------------- events (floating lanterns) ---------------- */
  function spawnLantern(n: GNode) {
    if (st.lan.length > 80) return;
    const si = n.id === 'pay' ? 0 : 1;
    st.lan.push({
      s: 'flow',
      seg: si,
      d: 0,
      x: segs[si].A.x,
      y: segs[si].A.y,
      ph: R() * TAU,
      t: 0,
      ang: 0,
      dur: 1,
      fx: 0,
      fy: 0,
      tx: 0,
      ty: 0,
      held: 0,
      rel: false,
    });
  }
  const blocked = (sg: Seg) => (sg.to === 'pond' ? nodes.mongo.down > 0 : nodes[sg.to].down > 0);
  function stepLanterns(dt: number) {
    const sp = clamp(S * 0.11, 26, 60) * (1 + 0.7 * st.load),
      K = nodes.kafka,
      C = nodes.cons,
      gapL = clamp(S * 0.028, 7, 14);
    st.emitT -= dt;
    if (st.emitT <= 0) {
      const n = st.emitI++ % 2 ? nodes.gql : nodes.pay;
      if (!n.down) spawnLantern(n);
      st.emitT = 1.15 / (1 + st.load * 0.8);
    }
    for (const id of ['pay', 'gql'] as const) {
      const n = nodes[id];
      if (n.pending > 0 && !n.down) {
        n.pt = (n.pt || 0) - dt;
        if (n.pt <= 0) {
          spawnLantern(n);
          n.pending--;
          n.pt = 0.16;
        }
      }
    }
    for (let si = 0; si < 4; si++) {
      const sg = segs[si],
        bl = blocked(sg),
        list = st.lan.filter((l) => l.s === 'flow' && l.seg === si).sort((a, b) => b.d - a.d);
      let cap = bl ? sg.len : Infinity;
      for (const l of list) {
        l.d = Math.min(l.d + sp * dt, cap);
        if (bl) cap = l.d - gapL;
        const p = posAt(sg, l.d);
        l.x = p.x;
        l.y = p.y;
        if (!bl && l.d >= sg.len) {
          if (sg.to === 'kafka') {
            l.s = 'orbit';
            l.ang = Math.atan2(l.y - K.y, l.x - K.x);
            l.held = 0;
            l.rel = false;
            addRip(l.x, l.y, 1, sw * 1.2);
          } else if (sg.to === 'cons') {
            l.s = 'proc';
            l.t = 0;
            l.fx = l.x;
            l.fy = l.y;
          } else {
            l.s = 'pond';
            l.t = 0;
            l.fx = l.x;
            l.fy = l.y;
            const a = R() * TAU,
              M = nodes.mongo;
            l.tx = M.x + Math.cos(a) * M.r * 1.25;
            l.ty = M.y + Math.sin(a) * M.r * 1.1;
            l.dur = hyp(l.tx - l.x, l.ty - l.y) / (sp * 0.4);
            addRip(l.x, l.y, 1, sw * 1.5);
          }
        }
      }
    }
    const orb = st.lan.filter((l) => l.s === 'orbit');
    if (!K.down) {
      const w = (sp / (K.r + sw * 1.4)) * 0.85,
        minA = gapL / (K.r + sw * 1.4);
      orb.sort((a, b) => a.ang - b.ang);
      for (let i = 0; i < orb.length; i++) {
        const l = orb[i],
          nx = orb[(i + 1) % orb.length];
        let d = wrapA(nx.ang - l.ang);
        if (d < 0) d += TAU;
        l.ang += (orb.length > 1 && d < minA ? w * 0.35 : w) * dt;
        l.held += dt;
      }
      if (!C.down) {
        st.relT -= dt;
        if (st.relT <= 0) {
          let o: Lantern | null = null;
          for (const l of orb) if (!l.rel && l.held > 0.6 && (!o || l.held > o.held)) o = l;
          if (o) o.rel = true;
          st.relT = 0.62 / (1 + st.load * 1.6);
        }
      }
    }
    for (const l of orb) {
      const rm = K.rMid(l.ang);
      l.x = K.x + Math.cos(l.ang) * rm;
      l.y = K.y + Math.sin(l.ang) * rm;
      if (l.rel && !C.down && Math.abs(wrapA(l.ang - K.exitA)) < 0.12) {
        l.s = 'flow';
        l.seg = 2;
        l.d = 0;
      }
    }
    for (let i = st.lan.length - 1; i >= 0; i--) {
      const l = st.lan[i];
      if (l.s === 'proc') {
        l.t += dt / 0.4;
        const e = l.t < 0.5 ? 2 * l.t * l.t : 1 - Math.pow(-2 * l.t + 2, 2) / 2;
        l.x = lerp(l.fx, segs[3].A.x, e);
        l.y = lerp(l.fy, segs[3].A.y, e);
        if (l.t >= 1) {
          l.s = 'flow';
          l.seg = 3;
          l.d = 0;
          C.glint = 1;
        }
      } else if (l.s === 'pond') {
        l.t += dt / l.dur;
        const u = Math.min(1, l.t),
          cx = (l.fx + l.tx) / 2 + (pond.y - l.ty) * 0.15,
          cy = (l.fy + l.ty) / 2;
        l.x = (1 - u) * (1 - u) * l.fx + 2 * (1 - u) * u * cx + u * u * l.tx;
        l.y = (1 - u) * (1 - u) * l.fy + 2 * (1 - u) * u * cy + u * u * l.ty;
        if (l.t >= 1) {
          st.lan.splice(i, 1);
          st.stored++;
          nodes.mongo.glint = 1;
          addRip(l.x, l.y, 1, sw * 1.4);
          for (let k = 0; k < 3; k++)
            st.sparks.push({
              x: l.x,
              y: l.y,
              vx: (R() - 0.5) * 30,
              vy: -20 - R() * 30,
              a: 0,
              life: 0.9,
              c: '#ffd27a',
            });
        }
      }
    }
  }
  function drawLantern(g: Ctx, l: Lantern) {
    const sz = clamp(S * 0.018, 4.5, 8),
      bob = Math.sin(st.t * 2.2 + l.ph) * 0.12,
      x = l.x,
      y = l.y + Math.sin(st.t * 1.7 + l.ph) * 0.6,
      c = Math.cos(bob),
      s = Math.sin(bob);
    g.setTransform(dpr * c, dpr * s, -dpr * s, dpr * c, dpr * x, dpr * y);
    g.globalAlpha = l.s === 'pond' ? 1 - Math.max(0, (l.t - 0.65) / 0.35) : 1;
    g.fillStyle = 'rgba(5,25,35,.3)';
    g.fillRect(-sz / 2 + 1.5, -sz / 2 + 2, sz, sz);
    g.fillStyle = '#fbf0d6';
    g.fillRect(-sz / 2, -sz / 2, sz, sz);
    g.fillStyle = '#c53a2b';
    g.fillRect(-sz / 2, -sz / 2, sz, sz * 0.28);
    g.fillRect(-sz / 2, sz * 0.32, sz, sz * 0.18);
    g.fillStyle = dark ? '#fff1b8' : '#ffc95e';
    g.beginPath();
    g.arc(0, sz * 0.05, sz * 0.2, 0, TAU);
    g.fill();
    g.globalAlpha = 1;
  }

  /* ---------------- particles ---------------- */
  function spawnPart(burst?: boolean) {
    const pal = SEASONS[season],
      kind = pal.particle,
      cap = portrait ? 90 : 150;
    if (st.parts.length >= cap) return;
    let x, y, z;
    if (kind === 'snow') {
      x = R() * W * 1.1 - W * 0.05;
      y = R() * H * 1.1;
      z = 120 + R() * 120;
    } else if (!tree.tips.length) {
      x = W * (0.6 + R() * 0.4);
      y = R() * H * 0.35;
      z = 50 + R() * 70;
    } else {
      const t = tree.tips[(R() * tree.tips.length) | 0];
      x = tree.x + t[0];
      y = tree.y + t[1];
      z = 50 + R() * 70;
      if (x > W + 10 || y < -40) {
        x = W * (0.55 + R() * 0.45);
        y = R() * H * 0.4;
      }
    }
    const sz = kind === 'snow' ? 1.6 + R() * 2 : S * (0.011 + R() * 0.008) + 3;
    st.parts.push({
      k: kind,
      x,
      y,
      z,
      vx: (burst ? (R() - 0.5) * 60 : 0) - 8,
      vy: burst ? (R() - 0.2) * 40 : 6,
      rot: R() * TAU,
      vr: (R() - 0.5) * 4,
      fl: R() * TAU,
      sz,
      col: pick(R, pal.pcol),
      life: 0,
      land: false,
      wet: false,
      ph: 0,
    });
  }
  function stepParts(dt: number) {
    const pal = SEASONS[season],
      area = (W * H) / (900 * 520),
      wind = Math.sin(st.t * 0.23) * 14 - 6;
    st.fly += pal.rate * area * (1 + st.shake * 8) * dt;
    while (st.fly >= 1) {
      st.fly--;
      spawnPart(false);
    }
    if (pal.particle === 'leaf' && dark) {
      let n = 0;
      for (const p of st.parts) if (p.k === 'fly') n++;
      if (n < (portrait ? 10 : 16)) {
        const b =
          R() < 0.5 ? pick(R, bushes) : nodes[pick(R, ['pay', 'gql', 'kafka', 'cons'] as const)];
        st.parts.push({
          k: 'fly',
          x: b.x + (R() - 0.5) * b.r * 2,
          y: b.y + (R() - 0.5) * b.r * 2,
          z: 10 + R() * 20,
          vx: 0,
          vy: 0,
          ph: R() * TAU,
          life: 0,
          land: false,
          rot: 0,
          vr: 0,
          fl: 0,
          sz: 2,
          col: '#dfff7a',
          wet: false,
        });
      }
    }
    const pv = hyp(ptr.vx, ptr.vy),
      live = st.t - ptr.t < 0.12 && pv > 40,
      rr = clamp(S * 0.12, 40, 90);
    for (let i = st.parts.length - 1; i >= 0; i--) {
      const p = st.parts[i];
      p.life += dt;
      if (p.k === 'fly') {
        p.ph += dt;
        p.vx += Math.cos(p.ph * 1.3 + i) * 20 * dt;
        p.vy += Math.sin(p.ph * 0.9 + i * 2) * 20 * dt;
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.life > 14 || !dark || season !== 'summer') st.parts.splice(i, 1);
        continue;
      }
      if (live && !p.wet) {
        const sx = p.x,
          sy = p.y - p.z * 0.5,
          d = hyp(sx - ptr.x, sy - ptr.y);
        if (d < rr) {
          const f = 1 - d / rr;
          p.vx += (ptr.vx * 0.5 + ((sx - ptr.x) / (d + 1)) * 120) * f * dt * 6;
          p.vy += (ptr.vy * 0.5 + ((sy - ptr.y) / (d + 1)) * 120) * f * dt * 6;
          if (p.land) {
            p.land = false;
            p.z = 4 + f * 18;
          }
          p.vr += (R() - 0.5) * 20 * f;
        }
      }
      if (!p.land) {
        const fall = p.k === 'snow' ? 34 : p.k === 'maple' ? 30 : 22;
        p.vx += (wind - p.vx) * 0.8 * dt;
        p.vy += (5 - p.vy) * 0.8 * dt;
        p.x += (p.vx + Math.sin(p.life * 2 + p.rot) * (p.k === 'snow' ? 6 : 14)) * dt;
        p.y += p.vy * dt;
        p.z -= fall * dt;
        p.rot += p.vr * dt;
        p.fl += dt * (p.k === 'snow' ? 0 : 5);
        if (p.z <= 0) {
          p.z = 0;
          p.land = true;
          p.life = 0;
          p.wet = inPond(p.x, p.y, 0.97);
          if (p.wet && p.k !== 'snow') addRip(p.x, p.y, 1, S * 0.025);
        }
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= p.wet ? 0.995 : 0.9;
        p.vy *= p.wet ? 0.995 : 0.9;
        if (p.wet) {
          p.x += Math.sin(st.t * 0.4 + p.rot) * 3 * dt;
          p.rot += 0.1 * dt;
          if (!inPond(p.x, p.y, 0.95)) {
            p.vx *= -0.5;
            p.vy *= -0.5;
            p.x += (pond.x - p.x) * 0.02;
            p.y += (pond.y - p.y) * 0.02;
          }
        }
        const max = p.k === 'snow' ? 3 : p.wet ? 14 : 10;
        if (p.life > max) {
          st.parts.splice(i, 1);
          continue;
        }
      }
      if (p.x < -30 || p.x > W + 30 || p.y < -60 || p.y > H + 30) st.parts.splice(i, 1);
    }
  }
  function drawPart(g: Ctx, p: Part) {
    if (p.k === 'fly') return;
    const sx = p.x - p.z * 0.12,
      sy = p.y - p.z * 0.5,
      max = p.k === 'snow' ? 3 : p.wet ? 14 : 10,
      a = p.land ? clamp((max - p.life) / 2, 0, 1) : clamp(p.life * 3, 0, 1);
    if (!p.land && p.z > 3) {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.globalAlpha = a * (p.k === 'snow' ? 0.32 : clamp(0.35 - p.z / 400, 0.06, 0.3));
      g.fillStyle = p.k === 'snow' ? '#3d4f6a' : '#2a2014';
      g.beginPath();
      g.ellipse(p.x + p.z * 0.25, p.y + p.z * 0.06, p.sz * 0.45, p.sz * 0.3, 0, 0, TAU);
      g.fill();
    }
    g.globalAlpha = a * (p.k === 'snow' ? 0.95 : 1);
    if (p.k === 'snow') {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = dark ? '#c4cdf0' : '#fff';
      g.strokeStyle = dark ? 'rgba(30,40,70,.5)' : 'rgba(60,80,115,.6)';
      g.lineWidth = 0.8;
      g.beginPath();
      g.arc(sx, sy, p.sz * (p.land ? 0.8 : 1), 0, TAU);
      g.fill();
      g.stroke();
      return;
    }
    const f = p.land ? 1 : 0.3 + 0.7 * Math.abs(Math.sin(p.fl)),
      c = Math.cos(p.rot),
      s = Math.sin(p.rot);
    g.setTransform(dpr * c, dpr * s, -dpr * s * f, dpr * c * f, dpr * sx, dpr * sy);
    g.fillStyle = dark ? night(p.col) : p.col;
    if (p.k === 'petal') petalPath(g, p.sz);
    else if (p.k === 'maple') maplePath(g, p.sz * 0.62);
    else leafPath(g, p.sz);
    g.fill();
    if (p.k !== 'petal') {
      g.strokeStyle = 'rgba(60,20,10,.35)';
      g.lineWidth = 0.6;
      g.beginPath();
      g.moveTo(0, -p.sz * 0.3);
      g.lineTo(0, p.sz * 0.4);
      g.stroke();
    }
  }

  function addRip(x: number, y: number, water: number, max?: number, life?: number) {
    if (st.rip.length > 40) st.rip.shift();
    st.rip.push({
      x,
      y,
      w: water,
      max: max || S * 0.12,
      a: 0,
      life: life || (water ? 1.8 : 1.6),
      r0: 0,
    });
  }

  /* ---------------- interaction ---------------- */
  const say = (t: string) => onStatus(t);
  function haptic(ms: number | number[]) {
    try {
      if (navigator.vibrate) navigator.vibrate(ms);
    } catch {
      /* unsupported */
    }
  }
  function tapNode(n: GNode) {
    n.wob = 0;
    haptic(8);
    st.load = Math.min(2.2, st.load + 0.45);
    const rr = n.id === 'kafka' ? n.outer : n.r;
    for (let k = 0; k < 2; k++)
      st.rip.push({
        x: n.x,
        y: n.y,
        w: n.id === 'mongo' ? 1 : 0,
        r0: rr,
        max: S * 0.13,
        a: -k * 0.25,
        life: 1.6,
      });
    if (n.down) say(n.name + ' is recovering. Give it a moment.');
    else if (n.prod) {
      n.pending += 5;
      say(n.name + ': +5 events. Kafka soaks up the burst.');
    } else {
      nodes.pay.pending += 3;
      nodes.gql.pending += 3;
      say('Traffic spike toward ' + n.name + '. Watch the buffer absorb it.');
    }
    if (reduce) {
      n.glint = 1;
      st.rip.length = 0;
      render();
    }
  }
  let stillT: ReturnType<typeof setTimeout> | undefined;
  const FAIL: Record<NodeId, string[]> = {
    pay: ['Payments paused. GraphQL keeps producing.', 'Payments back online.'],
    gql: ['GraphQL gateway paused. Payments keeps producing.', 'GraphQL gateway back online.'],
    kafka: [
      'Kafka broker down. Producers hold their events upstream…',
      'Kafka back. Producers flush their queue, nothing lost.',
    ],
    cons: [
      'Consumers down. Kafka buffers events in its ring…',
      'Consumers back. Draining the buffer, nothing lost.',
    ],
    mongo: [
      'MongoDB unavailable. Consumers hold writes and retry…',
      'MongoDB back. Writes catch up.',
    ],
  };
  function failNode(n: GNode) {
    if (n.down) return;
    n.down = 3.8;
    n.wob = 0;
    haptic([12, 40, 12]);
    say(FAIL[n.id][0]);
    if (reduce) {
      render();
      clearTimeout(stillT);
      stillT = setTimeout(() => {
        if (n.down) {
          n.down = 0;
          recover(n);
          st.sparks.length = 0;
          st.rip.length = 0;
          render();
        }
      }, 3800);
    }
  }
  function recover(n: GNode) {
    const rr = n.id === 'kafka' ? n.outer : n.r;
    st.rip.push({
      x: n.x,
      y: n.y,
      w: n.id === 'mongo' ? 1 : 0,
      r0: rr,
      max: S * 0.2,
      a: 0,
      life: 1.8,
    });
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * TAU;
      st.sparks.push({
        x: n.x + Math.cos(a) * rr,
        y: n.y + Math.sin(a) * rr,
        vx: Math.cos(a) * 30,
        vy: Math.sin(a) * 30 - 15,
        a: 0,
        life: 1.1,
        c: '#ffe08a',
      });
    }
    say(FAIL[n.id][1]);
  }
  function feed(x: number, y: number) {
    addRip(x, y, 1, S * 0.1);
    addRip(x, y, 1, S * 0.06, 1.4);
    haptic(6);
    const ks = st.koi
      .slice()
      .sort((a, b) => hyp(a.p[0].x - x, a.p[0].y - y) - hyp(b.p[0].x - x, b.p[0].y - y))
      .slice(0, 2);
    for (const f of ks) {
      f.tx = x + (R() - 0.5) * 6;
      f.ty = y + (R() - 0.5) * 6;
      f.feed = 1;
      f.tt = 6;
    }
    say('The koi come to see what you dropped.');
    if (reduce) render();
  }
  function shakeTree() {
    st.shake = 1;
    haptic(10);
    for (let i = 0; i < 18; i++) spawnPart(true);
    if (season === 'winter' && tree.tips.length)
      for (let i = 0; i < 25; i++) {
        const t = pick(R, tree.tips);
        st.parts.push({
          k: 'snow',
          x: tree.x + t[0],
          y: tree.y + t[1],
          z: 40 + R() * 40,
          vx: (R() - 0.5) * 30,
          vy: 10,
          rot: 0,
          vr: 0,
          fl: 0,
          sz: 1.2 + R() * 1.8,
          col: '#fff',
          life: 0,
          land: false,
          wet: false,
          ph: 0,
        });
      }
    say(
      {
        winter: 'Snow slides off the bare branches.',
        autumn: 'A flurry of momiji leaves.',
        spring: 'Sakura petals drift down.',
        summer: 'Leaves rustle in the summer air.',
      }[season]
    );
  }
  function hitNode(x: number, y: number): GNode | null {
    for (const id of ids) {
      const n = nodes[id],
        rr = (id === 'kafka' ? n.outer : n.r) + 6;
      if (hyp(x - n.x, y - n.y) < Math.max(rr, 24)) return n;
    }
    return null;
  }
  const hitTree = (x: number, y: number) => hyp(x - tree.x, y - tree.y) < tree.R * 0.85;
  const hitLant = (x: number, y: number) =>
    Math.abs(x - lant.x) < lant.h * 0.3 && y < lant.y + 4 && y > lant.y - lant.h * 1.05;

  function addRakePt(x: number, y: number) {
    const l = strokePts[strokePts.length - 1];
    if (l && hyp(x - l.x, y - l.y) < 3) return;
    strokePts.push({ x, y });
    if (strokePts.length > 240) {
      commitRake();
      strokePts.push(l, { x, y });
    }
    renderActive();
  }
  function renderActive() {
    const g = activeG,
      P = strokePts;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, active.width, active.height);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (P.length < 2) return;
    const sm = P.map((p, i) => {
      const a = P[Math.max(0, i - 1)],
        b = P[Math.min(P.length - 1, i + 1)];
      return { x: (a.x + p.x * 2 + b.x) / 4, y: (a.y + p.y * 2 + b.y) / 4 };
    });
    const path = (o: number) => {
      const q = new Path2D();
      sm.forEach((p, i) => {
        const a = sm[Math.max(0, i - 1)],
          b = sm[Math.min(sm.length - 1, i + 1)],
          dx = b.x - a.x,
          dy = b.y - a.y,
          l = hyp(dx, dy) || 1,
          x = p.x - (dy / l) * o,
          y = p.y + (dx / l) * o;
        if (i) q.lineTo(x, y);
        else q.moveTo(x, y);
      });
      return q;
    };
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.lineWidth = rakeW + gap * 1.2;
    g.strokeStyle = sandPat;
    g.stroke(path(0));
    g.lineWidth = 1.25;
    for (let k = -2; k <= 2; k++) {
      const q = path(k * gap);
      g.save();
      g.translate(-0.6, -0.6);
      g.strokeStyle = GSH.replace(/[\d.]+\)$/, '.36)');
      g.stroke(q);
      g.restore();
      g.save();
      g.translate(0.65, 0.65);
      g.strokeStyle = RHI;
      g.stroke(q);
      g.restore();
    }
    g.globalCompositeOperation = 'destination-out';
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(mask, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const strokes: { pts: XY[]; t: number }[] = [];
  function commitRake() {
    if (strokePts.length > 1) {
      strokes.push({ pts: strokePts.slice(), t: st.t });
      if (strokes.length > 40) strokes.shift();
      rakeG.setTransform(1, 0, 0, 1, 0, 0);
      rakeG.drawImage(active, 0, 0);
      rakeG.setTransform(dpr, 0, 0, dpr, 0, 0);
      st.lastRake = st.t;
    }
    strokePts.length = 0;
    renderActive();
  }
  function ghostRake() {
    const pts: XY[] = [];
    if (portrait)
      for (let i = 0; i <= 40; i++) {
        const u = i / 40;
        pts.push({
          x: lerp(W * 0.08, W * 0.62, u),
          y: H * 0.27 + Math.sin(u * PI * 2) * H * 0.035 + u * H * 0.02,
        });
      }
    else {
      for (let i = 0; i <= 40; i++) {
        const u = i / 40;
        pts.push({ x: lerp(W * 0.22, W * 0.52, u), y: H * 0.12 + Math.sin(u * PI * 2) * H * 0.05 });
      }
      for (let i = 0; i <= 30; i++) {
        const u = i / 30;
        pts.push({ x: lerp(W * 0.24, W * 0.5, u), y: H * 0.9 - Math.sin(u * PI * 1.5) * H * 0.04 });
      }
    }
    st.ghost = { pts, i: 0, t: 0 };
    strokePts.length = 0;
    if (reduce) {
      st.ghost = null;
      for (let i = 0; i < pts.length; i++) {
        if (i && hyp(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y) > W * 0.1) commitRake();
        addRakePt(pts[i].x, pts[i].y);
      }
      commitRake();
      render();
    }
  }

  function pos(e: PointerEvent) {
    const b = cvs.getBoundingClientRect();
    return { x: (e.clientX - b.left) * (W / b.width), y: (e.clientY - b.top) * (H / b.height) };
  }
  function onDown(e: PointerEvent) {
    if (e.button > 0) return;
    const p = pos(e);
    interacted();
    const n = hitNode(p.x, p.y);
    press = {
      id: e.pointerId,
      x0: p.x,
      y0: p.y,
      node: n,
      t0: performance.now(),
      mode: n ? 'node' : 'maybe',
      failed: false,
    };
    if (n)
      press.timer = setTimeout(() => {
        if (press && press.node === n && press.mode === 'node') {
          press.failed = true;
          failNode(n);
        }
      }, 600);
  }
  function onMove(e: PointerEvent) {
    const p = pos(e),
      now = st.t,
      dt = Math.max(0.008, now - ptr.t);
    if (ptr.x > -900) {
      ptr.vx = lerp(ptr.vx, (p.x - ptr.x) / dt, 0.5);
      ptr.vy = lerp(ptr.vy, (p.y - ptr.y) / dt, 0.5);
    }
    ptr.x = p.x;
    ptr.y = p.y;
    ptr.t = now;
    if (e.pointerType === 'mouse' && !press) {
      root.style.cursor =
        hitNode(p.x, p.y) || hitLant(p.x, p.y) || inPond(p.x, p.y) ? 'pointer' : 'crosshair';
      if (hitTree(p.x, p.y) && hyp(ptr.vx, ptr.vy) > 500) st.shake = Math.max(st.shake, 0.25);
    }
    if (!press || press.id !== e.pointerId) return;
    const moved = hyp(p.x - press.x0, p.y - press.y0);
    if (press.mode === 'maybe' && moved > 6) {
      if (inPond(press.x0, press.y0)) press.mode = 'water';
      else {
        press.mode = 'rake';
        strokePts.length = 0;
        addRakePt(press.x0, press.y0);
      }
    }
    if (press.mode === 'node' && moved > 16 && !press.failed) {
      clearTimeout(press.timer);
      press.mode = 'rake';
      strokePts.length = 0;
      addRakePt(press.x0, press.y0);
    }
    if (press.mode === 'rake') {
      addRakePt(p.x, p.y);
      if (reduce) render();
    }
    if (press.mode === 'water' && (!press.lr || now - press.lr > 0.08) && inPond(p.x, p.y)) {
      press.lr = now;
      addRip(p.x, p.y, 1, S * 0.06, 1.2);
    }
  }
  function onUp(e: PointerEvent) {
    if (!press || press.id !== e.pointerId) return;
    const p = press;
    press = null;
    clearTimeout(p.timer);
    if (e.type === 'pointercancel') {
      if (p.mode === 'rake') commitRake();
      return;
    }
    if (p.mode === 'node' && !p.failed && p.node) tapNode(p.node);
    else if (p.mode === 'rake') commitRake();
    else if (p.mode === 'maybe') {
      if (inPond(p.x0, p.y0)) feed(p.x0, p.y0);
      else if (hitLant(p.x0, p.y0)) {
        st.lanternOn = !st.lanternOn;
        say(st.lanternOn ? 'Lantern lit.' : 'Lantern out. The garden sleeps.');
      } else if (hitTree(p.x0, p.y0)) shakeTree();
      else {
        addRip(p.x0, p.y0, 0, S * 0.07, 1.2);
        burstScatter(p.x0, p.y0);
      }
    }
    if (reduce) render();
  }
  function burstScatter(x: number, y: number) {
    const rr = S * 0.15;
    for (const q of st.parts) {
      const d = hyp(q.x - x, q.y - y);
      if (d < rr && !q.wet && q.k !== 'fly') {
        const f = 1 - d / rr;
        q.vx += ((q.x - x) / (d + 1)) * 160 * f;
        q.vy += ((q.y - y) / (d + 1)) * 160 * f;
        if (q.land) {
          q.land = false;
          q.z = 6 + f * 20;
        }
      }
    }
  }
  let hinted = false;
  function interacted() {
    if (!hinted) {
      hinted = true;
      root.classList.add('played');
    }
    if (st.ghost) {
      st.ghost = null;
      commitRake();
    }
  }

  /* ---------------- frame ---------------- */
  function step(dt: number) {
    st.t += dt;
    st.load = Math.max(0, st.load - dt * 0.14);
    st.shake = Math.max(0, st.shake - dt * 1.2);
    for (const id of ids) {
      const n = nodes[id];
      n.wob += dt;
      n.glint = Math.max(0, n.glint - dt * 2);
      if (n.down > 0) {
        n.down -= dt;
        if (n.down <= 0) {
          n.down = 0;
          recover(n);
        }
      }
    }
    stepLanterns(dt);
    for (const f of st.koi) stepKoi(f, dt);
    stepParts(dt);
    for (let i = st.rip.length - 1; i >= 0; i--) {
      const r = st.rip[i];
      r.a += dt;
      if (r.a > r.life) st.rip.splice(i, 1);
    }
    for (let i = st.sparks.length - 1; i >= 0; i--) {
      const s = st.sparks[i];
      s.a += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 10 * dt;
      if (s.a > s.life) st.sparks.splice(i, 1);
    }
    if (st.ghost) {
      const gh = st.ghost;
      gh.t += dt;
      const want = Math.min(gh.pts.length, Math.floor(gh.t * 30));
      while (gh.i < want) {
        const p = gh.pts[gh.i++];
        if (gh.i > 1 && hyp(p.x - gh.pts[gh.i - 2].x, p.y - gh.pts[gh.i - 2].y) > W * 0.1)
          commitRake();
        addRakePt(p.x, p.y);
        ptr.vx = (p.x - ptr.x) / dt;
        ptr.vy = (p.y - ptr.y) / dt;
        ptr.x = p.x;
        ptr.y = p.y;
        ptr.t = st.t;
      }
      if (gh.i >= gh.pts.length) {
        commitRake();
        st.ghost = null;
      }
    }
    st.fadeT = (st.fadeT || 0) + dt;
    if (st.fadeT > 0.5) {
      st.fadeT = 0;
      if (st.t - st.lastRake > 40) {
        if (st.t - st.lastRake < 41) {
          rakeG.setTransform(1, 0, 0, 1, 0, 0);
          rakeG.clearRect(0, 0, rake.width, rake.height);
          rakeG.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
      } else {
        rakeG.globalCompositeOperation = 'destination-out';
        rakeG.fillStyle = 'rgba(0,0,0,.022)';
        rakeG.fillRect(0, 0, W, H);
        rakeG.globalCompositeOperation = 'source-over';
      }
    }
  }

  function render() {
    const g = ctx,
      t = st.t,
      pal = SEASONS[season];
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    g.drawImage(ground, 0, 0, W, H);
    if (reduce || st.t - st.lastRake < 41) g.drawImage(rake, 0, 0, W, H);
    if (strokePts.length > 1) g.drawImage(active, 0, 0, W, H);
    for (const r of st.rip)
      if (!r.w && r.a > 0) {
        const u = r.a / r.life,
          rad = (r.r0 || 0) + u * r.max;
        g.lineWidth = 1.3;
        g.globalAlpha = (1 - u) * 0.9;
        g.strokeStyle = GSH;
        g.beginPath();
        g.arc(r.x - 0.6, r.y - 0.6, rad, 0, TAU);
        g.stroke();
        g.strokeStyle = dark ? 'rgba(200,210,255,.35)' : 'rgba(255,255,250,.9)';
        g.beginPath();
        g.arc(r.x + 0.7, r.y + 0.7, rad, 0, TAU);
        g.stroke();
        g.globalAlpha = 1;
      }
    const spd = 30 * (1 + st.load);
    g.lineCap = 'round';
    g.strokeStyle = dark ? 'rgba(190,205,255,.3)' : 'rgba(255,255,255,.5)';
    g.lineWidth = 1.1;
    g.setLineDash([2, 13]);
    g.lineDashOffset = -t * spd;
    for (const s of segs) g.stroke(s.path);
    g.strokeStyle = rgba(pal.water[0], dark ? 0.35 : 0.9);
    g.lineWidth = 1.6;
    g.setLineDash([5, 21]);
    g.lineDashOffset = -t * spd * 0.7;
    for (const s of segs) g.stroke(s.path);
    const K = nodes.kafka;
    g.lineDashOffset = K.down ? 0 : -t * spd * 0.6;
    g.stroke(K.midPath);
    g.setLineDash([]);
    const M = nodes.mongo;
    g.save();
    g.beginPath();
    g.ellipse(pond.x, pond.y, pond.rx, pond.ry, 0, 0, TAU);
    g.moveTo(M.x + M.r, M.y);
    g.arc(M.x, M.y, M.r, 0, TAU, true);
    g.clip('evenodd');
    g.globalAlpha = dark ? 0.8 : 0.93;
    for (const f of st.koi) drawKoi(g, f);
    g.globalAlpha = 1;
    g.strokeStyle = dark ? 'rgba(200,215,255,.1)' : 'rgba(255,255,255,.2)';
    g.lineWidth = 1.2;
    for (let i = 0; i < 7; i++) {
      const x = pond.x + pond.rx * 0.72 * Math.sin(t * 0.11 + i * 1.7),
        y = pond.y + pond.ry * 0.72 * Math.cos(t * 0.09 + i * 2.3),
        l = pond.rx * 0.12;
      g.beginPath();
      g.moveTo(x - l, y);
      g.quadraticCurveTo(x, y - 2 - Math.sin(t + i) * 1.5, x + l, y);
      g.stroke();
    }
    for (const r of st.rip)
      if (r.w && r.a > 0) {
        const u = r.a / r.life,
          rad = (r.r0 || 0) + (1 - Math.pow(1 - u, 2)) * r.max,
          al = 1 - u;
        g.lineWidth = 1.4;
        g.strokeStyle = 'rgba(255,255,255,' + al * (dark ? 0.35 : 0.7) + ')';
        g.beginPath();
        g.arc(r.x, r.y, rad, 0, TAU);
        g.stroke();
        g.strokeStyle = 'rgba(0,20,30,' + al * 0.2 + ')';
        g.beginPath();
        g.arc(r.x + 1, r.y + 1.5, rad + 2, 0, TAU);
        g.stroke();
        if (rad > 8) {
          g.strokeStyle = 'rgba(255,255,255,' + al * 0.35 + ')';
          g.beginPath();
          g.arc(r.x, r.y, rad * 0.6, 0, TAU);
          g.stroke();
        }
      }
    g.restore();
    for (const p of st.parts) if (p.land) drawPart(g, p);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalAlpha = 1;
    for (const l of st.lan) drawLantern(g, l);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const id of ids) {
      const n = nodes[id],
        wb = n.wob < 1.6 ? Math.exp(-n.wob * 4) * Math.sin(n.wob * 24) : 0,
        rr = id === 'kafka' ? n.outer : n.r;
      if (n.down) {
        const pu = 0.5 + 0.5 * Math.sin(t * 7);
        g.strokeStyle = 'rgba(214,64,40,' + (0.35 + pu * 0.35) + ')';
        g.lineWidth = 2.2;
        g.setLineDash([4, 5]);
        g.lineDashOffset = t * 12;
        g.beginPath();
        g.arc(n.x, n.y, rr + 4, 0, TAU);
        g.stroke();
        g.setLineDash([]);
      }
      if (press && press.node === n && press.mode === 'node' && !press.failed) {
        const h = clamp((performance.now() - press.t0 - 120) / 480, 0, 1);
        if (h > 0) {
          g.strokeStyle = 'rgba(214,64,40,.85)';
          g.lineWidth = 3;
          g.lineCap = 'round';
          g.beginPath();
          g.arc(n.x, n.y, rr + 6, -PI / 2, -PI / 2 + h * TAU);
          g.stroke();
        }
      }
      sprites[id].forEach(({ s, sp }, k) => {
        const x = n.x + s[0] * n.r,
          y = n.y + s[1] * n.r,
          a = wb * 0.16 * (k ? 0.6 : 1),
          sq = wb * 0.06,
          c = Math.cos(a),
          si = Math.sin(a);
        g.setTransform(
          dpr * c * (1 + sq),
          dpr * si * (1 + sq),
          -dpr * si * (1 - sq),
          dpr * c * (1 - sq),
          dpr * x,
          dpr * y
        );
        g.drawImage(n.down && !k ? sp.b : sp.c, -sp.sz / 2, -sp.sz / 2, sp.sz, sp.sz);
        g.globalAlpha = 1;
      });
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (n.glint > 0) {
        const s0 = STONES[id][0],
          sr = s0[2] * n.r,
          x = n.x + s0[0] * n.r - sr * 0.3,
          y = n.y + s0[1] * n.r - sr * 0.4,
          k = n.glint * sr * 0.5;
        g.strokeStyle = 'rgba(255,248,220,' + n.glint + ')';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(x - k, y);
        g.lineTo(x + k, y);
        g.moveTo(x, y - k);
        g.lineTo(x, y + k);
        g.stroke();
      }
    }
    g.drawImage(over, 0, 0, W, H);
    const sway = Math.sin(t * 0.7) * 0.006 + st.shake * Math.sin(t * 26) * 0.02,
      c = Math.cos(sway),
      si = Math.sin(sway);
    if (treeC) {
      g.setTransform(dpr * c, dpr * si, -dpr * si, dpr * c, dpr * tree.x, dpr * tree.y);
      g.drawImage(treeC, -tree.sz / 2, -tree.sz / 2, tree.sz, tree.sz);
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const p of st.parts) if (!p.land) drawPart(g, p);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const s of st.sparks) {
      g.globalAlpha = 1 - s.a / s.life;
      g.fillStyle = s.c;
      g.beginPath();
      g.arc(s.x, s.y, 1.5, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;
    if (dark) {
      g.globalCompositeOperation = 'lighter';
      const gl = (s: HTMLCanvasElement, x: number, y: number, r: number, a: number) => {
        g.globalAlpha = a;
        g.drawImage(s, x - r, y - r, r * 2, r * 2);
      };
      gl(GLOW.cool, pond.x - pond.rx * 0.25, pond.y - pond.ry * 0.2, pond.rx * 0.5, 0.22);
      if (st.lanternOn) {
        const fl = 0.9 + 0.06 * Math.sin(t * 13) + 0.04 * Math.sin(t * 7.3);
        gl(GLOW.warm, lant.x, lant.y - lant.h * 0.25, S * 0.5 * fl, 0.45);
        gl(GLOW.warm, lant.wx, lant.wy, lant.h * 0.45, 0.8 * fl);
        gl(GLOW.white, lant.wx, lant.wy, lant.h * 0.12, 0.9);
      }
      const ls = clamp(S * 0.018, 4.5, 8);
      for (const l of st.lan)
        gl(
          GLOW.warm,
          l.x,
          l.y,
          ls * 4.2,
          0.55 * (l.s === 'pond' ? 1 - Math.max(0, (l.t - 0.65) / 0.35) : 1)
        );
      for (const p of st.parts)
        if (p.k === 'fly')
          gl(
            GLOW.fly,
            p.x,
            p.y - p.z * 0.5,
            9,
            (0.5 + 0.5 * Math.sin(p.ph * 3 + p.x)) * 0.9 * clamp(p.life, 0, 1)
          );
      for (const id of ids) {
        const n = nodes[id];
        if (n.down) gl(GLOW.red, n.x, n.y + n.r * 0.2, n.r * 0.5, 0.18 + 0.1 * Math.sin(t * 7));
        if (n.glint) gl(GLOW.white, n.x, n.y, n.r * 0.8, n.glint * 0.3);
      }
      for (const s of st.sparks) gl(GLOW.warm, s.x, s.y, 7, 1 - s.a / s.life);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }
  }

  function frame(now: number) {
    raf = 0;
    if (!running) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    step(dt);
    render();
    if (opts.onFrame) opts.onFrame(st);
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (reduce || running || !visible || document.hidden || !W || dead) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function resize() {
    const b = root.getBoundingClientRect();
    if (b.width < 10 || dead) return;
    const nw = Math.round(b.width),
      nh = Math.round(b.height),
      nd = Math.min(2, devicePixelRatio || 1);
    if (nw === W && nh === H && nd === dpr) return;
    W = nw;
    H = nh;
    dpr = nd;
    cvs.width = Math.round(W * dpr);
    cvs.height = Math.round(H * dpr);
    const fresh = !segs.length;
    strokes.length = 0;
    layout();
    build();
    initKoi();
    st.lan.length = 0;
    st.parts.length = 0;
    st.rip.length = 0;
    R = rnd(5);
    for (let i = 0; i < 240; i++) step(1 / 30);
    st.rip.length = 0;
    if (opts.onLayout) opts.onLayout({ nodes, pond, tree, lant, W, H, portrait });
    render();
    start();
    if (fresh && opts.ghost !== false)
      ghostTimer = setTimeout(
        () => {
          if (!hinted) ghostRake();
        },
        reduce ? 0 : 1400
      );
  }

  let dead = false,
    roT: ReturnType<typeof setTimeout> | undefined,
    ghostTimer: ReturnType<typeof setTimeout> | undefined;
  const onLeave = () => {
    ptr.x = ptr.y = -999;
  };
  const onVis = () => (document.hidden ? stop() : start());
  cvs.style.touchAction = 'pan-y';
  root.addEventListener('pointerdown', onDown);
  root.addEventListener('pointermove', onMove);
  root.addEventListener('pointerup', onUp);
  root.addEventListener('pointercancel', onUp);
  root.addEventListener('pointerleave', onLeave);
  const ro = new ResizeObserver(() => {
    clearTimeout(roT);
    roT = setTimeout(resize, 80);
  });
  ro.observe(root);
  const io = new IntersectionObserver((es) => {
    visible = es[0].isIntersecting;
    if (visible) start();
    else stop();
  });
  io.observe(root);
  document.addEventListener('visibilitychange', onVis);
  resize();

  const lantern = () => {
    st.lanternOn = !st.lanternOn;
    say(st.lanternOn ? 'Lantern lit.' : 'Lantern out. The garden sleeps.');
    if (reduce) render();
  };
  return {
    nodes,
    st,
    get reduced() {
      return reduce;
    },
    render,
    get season() {
      return season;
    },
    get dark() {
      return dark;
    },
    setSeason(s: Season) {
      if (s === season) return;
      season = s;
      build();
      st.parts.length = 0;
      const t0 = st.t;
      for (let i = 0; i < 150; i++) stepParts(1 / 30);
      st.t = t0;
      render();
    },
    setDark(d: boolean) {
      if (d === dark) return;
      dark = d;
      st.parts = st.parts.filter((p) => p.k !== 'fly');
      build();
      render();
    },
    setReduced(r: boolean) {
      if (r === reduce) return;
      reduce = r;
      if (reduce) {
        stop();
        render();
      } else start();
    },
    tap(id: NodeId) {
      tapNode(nodes[id]);
    },
    fail(id: NodeId) {
      failNode(nodes[id]);
    },
    feed() {
      feed(pond.x - pond.rx * 0.3, pond.y);
    },
    shake: shakeTree,
    rake() {
      interacted();
      ghostRake();
    },
    toggleLantern: lantern,
    destroy() {
      dead = true;
      stop();
      clearTimeout(roT);
      clearTimeout(ghostTimer);
      clearTimeout(stillT);
      treeToken++;
      ro.disconnect();
      io.disconnect();
      root.removeEventListener('pointerdown', onDown);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerup', onUp);
      root.removeEventListener('pointercancel', onUp);
      root.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVis);
    },
  };
}

/* ---------------- site wrapper ---------------- */

const SHORT: Partial<Record<NodeId, string>> = { gql: 'GraphQL', kafka: 'Kafka' };
const SEASON_NAME: Record<Season, string> = {
  spring: 'Spring',
  summer: 'Summer',
  autumn: 'Autumn',
  winter: 'Winter',
};

export interface GardenHandle {
  destroy: () => void;
}

/**
 * Mount the garden into `root` (a positioned element containing a <canvas>).
 * Creates real buttons over each stone, the pond, the tree and the lantern so the
 * garden works by keyboard and screen reader; pointer input goes to the canvas.
 */
export function mountGarden(
  root: HTMLElement,
  statusEl: HTMLElement | null,
  hintId: string
): GardenHandle {
  const t0 = performance.now();
  const html = document.documentElement;
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const section = root.closest<HTMLElement>('[data-zen-garden]');
  const say = (t: string) => {
    if (statusEl) statusEl.textContent = t;
  };
  let g: Engine | null = null;
  let layout: Layout | null = null;

  const overlay = document.createElement('div');
  overlay.className = 'zg-overlay';
  root.appendChild(overlay);

  const button = (
    cls: string,
    label: string,
    onPress: () => void,
    extra?: (b: HTMLButtonElement) => void
  ) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.setAttribute('aria-label', label);
    b.setAttribute('aria-describedby', hintId);
    b.addEventListener('click', onPress);
    extra?.(b);
    overlay.appendChild(b);
    return b;
  };

  const stones = {} as Record<NodeId, HTMLButtonElement>;
  const labels = {} as Record<NodeId, { el: HTMLElement; name: HTMLElement; st: HTMLElement }>;
  for (const [id, name] of NODES) {
    stones[id] = button(
      'zg-hit zg-stone',
      `${name}: add load`,
      () => g?.tap(id),
      (b) => {
        b.setAttribute('aria-keyshortcuts', 'F');
        b.title = `${name}. Enter adds load, F simulates a failure.`;
        b.addEventListener('keydown', (e) => {
          if (e.key !== 'f' && e.key !== 'F') return;
          e.preventDefault();
          g?.fail(id);
        });
      }
    );
    const el = document.createElement('span');
    el.className = 'zg-label';
    el.setAttribute('aria-hidden', 'true');
    const nm = document.createElement('b');
    const st = document.createElement('span');
    st.className = 'zg-st';
    el.append(nm, st);
    overlay.appendChild(el);
    labels[id] = { el, name: nm, st };
  }
  const pondBtn = button('zg-hit', 'Koi pond: feed the koi', () => g?.feed());
  const treeBtn = button('zg-hit', 'Tree: shake the branches', () => g?.shake());
  const lampBtn = button('zg-hit zg-hit-lamp', 'Stone lantern: light or put out', () =>
    g?.toggleLantern()
  );

  const px = (n: number) => `${Math.round(n)}px`;
  const box = (el: HTMLElement, x: number, y: number, w: number, h: number) => {
    el.style.left = px(x);
    el.style.top = px(y);
    el.style.width = px(w);
    el.style.height = px(h);
  };
  function place(L: Layout) {
    layout = L;
    for (const [id, name] of NODES) {
      const n = L.nodes[id];
      const r = id === 'kafka' ? n.outer : n.r;
      const d = Math.max(44, r * 2);
      box(stones[id], n.x, n.y, d, d);
      const lb = labels[id];
      lb.name.textContent = L.W < 560 ? (SHORT[id] ?? name) : name;
      lb.el.style.left = px(n.x);
      lb.el.style.top = px(Math.min(L.H - 22, n.y + r + (id === 'mongo' ? 4 : 6)));
    }
    box(pondBtn, L.pond.x, L.pond.y, L.pond.rx * 2, L.pond.ry * 2);
    box(
      treeBtn,
      Math.min(L.W - 40, L.tree.x - L.tree.R * 0.35),
      Math.max(40, L.tree.y + L.tree.R * 0.3),
      72,
      72
    );
    box(lampBtn, L.lant.x, L.lant.y - L.lant.h * 0.5, 44, L.lant.h);
  }

  function tick() {
    if (!g || !layout || document.hidden) return;
    let orbiting = 0;
    for (const l of g.st.lan) if (l.s === 'orbit') orbiting++;
    for (const [id] of NODES) {
      const n = g.nodes[id];
      const lb = labels[id];
      let s = '';
      if (n.down) s = id === 'mongo' ? 'unavailable' : 'down';
      else if (id === 'kafka' && orbiting > 0) s = `buffer ${orbiting}`;
      else if (id === 'mongo' && g.st.stored) s = `${g.st.stored} saved`;
      lb.el.classList.toggle('zg-down', !!n.down);
      if (lb.st.textContent !== s) lb.st.textContent = s;
    }
  }

  g = mount(root, {
    dark: html.classList.contains('dark'),
    reduced: mq.matches,
    onStatus: (t) => {
      say(t);
      tick();
    },
    onLayout: place,
  });
  const engine = g;
  tick();
  const timer = window.setInterval(tick, 250);

  // Season switcher (markup lives in ZenGarden.astro)
  const today = autoSeason();
  const seasonBtns = Array.from(
    section?.querySelectorAll<HTMLButtonElement>('[data-garden-season]') ?? []
  );
  const markSeason = () => {
    for (const b of seasonBtns) {
      const s = b.dataset.gardenSeason as Season;
      b.setAttribute('aria-pressed', String(s === engine.season));
      b.classList.toggle('zg-now', s === today);
      if (s === today) b.title = 'Today’s season';
    }
  };
  const onSeason = (e: Event) => {
    const s = (e.currentTarget as HTMLButtonElement).dataset.gardenSeason as Season;
    if (!SEASON_NAME[s]) return;
    engine.setSeason(s);
    markSeason();
    say(`${SEASON_NAME[s]} in the garden.`);
  };
  for (const b of seasonBtns) b.addEventListener('click', onSeason);
  markSeason();

  // Follow the site theme toggle and the reduced-motion preference live
  const themeObs = new MutationObserver(() => engine.setDark(html.classList.contains('dark')));
  themeObs.observe(html, { attributes: true, attributeFilter: ['class'] });
  const onMotion = (e: MediaQueryListEvent) => engine.setReduced(e.matches);
  mq.addEventListener('change', onMotion);

  root.dataset.firstDrawMs = String(Math.round(performance.now() - t0));
  say('All systems steady.');

  return {
    destroy() {
      engine.destroy();
      window.clearInterval(timer);
      themeObs.disconnect();
      mq.removeEventListener('change', onMotion);
      for (const b of seasonBtns) b.removeEventListener('click', onSeason);
      overlay.remove();
    },
  };
}
