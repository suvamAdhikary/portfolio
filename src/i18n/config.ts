// Locale routing helpers. English is the default locale and lives at `/` (no prefix);
// Japanese mirrors every page under `/ja/`. Keep in sync with `i18n` in astro.config.mjs.

export const locales = ['en', 'ja'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

/** BCP 47 tag for <html lang> and hreflang. */
export const htmlLang: Record<Locale, string> = { en: 'en', ja: 'ja' };
/** Open Graph locale. */
export const ogLocale: Record<Locale, string> = { en: 'en_US', ja: 'ja_JP' };
/** Switcher label, written in its own language. */
export const localeLabel: Record<Locale, string> = { en: 'EN', ja: '日本語' };
/** Full language name, written in its own language. */
export const localeName: Record<Locale, string> = { en: 'English', ja: '日本語' };

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (locales as readonly string[]).includes(value);

/** Locale of a URL path (`/ja` or `/ja/...` is Japanese, everything else English). */
export function localeFromPath(pathname: string): Locale {
  return /^\/ja(\/|$)/.test(pathname) ? 'ja' : 'en';
}

/** Strip the locale prefix: `/ja/case-studies/x/` -> `/case-studies/x/`. */
export function stripLocale(pathname: string): string {
  const rest = pathname.replace(/^\/ja(?=\/|$)/, '');
  return rest === '' ? '/' : rest;
}

/** Path of `path` (written for the default locale) in `locale`: `/x/` -> `/ja/x/`. */
export function localizePath(path: string, locale: Locale): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (locale === defaultLocale) return clean;
  return clean === '/' ? `/${locale}/` : `/${locale}${clean}`;
}

/** The same page in another locale. Every page exists in both locales. */
export function switchLocalePath(pathname: string, to: Locale): string {
  return localizePath(stripLocale(pathname), to);
}

/** Home page of a locale (`/` or `/ja/`). */
export const homePath = (locale: Locale) => localizePath('/', locale);
