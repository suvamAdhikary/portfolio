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

### 🚧 In Progress

_Currently empty - no active development_

---

### 📋 Next (Target: 2026-10-20)

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

- Content updates should be made in `data/profile.json` and `src/content/case-studies/*.mdx`
- Major structural changes should be documented in this roadmap
- Keep the "Done" section as historical record
- Move completed items from "Next" to "Done" with completion date
- Update project URLs section as deployment progresses

**Last Updated:** 2026-10-14
