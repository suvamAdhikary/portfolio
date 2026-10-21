import { test, expect, type Page } from '@playwright/test';

const SECTIONS = ['about', 'experience', 'case-studies', 'projects', 'builds', 'contact'] as const;
const PALETTE_SECTIONS = [
  'about',
  'experience',
  'case-studies',
  'projects',
  'builds',
  'skills',
  'education',
  'contact',
] as const;

const isCompact = (page: Page) => (page.viewportSize()?.width ?? 1440) < 1024;

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

/** The section heading must be inside the viewport and not covered by the fixed header. */
async function expectHeadingVisible(page: Page, id: string) {
  await settle(page);
  const box = await page.evaluate((sectionId) => {
    const target = document.getElementById(sectionId);
    if (!target) return null;
    const heading = (
      target.matches('h1,h2,h3') ? target : target.querySelector('h2, h3')
    ) as HTMLElement | null;
    const el = heading ?? target;
    const r = el.getBoundingClientRect();
    const header = document.getElementById('main-header')?.getBoundingClientRect();
    return {
      top: r.top,
      bottom: r.bottom,
      vh: window.innerHeight,
      headerBottom: header && header.bottom > 0 ? header.bottom : 0,
      atBottom: window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2,
    };
  }, id);
  expect(box, `#${id} exists`).not.toBeNull();
  expect(box!.top, `#${id} heading not hidden under sticky header`).toBeGreaterThanOrEqual(
    box!.headerBottom - 1
  );
  expect(box!.bottom, `#${id} heading inside viewport`).toBeLessThanOrEqual(box!.vh);
}

async function noHorizontalOverflow(page: Page) {
  const { sw, cw } = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }));
  expect(sw, 'no horizontal overflow').toBeLessThanOrEqual(cw);
}

async function clickHeaderLink(page: Page, section: string) {
  if (isCompact(page)) {
    const menuButton = page.locator('#mobile-menu-button');
    await expect(menuButton).toBeVisible();
    await menuButton.click();
    await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    await page.locator(`#mobile-menu a[data-section="${section}"]`).click();
    await expect(page.locator('#mobile-menu')).toBeHidden();
  } else {
    await page
      .locator(`#main-header a.nav-link:not(.mobile-nav-link)[data-section="${section}"]`)
      .click();
  }
}

test.describe('home page', () => {
  test('full scroll: reveals, sticky header, no overflow, back to top', async ({ page }) => {
    await page.goto('/');
    await noHorizontalOverflow(page);

    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    const vh = page.viewportSize()!.height;
    for (let y = 0; y <= height; y += Math.round(vh * 0.6)) {
      await page.mouse.wheel(0, Math.round(vh * 0.6));
      await page.waitForTimeout(60);
    }
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await settle(page);
    await page.waitForTimeout(800); // reveal transition

    // Nothing stuck invisible
    const hidden = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>('.scroll-reveal'))
        .filter(
          (el) => !el.classList.contains('is-visible') || getComputedStyle(el).opacity !== '1'
        )
        .map((el) => el.textContent?.trim().slice(0, 40))
    );
    expect(hidden, 'all scroll-reveal blocks revealed').toEqual([]);
    await noHorizontalOverflow(page);

    // Header hides while scrolling down, comes back when scrolling up
    await expect(page.locator('#main-header')).toHaveClass(/-translate-y-full/);
    await page.mouse.wheel(0, -300);
    await settle(page);
    await expect(page.locator('#main-header')).not.toHaveClass(/-translate-y-full/);

    // Back to top
    const backToTop = page.locator('#back-to-top');
    await expect(backToTop).toBeVisible();
    await backToTop.click();
    await settle(page);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  for (const section of SECTIONS) {
    test(`header nav → #${section}: heading visible, hash, active state`, async ({ page }) => {
      await page.goto('/');
      await clickHeaderLink(page, section);
      await expect(page).toHaveURL(new RegExp(`#${section}$`));
      await expectHeadingVisible(page, section);
      const activeLink = isCompact(page)
        ? page.locator(`#mobile-menu a[data-section="${section}"]`)
        : page.locator(`#main-header a.nav-link:not(.mobile-nav-link)[data-section="${section}"]`);
      await expect(activeLink).toHaveAttribute('aria-current', 'location');
    });
  }

  test('back button returns to the previous section', async ({ page }) => {
    await page.goto('/');
    await clickHeaderLink(page, 'experience');
    await expectHeadingVisible(page, 'experience');
    await clickHeaderLink(page, 'builds');
    await expectHeadingVisible(page, 'builds');
    await page.goBack();
    await expect(page).toHaveURL(/#experience$/);
    await expectHeadingVisible(page, 'experience');
  });

  for (const section of PALETTE_SECTIONS) {
    test(`command palette (touch-visible trigger) → #${section}`, async ({ page }) => {
      await page.goto('/');
      const trigger = page.locator('#command-trigger');
      await expect(trigger).toBeVisible();
      await trigger.click();
      await expect(page.locator('#command-palette')).toBeVisible();
      await page.locator(`#command-results a[href$="#${section}"]`).click();
      await expect(page.locator('#command-palette')).toBeHidden();
      await expect(page).toHaveURL(new RegExp(`#${section}$`));
      await expectHeadingVisible(page, section);
    });
  }

  test('footer quick links land on their sections', async ({ page }) => {
    await page.goto('/');
    const links = page.locator('footer a[href^="/#"]');
    const hrefs = await links.evaluateAll((els) => els.map((e) => e.getAttribute('href')!));
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await settle(page);
      await page.locator(`footer a[href="${href}"]`).click();
      await expect(page).toHaveURL(new RegExp(`${href.replace('/', '')}$`));
      await expectHeadingVisible(page, href.slice(2));
    }
  });

  for (const section of ['builds', 'projects', 'contact'] as const) {
    test(`deep link /#${section} loads at the section`, async ({ page }) => {
      await page.goto(`/#${section}`);
      await expectHeadingVisible(page, section);
    });
  }

  test('reduced motion disables smooth scrolling', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    expect(
      await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)
    ).toBe('auto');
    const hidden = await page.evaluate(
      () =>
        Array.from(document.querySelectorAll<HTMLElement>('.scroll-reveal')).filter(
          (el) => getComputedStyle(el).opacity !== '1'
        ).length
    );
    expect(hidden).toBe(0);
  });

  test('interactive controls meet 44px tap target in the header', async ({ page }) => {
    await page.goto('/');
    const sizes = await page
      .locator('#main-header a:visible, #main-header button:visible')
      .evaluateAll((els) =>
        els.map((e) => {
          const r = e.getBoundingClientRect();
          return {
            label: e.getAttribute('aria-label') ?? e.textContent?.trim(),
            w: r.width,
            h: r.height,
          };
        })
      );
    for (const s of sizes) {
      expect(s.h, `${s.label} height`).toBeGreaterThanOrEqual(44);
      expect(s.w, `${s.label} width`).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe('case study pages', () => {
  const slug = 'kafka-event-architecture';

  test('table of contents links land on headings', async ({ page }) => {
    await page.goto(`/case-studies/${slug}/`);
    await noHorizontalOverflow(page);
    const compact = isCompact(page);
    const tocLinks = compact
      ? page.locator('details a.toc-link')
      : page.locator('aside[aria-label="On this page"] a.toc-link');
    if (compact) await page.locator('details > summary').click();
    const hrefs = await tocLinks.evaluateAll((els) => els.map((e) => e.getAttribute('href')!));
    expect(hrefs.length).toBeGreaterThan(1);
    for (const href of hrefs) {
      if (
        compact &&
        !(await page.locator('details').evaluate((d) => (d as HTMLDetailsElement).open))
      ) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.locator('details > summary').click();
      }
      await page.locator(`${compact ? 'details' : 'aside'} a.toc-link[href="${href}"]`).click();
      await expect(page).toHaveURL(new RegExp(`${href}$`));
      await expectHeadingVisible(page, decodeURIComponent(href.slice(1)));
    }
  });

  test('prev/next and back-to-home links', async ({ page }) => {
    await page.goto(`/case-studies/${slug}/`);
    const next = page.locator('nav[aria-label="More case studies"] a').last();
    const nextHref = await next.getAttribute('href');
    await next.click();
    await expect(page).toHaveURL(new RegExp(nextHref!.replace(/[/#]/g, '\\$&') + '$'));
    await expect(page.locator('h1')).toBeVisible();

    await page.goto(`/case-studies/${slug}/`);
    await page.locator('nav[aria-label="Breadcrumb"] a').click();
    await expect(page).toHaveURL(/\/#case-studies$/);
    await expectHeadingVisible(page, 'case-studies');
  });

  test('command palette on a case study jumps to home sections', async ({ page }) => {
    await page.goto(`/case-studies/${slug}/`);
    await page.locator('#command-trigger').click();
    await page.locator('#command-results a[href="/#builds"]').click();
    await expect(page).toHaveURL(/\/#builds$/);
    await expectHeadingVisible(page, 'builds');
  });
});
