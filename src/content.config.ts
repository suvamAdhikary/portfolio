import { z, defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

const caseStudyCollection = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/case-studies' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.date(),
    tags: z.array(z.string()),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    order: z.number().optional(),
  }),
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
  writing: writingCollection,
};
