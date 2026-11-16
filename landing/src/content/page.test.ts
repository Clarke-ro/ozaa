import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { checkContact } from "./contactForm.ts";
import { appLinks, LOCAL_APP_URL } from "./links.ts";
import { demoPage, faq, features, footer, hero, how, nav, routes, screens, why } from "./page.ts";
import { formatDate, paginate, readTimeFor, related } from "./posts.ts";
import { pricing } from "./pricing.ts";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");
const list = async (dir: string) => readdir(new URL(dir, import.meta.url));

const banned: readonly RegExp[] = [/TakeOrder/i, /ScanChop/i, /Ghana/i, /Accra/i, /\bTwi\b/, /\bEwe\b/, /GH₵/, /GHS/, /₵/];

async function copyFiles() {
  const files = ["./page.ts", "./pricing.ts", "../../README.md", "../../LEARNING.md"];
  for (const name of await list("./blog/")) files.push(`./blog/${name}`);
  for (const name of await list("./legal/")) files.push(`./legal/${name}`);
  return files;
}

test("published copy does not name a forbidden word or a currency mark", async () => {
  for (const path of await copyFiles()) {
    const text = await read(path);
    for (const pattern of banned) assert.equal(pattern.test(text), false, `${path} matches ${pattern}`);
  }
});

test("no payments wording anywhere: payments come in a later build", async () => {
  const words = /\bpay(s|ment|ments|ing)?\b|\bmomo\b|mobile money|checkout|\bsplit (the )?bill|\btips?\b|card payment/i;
  const files = ["./page.ts", "./pricing.ts"];
  for (const name of await list("../components/")) files.push(`../components/${name}`);
  for (const name of await list("./blog/")) files.push(`./blog/${name}`);
  for (const path of files) {
    const text = await read(path);
    assert.equal(words.test(text), false, `${path} mentions payments: ${text.match(words)?.[0]}`);
  }
});

test("every sample screen file is used once and exists", async () => {
  const used = new Set<string>([screens[hero.screen].src, screens[how.screen].src]);
  for (const card of features.cards) used.add(screens[card.screen].src);
  for (const menu of demoPage.menus) used.add(screens[menu.screen].src);
  assert.equal(used.size, Object.keys(screens).length, "a screen is listed but never shown");
  for (const src of used) await access(new URL(`../../public${src}`, import.meta.url));
  assert.equal((await list("../../public/screens/")).length, used.size, "an unused file in public/screens");
});

test("every navbar and footer link is a real page, not a scroll to a section", async () => {
  const legal = (await list("./legal/")).map((name) => `/${name.replace(/\.md$/, "")}`);
  const pageFile = async (path: string) => {
    if (legal.includes(path)) return;
    const file = path === "/" ? "index.astro" : path === "/blog" ? "blog/index.astro" : `${path.slice(1)}.astro`;
    await access(new URL(`../pages/${file}`, import.meta.url));
  };
  const hrefs = [
    ...nav.links.map((link) => link.href),
    ...footer.columns.flatMap((column) => column.links.map((link) => link.href as string)),
    ...footer.legal.map((link) => link.href),
    ...Object.values(routes),
  ];
  for (const href of hrefs) {
    assert.ok(href.startsWith("/"), `${href} is not a route`);
    await pageFile(href);
  }
  assert.deepEqual(
    nav.links.map((link) => link.href),
    ["/", "/features", "/demo", "/pricing", "/blog"],
  );
});

test("the grids and lists have the counts the layout is built for", () => {
  assert.equal(features.cards.length, 6);
  assert.equal(why.cards.length, 6);
  assert.ok(faq.items.length >= 5 && faq.items.length <= 6);
  assert.equal(pricing.plans.length, 3);
});

test("Get started points at the web app, local until it is hosted", () => {
  assert.deepEqual(appLinks(undefined), {
    app: `${LOCAL_APP_URL}/`,
    owner: `${LOCAL_APP_URL}/owner/login`,
    demo: `${LOCAL_APP_URL}/`,
    sample: `${LOCAL_APP_URL}/mamas-kitchen/t/12`,
  });
  assert.equal(appLinks("https://app.example.com/").app, "https://app.example.com/");
});

test("sign-in goes to the real app, and the samples to the demo once it has its own address", () => {
  const split = appLinks("https://app.example.com", "https://demo.example.com/");
  assert.equal(split.owner, "https://app.example.com/owner/login");
  assert.equal(split.sample, "https://demo.example.com/mamas-kitchen/t/12");
  assert.equal(split.demo, "https://demo.example.com/");
  // Before the demo has its own address, the samples stay on the app, as they always were.
  assert.equal(appLinks("https://app.example.com").sample, "https://app.example.com/mamas-kitchen/t/12");
});

test("prices, policies and socials stay marked as placeholders until they are real", async () => {
  assert.equal(pricing.placeholder, true);
  for (const name of await list("./legal/")) assert.match(await read(`./legal/${name}`), /placeholder: true/);
  for (const social of footer.socials) assert.equal(social.url as string, "");
});

test("blog posts have the frontmatter the pages need, and a cover that exists", async () => {
  for (const name of await list("./blog/")) {
    assert.match(name, /^[a-z0-9]+(-[a-z0-9]+)*\.md$/, `${name} is not a kebab-case slug`);
    const text = await read(`./blog/${name}`);
    for (const key of ["title", "description", "date", "cover", "coverAlt"]) {
      assert.match(text, new RegExp(`^${key}:`, "m"), `${name} has no ${key}`);
    }
    const cover = text.match(/^cover: "(.+)"$/m)?.[1] ?? "";
    await access(new URL(`../../public${cover}`, import.meta.url));
  }
});

test("blog helpers: read time, dates, related posts and pages", () => {
  assert.equal(readTimeFor("word ".repeat(10)), 1);
  assert.equal(readTimeFor("word ".repeat(660)), 3);
  assert.equal(readTimeFor("word ".repeat(326)), 2);
  assert.equal(formatDate(new Date("2026-11-02")), "November 2, 2026");
  const posts = [
    { slug: "a", date: new Date("2026-10-01") },
    { slug: "b", date: new Date("2026-10-20") },
    { slug: "c", date: new Date("2026-11-02") },
  ];
  assert.deepEqual(related(posts, "c").map((p) => p.slug), ["b", "a"]);
  assert.deepEqual(paginate([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(paginate([], 12), [[]]);
});

test("the contact form asks for a name, a real email and a message, and traps bots", () => {
  const messages = { name: "name", email: "email", message: "message" };
  const empty = { name: "", email: "", message: "", company: "" };
  const bad = checkContact(empty, messages);
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.deepEqual(Object.keys(bad.errors), ["name", "email", "message"]);
  const typo = checkContact({ ...empty, name: "Ama", email: "ama@cafe", message: "Hi" }, messages);
  assert.equal(typo.ok, false);
  const good = { name: "Ama", email: "ama@cafe.test", message: "Hello", company: "" };
  assert.deepEqual(checkContact(good, messages), { ok: true, spam: false });
  assert.deepEqual(checkContact({ ...good, company: "Spam Inc" }, messages), { ok: true, spam: true });
});
