import { getCollection, type CollectionEntry } from 'astro:content';
import type { Locale } from './config';

export type CaseStudy = CollectionEntry<'case-studies'> | CollectionEntry<'case-studies-ja'>;

/**
 * Published case studies for a locale, in that locale's order.
 *
 * English keeps the original order (MongoDB, Kafka, GraphQL). Japanese leads with
 * reliability and fault tolerance, which Japanese product and enterprise teams weigh
 * most: Kafka (no lost events through partial failures) first, then the GraphQL
 * Federation gateway (architecture at scale, 60% fewer production incidents), then the
 * MongoDB optimisation (performance).
 */
export async function getCaseStudies(locale: Locale): Promise<CaseStudy[]> {
  const entries: CaseStudy[] =
    locale === 'ja' ? await getCollection('case-studies-ja') : await getCollection('case-studies');
  return entries
    .filter((cs) => !cs.data.draft)
    .sort((a, b) => (a.data.order ?? 999) - (b.data.order ?? 999));
}
