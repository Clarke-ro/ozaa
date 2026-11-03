import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { checkContactDraft, contactMode } from "./contact.ts";
import { appLinks, LOCAL_APP_URL } from "./links.ts";
import {
  contact,
  guestFeatures,
  hero,
  ownerNow,
  payments,
  pricing,
  questions,
  screens,
  sections,
  site,
} from "./page.ts";

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

test("published copy does not name a forbidden word or a currency mark", async () => {
  const files = [
    new URL("./page.ts", import.meta.url),
    new URL("./contact.ts", import.meta.url),
    new URL("../pages/index.astro", import.meta.url),
    new URL("../../README.md", import.meta.url),
    new URL("../../LEARNING.md", import.meta.url),
  ];
  for (const file of files) {
    const text = await readFile(file, "utf8");
    for (const pattern of banned) {
      assert.equal(
        pattern.test(text),
        false,
        `${file.pathname} matches ${pattern}`,
      );
    }
  }
});

test("pricing and contact stay placeholders until Clarke fills them", () => {
  assert.equal(pricing.status, "placeholder");
  assert.equal(contactMode(contact), "placeholder");
  assert.equal(contact.status, "placeholder");
  assert.equal(site.url, "");
  if (pricing.status !== "placeholder") return;
  assert.match(pricing.body, /placeholder/i);
  if (contact.status === "placeholder") {
    assert.match(contact.notice, /placeholder/i);
    assert.match(contact.held, /nothing was sent/i);
  }
});

test("section ids are unique and the page renders each one", async () => {
  const ids = sections.map((section) => section.id);
  assert.equal(new Set(ids).size, ids.length);
  const index = await readFile(
    new URL("../pages/index.astro", import.meta.url),
    "utf8",
  );
  for (const id of ids) {
    assert.match(index, new RegExp(`\\b${id}:`));
  }
});

test("every sample screen file exists once in the public folder", async () => {
  const used = new Set<string>([screens[hero.screen].src, screens[payments.screen].src]);
  for (const feature of guestFeatures) used.add(screens[feature.screen].src);
  for (const item of ownerNow) used.add(screens[item.screen].src);
  assert.equal(used.size, Object.keys(screens).length);
  for (const src of used) {
    await access(new URL(`../../public${src}`, import.meta.url));
  }
});

test("the contact check asks for a restaurant, a name, and one way to reply", () => {
  assert.equal(contact.status, "placeholder");
  if (contact.status !== "placeholder") return;
  const copy = contact;
  const empty = {
    restaurant: "",
    name: "",
    phone: "",
    email: "",
    whatsapp: "",
    message: "",
  };
  assert.deepEqual(checkContactDraft(empty, copy), {
    ok: false,
    field: "restaurant",
    message: copy.missingRestaurant,
  });
  assert.equal(
    checkContactDraft({ ...empty, restaurant: "North Cafe" }, copy).ok,
    false,
  );
  const noReach = checkContactDraft(
    { ...empty, restaurant: "North Cafe", name: "Ama" },
    copy,
  );
  assert.equal(noReach.ok, false);
  if (!noReach.ok) assert.equal(noReach.field, "reach");
  const ready = checkContactDraft(
    { ...empty, restaurant: "North Cafe", name: "Ama", email: "a@cafe.test" },
    copy,
  );
  assert.deepEqual(ready, { ok: true });
});

test("a ready contact with a blank link stays a placeholder", () => {
  assert.equal(
    contactMode({
      status: "ready",
      whatsappHref: "https://wa.me/100",
      phoneHref: "",
      emailHref: "mailto:hi@example.com",
    }),
    "placeholder",
  );
  assert.equal(
    contactMode({
      status: "ready",
      whatsappHref: "https://wa.me/100",
      phoneHref: "tel:+100",
      emailHref: "mailto:hi@example.com",
    }),
    "ready",
  );
});

test("feature rows pair up, two screens to a row", () => {
  assert.equal(guestFeatures.length % 2, 0);
  assert.equal(ownerNow.length % 2, 0);
});

test("Get Ozaa points at the web app, local until it is hosted", () => {
  assert.deepEqual(appLinks(undefined), {
    app: `${LOCAL_APP_URL}/`,
    sample: `${LOCAL_APP_URL}/mamas-kitchen/t/12`,
    owner: `${LOCAL_APP_URL}/owner/login`,
  });
  assert.equal(appLinks("https://app.example.com/").app, "https://app.example.com/");
  assert.equal(appLinks("  ").owner, `${LOCAL_APP_URL}/owner/login`);
});

test("payment copy is not just one mobile money brand", () => {
  const text = JSON.stringify({ payments, questions });
  assert.equal(/MoMo/.test(text), false);
  assert.match(text, /card/i);
  assert.match(text, /never holds|does(n't| not) hold/i);
});

test("no copy promises video reviews, which the product dropped", async () => {
  const text = await readFile(new URL("./page.ts", import.meta.url), "utf8");
  assert.equal(/video/i.test(text), false);
});
