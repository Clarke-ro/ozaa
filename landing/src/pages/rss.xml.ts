import type { APIRoute } from "astro";
import { blogPage } from "../content/page";
import { getPosts } from "../lib/blog";

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The blog as an RSS feed, newest first. */
export const GET: APIRoute = async ({ site }) => {
  const base = site ?? new URL("http://localhost:4321");
  const items = (await getPosts())
    .map((post) => {
      const link = new URL(`/blog/${post.slug}`, base).href;
      return `    <item>
      <title>${escape(post.title)}</title>
      <link>${link}</link>
      <guid>${link}</guid>
      <description>${escape(post.description)}</description>
      <pubDate>${post.date.toUTCString()}</pubDate>
    </item>`;
    })
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Cravins blog</title>
    <link>${new URL("/blog", base).href}</link>
    <description>${escape(blogPage.description)}</description>
    <language>en</language>
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
};
