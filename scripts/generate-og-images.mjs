/* global console, document, Buffer */
// Generates the social preview cards and app icons:
//
//   npm run og:generate
//
//   public/og/<page>-<locale>.png   1200x630 Open Graph / Twitter cards, one per page:
//                                   home-en, home-ja and <key>-en / <key>-ja for every
//                                   case study, where <key> is the first word of its slug
//                                   (kafka-event-architecture -> kafka). Keep in sync with
//                                   src/lib/seo.ts (ogImagePath).
//   public/og-image.png             legacy default card (copy of home-en), for old shares
//   public/icon-192.png, icon-512.png, apple-touch-icon.png (180), favicon.svg, favicon.ico
//
// Text comes from data/profile.json, data/i18n/ja.json and the case-study frontmatter, so
// re-run this after changing a title, description or tags. Rendering: headless Chromium
// (Playwright). Latin text uses the site's Inter Variable; Japanese uses BIZ UDPGothic
// (OFL, Google Fonts) installed as a system font, falling back to Noto Sans CJK JP,
// Hiragino or Yu Gothic. Install BIZ UDPGothic for the sharpest Japanese cards.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const profile = readJson('data/profile.json');
const ja = readJson('data/i18n/ja.json').profile;
const SITE = 'suvamadhikary.vercel.app';

const interWoff2 = fs
  .readFileSync(
    path.join(root, 'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2')
  )
  .toString('base64');

// ---------------------------------------------------------------------------- content

/** Minimal frontmatter reader for the case-study MDX files (title, description, tags, draft). */
function frontmatter(file) {
  const src = fs.readFileSync(file, 'utf8');
  const fm = src.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
  const str = (key) => {
    const m = fm.match(new RegExp(`^${key}:\\s*(['"])(.*)\\1\\s*$`, 'm'));
    return m ? m[2].replace(/\\(['"])/g, '$1') : '';
  };
  const tags = (fm.match(/^tags:\s*\[(.*)\]\s*$/m)?.[1] ?? '')
    .split(',')
    .map((t) => t.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
  return {
    title: str('title'),
    description: str('description'),
    tags,
    draft: /^draft:\s*true/m.test(fm),
  };
}

const ogKey = (slug) => slug.split('-')[0];

const copy = {
  en: {
    role: profile.title,
    location: profile.location,
    tagline: profile.tagline,
    caseStudy: 'Case study',
    pill: 'Portfolio',
  },
  ja: {
    role: ja.title,
    location: ja.location,
    tagline: ja.tagline,
    caseStudy: 'ケーススタディ',
    pill: 'ポートフォリオ',
  },
};
// Core stack shown on the home cards; every item is in data/profile.json skills.
const stack = ['Node.js', 'TypeScript', 'Apache Kafka', 'MongoDB', 'Kubernetes'];
const allSkills = Object.values(profile.skills).flat();
for (const s of stack) if (!allSkills.includes(s)) throw new Error(`${s} is not in profile.json`);

/** @type {{ file: string, locale: 'en' | 'ja', kind: 'home' | 'case', title?: string, description?: string, tags?: string[] }[]} */
const cards = [
  { file: 'home-en.png', locale: 'en', kind: 'home' },
  { file: 'home-ja.png', locale: 'ja', kind: 'home' },
];
const seen = new Map();
for (const [dir, locale] of [
  ['src/content/case-studies', 'en'],
  ['src/content/case-studies-ja', 'ja'],
]) {
  for (const name of fs.readdirSync(path.join(root, dir)).sort()) {
    if (!name.endsWith('.mdx') && !name.endsWith('.md')) continue;
    const slug = name.replace(/\.mdx?$/, '');
    const fm = frontmatter(path.join(root, dir, name));
    if (fm.draft) continue;
    const key = ogKey(slug);
    const owner = seen.get(`${key}-${locale}`);
    if (owner && owner !== slug)
      throw new Error(`OG key "${key}" is shared by ${owner} and ${slug}`);
    seen.set(`${key}-${locale}`, slug);
    cards.push({ file: `${key}-${locale}.png`, locale, kind: 'case', ...fm });
  }
}

// ---------------------------------------------------------------------------- markup

const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]
  );

// Brand colours: the site's primary scale (oklch hue 250) on gray-950 slate.
const css = `
@font-face { font-family: 'Inter'; src: url(data:font/woff2;base64,${interWoff2}) format('woff2');
  font-weight: 100 900; font-display: block; }
@font-face { font-family: 'JP'; font-weight: 400;
  src: local('BIZ UDPGothic'), local('BIZUDPGothic-Regular'), local('Noto Sans CJK JP'), local('Hiragino Sans'), local('Yu Gothic'); }
@font-face { font-family: 'JP'; font-weight: 700;
  src: local('BIZ UDPGothic Bold'), local('BIZUDPGothic-Bold'), local('Noto Sans CJK JP Bold'), local('Hiragino Sans W6'), local('Yu Gothic Bold'); }
* { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --p300: oklch(0.78 0.12 250); --p400: oklch(0.66 0.16 250); --p500: oklch(0.55 0.2 250);
  --p600: oklch(0.45 0.2 250); --bg: oklch(0.13 0.028 261.692);
}
html, body { width: 1200px; height: 630px; }
body { font-family: 'Inter', 'JP', sans-serif; color: #f8fafc; background: var(--bg);
  -webkit-font-smoothing: antialiased; text-rendering: geometricPrecision; overflow: hidden; }
:lang(ja) { font-family: 'Inter', 'JP', sans-serif; line-break: strict; word-break: auto-phrase; }
.card { position: relative; width: 1200px; height: 630px; padding: 64px 72px 56px; display: flex; flex-direction: column; overflow: hidden; }
.glow { position: absolute; border-radius: 50%; filter: blur(90px); }
.g1 { width: 720px; height: 720px; right: -220px; top: -300px; background: oklch(0.55 0.2 250 / 0.38); }
.g2 { width: 520px; height: 520px; left: -260px; bottom: -340px; background: oklch(0.45 0.2 250 / 0.28); }
.grid { position: absolute; inset: 0;
  background-image: linear-gradient(to right, rgba(148,163,184,0.09) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(148,163,184,0.09) 1px, transparent 1px);
  background-size: 48px 48px; -webkit-mask-image: radial-gradient(ellipse 90% 80% at 70% 10%, black, transparent 75%); }
.dots { position: absolute; inset: 0; -webkit-mask-image: linear-gradient(to left, black 12%, transparent 42%); }
.top, .main, .bottom { position: relative; }
.top { display: flex; align-items: center; justify-content: space-between; }
.brand { display: flex; align-items: center; gap: 18px; }
.mark { width: 60px; height: 60px; border-radius: 16px; display: grid; place-items: center;
  background: linear-gradient(135deg, var(--p500), var(--p600)); box-shadow: 0 10px 30px oklch(0.55 0.2 250 / 0.45), inset 0 1px 0 rgba(255,255,255,0.25);
  font-weight: 800; font-size: 26px; letter-spacing: -0.02em; }
.domain { font-size: 22px; color: #cbd5e1; font-weight: 500; letter-spacing: -0.01em; }
.pill { font-size: 20px; font-weight: 600; color: var(--p300); padding: 9px 20px; border-radius: 999px;
  border: 1.5px solid oklch(0.66 0.16 250 / 0.45); background: oklch(0.55 0.2 250 / 0.14); }
.main { flex: 1; display: flex; flex-direction: column; justify-content: center; }
.name { font-size: 104px; line-height: 0.98; font-weight: 800; letter-spacing: -0.035em; }
.name .last { display: block; background: linear-gradient(90deg, var(--p400), var(--p300));
  -webkit-background-clip: text; background-clip: text; color: transparent; padding-bottom: 6px; }
.role { margin-top: 22px; font-size: 36px; font-weight: 600; color: #e2e8f0; letter-spacing: -0.01em; }
.role .sep { color: #64748b; margin: 0 14px; font-weight: 400; }
.role .loc { color: #94a3b8; font-weight: 500; }
.tagline { margin-top: 16px; font-size: 25px; line-height: 1.5; color: #94a3b8; max-width: 1000px; }
.eyebrow { font-size: 22px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: var(--p400); margin-bottom: 20px; }
:lang(ja) .eyebrow { letter-spacing: 0.08em; }
.title { font-size: 62px; line-height: 1.12; font-weight: 800; letter-spacing: -0.025em; max-width: 1040px; text-wrap: balance; }
:lang(ja) .title { font-size: 58px; line-height: 1.3; letter-spacing: 0; font-weight: 700; }
.desc { margin-top: 24px; font-size: 27px; line-height: 1.5; color: #a5b4c8; max-width: 940px; text-wrap: pretty; }
:lang(ja) .desc { font-size: 26px; line-height: 1.65; }
.bottom { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.chips { display: flex; flex-wrap: wrap; gap: 12px; }
.chip { font-size: 20px; font-weight: 600; color: #e2e8f0; padding: 9px 18px; border-radius: 12px;
  background: rgba(30,41,59,0.75); border: 1px solid rgba(148,163,184,0.22); }
.by { font-size: 21px; color: #94a3b8; font-weight: 500; white-space: nowrap; }
.by b { color: #e2e8f0; font-weight: 700; }
.bar { position: absolute; left: 0; right: 0; bottom: 0; height: 6px; background: linear-gradient(90deg, var(--p600), var(--p400), var(--p300)); }
`;

// A few deterministic "network" nodes echoing the hero's constellation background.
function constellation(seed) {
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const pts = Array.from({ length: 14 }, () => [820 + rnd() * 350, 130 + rnd() * 340]);
  const lines = [];
  for (let i = 0; i < pts.length; i++)
    for (let j = i + 1; j < pts.length; j++) {
      const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]);
      if (d < 150)
        lines.push(
          `<line x1="${pts[i][0]}" y1="${pts[i][1]}" x2="${pts[j][0]}" y2="${pts[j][1]}" />`
        );
    }
  return `<svg class="dots" viewBox="0 0 1200 630" aria-hidden="true">
    <g stroke="oklch(0.66 0.16 250 / 0.28)" stroke-width="1.2">${lines.join('')}</g>
    <g fill="oklch(0.78 0.12 250 / 0.6)">${pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" />`).join('')}</g></svg>`;
}

function cardHtml(card, seed) {
  const c = copy[card.locale];
  const top = `<div class="top"><div class="brand"><div class="mark">SA</div><div class="domain">${SITE}</div></div>
    <div class="pill">${esc(c.pill)}</div></div>`;
  let main;
  let bottom;
  if (card.kind === 'home') {
    const [first, ...rest] = profile.name.split(' ');
    main = `<div class="name">${esc(first)}<span class="last">${esc(rest.join(' '))}</span></div>
      <div class="role">${esc(c.role)}<span class="sep">/</span><span class="loc">${esc(c.location)}</span></div>
      <div class="tagline">${esc(c.tagline)}</div>`;
    bottom = `<div class="chips">${stack.map((s) => `<span class="chip">${esc(s)}</span>`).join('')}</div>`;
  } else {
    main = `<div class="eyebrow">${esc(c.caseStudy)}</div><div class="title">${esc(card.title)}</div>
      <div class="desc">${esc(card.description)}</div>`;
    bottom = `<div class="chips">${card.tags
      .slice(0, 4)
      .map((t) => `<span class="chip">${esc(t)}</span>`)
      .join(
        ''
      )}</div><div class="by">${card.locale === 'ja' ? `<b>${esc(profile.name)}</b>・${esc(c.role)}` : `<b>${esc(profile.name)}</b> · ${esc(c.role)}`}</div>`;
  }
  return `<!doctype html><html lang="${card.locale}"><head><meta charset="utf-8"><style>${css}</style></head>
    <body><div class="card"><div class="glow g1"></div><div class="glow g2"></div><div class="grid"></div>${constellation(seed)}
    ${top}<div class="main">${main}</div><div class="bottom">${bottom}</div><div class="bar"></div></div></body></html>`;
}

// App icon: "SA" monogram on the brand gradient. Full-bleed square with the letters inside
// the central 60%, so the same artwork works as a maskable icon.
const iconSvg = (
  size,
  radius = 0
) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#0a6ae0"/><stop offset="1" stop-color="#0046b0"/></linearGradient>
    <radialGradient id="h" cx="0.25" cy="0.15" r="0.9"><stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/><stop offset="0.6" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs>
  <rect width="100" height="100" rx="${radius}" fill="#030712"/>
  <rect width="100" height="100" rx="${radius}" fill="url(#g)"/>
  <rect width="100" height="100" rx="${radius}" fill="url(#h)"/>
  <text x="50" y="51" font-family="Inter, Arial, sans-serif" font-size="40" font-weight="800" letter-spacing="-1.6" fill="#ffffff" text-anchor="middle" dominant-baseline="central">SA</text>
</svg>`;

// ---------------------------------------------------------------------------- render

/** ICO container holding PNG images (supported by every current browser). */
function ico(pngs) {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, e);
    header.writeUInt8(size >= 256 ? 0 : size, e + 1);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...pngs.map((p) => p.data)]);
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });

  // Warn when the preferred Japanese font is missing (cards still render with a fallback).
  await page.setContent(
    `<html lang="ja"><head><style>${css}</style></head><body><p style="font-family:JP">日本語</p></body></html>`
  );
  const jpFont = await page.evaluate(async () => {
    await document.fonts.ready;
    const faces = [...document.fonts].filter((f) => f.family.replace(/"/g, '') === 'JP');
    await Promise.allSettled(faces.map((f) => f.load()));
    return faces.some((f) => f.status === 'loaded');
  });
  if (!jpFont)
    console.warn(
      '! No Japanese font found (install BIZ UDPGothic); JA cards use a generic fallback.'
    );

  const outDir = path.join(root, 'public/og');
  fs.mkdirSync(outDir, { recursive: true });
  for (const [i, card] of cards.entries()) {
    await page.setContent(cardHtml(card, 7919 * (i + 3)), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page.evaluate(() => {
      const main = document.querySelector('.main');
      return main.scrollHeight > main.clientHeight + 1;
    });
    if (overflow) throw new Error(`${card.file}: text does not fit the card, shorten it`);
    await page.screenshot({ path: path.join(outDir, card.file), type: 'png' });
    console.log(`public/og/${card.file}`);
  }
  fs.copyFileSync(path.join(outDir, 'home-en.png'), path.join(root, 'public/og-image.png'));
  console.log('public/og-image.png (copy of home-en)');

  const icon = async (size, radius = 0) => {
    const p = await browser.newPage({ viewport: { width: size, height: size } });
    await p.setContent(
      `<html><head><style>@font-face{font-family:'Inter';src:url(data:font/woff2;base64,${interWoff2}) format('woff2');font-weight:100 900}html,body{margin:0;background:transparent}svg{display:block}</style></head><body>${iconSvg(size, radius)}</body></html>`
    );
    await p.evaluate(() => document.fonts.ready);
    const data = await p.screenshot({ type: 'png', omitBackground: true });
    await p.close();
    return data;
  };
  for (const [file, size] of [
    ['icon-192.png', 192],
    ['icon-512.png', 512],
    ['apple-touch-icon.png', 180],
  ]) {
    fs.writeFileSync(path.join(root, 'public', file), await icon(size));
    console.log(`public/${file}`);
  }
  // Tab icons: rounded corners, since browsers show them as-is.
  fs.writeFileSync(
    path.join(root, 'public/favicon.ico'),
    ico([
      { size: 32, data: await icon(32, 22) },
      { size: 48, data: await icon(48, 22) },
    ])
  );
  console.log('public/favicon.ico');
  fs.writeFileSync(
    path.join(root, 'public/favicon.svg'),
    iconSvg(100, 22)
      .replace(/ width="100" height="100"/, '')
      .replace('Inter, Arial', 'Inter, system-ui, Arial') + '\n'
  );
  console.log('public/favicon.svg');
} finally {
  await browser.close();
}
