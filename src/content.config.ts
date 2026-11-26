import { z, defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

const caseStudySchema = z.object({
  title: z.string(),
  description: z.string(),
  publishDate: z.date(),
  tags: z.array(z.string()),
  featured: z.boolean().default(false),
  draft: z.boolean().default(false),
  order: z.number().optional(),
});

const caseStudyCollection = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/case-studies' }),
  schema: caseStudySchema,
});

// Japanese editions (served under /ja/case-studies/). Same file names (ids) as the English
// collection so each article pairs with its English version; `order` is the Japanese order.
const caseStudyJaCollection = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/case-studies-ja' }),
  schema: caseStudySchema,
});

const writingCollection = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/writing' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.date(),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().default(false),
    external: z.boolean().default(false),
    url: z.string().url().optional(),
  }),
});

export const collections = {
  'case-studies': caseStudyCollection,
  'case-studies-ja': caseStudyJaCollection,
  writing: writingCollection,
};
