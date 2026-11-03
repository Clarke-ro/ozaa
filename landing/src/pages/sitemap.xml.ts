import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { routes } from "../content/page";
import { getPosts } from "../lib/blog";

/** Every public page, for search engines. Login and Get started hand over to the app, so they stay out. */
export const GET: APIRoute = async ({ site }) => {
  const base = site ?? new URL("http://localhost:4321");
  const legal = (await getCollection("legal")).filter((page) => !page.data.placeholder);
  const pages = [
    routes.home,
    routes.features,
    routes.demo,
    routes.pricing,
    routes.blog,
    routes.contact,
    ...legal.map((page) => `/${page.id}`),
  ].map((path) => ({ loc: new URL(path, base).href, lastmod: undefined as string | undefined }));
  const posts = (await getPosts()).map((post) => ({
    loc: new URL(`/blog/${post.slug}`, base).href,
    lastmod: post.date.toISOString().slice(0, 10),
  }));
  const urls = [...pages, ...posts]
    .map((url) => `  <url><loc>${url.loc}</loc>${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ""}</url>`)
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
