import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { checkContactDraft, contactMode } from "./contact.ts";
import {
  contact,
  guestFeatures,
  hero,
  ownerNow,
  pricing,
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
  const used = new Set<string>([screens[hero.screen].src]);
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
