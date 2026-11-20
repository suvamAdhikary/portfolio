import { test, expect, type Page } from '@playwright/test';

const CAPTION =
  'Each stone is a kind of system I build. Events flow from producers through Kafka to consumers, staying calm under load and recovering from failure.';

/** Scroll the garden into view without smooth scrolling. */
async function scrollToGarden(page: Page) {
  await page.evaluate(() => {
    const r = document.querySelector('[data-garden-root]')!.getBoundingClientRect();
    window.scrollTo({ top: window.scrollY + r.top - 80, behavior: 'instant' });
  });
}

/** Fraction of sampled canvas pixels that are painted (non-transparent). */
async function paintedRatio(page: Page) {
  return page.evaluate(() => {
    const c = document.querySelector<HTMLCanvasElement>('[data-garden-root] canvas')!;
    if (!c.width || !c.height) return 0;
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    let painted = 0;
    let n = 0;
    for (let i = 3; i < d.length; i += 4 * 97) {
      n++;
      if (d[i] > 0) painted++;
    }
    return painted / n;
  });
}

test.describe('zen garden', () => {
  test('section sits after the hero with real, crawlable text', async ({ page, request }) => {
    const html = await (await request.get('/')).text();
    expect(html).toContain('A quiet garden of busy systems');
    expect(html).toContain('Each stone is a kind of system I build.');
    expect(html).not.toMatch(/upGrad[^<]*garden|garden[^<]*upGrad/i);

    await page.goto('/');
    const order = await page.evaluate(() =>
      Array.from(document.querySelectorAll('main > section')).map((s) => s.id)
    );
    expect(order.slice(0, 3)).toEqual(['hero', 'garden', 'highlights']);
    await expect(page.locator('#garden h2')).toHaveText('A quiet garden of busy systems');
    await expect(page.locator('#garden figcaption, #garden .zg-caption p')).toHaveText(CAPTION);
    await expect(page.locator('#garden canvas')).toHaveAttribute('role', 'img');
    await expect(page.locator('#garden canvas')).toHaveAttribute(
      'aria-label',
      /Japanese rock garden/
    );
    await expect(page.locator('#garden-status')).toHaveAttribute('aria-live', 'polite');
  });

  test('canvas initialises only after scrolling near it', async ({ page }) => {
    const chunks: string[] = [];
    page.on('request', (r) => {
      if (/zen-garden\.[\w-]+\.js$/.test(r.url())) chunks.push(r.url());
    });
    await page.goto('/', { waitUntil: 'networkidle' });
    // Nothing loaded or drawn yet: the hero fills the first screen
    expect(chunks).toHaveLength(0);
    await expect(page.locator('#garden')).not.toHaveAttribute('data-ready', /.*/);
    await expect(page.locator('#garden .zg-stone')).toHaveCount(0);

    await scrollToGarden(page);
    await expect(page.locator('#garden')).toHaveAttribute('data-ready', 'true', {
      timeout: 15_000,
    });
    expect(chunks).toHaveLength(1);
    await expect(page.locator('#garden .zg-stone')).toHaveCount(5);
    await expect(page.locator('#garden-status')).toHaveText('All systems steady.');
    expect(await paintedRatio(page)).toBeGreaterThan(0.95);

    // The canvas box was reserved up front: initialising did not change the layout
    const box = await page.locator('[data-garden-root]').boundingBox();
    const canvas = await page.locator('[data-garden-root] canvas').boundingBox();
    expect(Math.round(canvas!.width)).toBe(Math.round(box!.width));
    expect(Math.round(canvas!.height)).toBe(Math.round(box!.height));

    // Stones are real buttons: tapping one adds load and is announced
    const kafka = page.getByRole('button', { name: 'Event pipeline (Kafka): add load' });
    await kafka.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#garden-status')).toContainText('Load spike through');
    await page.keyboard.press('f');
    await expect(page.locator('#garden-status')).toContainText('Kafka is down.');
  });

  test('follows the site theme toggle live', async ({ page }) => {
    await page.goto('/');
    await scrollToGarden(page);
    await expect(page.locator('#garden')).toHaveAttribute('data-ready', 'true', {
      timeout: 15_000,
    });
    const sample = () =>
      page.evaluate(() => {
        const c = document.querySelector<HTMLCanvasElement>('[data-garden-root] canvas')!;
        const d = c.getContext('2d')!.getImageData(Math.floor(c.width / 2), 40, 1, 1).data;
        return d[0] + d[1] + d[2];
      });
    const before = await sample();
    await page.evaluate(() => {
      const root = document.documentElement;
      root.classList.toggle('dark');
    });
    await expect.poll(sample).not.toBe(before);
  });
});

test.describe('zen garden with reduced motion', () => {
  test('shows a still frame and redraws only on interaction', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await scrollToGarden(page);
    await expect(page.locator('#garden')).toHaveAttribute('data-ready', 'true', {
      timeout: 15_000,
    });
    expect(await paintedRatio(page)).toBeGreaterThan(0.95);
    const frame = () =>
      page.evaluate(() =>
        document.querySelector<HTMLCanvasElement>('[data-garden-root] canvas')!.toDataURL()
      );
    const a = await frame();
    await page.waitForTimeout(800);
    expect(await frame()).toBe(a);

    await page.getByRole('button', { name: 'Payments: add load' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#garden-status')).toContainText('Load spike through Payments');
    expect(await frame()).not.toBe(a);
  });
});
