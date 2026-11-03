/** Blog helpers with no Astro imports, so the tests can run them in plain Node. */

export type PostSummary = {
  slug: string;
  title: string;
  description: string;
  date: Date;
  cover: string;
  coverAlt: string;
  readTime: number;
};

/** Average adult reading speed for web copy. */
const WORDS_PER_MINUTE = 220;

/** Minutes to read, from the Markdown body: at least 1. */
export function readTimeFor(markdown: string): number {
  const words = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`[\]()!-]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  // Rounded up: a post a little over a minute reads as 2, so the estimate never undersells.
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "November 2, 2026", the same in every time zone (dates are written without a time). */
export function formatDate(date: Date): string {
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

export function newestFirst<T extends { date: Date }>(posts: readonly T[]): T[] {
  return [...posts].sort((a, b) => b.date.getTime() - a.date.getTime());
}

/** Posts to suggest after this one: the newest others, up to `count`. */
export function related<T extends { slug: string; date: Date }>(
  posts: readonly T[],
  slug: string,
  count = 2,
): T[] {
  return newestFirst(posts.filter((post) => post.slug !== slug)).slice(0, count);
}

/** Split posts into pages; page 1 is /blog, later pages are /blog/page/<n>. */
export function paginate<T>(items: readonly T[], perPage: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += perPage) pages.push(items.slice(i, i + perPage));
  return pages.length ? pages : [[]];
}
