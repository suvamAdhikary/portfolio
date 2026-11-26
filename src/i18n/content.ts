// Locale-aware views of the site data. English comes straight from data/*.json; Japanese
// overlays only the wording from data/i18n/ja.json, so facts, figures and dates have a
// single source of truth.
import profileEn from '../../data/profile.json';
import buildsEn from '../../data/builds.json';
import ja from '../../data/i18n/ja.json';
import type { Locale } from './config';

type Profile = typeof profileEn;
type Build = (typeof buildsEn)[number];
type JaExperience = Record<string, { location: string; highlights: string[] }>;
type JaEducation = Record<string, { degree: string; institution: string }>;
type JaBuild = { description: string; imageAlt: string; stack: Record<string, string> };

export function getProfile(locale: Locale): Profile {
  if (locale === 'en') return profileEn;
  const p = ja.profile;
  const exp = p.experience as JaExperience;
  const edu = p.education as JaEducation;
  const skillNames = p.skillNames as Record<string, string>;
  const skillCategories = p.skillCategories as Record<string, string>;
  return {
    ...profileEn,
    title: p.title,
    location: p.location,
    tagline: p.tagline,
    experience: profileEn.experience.map((e) => ({
      ...e,
      location: exp[e.company]?.location ?? e.location,
      highlights: exp[e.company]?.highlights ?? e.highlights,
    })),
    skills: Object.fromEntries(
      Object.entries(profileEn.skills).map(([category, list]) => [
        skillCategories[category] ?? category,
        list.map((s) => skillNames[s] ?? s),
      ])
    ) as Profile['skills'],
    // 学歴 is listed oldest first in Japanese résumés (履歴書 convention).
    education: profileEn.education
      .map((e) => ({
        ...e,
        degree: edu[e.institution]?.degree ?? e.degree,
        institution: edu[e.institution]?.institution ?? e.institution,
      }))
      .sort((a, b) => Number(a.startYear ?? a.year) - Number(b.startYear ?? b.year)),
  };
}

export function getBuilds(locale: Locale): Build[] {
  if (locale === 'en') return buildsEn;
  const overlay = ja.builds as Record<string, JaBuild>;
  return buildsEn.map((b) => {
    const o = overlay[b.id];
    if (!o) return b;
    return {
      ...b,
      description: o.description,
      imageAlt: o.imageAlt,
      stack: b.stack.map((s) => o.stack[s] ?? s),
    };
  });
}

/** Curated project blurbs: English lives in HomePage.astro, Japanese in data/i18n/ja.json. */
export const jaProjectDescriptions = ja.projects as Record<string, string>;

/** `2024-07` -> `Jul 2024` (en) or `2024年7月` (ja). */
export function formatMonth(ym: string, locale: Locale): string {
  const d = new Date(ym);
  if (locale === 'ja') return `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月`;
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/** Full date: `January 20, 2025` (en) or `2025年1月20日` (ja). */
export function formatDate(date: Date, locale: Locale): string {
  if (locale === 'ja')
    return `${date.getUTCFullYear()}年${date.getUTCMonth() + 1}月${date.getUTCDate()}日`;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
