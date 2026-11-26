import { test, expect, type Page } from '@playwright/test';

// English lives at `/`, Japanese mirrors every page under `/ja/`.
const SITE = 'https://suvamadhikary.vercel.app';
const SLUGS = [
  'kafka-event-architecture',
  'graphql-federation-gateway',
  'mongodb-optimization',
] as const;
const PAIRS: [string, string][] = [
  ['/', '/ja/'],
  ...SLUGS.map((s): [string, string] => [`/case-studies/${s}/`, `/ja/case-studies/${s}/`]),
];

const isCompact = (page: Page) => (page.viewportSize()?.width ?? 1440) < 1024;

async function noHorizontalOverflow(page: Page) {
  const { sw, cw } = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }));
  expect(sw, 'no horizontal overflow').toBeLessThanOrEqual(cw);
}

/** Wait until window.scrollY stops changing (smooth scroll finished). */
async function settle(page: Page) {
  await page.waitForFunction(
    () =>
      new Promise<boolean>((resolve) => {
        let last = window.scrollY;
        let still = 0;
        const tick = () => {
          if (window.scrollY === last) still++;
          else {
            still = 0;
            last = window.scrollY;
          }
          if (still >= 6) resolve(true);
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      })
  );
}

/** The language switch link for `lang` (the current language is not a link). */
const switchLink = (page: Page, lang: 'en' | 'ja') =>
  page.locator(`#main-header a[data-lang-switch="${lang}"]`);

test.describe('localisation: SEO and markup', () => {
  for (const [en, ja] of PAIRS) {
    test(`hreflang pair ${en} <-> ${ja}`, async ({ request }) => {
      for (const [path, lang, ogLocale, altLocale] of [
        [en, 'en', 'en_US', 'ja_JP'],
        [ja, 'ja', 'ja_JP', 'en_US'],
      ] as const) {
        const html = await (await request.get(path)).text();
        expect(html).toContain(`<html lang="${lang}"`);
        expect(html).toContain(`<link rel="canonical" href="${SITE}${path}">`);
        expect(html).toContain(`<link rel="alternate" hreflang="en" href="${SITE}${en}">`);
        expect(html).toContain(`<link rel="alternate" hreflang="ja" href="${SITE}${ja}">`);
        expect(html).toContain(`<link rel="alternate" hreflang="x-default" href="${SITE}${en}">`);
        expect(html).toContain(`<meta property="og:locale" content="${ogLocale}">`);
        expect(html).toContain(`<meta property="og:locale:alternate" content="${altLocale}">`);
        expect(html).toContain(`<meta property="og:url" content="${SITE}${path}">`);
      }
    });
  }

  test('Japanese pages have Japanese titles and descriptions', async ({ page }) => {
    await page.goto('/ja/');
    await expect(page).toHaveTitle(/バックエンドエンジニア/);
    const desc = await page.locator('meta[name="description"]').getAttribute('content');
    expect(desc).toMatch(/ポートフォリオ/);
    expect(await page.locator('meta[property="og:title"]').getAttribute('content')).toMatch(
      /バックエンドエンジニア/
    );
    await page.goto(`/ja/case-studies/${SLUGS[0]}/`);
    await expect(page).toHaveTitle(
      'Apache Kafka によるイベント駆動アーキテクチャ | Suvam Adhikary'
    );
    await expect(page.locator('h1')).toHaveText('Apache Kafka によるイベント駆動アーキテクチャ');
  });

  test('sitemap lists every Japanese route with alternates', async ({ request }) => {
    const xml = await (await request.get('/sitemap-0.xml')).text();
    for (const [en, ja] of PAIRS) {
      expect(xml).toContain(`<loc>${SITE}${ja}</loc>`);
      expect(xml).toContain(`<loc>${SITE}${en}</loc>`);
      expect(xml).toContain(`hreflang="ja" href="${SITE}${ja}"`);
    }
  });

  test('every internal link on Japanese pages stays in /ja/', async ({ page }) => {
    for (const [, ja] of PAIRS) {
      await page.goto(ja);
      const offLocale = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="/"]'))
          .filter((a) => !a.dataset.langSwitch)
          .map((a) => a.getAttribute('href')!)
          .filter((href) => !href.startsWith('/ja/') && !/\.(pdf|xml|svg|ico)$/.test(href))
      );
      expect(offLocale, `${ja} links`).toEqual([]);
    }
  });

  test('Japanese case studies lead with reliability (Kafka, GraphQL, MongoDB)', async ({
    page,
  }) => {
    await page.goto('/ja/');
    const ja = await page
      .locator('#case-studies a[href*="/case-studies/"]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(ja).toEqual(SLUGS.map((s) => `/ja/case-studies/${s}`));
    await page.goto('/');
    const en = await page
      .locator('#case-studies a[href*="/case-studies/"]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(en).toEqual([
      '/case-studies/mongodb-optimization',
      '/case-studies/kafka-event-architecture',
      '/case-studies/graphql-federation-gateway',
    ]);
  });

  test('Japanese résumé conventions: dates, current role, education order', async ({ page }) => {
    await page.goto('/ja/');
    const experience = page.locator('#experience');
    await expect(experience.locator('h2')).toHaveText('職務経歴');
    await expect(experience).toContainText('2026年4月〜現在');
    await expect(experience).toContainText('2024年7月〜2026年2月');
    await expect(experience).toContainText('2022年1月〜2023年5月');
    await expect(experience).toContainText('在籍中');
    const years = await page
      .locator('#education p.font-mono')
      .evaluateAll((els) => els.map((e) => e.textContent?.trim()));
    expect(years).toEqual(['2014年〜2018年', '2021年']);
  });

  test('résumé: /ja/ links the Japanese 職務経歴書, / keeps the English PDF', async ({
    page,
    request,
  }) => {
    const pdfLinks = () =>
      page.locator('a[href$=".pdf"]').evaluateAll((els) =>
        els.map((a) => ({
          href: a.getAttribute('href'),
          text: a.textContent?.trim(),
          download: a.getAttribute('download'),
          hreflang: a.getAttribute('hreflang'),
        }))
      );

    await page.goto('/ja/');
    expect(await pdfLinks()).toEqual([
      {
        href: '/resume-ja.pdf',
        text: '職務経歴書（PDF）',
        download: 'Suvam_Adhikary_Resume_JA.pdf',
        hreflang: null,
      },
    ]);

    await page.goto('/');
    expect(await pdfLinks()).toEqual([
      { href: '/resume.pdf', text: 'Download Resume', download: null, hreflang: null },
    ]);

    for (const path of ['/resume-ja.pdf', '/resume.pdf']) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
      expect(res.headers()['content-type'], path).toContain('application/pdf');
      const body = await res.body();
      expect(body.subarray(0, 5).toString(), path).toBe('%PDF-');
    }
  });
});

test.describe('localisation: language switch', () => {
  test('header switch goes to the same page in the other language', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#main-header [aria-current="true"][lang="en"]')).toHaveText('EN');
    await switchLink(page, 'ja').click();
    await expect(page).toHaveURL(/\/ja\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
    await noHorizontalOverflow(page);

    await page.goto(`/ja/case-studies/${SLUGS[1]}/`);
    await switchLink(page, 'en').click();
    await expect(page).toHaveURL(new RegExp(`/case-studies/${SLUGS[1]}/$`));
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('switch keeps the current home section', async ({ page }) => {
    await page.goto('/#experience');
    await expect(page.locator('#experience h2')).toBeVisible();
    await settle(page);
    // The fixed header may have slid away after the deep-link jump; scrolling up brings it back
    await page.mouse.wheel(0, -120);
    await settle(page);
    await expect(page.locator('#main-header')).not.toHaveClass(/-translate-y-full/);
    await switchLink(page, 'ja').click();
    await expect(page).toHaveURL(/\/ja\/#experience$/);
    await expect(page.locator('#experience h2')).toHaveText('職務経歴');
  });

  test('remembers 日本語 for returning visitors, without breaking back/forward', async ({
    page,
  }) => {
    await page.goto('/');
    await switchLink(page, 'ja').click();
    await expect(page).toHaveURL(/\/ja\/$/);
    expect(await page.evaluate(() => localStorage.getItem('locale'))).toBe('ja');

    // Back button returns to the English page and stays there.
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await page.waitForTimeout(300);
    await expect(page).not.toHaveURL(/\/ja\//);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    // A fresh visit (typed URL, bookmark) to an English page opens the Japanese one.
    await page.goto(`/case-studies/${SLUGS[0]}/#overview`);
    await expect(page).toHaveURL(new RegExp(`/ja/case-studies/${SLUGS[0]}/`));

    // ?lang=en always stays in English.
    await page.goto('/?lang=en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    // Choosing English turns the redirect off.
    await page.goto('/ja/');
    await switchLink(page, 'en').click();
    await expect(page).toHaveURL(/\/$/);
    expect(await page.evaluate(() => localStorage.getItem('locale'))).toBe('en');
    await page.goto('/');
    await page.waitForTimeout(300);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('first-time visitors and crawlers are never redirected', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(300);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.goto('/ja/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  });

  test('switch is a 44px tap target with matching accessible names', async ({ page }) => {
    for (const path of ['/', '/ja/']) {
      await page.goto(path);
      const group = page.locator('#main-header .lang-switch');
      await expect(group).toBeVisible();
      await expect(group).toHaveAttribute('role', 'group');
      for (const el of await group.locator('a, span').all()) {
        const box = (await el.boundingBox())!;
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.width).toBeGreaterThanOrEqual(44);
      }
    }
    await expect(page.getByRole('link', { name: 'EN', exact: true })).toHaveAttribute(
      'hreflang',
      'en'
    );
  });
});

test.describe('localisation: Japanese pages', () => {
  test('header, palette and footer are Japanese and stay in /ja/', async ({ page }) => {
    await page.goto('/ja/');
    await noHorizontalOverflow(page);
    if (isCompact(page)) {
      await page.locator('#mobile-menu-button').click();
      await expect(page.locator('#mobile-menu-button')).toHaveAttribute(
        'aria-label',
        'メニューを閉じる'
      );
      await page.locator('#mobile-menu a[data-section="builds"]').click();
    } else {
      await page
        .locator('#main-header a.nav-link:not(.mobile-nav-link)', { hasText: '個人開発' })
        .click();
    }
    await expect(page).toHaveURL(/\/ja\/#builds$/);
    await expect(page.locator('#builds h2')).toHaveText('公開中のゲームとアプリ');

    await page.locator('#command-trigger').click();
    await expect(page.locator('#command-input')).toHaveAttribute(
      'placeholder',
      'セクションへ移動…'
    );
    await page.locator('#command-input').fill('skills');
    await expect(page.locator('#command-results a')).toHaveCount(1);
    await expect(page.locator('#command-results a')).toContainText('スキル');
    await page.locator('#command-results a').click();
    await expect(page).toHaveURL(/\/ja\/#skills$/);

    const footer = await page
      .locator('footer a[href*="#"]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(footer.length).toBeGreaterThan(0);
    for (const href of footer) expect(href).toMatch(/^\/ja\/#/);
  });

  test('case study: Japanese edition, TOC and prev/next stay in /ja/', async ({ page }) => {
    await page.goto(`/ja/case-studies/${SLUGS[0]}/`);
    await noHorizontalOverflow(page);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
    await expect(page.locator('article h2').first()).toHaveText('概要');
    await expect(page.locator('header time')).toHaveText('2025年1月20日');
    // Every TOC entry points at a (Japanese) heading id on the page
    const toc = await page
      .locator('a.toc-link')
      .evaluateAll((els) => els.map((e) => e.getAttribute('href')!));
    expect(toc.length).toBeGreaterThan(1);
    const missing = await page.evaluate(
      (hrefs) => hrefs.filter((h) => !document.getElementById(decodeURIComponent(h.slice(1)))),
      toc
    );
    expect(missing).toEqual([]);
    const next = page.locator('nav[aria-label="その他のケーススタディ"] a').last();
    await expect(next).toHaveAttribute('href', `/ja/case-studies/${SLUGS[1]}/`);
    await page.locator('nav[aria-label="パンくずリスト"] a').click();
    await expect(page).toHaveURL(/\/ja\/#case-studies$/);

    await page.goto(`/ja/case-studies/${SLUGS[0]}/`);
    await page.locator('#command-trigger').click();
    await page.locator('#command-results a[href="/ja/#builds"]').click();
    await expect(page).toHaveURL(/\/ja\/#builds$/);
  });

  test('builds keep live links only (no repo links)', async ({ page }) => {
    await page.goto('/ja/');
    const hrefs = await page
      .locator('#builds a')
      .evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(hrefs).toHaveLength(3);
    for (const href of hrefs) expect(href).toMatch(/^https:\/\/[\w-]+\.vercel\.app\/$/);
    await expect(page.locator('#builds')).toContainText('プレイする');
  });

  test('zen garden speaks Japanese', async ({ page }) => {
    await page.goto('/ja/');
    await expect(page.locator('#garden h2')).toHaveText('静かな庭と、休みなく動くシステム');
    await expect(page.locator('#garden-hint')).toContainText('砂をドラッグすると砂紋を描けます');
    await expect(page.locator('#garden canvas')).toHaveAttribute('aria-label', /枯山水/);

    await page.evaluate(() => {
      const r = document.querySelector('[data-garden-root]')!.getBoundingClientRect();
      window.scrollTo({ top: window.scrollY + r.top - 80, behavior: 'instant' });
    });
    await expect(page.locator('#garden')).toHaveAttribute('data-ready', 'true', {
      timeout: 15_000,
    });
    // The season switcher appears once the garden is running
    const seasons = page.getByRole('group', { name: '季節' });
    await expect(seasons.getByRole('button')).toHaveText(['春', '夏', '秋', '冬']);
    await expect(page.locator('#garden-status')).toHaveText('すべてのシステムが安定稼働中です。');
    await page.getByRole('button', { name: '鯉の池：鯉にえさをあげる' }).press('Enter');
    await expect(page.locator('#garden-status')).toHaveText('鯉が何かと寄ってきました。');
    await page.getByRole('button', { name: 'イベント基盤（Kafka）：負荷を追加' }).focus();
    await page.keyboard.press('f');
    await expect(page.locator('#garden-status')).toContainText('Kafka ブローカーが停止');
    await seasons.getByRole('button', { name: '冬' }).click();
    await expect(page.locator('#garden-status')).toHaveText('庭は冬の装いになりました。');
    await noHorizontalOverflow(page);
  });

  test('full scroll: everything revealed, no horizontal overflow', async ({ page }) => {
    await page.goto('/ja/');
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    const vh = page.viewportSize()!.height;
    for (let y = 0; y <= height; y += Math.round(vh * 0.7)) {
      await page.mouse.wheel(0, Math.round(vh * 0.7));
      await page.waitForTimeout(40);
    }
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(900);
    const hidden = await page.evaluate(
      () =>
        Array.from(document.querySelectorAll<HTMLElement>('.scroll-reveal')).filter(
          (el) => !el.classList.contains('is-visible')
        ).length
    );
    expect(hidden).toBe(0);
    await noHorizontalOverflow(page);
  });
});
