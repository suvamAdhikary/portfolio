/* global process, console, document */
// Generates public/resume-ja.pdf, the Japanese 職務経歴書 linked from /ja/.
//
//   npm run resume:ja                # dated today
//   npm run resume:ja -- 2026-11-26  # fixed "現在" date
//
// Every fact below comes from the English résumé (public/resume.pdf) or data/profile.json;
// only the wording is Japanese. Do not add facts here that those two sources lack
// (no phone number, street address, Japanese level, visa status or katakana name).
// Rendering: headless Chromium (Playwright), A4. Font: BIZ UDPGothic (OFL, Google Fonts),
// installed as a system font, falling back to Yu Gothic / Hiragino / Meiryo / Noto Sans CJK.
// Use a static TrueType font: Chromium embeds variable, CFF/OTF and web fonts as Type 3
// glyphs, which some PDF viewers render poorly.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const profile = JSON.parse(fs.readFileSync(path.join(root, 'data/profile.json'), 'utf8'));
const out = path.join(root, 'public/resume-ja.pdf');

const asOf = process.argv[2] ? new Date(`${process.argv[2]}T00:00:00`) : new Date();
const asOfJa = `${asOf.getFullYear()}年${asOf.getMonth() + 1}月${asOf.getDate()}日現在`;
const ym = (s) => {
  const [y, m] = s.split('-').map(Number);
  return `${y}年${m}月`;
};

const summary = [
  'Node.js・TypeScript・Kafka・MongoDB・MSSQL を用いて、本番運用の API、マイクロサービス、イベント駆動システムの開発と堅牢化に4.5年以上携わってきたバックエンドエンジニアです。',
  'プロダクト企業とエンタープライズの両方のプラットフォームで、パフォーマンス最適化、API セキュリティ、可観測性の強化、Kubernetes へのデプロイを担当してきました。',
];

const skills = [
  ['言語', 'TypeScript, JavaScript, SQL, Python'],
  ['バックエンド', 'Node.js, NestJS, Express.js, REST API, GraphQL, GraphQL Federation'],
  ['データ・メッセージング', 'MongoDB, MSSQL, MySQL, Redis, Apache Kafka, RabbitMQ'],
  ['クラウド・DevOps', 'AWS EC2, Docker, Kubernetes, kubectl, k9s, CI/CD'],
  ['可観測性・設計', 'Winston, Kibana, Grafana, マイクロサービス, イベント駆動アーキテクチャ, JWT'],
];

// Work style (Hybrid/Remote) is from the English résumé; dates, titles and companies from
// data/profile.json (they match the résumé).
const workStyle = {
  Neutrinos: 'インド・ベンガルール（ハイブリッド）',
  'upGrad Education': 'インド・ハイデラバード（ハイブリッド）',
  'Educational Initiatives': 'インド・ベンガルール（ハイブリッド）',
  'Lead School': 'リモート',
};
const work = {
  Neutrinos: {
    about: 'エンタープライズ向け保険プラットフォームのバックエンド API を担当。',
    bullets: [
      'Node.js / TypeScript の API フロー15本以上を堅牢化。パラメータ化した MSSQL クエリ、構造化ログ、エラーハンドリングの標準化、JWT ミドルウェア、個人情報（PII）を出力しないログを導入',
      '認証、ユーザー、保険契約、自動車保険、保険金請求の各領域で API を開発・リファクタリング。社内業務向けの管理 CMS とレポート API も構築',
      'AWS EC2 から kubectl apply で Kubernetes ワークロードをデプロイ。リリース時や本番障害の調査では、k9s でロールアウト、Pod の状態、ログを監視',
    ],
  },
  'upGrad Education': {
    about: 'アクティブ学習者1万5千人以上の学習プラットフォームで、マイクロサービス基盤を担当。',
    bullets: [
      'MongoDB の bulkWrite で課題の再アップロード処理を再設計し、DB ラウンドトリップを90%削減',
      'アグリゲーションのプロジェクションとステージを最適化し、ドキュメントあたりのメモリを145KB から5KB に削減、クエリスループットを5倍に向上',
      '21以上のマイクロサービスにまたがり1日10万件以上のイベントを処理する Kafka のプロデューサー／コンシューマーを運用。リトライとデッドレター処理で部分障害に対応',
      '20以上のマイクロサービスを統合する GraphQL Federation ゲートウェイを構築し、Kibana と Grafana で可観測性を強化。本番障害を60%削減',
    ],
  },
  'Educational Initiatives': {
    about: '学習者1万人以上を支える基礎リテラシー教育プログラムのバックエンドを担当。',
    bullets: [
      'MongoDB と Redis によるオフライン同期と競合解決を含むバックエンド基盤を構築',
      'API ゲートウェイとデータアクセス層を備えた6サービス構成のマイクロサービスバックエンドを設計・構築し、新機能を既存のレガシーシステムと連携',
      'リトライ、バッチ処理、バックグラウンド処理を備えた再利用可能な TypeScript ライブラリと堅牢な REST API を構築し、開発工数を30%削減',
    ],
  },
  'Lead School': {
    about: '学校向けプロダクトのバックエンド API を担当。',
    bullets: [
      'Genie（課外活動管理）、Epsilon（コンテンツレビュー）、Assessment（K-12 向けテスト問題の作成）などの REST API を Node.js・MongoDB・Redis で開発',
      'Redis キャッシュと API の最適化により、週1万人以上が利用するバックエンドの応答時間を60%改善',
    ],
  },
};

const projects = [
  [
    'Workflow Engine',
    'github.com/suvamAdhikary/workflow-engine-backend',
    'NestJS によるワークフロー自動化の API。JWT 認証、API キー、Redis キャッシュ、Webhook を実装。',
  ],
  [
    'VisuCode',
    'visucode.vercel.app',
    'Next.js・TypeScript・Nx で構築した、DSA（データ構造とアルゴリズム）をインタラクティブに学べる学習プロダクト。',
  ],
];

// 学歴・修了課程: oldest first (Japanese convention)
const education = [
  [
    '2014年〜2018年',
    'Heritage Institute of Technology（インド・コルカタ）',
    '機械工学 学士（B.Tech）',
  ],
  ['2021年', 'Masai School', 'フルスタック Web 開発コース 修了'],
];

const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]
  );

const jobs = profile.experience
  .map((e) => {
    const w = work[e.company];
    if (!w) throw new Error(`No Japanese copy for ${e.company}`);
    const period = `${ym(e.startDate)}〜${e.current ? '現在' : ym(e.endDate)}`;
    return `
    <section class="job">
      <div class="job-head">
        <div><span class="company">${esc(e.company)}</span><span class="role">${esc(e.position)}</span></div>
        <div class="period">${period}</div>
      </div>
      <div class="meta">${esc(workStyle[e.company])}${e.current ? '<span class="now">在籍中</span>' : ''}</div>
      <p class="about">${esc(w.about)}</p>
      <ul>${w.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
    </section>`;
  })
  .join('');

const html = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><title>職務経歴書 Suvam Adhikary</title>
<style>
@page { size: A4; margin: 14mm 15mm 14mm; }
* { box-sizing: border-box; margin: 0; padding: 0; }
:root { --ink: #0f172a; --muted: #475569; --line: #cbd5e1; --soft: #f1f5f9; --blue: #1d4ed8; --blue-soft: #eff6ff; }
html { font-family: 'BIZ UDPGothic', 'Yu Gothic', 'Hiragino Sans', Meiryo, 'Noto Sans CJK JP', sans-serif; color: var(--ink); font-size: 9.4pt; line-height: 1.62; line-break: strict; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2.4pt solid var(--blue); padding-bottom: 6pt; }
h1 { font-size: 18pt; letter-spacing: 0.28em; font-weight: 700; }
.asof { font-size: 8.5pt; color: var(--muted); }
.who { display: flex; justify-content: space-between; gap: 12pt; margin-top: 9pt; }
.name { font-size: 16pt; font-weight: 700; letter-spacing: 0.01em; }
.title { color: var(--blue); font-weight: 700; font-size: 10pt; margin-top: 1pt; }
.stack { color: var(--muted); font-size: 8.4pt; white-space: nowrap; }
a { color: inherit; text-decoration: none; }
.contact { font-size: 8.4pt; color: var(--muted); text-align: right; line-height: 1.55; }
.contact b { color: var(--ink); font-weight: 700; }
h2 { font-size: 10.6pt; font-weight: 700; margin: 12pt 0 5pt; padding: 2.5pt 7pt; background: var(--soft); border-left: 3pt solid var(--blue); break-after: avoid; }
p { text-align: justify; }
.summary p + p { margin-top: 3pt; }
table.skills { width: 100%; border-collapse: collapse; font-size: 8.9pt; }
table.skills th { width: 34mm; text-align: left; font-weight: 700; color: var(--blue); vertical-align: top; padding: 2.2pt 6pt 2.2pt 0; white-space: nowrap; }
table.skills td { padding: 2.2pt 0; border-bottom: 0.5pt solid #e2e8f0; }
table.skills tr:last-child td { border-bottom: 0; }
.job { break-inside: avoid; padding: 6pt 0 6pt; border-bottom: 0.6pt solid var(--line); }
.job:last-of-type { border-bottom: 0; }
.job-head { display: flex; justify-content: space-between; align-items: baseline; gap: 10pt; }
.company { font-weight: 700; font-size: 10.6pt; }
.role { margin-left: 8pt; font-weight: 700; color: var(--blue); font-size: 9.2pt; }
.period { font-weight: 700; font-size: 9pt; white-space: nowrap; }
.meta { font-size: 8.3pt; color: var(--muted); }
.now { margin-left: 6pt; padding: 0 5pt; border-radius: 6pt; background: var(--blue-soft); color: var(--blue); font-weight: 700; font-size: 7.6pt; }
.about { margin-top: 2pt; font-weight: 700; font-size: 9pt; }
ul { list-style: none; margin-top: 2pt; }
li { position: relative; padding-left: 10pt; margin-top: 1.6pt; text-align: justify; }
li::before { content: ''; position: absolute; left: 1.5pt; top: 0.68em; width: 3.2pt; height: 3.2pt; border-radius: 50%; background: var(--blue); }
.proj { display: grid; grid-template-columns: 34mm 1fr; gap: 2pt 6pt; break-inside: avoid; }
.proj b { color: var(--blue); white-space: nowrap; }
.proj .url { font-size: 8.3pt; color: var(--muted); }
table.edu { width: 100%; border-collapse: collapse; break-inside: avoid; }
table.edu td { padding: 2.5pt 0; border-bottom: 0.5pt solid #e2e8f0; vertical-align: top; }
table.edu td:first-child { width: 34mm; font-weight: 700; white-space: nowrap; }
table.edu tr:last-child td { border-bottom: 0; }
.end { text-align: right; margin-top: 10pt; font-size: 9pt; }
.keep { break-inside: avoid; }
</style></head><body>
<header><h1>職務経歴書</h1><div class="asof">${asOfJa}</div></header>
<div class="who">
  <div>
    <div class="name">${esc(profile.name)}</div>
    <div class="title">バックエンドエンジニア</div>
    <div class="stack">Node.js / TypeScript / Kafka / マイクロサービス</div>
  </div>
  <div class="contact">
    インド・ベンガルール（転居可）<br>
    <b>Email</b> <a href="mailto:${esc(profile.email)}">${esc(profile.email)}</a><br>
    <b>LinkedIn</b> <a href="${esc(profile.links.linkedin)}">linkedin.com/in/suvam-adhikary</a><br>
    <b>GitHub</b> <a href="${esc(profile.links.github)}">github.com/suvamAdhikary</a><br>
    <b>Portfolio</b> <a href="https://suvamadhikary.vercel.app/">suvamadhikary.vercel.app</a>
  </div>
</div>

<div class="keep summary"><h2>職務要約</h2>${summary.map((p) => `<p>${esc(p)}</p>`).join('')}</div>

<div class="keep"><h2>技術スタック</h2>
<table class="skills">${skills.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table></div>

<h2>職務経歴</h2>${jobs}

<div class="keep"><h2>主な実績・プロジェクト</h2>
${projects.map(([n, u, d]) => `<div class="proj"><b>${esc(n)}</b><div>${esc(d)}<div class="url"><a href="https://${esc(u)}">${esc(u)}</a></div></div></div>`).join('<div style="height:4pt"></div>')}</div>

<div class="keep"><h2>学歴・修了課程</h2>
<table class="edu">${education.map(([y, s, d]) => `<tr><td>${esc(y)}</td><td>${esc(s)}<br><span class="meta">${esc(d)}</span></td></tr>`).join('')}</table></div>

<p class="end">以上</p>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.pdf({
  path: out,
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true,
  tagged: true,
  displayHeaderFooter: true,
  headerTemplate: '<span></span>',
  footerTemplate:
    '<div style="width:100%;font-size:7pt;color:#64748b;text-align:center;font-family:BIZ UDPGothic,Yu Gothic,Meiryo,sans-serif"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
});
await browser.close();
console.log(`Wrote ${path.relative(root, out)} (${asOfJa})`);
