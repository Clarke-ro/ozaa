# Learning Ozaa

Plain notes for Clarke. Newest at the top.

---

## 2026-10-31 · Marketing page

**What we built**

A one-page site that explains Ozaa to a restaurant owner. Guests scan a QR code on the table. The menu, the waiter, and the bill open in the phone browser. The first launch is in Africa, and the product is for restaurants anywhere.

**How it works**

The site is static. A build step turns the page into HTML, CSS, and two small scripts: one opens the phone menu, one fades cards in as you scroll. There is no server and no database.

```
page.ts  →  Astro components  →  dist/index.html
                ↓
         contact.ts checks the form in the browser
                ↓
         the page says nothing was sent
```

You change words in `src/content/page.ts`. The components only display that file. The nav is the `sections` list, so a new block needs a line there and a matching component.

**Files to look at**

- `src/content/page.ts`: the words, the pictures, and the placeholders.
- `src/content/contact.ts`: the rule for a valid enquiry, and the switch from placeholder to real contact links.
- `src/pages/index.astro`: the order of the page.
- `src/styles/global.css`: colour, type, and spacing.

**New idea: a placeholder is a state**

`contact.status` is either `"placeholder"` or `"ready"`. A placeholder has a notice and no address. A ready contact has three links. The page cannot show a send button that pretends to deliver mail while the status is still a placeholder. When you have a real WhatsApp number, phone number, and email, you change the status. You do not add a second form.

**Try it yourself**

In `src/content/page.ts`, change `hero.heading` to a sentence of your own. Run `npm run dev` and reload the page. Put the old sentence back when you are done, then run `npm test`.
