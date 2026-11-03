import { getCollection } from "astro:content";
import { newestFirst, readTimeFor, type PostSummary } from "../content/posts";

/** Every post, newest first, with its read time filled in when the file doesn't set one. */
export async function getPosts(): Promise<PostSummary[]> {
  const entries = await getCollection("blog");
  return newestFirst(
    entries.map((entry) => ({
      slug: entry.id,
      title: entry.data.title,
      description: entry.data.description,
      date: entry.data.date,
      cover: entry.data.cover,
      coverAlt: entry.data.coverAlt,
      readTime: entry.data.readTime ?? readTimeFor(entry.body ?? ""),
    })),
  );
}
