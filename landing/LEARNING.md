# Learning Ozaa

Plain notes for Clarke. Newest at the top.

---

## 2026-11-03 · A site of its own: QR code, footer and phone frames

**What we built**

The landing site now has a real QR code under the statement that opens a sample table. It also has a new footer with each network's own logo, and whole-screen app shots inside the iPhone frame on the hero and Try it pages.

**How it works**

Some of it happens once, when you run `npm run build`, not every time someone visits:

```
npm run build
   ├─ qrcode turns the sample-table link into an SVG
   ├─ simple-icons hands over the Instagram, X, Facebook and TikTok shapes
   └─ both land in dist/ as plain markup
visitor opens the page → gets the finished SVGs, no extra scripts
```

The app screenshots are taken with the phone's safe areas switched on, so the banner photo runs up behind the status bar the way it does on a real iPhone.

**Files to look at**

- `src/components/Statement.astro`: the QR code.
- `src/components/SocialIcon.astro`: the brand icons.
- `src/components/IPhone.astro`: the `full` option for whole-screen shots.
- `src/components/Footer.astro` and the Footer part of `src/styles/global.css`.

**New idea: build time and run time**

Build time is when your computer makes the site. Run time is when a visitor's phone shows it. Work done at build time is done once and costs the visitor nothing. That's why the QR library stays in `devDependencies`: the visitor never downloads it.

**Try it yourself**

Run `PUBLIC_APP_URL=https://example.com npm run build`, then open `dist/index.html` and scan the code with your phone. It now points at example.com. Build again without it to go back.

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
