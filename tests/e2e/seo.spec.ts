import { test, expect, type APIRequestContext } from '@playwright/test';

// Structured data, social cards, icons and the sitemap for every EN + JA page.
const SITE = 'https://suvamadhikary.vercel.app';
const STUDIES = [
  { slug: 'kafka-event-architecture', key: 'kafka' },
  { slug: 'graphql-federation-gateway', key: 'graphql' },
  { slug: 'mongodb-optimization', key: 'mongodb' },
] as const;

type Page = { path: string; locale: 'en' | 'ja'; og: string; kind: 'home' | 'case' };
const PAGES: Page[] = [
  { path: '/', locale: 'en', og: '/og/home-en.png', kind: 'home' },
  { path: '/ja/', locale: 'ja', og: '/og/home-ja.png', kind: 'home' },
  ...STUDIES.flatMap(({ slug, key }): Page[] => [
    { path: `/case-studies/${slug}/`, locale: 'en', og: `/og/${key}-en.png`, kind: 'case' },
    { path: `/ja/case-studies/${slug}/`, locale: 'ja', og: `/og/${key}-ja.png`, kind: 'case' },
  ]),
];

/** Every JSON-LD block of a page, parsed (throws on invalid JSON). */
async function jsonLd(request: APIRequestContext, path: string) {
  const html = await (await request.get(path)).text();
  const blocks = [
    ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
  ].map((m) => JSON.parse(m[1]));
  return { html, blocks };
}

/** Value of `<meta property|name="key" content="...">` in raw HTML. */
function meta(html: string, key: string) {
  const re = new RegExp(
    `<meta (?:property|name)="${key.replace(/[:]/g, '\\:')}" content="([^"]*)"`
  );
  return html.match(re)?.[1];
}

const png = (buf: Buffer) => ({
  signature: buf.subarray(0, 8).toString('hex'),
  width: buf.readUInt32BE(16),
  height: buf.readUInt32BE(20),
});
const PNG_SIGNATURE = '89504e470d0a1a0a';

test.describe('SEO: structured data', () => {
  for (const locale of ['en', 'ja'] as const) {
    const path = locale === 'en' ? '/' : '/ja/';
    test(`ProfilePage JSON-LD on ${path}`, async ({ request }) => {
      const { blocks } = await jsonLd(request, path);
      expect(blocks).toHaveLength(1);
      const [ld] = blocks;
      expect(ld['@context']).toBe('https://schema.org');
      expect(ld['@type']).toBe('ProfilePage');
      expect(ld.url).toBe(`${SITE}${path}`);
      expect(ld.inLanguage).toBe(locale);
      expect(ld.primaryImageOfPage.url).toBe(`${SITE}/og/home-${locale}.png`);
      const person = ld.mainEntity;
      expect(person['@type']).toBe('Person');
      expect(person.name).toBe('Suvam Adhikary');
      expect(person.jobTitle).toBe(locale === 'en' ? 'Backend Engineer' : 'バックエンドエンジニア');
      expect(person.worksFor).toEqual({ '@type': 'Organization', name: 'Neutrinos' });
      expect(person.address).toMatchObject({
        '@type': 'PostalAddress',
        addressLocality: 'Bengaluru',
      });
      expect(person.sameAs).toEqual([
        'https://github.com/suvamAdhikary',
        'https://www.linkedin.com/in/suvam-adhikary',
      ]);
      expect(person.knowsAbout).toEqual(
        expect.arrayContaining(['Node.js', 'TypeScript', 'Apache Kafka', 'MongoDB'])
      );
    });
  }

  for (const p of PAGES.filter((pg) => pg.kind === 'case')) {
    test(`TechArticle JSON-LD on ${p.path}`, async ({ request }) => {
      const { html, blocks } = await jsonLd(request, p.path);
      expect(blocks).toHaveLength(1);
      const [ld] = blocks;
      expect(ld['@context']).toBe('https://schema.org');
      expect(ld['@type']).toBe('TechArticle');
      expect(ld.headline).toBeTruthy();
      expect(meta(html, 'og:title')).toBe(`${ld.headline} | Suvam Adhikary`);
      expect(ld.description).toBe(meta(html, 'description'));
      expect(ld.url).toBe(`${SITE}${p.path}`);
      expect(ld.inLanguage).toBe(p.locale);
      expect(ld.keywords).toMatch(/\w/);
      expect(ld.author).toMatchObject({ '@type': 'Person', name: 'Suvam Adhikary' });
      expect(ld.image.url).toBe(`${SITE}${p.og}`);
      expect(ld.image.url).toBe(meta(html, 'og:image'));
      expect(Number.isNaN(Date.parse(ld.datePublished))).toBe(false);
    });
  }
});

test.describe('SEO: social cards', () => {
  for (const p of PAGES) {
    test(`Open Graph and Twitter tags on ${p.path}`, async ({ request }) => {
      const html = await (await request.get(p.path)).text();
      expect(meta(html, 'og:site_name')).toBe('Suvam Adhikary');
      expect(meta(html, 'og:image')).toBe(`${SITE}${p.og}`);
      expect(meta(html, 'og:image:width')).toBe('1200');
      expect(meta(html, 'og:image:height')).toBe('630');
      expect(meta(html, 'og:image:type')).toBe('image/png');
      const alt = meta(html, 'og:image:alt');
      expect(alt).toBeTruthy();
      if (p.locale === 'ja') expect(alt).toMatch(/[ぁ-んァ-ヶ一-龯]/);
      expect(meta(html, 'twitter:card')).toBe('summary_large_image');
      expect(meta(html, 'twitter:image')).toBe(`${SITE}${p.og}`);
      expect(meta(html, 'twitter:image:alt')).toBe(alt);

      const res = await request.get(p.og);
      expect(res.status()).toBe(200);
      expect(res.headers()['content-type']).toContain('image/png');
      const img = png(await res.body());
      expect(img).toEqual({ signature: PNG_SIGNATURE, width: 1200, height: 630 });
    });
  }

  test('legacy /og-image.png is a real 1200x630 PNG', async ({ request }) => {
    const res = await request.get('/og-image.png');
    expect(res.status()).toBe(200);
    expect(png(await res.body())).toEqual({ signature: PNG_SIGNATURE, width: 1200, height: 630 });
  });
});

test.describe('SEO: manifest and icons', () => {
  test('head links the manifest, icons and theme colours', async ({ request }) => {
    for (const path of ['/', '/ja/']) {
      const html = await (await request.get(path)).text();
      // Added by script after load, never in the static HTML (keeps it off the critical chain)
      expect(html).not.toMatch(/<link[^>]*rel="manifest"/);
      expect(html).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png">');
      expect(html).toMatch(/<meta name="theme-color" media="\(prefers-color-scheme: light\)"/);
      expect(html).toMatch(/<meta name="theme-color" media="\(prefers-color-scheme: dark\)"/);
    }
  });

  test('manifest link is attached after load', async ({ page }) => {
    for (const path of ['/', '/ja/']) {
      await page.goto(path);
      const link = page.locator('head link[rel="manifest"]');
      await expect(link).toHaveCount(1);
      await expect(link).toHaveAttribute('href', '/site.webmanifest');
    }
  });

  test('manifest is valid and every icon is served at its declared size', async ({ request }) => {
    const res = await request.get('/site.webmanifest');
    expect(res.status()).toBe(200);
    const manifest = await res.json();
    expect(manifest.name).toContain('Suvam Adhikary');
    expect(manifest.start_url).toBe('/');
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));

    const icons = [
      ...manifest.icons.map((i: { src: string; sizes: string }) => [i.src, i.sizes]),
      ['/apple-touch-icon.png', '180x180'],
    ] as [string, string][];
    for (const [src, size] of icons) {
      const icon = await request.get(src);
      expect(icon.status(), src).toBe(200);
      expect(icon.headers()['content-type']).toContain('image/png');
      const { signature, width, height } = png(await icon.body());
      expect(signature).toBe(PNG_SIGNATURE);
      expect(`${width}x${height}`, src).toBe(size);
    }
    for (const src of ['/favicon.ico', '/favicon.svg']) {
      expect((await request.get(src)).status(), src).toBe(200);
    }
  });
});

test.describe('SEO: sitemap', () => {
  test('every page has <lastmod> and hreflang alternates', async ({ request }) => {
    const xml = await (await request.get('/sitemap-0.xml')).text();
    const urls = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1]);
    expect(urls).toHaveLength(PAGES.length);
    for (const p of PAGES) {
      const entry = urls.find((u) => u.includes(`<loc>${SITE}${p.path}</loc>`));
      expect(entry, p.path).toBeTruthy();
      const lastmod = entry!.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1];
      expect(lastmod, `${p.path} lastmod`).toBeTruthy();
      expect(Number.isNaN(Date.parse(lastmod!))).toBe(false);
      expect(entry).toMatch(/<xhtml:link rel="alternate" hreflang="en" href="[^"]+"\/>/);
      expect(entry).toMatch(/<xhtml:link rel="alternate" hreflang="ja" href="[^"]+"\/>/);
    }
  });
});

test('search button is named by its own text', async ({ page }) => {
  for (const [path, name] of [
    ['/', 'Search sections (Ctrl+K)'],
    ['/ja/', 'セクションを検索（Ctrl+K）'],
  ] as const) {
    await page.goto(path);
    const trigger = page.locator('#command-trigger');
    await expect(trigger).not.toHaveAttribute('aria-label', /.*/);
    await expect(page.getByRole('button', { name, exact: true })).toHaveCount(1);
  }
});
