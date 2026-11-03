import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

/** Blog posts: one Markdown file each in src/content/blog/<slug>.md. The file name is the URL. */
const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    cover: z.string(),
    coverAlt: z.string(),
    /** Minutes. Leave it out and the site works it out from the word count. */
    readTime: z.number().int().positive().optional(),
  }),
});

/** Terms, Privacy and Cookies: paste the real policy into each file. */
const legal = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/legal" }),
  schema: z.object({
    title: z.string(),
    updated: z.coerce.date(),
    placeholder: z.boolean().default(false),
  }),
});

export const collections = { blog, legal };
