import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { appLinks, LOCAL_APP_URL } from "./links.ts";
import { faq, features, footer, hero, how, nav, screens, site, why } from "./page.ts";

const banned: readonly RegExp[] = [
  /TakeOrder/i,
  /ScanChop/i,
  /Ghana/i,
  /Accra/i,
  /\bTwi\b/,
  /\bEwe\b/,
  /GH₵/,
  /GHS/,
  /₵/,
];

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

test("published copy does not name a forbidden word or a currency mark", async () => {
  for (const path of ["./page.ts", "../pages/index.astro", "../../README.md", "../../LEARNING.md"]) {
    const text = await read(path);
    for (const pattern of banned) assert.equal(pattern.test(text), false, `${path} matches ${pattern}`);
  }
});

test("no payments wording anywhere: payments come in a later build", async () => {
  const words = /\bpay(s|ment|ments|ing)?\b|\bmomo\b|mobile money|checkout|\bsplit (the )?bill|\btips?\b|card payment/i;
  const files = ["./page.ts"];
  for (const name of await readdir(new URL("../components/", import.meta.url))) {
    files.push(`../components/${name}`);
  }
  for (const path of files) {
    const text = await read(path);
    assert.equal(words.test(text), false, `${path} mentions payments: ${text.match(words)?.[0]}`);
  }
});

test("every sample screen file is used once and exists in the public folder", async () => {
  const used = new Set<string>([screens[hero.screen].src, screens[how.screen].src]);
  for (const card of features.cards) used.add(screens[card.screen].src);
  assert.equal(used.size, Object.keys(screens).length, "a screen is listed but never shown");
  for (const src of used) await access(new URL(`../../public${src}`, import.meta.url));
  const files = await readdir(new URL("../../public/screens/", import.meta.url));
  assert.equal(files.length, used.size, "public/screens has a file the page doesn't use");
});

test("every navbar link lands on a section of the page", async () => {
  const components = await Promise.all(
    (await readdir(new URL("../components/", import.meta.url))).map((name) =>
      read(`../components/${name}`),
    ),
  );
  const markup = components.join("\n");
  const all: readonly { href: string }[] = [
    ...nav.links,
    ...footer.columns.flatMap((column): readonly { href: string }[] => column.links),
  ];
  for (const link of all) {
    if (!link.href.startsWith("#")) continue;
    assert.match(markup, new RegExp(`id="${link.href.slice(1)}"`), `${link.href} has no section`);
  }
});

test("the grids and lists have the counts the layout is built for", () => {
  assert.equal(features.cards.length, 6);
  assert.equal(why.cards.length, 6);
  assert.ok(faq.items.length >= 5 && faq.items.length <= 6);
});

test("Get started points at the web app, local until it is hosted", () => {
  assert.equal(site.url, "");
  assert.deepEqual(appLinks(undefined), {
    app: `${LOCAL_APP_URL}/`,
    sample: `${LOCAL_APP_URL}/mamas-kitchen/t/12`,
    owner: `${LOCAL_APP_URL}/owner/login`,
  });
  assert.equal(appLinks("https://app.example.com/").app, "https://app.example.com/");
  assert.equal(appLinks("  ").owner, `${LOCAL_APP_URL}/owner/login`);
});

test("placeholder socials and legal links stay unlinked until they have a real address", () => {
  for (const item of [...footer.socials, ...footer.legal]) assert.equal(item.url, "");
});
