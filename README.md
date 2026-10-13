# Suvam Adhikary - Portfolio

Modern, performant portfolio website built with Astro 5, TypeScript, and Tailwind CSS.

## 🚀 Tech Stack

- **Framework:** Astro 5 (static site generation)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4
- **Content:** MDX with Zod schemas
- **Deployment:** Vercel
- **CI/CD:** GitHub Actions

## 🛠️ Development

### Prerequisites

- Node.js v22.12.0+ (specified in `.nvmrc`)
- npm

### Local Setup

```bash
# Install dependencies
npm install

# Start dev server (runs on port 43123)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Local Clone Path

**Windows:** `D:\mh\projects\portfolio`

## 📝 Editing Content

### Profile Information

Edit `data/profile.json` to update:
- Personal details (name, title, location, tagline)
- Contact information and social links
- Experience timeline
- Skills by category
- Education
- "Open to roles" badge (set `openToRoles: true/false`)

### Case Studies

Case studies are MDX files in `src/content/case-studies/`.

To add a new case study:

1. Create a new `.mdx` file in `src/content/case-studies/`
2. Add frontmatter with required fields:

```yaml
---
title: "Your Case Study Title"
description: "Brief description"
publishDate: 2024-01-15
tags: ["Node.js", "TypeScript", "Kafka"]
featured: true
draft: false
order: 1
---
```

3. Write your content in Markdown/MDX
4. Use Mermaid for diagrams (see existing case studies for examples)

### Projects

Projects are automatically fetched from GitHub at build time. Set `GITHUB_TOKEN` environment variable for higher API rate limits (optional).

## 🎨 Customization

### Colors

Edit Tailwind theme in `src/styles/global.css`:

```css
@theme {
  --color-primary-500: oklch(0.55 0.20 250); /* Adjust primary color */
}
```

### Site URL

Update `site` in `astro.config.mjs`:

```js
export default defineConfig({
  site: 'https://your-domain.com',
  // ...
});
```

Update `robots.txt` with your sitemap URL.

## 🚢 Deployment to Vercel

### Initial Setup

1. Push your code to GitHub
2. Import the repository in Vercel
3. Configure build settings:
   - **Framework Preset:** Astro
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

### Environment Variables (Optional)

- `GITHUB_TOKEN`: GitHub personal access token for higher API rate limits

### Custom Domain

1. Go to Vercel project settings → Domains
2. Add your custom domain
3. Update `site` in `astro.config.mjs` with your domain
4. Update canonical URLs in `robots.txt`

## 🔄 GitHub Actions CI/CD

### Workflows

**Pull Request Checks** (`.github/workflows/ci.yml`):
- Type checking with `astro check`
- ESLint validation
- Build verification
- Link checking with Lychee
- Lighthouse CI performance audits

**Weekly Deployment** (`.github/workflows/weekly-deploy.yml`):
- Scheduled: Every Monday at 9 AM UTC
- Manual trigger available
- Calls Vercel deploy hook to rebuild site

### Setup Deploy Hook

1. In Vercel: Settings → Git → Deploy Hooks
2. Create a new deploy hook (name: "Weekly Deploy", branch: "main")
3. Copy the hook URL
4. In GitHub: Settings → Secrets and variables → Actions → Variables
5. Add repository variable: `VERCEL_DEPLOY_HOOK_URL` = `<your-hook-url>`

## 📊 Features

✅ Server-side rendered at build time (static HTML)  
✅ Content collections with Zod validation  
✅ Responsive design (mobile-first)  
✅ Dark mode with accessible toggle  
✅ SEO optimized (meta tags, Open Graph, Twitter Cards)  
✅ JSON-LD structured data  
✅ Sitemap generation  
✅ GitHub API integration for projects  
✅ Mermaid diagrams in case studies  
✅ Lighthouse score ~100  
✅ Self-hosted variable fonts  
✅ Accessible (ARIA labels, keyboard navigation, focus states)

## 📁 Project Structure

```
/
├── .github/
│   └── workflows/          # GitHub Actions
├── data/
│   └── profile.json        # Personal data
├── public/
│   ├── favicon.svg
│   ├── og-image.png
│   └── robots.txt
├── src/
│   ├── components/         # Reusable components
│   ├── content/
│   │   ├── case-studies/   # MDX case studies
│   │   └── config.ts       # Content schemas
│   ├── layouts/            # Page layouts
│   ├── pages/              # Route pages
│   └── styles/
│       └── global.css      # Global styles
├── astro.config.mjs        # Astro configuration
├── tailwind.config.js      # Tailwind configuration
├── tsconfig.json           # TypeScript config
├── .nvmrc                  # Node version
├── .editorconfig           # Editor settings
├── .gitattributes          # Git line endings
└── package.json
```

## 🧪 Quality Checks

Run all checks locally:

```bash
# Type checking
npx astro check

# Linting
npm run lint

# Format code
npm run format

# Build
npm run build
```

## 📄 License

Personal portfolio - all rights reserved.

## 👤 Contact

**Suvam Adhikary**  
Backend Engineer | Bengaluru, India

- GitHub: [@suvamAdhikary](https://github.com/suvamAdhikary)
- LinkedIn: [suvam-adhikary](https://www.linkedin.com/in/suvam-adhikary)

---

Built with [Astro](https://astro.build) 🚀
