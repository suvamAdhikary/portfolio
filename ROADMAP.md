# Portfolio Roadmap

This document tracks the evolution of Suvam Adhikary's portfolio website. **Update this file whenever significant work changes occur.**

## Timeline & Status

### ✅ Done (2026-10-13)

**Decision: Full rebuild with Astro instead of patching old React SPA**

- **Why Astro?** Static site generation for optimal SEO, perfect Lighthouse scores, zero client JS needed for content site, better performance than React SPA
- **Why new repo?** Clean slate for modern stack; old `portfolio_react` repository (https://github.com/suvamAdhikary/portfolio_react) will be archived after migration
- **Content strategy:** All content in git (data/profile.json + MDX) for version control and easy editing

**Core Infrastructure (2026-10-13)**

- [x] Scaffold Astro 5 project with strict TypeScript
- [x] Configure Tailwind CSS v4 with custom theme
- [x] Set up content collections with Zod schemas
- [x] Implement dark mode with accessible toggle
- [x] Configure self-hosted variable fonts (Inter)

**Pages & Components (2026-10-13)**

- [x] Homepage with all sections (hero, about, experience, case studies, projects, skills, education, contact)
- [x] Dynamic case study pages with MDX rendering
- [x] GitHub API integration for projects (with fallback)
- [x] Responsive layouts (mobile + desktop)
- [x] Header navigation and footer

**Content Templates (2026-10-13)**

- [x] Profile data structure (data/profile.json)
- [x] 4 case study templates with TODO placeholders:
  - Kafka Event Pipeline
  - GraphQL Federation Gateway
  - Kubernetes Deployment Pipeline
  - Resilient APIs with NestJS
- [x] Mermaid diagram slots in templates
- [x] Experience timeline structure
- [x] Curated projects section with featured and bootcamp projects (2026-10-13)
  - Featured: workflow-engine-backend, visucode (live link), identity-reconciliation, logic-composer, workflow-engine-frontend
  - Earlier work: Capdas-ECommerce, dineout_clone, Rhythm, MyGlamm-with-Backend, deliveroo-clone (labeled as 2021-23 bootcamp/team projects)
  - Excluded portfolio_react and other non-production repos
- [x] Real content from career documents (2026-10-13)
  - Experience timeline: All 4 employers (Neutrinos Apr 2026-Present, upGrad Jul 2024-Feb 2026, Educational Initiatives May 2023-Jun 2024, Lead School Jan 2022-May 2023) with real metrics and impact bullets
  - About section rewritten with real experience and achievements
  - Skills updated with actual technologies used (added MSSQL, k9s, Observability tools)
  - 3 real case studies created from STAR stories: MongoDB Performance Optimization (90% round-trip reduction, 5x throughput), Kafka Event Architecture (100K+ events/day, 21+ services), GraphQL Federation Gateway (20+ microservices, 60% incident reduction)
  - Removed 4 placeholder case studies that couldn't be supported by real work
  - All facts verified against resume and STAR story documents; no invented metrics or claims
- [x] Resume PDF added to public/ with phone number redacted (2026-10-13)
  - Removed +91-8101846457 and surrounding separator from header
  - Used PyMuPDF for true text redaction (not just visual covering)
  - Verified with text extraction: phone number completely removed
  - Web-safe resume available at /resume.pdf
- [x] Migrated to GitHub as source of truth (2026-10-13)
  - Pushed full main branch with history to https://github.com/suvamAdhikary/portfolio
  - GitHub repo will be connected to Vercel for deployment
  - Removed temporary Origin-hosted repository references

**SEO & Quality (2026-10-13)**

- [x] Open Graph and Twitter Card meta tags
- [x] JSON-LD Person schema
- [x] Sitemap generation
- [x] Robots.txt
- [x] Accessibility (ARIA labels, focus states, keyboard nav)
- [x] Favicon and OG image

**CI/CD & DevOps (2026-10-13)**

- [x] GitHub Actions PR checks (type check, lint, build, Lychee link check, Lighthouse CI)
- [x] Weekly deploy workflow (optional Vercel hook)
- [x] ESLint and Prettier configuration
- [x] .nvmrc, .gitattributes, .editorconfig

**Documentation (2026-10-13)**

- [x] Comprehensive README with setup, editing guide, deployment instructions
- [x] Local clone path documented (D:\mh\projects\portfolio)
- [x] Content editing guide for non-technical updates

**Not Done Yet:**

- [ ] No actual deployment to Vercel (keeping old site live until ready)
- [ ] No custom domain configured
- [ ] No redirect from old portfolio_react site

**Modern Futuristic UI/UX Redesign (2026-10-14)**

- [x] Animated hero section with lightweight canvas particle system (node-graph visualization)
- [x] Glassmorphism card effects throughout
- [x] Bento grid for key metrics and highlights
- [x] Command palette (Cmd/Ctrl+K) for quick navigation
- [x] Scroll-reveal animations with reduced-motion support
- [x] Animated metric counters with intersection observer
- [x] Sticky navigation with active section highlighting
- [x] Polished case study detail pages with enhanced typography
- [x] Strong editorial typography with gradient text effects
- [x] Engineering aesthetic: monospace accents, system visuals, terminal touches
- [x] Bold modern design: gradient/glow accents, motion, enhanced card layouts
- [x] All existing content preserved unchanged
- [x] SEO/OG/JSON-LD/sitemap maintained
- [x] WCAG AA accessibility maintained (contrast, keyboard, focus, reduced motion)
- [x] Performance optimized (minimal JS via Astro islands, lightweight canvas)
- [x] Pull request created: https://github.com/suvamAdhikary/portfolio/pull/1

---

**Self-hosted Fonts & CI Fixes (2026-10-14)**

- [x] Self-hosted Inter Variable via `@fontsource-variable/inter` (font-display: swap); removed Google Fonts links and preconnects; preloaded latin subset
- [x] Tailwind v4 theme font tokens fixed (`--font-sans` / `--font-mono`) so utilities use 'Inter Variable'
- [x] Inlined stylesheets (`build.inlineStylesheets: 'always'`) to remove render-blocking CSS
- [x] Lighthouse CI a11y fixes: removed nested links in project cards (stretched-link pattern), aligned hero scroll-cue accessible name with visible text
- [x] Lighthouse CI perf fixes: hero canvas uses ResizeObserver (no layout reads in the draw loop) and pauses off-screen; sticky nav defers initial geometry reads
- [x] lychee link check excludes loopback, localhost, and `*.vercel.app` preview URLs via `.lycheeignore`
- Local LHCI: performance 0.97, accessibility 1.0, best-practices 1.0, SEO 1.0 (no assertion errors; thresholds unchanged)

**Dark Mode Fix (2026-10-14)**

- [x] Tailwind v4 class-based dark variant (`@custom-variant dark (&:where(.dark, .dark *))`); previously `dark:` utilities only followed the OS media query, so the toggle had no visible effect
- [x] No-flash head script: stored choice wins, otherwise prefers-color-scheme; no longer persists the OS default as a choice
- [x] Theme toggle wired by data attribute (fixes duplicate ids across headers), icons switch via CSS, `aria-pressed` state, follows OS changes until user chooses

**Case Study Pages Redesign (2026-10-14)**

- [x] Root cause: `global.css` (Tailwind) was only imported by `index.astro`, so case study pages shipped with no Tailwind CSS; also `prose` classes had no plugin. Moved the import into `BaseLayout` and added `@plugin '@tailwindcss/typography'`
- [x] Redesigned `/case-studies/[slug]`: glass header card (title, summary, date, reading time, stack tags), glass prose card, sticky "On this page" TOC (desktop), prev/next navigation
- [x] Shiki dual theme (github-light / github-dark) switched by the `.dark` class
- [x] Mermaid diagrams rendered client-side (lazy-loaded, light/dark themed) instead of raw code
- [x] `og:type` = article and TechArticle JSON-LD on case study pages; content unchanged

**Builds Section (2026-10-16)**

- [x] New "Builds" section below Projects with glass cards for live deployed builds: Lemonade Day, DevArcade, Framekar (live URLs verified 200 on 2026-10-16)
- [x] Data-driven: add an entry to `data/builds.json` plus a 1280x800 WebP in `src/assets/builds/` to add a build; Astro `<Image>` with alt text
- [x] Added to the sticky nav and command palette; external links use `rel="noopener noreferrer"`
- Source repos are private, so cards link to the live site only (no repo links); stack tags come from each repo's README/package.json

**Responsive UX Pass (2026-10-20)**

- [x] Audit at 360/390/768/1024/1440/1920 px in light and dark (headless Chromium) plus Lighthouse mobile and desktop
- [x] Mobile menu (hamburger, below 1024px) with all sections; header controls are now 44px tap targets; `aria-current` on the active section
- [x] Fixed horizontal overflow on phones (the contact row didn't wrap); fluid hero type (`clamp`), `100svh` hero, safe-area insets (`viewport-fit=cover`, notch and home-indicator padding)
- [x] Command palette: visible touch trigger, close button, top-aligned on phones, body scroll lock, focus return; links work from case study pages (`/#section`)
- [x] Smooth scrolling only when motion is allowed (removed the unconditional `scroll-smooth`); `scroll-margin-top` so headings clear the fixed header; header stays visible after in-page jumps
- [x] Back-to-top button; footer Builds link and 44px footer links
- [x] Case studies: collapsible "On this page" TOC on mobile/tablet; mermaid loads lazily when near the viewport (mobile TBT from 1,120 ms to 0 ms); high-contrast light Shiki theme (fixes a contrast failure)
- [x] Playwright navigation e2e suite (`tests/e2e/navigation.spec.ts`, 25 tests x 5 viewports x 2 themes) wired into CI as an `e2e` job

**Impact Counters Fix (2026-11-02)**

- [x] Bento impact counters now render their real final values in the static HTML (`100,000+`, `90`, `5`, `60`, `4`) instead of `0`, so crawlers, link previews, no-JS visitors and screen readers get the real numbers (a visually hidden copy carries the value; the animated digits are `aria-hidden`)
- [x] Count-up is a progressive enhancement: only counters still off-screen when the script runs reset to 0 and animate when 50% visible; counters already visible keep the final value; skipped entirely under `prefers-reduced-motion`
- [x] Zero layout shift: `tabular-nums` plus a `min-width` in `ch` reserves the final width, so the box never changes when the animation starts (CLS 0 at 375, 768 and 812x375)
- [x] Each metric is labelled with its source company: 100K+ events/day, 90% fewer DB round-trips, 5x throughput and 60% fewer incidents are all "at upGrad Education" (verified against `data/profile.json`, the three case studies and `public/resume.pdf`); "4 years in backend" is career-wide and left unlabelled

**Mobile-first rule check (21 Oct 2026 rule, checked 2026-11-02)**

- [x] The responsive pass in `feat/responsive-ux` (merged to main as PR #6) covers the rule: mobile menu below 1024px, 44px tap targets, no horizontal overflow, fluid hero type, safe-area insets, mobile TOC, Playwright suite across 5 viewports
- Remaining gaps noticed at 375/768 (see Next):
  - Landscape phone (812x375): the `100svh` hero fills the whole short viewport, so the first content sits below the fold; the fixed header takes a large share of the height
  - At 375 the bento cards stack one per row, making the highlights section very long; the two small metric cards (90 / 5) could sit two-up on phones
  - At 768 the `md:` 3-column bento leaves the "Experience" card alone on a row with empty space beside it

### 🚧 In Progress

**Zen garden, stage 1: home garden (2026-11-19, in review on `feat/zen-garden`)**

- [x] `src/components/ZenGarden.astro` renders right after the hero, before the impact counters; all other sections unchanged
- [x] Interactive karesansui on plain Canvas 2D, ported from the approved prototype to TypeScript (`src/scripts/zen-garden.ts`): five stones (Payments, GraphQL gateway, Kafka, Consumers, MongoDB), messages as glints along raked streams, tap a stone to add load (lag builds at Consumers, then clears), hold or press F to simulate a failure with realistic recovery
- [x] Follows the site theme live (`html.dark` + the header toggle); moonlit night theme with a glowing lantern
- [x] Accessibility: canvas `role="img"` with a description, real `<button>` per stone (keyboard: Enter adds load, F fails), `aria-live` status line, still frame under `prefers-reduced-motion`, pauses off-screen and when the tab is hidden
- [x] SEO: heading, intro and caption are real HTML; no company names in the garden (the upGrad figures stay in the counters)
- [x] Performance: script is a separate ~13 KB gzipped chunk, dynamically imported only when the garden is within 200px of the viewport and in `requestIdleCallback`; initial JS added is ~1.5 KB gzipped (loader + Vite preload helper); canvas box reserved with `aspect-ratio` (CLS 0)
- [x] Static WebP fallback (light/dark, phone and wide crops via `astro:assets`): `<noscript>` for no-JS, and a `<template>` inserted after page load so it never competes with LCP
- [x] First-draw trimmed versus the prototype: rocks, moss and shadows render into small offscreen canvases at their own size, river pebbles are one seamless tile, colour batches are single fills, DPR capped at 2, no `ctx.filter` (cheap downscale blur works the same in Safari). Measured in headless Chrome with 4x CPU throttling (software canvas, so pessimistic): phone 375x812@2x about 0.3 s (prototype about 0.65 s), desktop 1440x900 about 0.38 s (prototype about 0.9 s)
- [x] Playwright: `tests/e2e/zen-garden.spec.ts` (section order and crawlable text, lazy init after scrolling, theme toggle, reduced-motion still frame) across all 10 viewport/theme projects; full suite 290 passing
- [x] Lighthouse on the local build (gzip static server): 100 / 100 / 100 / 100 mobile and desktop, CLS 0, before and after

**Zen garden v2: seasonal + playful (2026-11-25, merged to `main` as PR #9 from `feat/zen-garden-v2`)**

- [x] Replaced the stage 1 garden with the approved v2 prototype ("yah, better"), ported to typed TypeScript in `src/scripts/zen-garden.ts` (same `mountGarden(root, statusEl, hintId)` entry point, so `ZenGarden.astro` keeps its lazy IntersectionObserver + idle boot, inlined boot script, reserved `aspect-ratio` box and `<template>` fallback)
- [x] Seasons: spring sakura, summer leaves and fireflies at night, autumn momiji, winter snow on white sand; defaults to today's season, with a 春夏秋冬 switcher above the garden (marks today's season)
- [x] A real garden from above: moss islands, natural streams with pebble banks, an irregular Kafka pond, a koi pond with chain-bodied koi, a red bridge, a stone lantern and a leafy canopy built from leaf and blossom sprites
- [x] Playful: drag to rake the sand (raked lines survive season and theme switches), tap a stone to send a burst of lantern-events, hold it (or press F) to crack the stone and watch producers or Kafka buffer then recover, tap the pond to feed the koi, the tree to shake it, the lantern to light it; a ghost rake demonstrates on first view
- [x] Dark theme is a lantern-lit evening: the tint is baked into the static layers, so there is no per-frame overlay; glows use additive blending
- [x] Accessibility: real buttons for all five stones plus the pond, tree and lantern (Enter acts, F fails a stone), `aria-live` status, labels showing Kafka's buffer and MongoDB's saved count, still frame under `prefers-reduced-motion` (taps and rakes still redraw it, and it follows changes to the setting live)
- [x] Performance: garden chunk 20.9 KB gzipped (was 12.9 KB), still only requested near the viewport; the heavy tree layer builds in idle time after the first frame. 60 fps median under 4x CPU throttling on phone and desktop. Lighthouse on the box (LHCI 0.15.1, 3 runs): desktop 100/100/100/100, mobile 96-98/100/100/100 (base commit on the same box: 97), CLS 0, network-dependency-tree-insight 1
- [x] Static WebP fallbacks regenerated from the new garden (light/dark, wide/tall; autumn)
- [x] Playwright: `tests/e2e/zen-garden.spec.ts` updated for the new status texts, plus season switcher, keyboard pond/lantern and reduced-motion rake tests; full suite 310 passing
- [ ] Pre-existing, not from the garden: LHCI's desktop `label-content-name-mismatch` assertion fails on the header's `#command-trigger` button (also fails on the base commit)


**English + Japanese localisation (2026-11-26, in review on `feat/i18n-ja`)**

Approved plan: a real Japanese edition for Japanese recruiters and hiring managers, not a word-for-word translation.

- [x] Routes: English stays at `/` (no prefix); every page is mirrored under `/ja/` (`/ja/`, `/ja/case-studies/<slug>/`). Astro `i18n` config (`prefixDefaultLocale: false`); helpers in `src/i18n/config.ts`
- [x] Shared pages: `src/components/HomePage.astro` and `src/components/CaseStudyPage.astro` render either locale; `src/pages/index.astro` and `src/pages/ja/index.astro` (and the two `[slug].astro` routes) are thin wrappers. English output is unchanged apart from the new switch
- [x] Copy: interface strings in `src/i18n/ui.ts`; Japanese wording for profile, builds and project blurbs in `data/i18n/ja.json` (overlays `data/profile.json` and `data/builds.json`, so facts, figures and dates have one source); Japanese case studies in `src/content/case-studies-ja/` (same slugs, code blocks identical to English)
- [x] Japanese conventions: です/ます prose, 職務経歴 / 学歴・修了課程 headings, dates as `2024年7月〜2026年2月` and `2026年4月〜現在`, `在籍中` badge, `4.5年以上`, 学歴 oldest first, `1万5千人以上` / `1日10万件以上`; résumé button says it is the English PDF (英文レジュメ). No claims added that the English site lacks (no Japanese level, visa or relocation statements)
- [x] Case studies reordered for `/ja/`: Kafka (reliability, no lost events through partial failures), GraphQL Federation (architecture at scale, 60% fewer incidents), then MongoDB (performance). English keeps MongoDB, Kafka, GraphQL
- [x] Zen garden on `/ja/`: heading, intro, caption, hint, canvas description, season switcher (春 夏 秋 冬 as the labels), stone/pond/tree/lantern button names and every `aria-live` status line in Japanese. The Japanese table ships as a data attribute on the section; the lazy garden chunk grew by about 0.2 KB gzipped
- [x] Header switch (`EN | 日本語`) on desktop and mobile, 44px targets, goes to the same page in the other language and keeps the home section (`/#experience` ↔ `/ja/#experience`). Choosing a language stores it in `localStorage` (`locale`); a returning visitor who chose 日本語 is sent from an English URL to its `/ja/` twin only on a fresh entry (typed URL, bookmark, external link), never on back/forward or reload, never from another page of the site, and never with `?lang=en`. Crawlers and first-time visitors are never redirected
- [x] SEO: `<html lang>`, self canonical, `hreflang` en / ja / x-default (absolute URLs) on every page pair, per-locale title, description, `og:locale` (`en_US` / `ja_JP`) and `og:locale:alternate`; `TechArticle.inLanguage`; sitemap lists all 8 URLs with `xhtml:link` alternates
- [x] Japanese typography without a webfont download: system Japanese fonts after Inter (Hiragino, Yu Gothic, Meiryo, Noto Sans CJK), `line-break: strict`, phrase-aware wrapping for headings (`word-break: auto-phrase`), looser line height for body text, `palt` on headings
- [x] Playwright: `tests/e2e/i18n.spec.ts` (hreflang/canonical/og on all 4 pairs, sitemap, links stay in `/ja/`, case-study order, Japanese dates, switch + persistence + back button, palette, footer, Japanese case study TOC and prev/next, builds live-only, Japanese garden, no horizontal overflow) across all 10 viewport/theme projects
- [x] Lighthouse on the box (local preview, 3 runs each): `/` and `/ja/` desktop 100/100/100/100, mobile 100/100/100/100, CLS 0
- [ ] Suvam to review the Japanese copy (ideally with a native reader) before merge; optional: katakana reading of the name, Japanese level, work-authorisation or relocation lines, only if he wants them stated
- [ ] After deploy: submit the sitemap again in Search Console and check the `/ja/` pages are indexed with the right `hreflang`

---

### 📋 Next

**SEO audit (2 Nov 2026)** — audited the live site (https://suvamadhikary.vercel.app/) and the local build. Fixes below are proposals only; held until Suvam approves.

Passes:

- Unique `<title>`, meta description and canonical on every page (home + 3 case studies)
- Open Graph (`og:title/description/type/url/image`) and Twitter `summary_large_image` cards on every page; `og:type=article` on case studies
- JSON-LD: `Person` on home; `TechArticle` (with author `Person`) on each case study
- `robots.txt` (allow all, points to `sitemap-index.xml`) and `sitemap-index.xml` → `sitemap-0.xml` listing all 4 URLs (live: 200)
- Semantic headings: exactly one `<h1>` per page, h2 → h3 → h4 order with no skipped levels
- Lighthouse (local preview, 2026-11-02): 100 / 100 / 100 / 100 mobile and desktop, CLS 0
- Google Search Console HTML verification file is in `public/` (`googleb…html`)

Missing / proposed fixes:

- [x] Counters fix is live (PR #7 merged; production HTML shows `100,000+`, checked 2026-11-19)
- [ ] No `ProfilePage` JSON-LD: wrap the home `Person` as `ProfilePage.mainEntity` (with `dateModified`)
- [ ] No PWA web manifest or touch icons: add `site.webmanifest` (name, short_name, `theme_color`, `background_color`, 192/512 PNG + maskable icons), `apple-touch-icon.png`, and `<meta name="theme-color">` for light/dark
- [ ] Open Graph extras: add `og:site_name`, `og:locale`, `og:image:width/height/alt` and `twitter:image:alt`; consider a per-case-study OG image (all pages share `og-image.png`)
- [ ] `TechArticle`: add `dateModified`, `image`, `mainEntityOfPage` and `publisher` where missing
- [ ] Sitemap has no `<lastmod>`: enable `lastmod` in `@astrojs/sitemap` (`/sitemap.xml` returns 404; fine because robots.txt points at the index, but submit `sitemap-index.xml` in Search Console)
- [ ] Search Console: confirm the property is verified for `suvamadhikary.vercel.app`, submit the sitemap, request indexing for the 4 URLs, then re-check Rich Results for `Person`/`ProfilePage`/`TechArticle`
- [ ] Re-run Lighthouse on production after deploy (local scores are 100; production not re-measured here)

**Zen garden: next stages (plan approved 2026-11; build each only after Suvam says go)**

- [ ] Stage 2: case-study request walkthroughs, a short tap-through at the top of each case study in the garden style (a Kafka event through partitions, a GraphQL query fanning out, a payment with retries and idempotency)
- [ ] Stage 3: skills view, a toggle or search that regroups the same stones by meaning ("payments", "Kafka", "LLM"), grouping computed ahead of time (no live AI)
- [ ] Stage 4: Builds stones, a tiny stone per game card (Lemonade Day, DevArcade, Framekar) that ripples on hover and links to the live game
- [ ] Stage 5: a "behind the garden" note on how the scene is built (seasonal touches shipped in v2)
- [ ] Garden polish to consider: split the first build across frames to shorten the one long task on slow phones; regenerate the fallback WebPs whenever the garden's look changes

**Mobile follow-ups (from the 2026-11-02 check)**

- [ ] Landscape phones: cap the hero at a sensible height when `orientation: landscape` and `max-height: 500px`
- [ ] Phones: consider two-up layout for the small bento metric cards; tidy the lone card on the 768 bento row

### 📋 Next — first deployment (Target: 2026-10-20)

**First Deployment**

- [ ] Review and finalize all content before deployment
- [ ] Set up Vercel project
- [ ] Configure environment variables (optional GITHUB_TOKEN for higher API limits)
- [ ] Deploy to Vercel production
- [ ] Verify Lighthouse scores in production (~100 target)
- [ ] Test all pages and functionality in production
- [ ] Confirm sitemap is accessible
- [ ] Validate Open Graph preview on social platforms

---

### 🔮 Later (Target: 2026-11-01)

**Custom Domain Migration**

- [ ] Purchase/configure custom domain (if not already owned)
- [ ] Add custom domain to Vercel project
- [ ] Update `astro.config.mjs` with production domain
- [ ] Update robots.txt sitemap URL
- [ ] Verify DNS propagation
- [ ] Set up SSL certificate (automatic via Vercel)

**Old Site Retirement**

- [ ] Add prominent redirect banner to old portfolio_react site pointing to new domain
- [ ] Set up 301 redirects from old Vercel deployment
- [ ] Update LinkedIn profile link to new portfolio
- [ ] Update GitHub profile README with new link
- [ ] Archive portfolio_react repository on GitHub
- [ ] Add "Archived - See new portfolio at [link]" notice to old repo README

**Analytics & Monitoring (Optional)**

- [ ] Consider adding privacy-friendly analytics (Plausible, Fathom, or Vercel Analytics)
- [ ] Set up uptime monitoring (if desired)
- [ ] Configure Vercel deploy notifications

**Content Enhancements (Optional)**

- [ ] Add blog/writing section if desired (collection is scaffolded, just needs content)
- [ ] Add more projects with detailed descriptions
- [ ] Consider adding testimonials/recommendations section
- [ ] Add certifications or awards section if applicable

---

## Key Decisions Log

### UI/UX Redesign (2026-10-14)

- **Decision:** Modern futuristic design blending minimal/editorial with engineering aesthetics
- **Date:** 2026-10-14
- **Rationale:**
  - Original design was too plain and traditional for a backend engineer portfolio
  - Animated canvas hero creates immediate visual impact without heavy 3D libraries
  - Bento grid efficiently showcases key metrics and achievements
  - Command palette (Cmd+K) provides power-user navigation matching developer expectations
  - Glassmorphism and gradient effects add depth while maintaining performance
  - Scroll animations create engagement without compromising accessibility
  - Sticky nav with active sections improves navigation UX
  - Enhanced typography and spacing create editorial quality
  - All animations respect prefers-reduced-motion for accessibility
  - Maintained existing SEO/accessibility/performance standards
  - Design benchmarked against top developer portfolios (Linear, Vercel, Stripe careers)

### Zen garden (2026-11-19)

- **Decision:** One small interactive piece on an otherwise fast static site: a Japanese dry garden whose stones are the kinds of systems Suvam builds. Original concept (no car, no toy world), tied to backend work and Japan
- **Date:** 2026-11-19
- **Rationale:** Explains distributed-systems behaviour (load, lag, failure, recovery) instead of decoration; plain Canvas 2D keeps it tiny; lazy loading, a reserved box and a static fallback keep Core Web Vitals and SEO intact
- **Stages:** 1 home garden (in review) → 2 case-study walkthroughs → 3 skills view → 4 Builds stones → 5 seasonal touches

### Future split (2026-11-02)

- **Decision:** Keep this project a single static Astro site (per Suvam's 2 Nov rule); no restructuring now
- **Date:** 2026-11-02
- **If it ever grows a backend** (e.g. a contact API or a blog CMS), treat it as a product folder: `portfolio/apps/web` (this Astro site) + `portfolio/services/api` (the backend), each with its own build and deploy

### Technology Stack

- **Decision:** Astro 5 over Next.js
- **Date:** 2026-10-13
- **Rationale:**
  - Pure content site benefits from static generation
  - Zero JavaScript by default = better performance
  - Perfect Lighthouse scores achievable
  - Simpler architecture than Next.js for this use case
  - MDX support is first-class
  - Better SEO out of the box

### Repository Strategy

- **Decision:** New repository instead of updating old one
- **Date:** 2026-10-13
- **Rationale:**
  - Complete technology shift (React SPA → Astro static)
  - Fresh Git history for cleaner maintenance
  - Old repo remains stable reference until migration complete
  - Cleaner to archive old repo after successful migration

### Content Management

- **Decision:** Content in Git (JSON + MDX) instead of CMS
- **Date:** 2026-10-13
- **Rationale:**
  - Version control for all content changes
  - No external dependencies or API calls
  - Type-safe with Zod schemas
  - Easy to edit in any text editor
  - Better performance (no runtime fetching)
  - Simpler deployment (no database)

### Deployment Strategy

- **Decision:** Vercel as hosting platform
- **Date:** 2026-10-13
- **Rationale:**
  - Free tier sufficient for personal site
  - Automatic deployments from Git
  - Edge network for global performance
  - Easy custom domain setup
  - Built-in analytics option
  - Excellent Astro support

### Dark Mode

- **Decision:** System preference + toggle with localStorage
- **Date:** 2026-10-13
- **Rationale:**
  - Respects user's OS preference by default
  - Allows manual override
  - No flash of unstyled content
  - Accessible toggle component

---

## Project URLs

- **Old Portfolio (React SPA):** https://suvam-adhikary-portfolio-react.vercel.app/
- **Old Repository:** https://github.com/suvamAdhikary/portfolio_react
- **New Repository:** https://github.com/suvamAdhikary/portfolio
- **New Production URL:** _(To be deployed via Vercel)_
- **Custom Domain:** _(To be configured)_

---

## Maintenance Notes

- Content updates should be made in `data/profile.json` and `src/content/case-studies/*.mdx`; mirror any wording change in `data/i18n/ja.json` and `src/content/case-studies-ja/*.mdx` (Japanese). Interface strings live in `src/i18n/ui.ts`
- Major structural changes should be documented in this roadmap
- Keep the "Done" section as historical record
- Move completed items from "Next" to "Done" with completion date
- Update project URLs section as deployment progresses

**Last Updated:** 2026-11-26
