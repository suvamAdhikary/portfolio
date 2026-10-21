// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://suvamadhikary.vercel.app',
  output: 'static',
  build: {
    // Inline CSS to avoid a render-blocking stylesheet request
    inlineStylesheets: 'always',
  },
  integrations: [mdx(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
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
