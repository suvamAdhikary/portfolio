// @ts-check
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

/**
 * Vite wraps every dynamic `import()` with `__vitePreload` from a separate
 * `preload-helper` chunk. That extra file is a second critical hop
 * (`document → boot.js → preload-helper.js`) and fails Lighthouse CI's
 * `network-dependency-tree-insight` (LHCI 0.15 recommended preset).
 *
 * `build.modulePreload.polyfill: false` only skips the *modulepreload
 * feature* polyfill, not this helper, so fold the helper into its importers.
 * The lazy garden chunk stays code-split.
 *
 * @returns {import('vite').Plugin}
 */
function inlineVitePreloadHelper() {
  return {
    name: 'inline-vite-preload-helper',
    apply: 'build',
    enforce: 'post',
    generateBundle(_opts, bundle) {
      for (const [helperFile, helper] of Object.entries(bundle)) {
        if (helper.type !== 'chunk' || !helper.fileName.includes('preload-helper')) {
          continue;
        }
        const exportMatch = helper.code.match(/export\s*\{([^}]+)\}/);
        if (!exportMatch) {
          this.warn(`Could not parse exports in ${helper.fileName}`);
          continue;
        }
        /** @type {Record<string, string>} */
        const exportMap = {};
        for (const part of exportMatch[1]
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)) {
          const m = part.match(/^(\w+)(?:\s+as\s+(\w+))?$/);
          if (m) exportMap[m[2] || m[1]] = m[1];
        }
        const helperBody = helper.code.replace(/export\s*\{[^}]+\}\s*;?\s*$/, '');
        const returnObj = Object.entries(exportMap)
          .map(([exp, local]) => `${exp}: ${local}`)
          .join(', ');

        for (const chunk of Object.values(bundle)) {
          if (chunk.type !== 'chunk' || chunk.fileName === helper.fileName) continue;
          const importRe = /import\s*\{([^}]+)\}\s*from\s*["'][^"']*preload-helper[^"']*["']\s*;?/;
          const im = chunk.code.match(importRe);
          if (!im) continue;
          const bindings = [];
          for (const part of im[1]
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)) {
            const m = part.match(/^(\w+)(?:\s+as\s+(\w+))?$/);
            if (m) bindings.push({ imported: m[1], local: m[2] || m[1] });
          }
          const prelude =
            `const __vitePreloadHelper = (() => { ${helperBody} return { ${returnObj} }; })();\n` +
            bindings.map((b) => `const ${b.local} = __vitePreloadHelper.${b.imported};\n`).join('');
          chunk.code = chunk.code.replace(importRe, () => prelude);
          if (Array.isArray(chunk.imports)) {
            chunk.imports = chunk.imports.filter((id) => id !== helper.fileName);
          }
        }
        delete bundle[helperFile];
      }
    },
  };
}

/**
 * Astro will not inline a page script that uses dynamic `import()`, so the
 * garden boot file is emitted as a separate high-priority request. Lighthouse's
 * `network-dependency-tree-insight` fails on any critical chain of length >= 2
 * (document + one script). Inline the boot script into the HTML and rewrite
 * its relative `import()` to `/_astro/...` so the canvas chunk stays lazy.
 *
 * @returns {import('astro').AstroIntegration}
 */
function inlineGardenBootScript() {
  return {
    name: 'inline-garden-boot-script',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const dist = fileURLToPath(dir);
        const astroDir = path.join(dist, '_astro');
        if (!fs.existsSync(astroDir)) return;
        const bootFiles = fs
          .readdirSync(astroDir)
          .filter((f) => f.startsWith('ZenGarden.astro_astro_type_script') && f.endsWith('.js'));
        if (bootFiles.length === 0) return;

        /** @param {string} dirPath @returns {Generator<string>} */
        function* walkHtml(dirPath) {
          for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
            const full = path.join(dirPath, entry.name);
            if (entry.isDirectory()) yield* walkHtml(full);
            else if (entry.name.endsWith('.html')) yield full;
          }
        }

        const used = new Set();
        for (const htmlPath of walkHtml(dist)) {
          let html = fs.readFileSync(htmlPath, 'utf8');
          let changed = false;
          for (const boot of bootFiles) {
            const escaped = boot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const srcRe = new RegExp(`<script type="module" src="/_astro/${escaped}"></script>`);
            if (!srcRe.test(html)) continue;
            let code = fs.readFileSync(path.join(astroDir, boot), 'utf8');
            code = code.replace(
              /import\((['"`])\.\/([^'"`]+)\1\)/g,
              (_m, q, file) => `import(${q}/_astro/${file}${q})`
            );
            html = html.replace(srcRe, `<script type="module">${code}</script>`);
            used.add(boot);
            changed = true;
          }
          if (changed) fs.writeFileSync(htmlPath, html);
        }
        for (const boot of used) fs.unlinkSync(path.join(astroDir, boot));
        if (used.size) logger.info(`Inlined garden boot script (${[...used].join(', ')})`);
      },
    },
  };
}

// https://astro.build/config
export default defineConfig({
  site: 'https://suvamadhikary.vercel.app',
  output: 'static',
  build: {
    // Inline CSS to avoid a render-blocking stylesheet request
    inlineStylesheets: 'always',
  },
  // English at `/` (no prefix), Japanese mirrored under `/ja/`. Routing helpers live in
  // src/i18n/config.ts; BaseLayout emits hreflang/og:locale for every page pair.
  i18n: {
    locales: ['en', 'ja'],
    defaultLocale: 'en',
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    mdx(),
    // Adds <xhtml:link rel="alternate" hreflang> entries for each en/ja page pair
    sitemap({ i18n: { defaultLocale: 'en', locales: { en: 'en', ja: 'ja' } } }),
    inlineGardenBootScript(),
  ],
  vite: {
    plugins: [tailwindcss(), inlineVitePreloadHelper()],
    build: {
      // No modulepreload feature-detection polyfill; modern browsers support it.
      // This does not remove Vite's preload-helper chunk (see plugin above).
      modulePreload: { polyfill: false },
    },
  },
  markdown: {
    syntaxHighlight: {
      type: 'shiki',
      // Mermaid fences are rendered client-side as diagrams
      excludeLangs: ['mermaid'],
    },
    shikiConfig: {
      // High-contrast light theme keeps token colours above WCAG AA on light backgrounds
      themes: { light: 'github-light-high-contrast', dark: 'github-dark' },
      defaultColor: false,
    },
  },
});
