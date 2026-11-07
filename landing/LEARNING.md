# Learning Cravins

Plain notes for Clarke. Newest at the top.

---

## 2026-11-07 · Compact single-tier footer inspired by Yolé

**What we built**

The landing site footer now uses a compact, single-tier layout inspired by Yolé in Cravins' warm espresso palette:
- **Left**: light logo lockup, tagline, and monochrome rounded-square social badges.
- **Middle**: Product, Resources, and Support link columns with crisp title-case headings.
- **Right**: CTA column (`Ready to upgrade your tables?`) with two side-by-side pills—an outlined glassy `Try a sample table` pill and a filled orange `Get started free` pill—plus a short lead line below.
- **Bottom bar**: a full-width horizontal divider with copyright on the left and underlined, pipe-separated legal links (`Terms | Privacy | Cookies | Cookie settings`) on the right.

**How it works**

CSS Grid lays out all five columns in one row on desktop, then folds cleanly on tablets and phones:

```
Desktop (>1080px):  [Brand + Socials] [Product] [Resources] [Support] [CTA Pills + Lead]
Tablet (≤1080px):   [Brand + Socials (full row)] → [Product] [Resources] [Support] → [CTA (full row)]
Phone (≤640px):     [Brand + Socials] → 2-column link grid → [CTA] → stacked bottom bar
```

The pipe dividers between the legal links are drawn in CSS with `.footer-legal li + li::before`, so screen readers don't read out vertical bar characters.

**Files to look at**

- `src/components/Footer.astro`: the five-column grid and bottom legal bar.
- `src/styles/global.css`: the `.footer`, `.footer-grid`, `.social`, and `.footer-legal` rules.

**New idea: `li + li::before` for visual separators**

Putting `|` characters in HTML makes screen readers announce "vertical line" between every link. Using CSS `li + li::before` draws a 1 px bar before every item *except* the first one, keeping the HTML clean and accessible.

**Try it yourself**

In `src/styles/global.css`, change `grid-template-columns` on `.footer-grid` or tweak the `margin: 0 14px` on `.footer-legal li + li::before` to see the spacing update live.

---

## 2026-11-07 · Frosted glass header

**What we built**

The landing site's top bar is now a full-width frosted glass strip pinned to the top of the screen, inspired by the Yolé header. It uses the light logo, warm white links, a glassy outlined "Log in" pill, and the filled orange "Get started" pill, with a thin bottom hair-line.

**How it works**

CSS blurs whatever scrolls behind the bar in real time:

```
page content scrolls under <header>
   ├─ background: rgba(55, 24, 8, 0.72) tints the bar warm espresso
   ├─ backdrop-filter: blur(22px) saturate(160%) frosts the pixels behind it
   └─ border-bottom: 1px solid rgba(255, 255, 255, 0.22) draws the bottom hair-line
```

Because the bar is `position: fixed` and 72% opaque, white links stay readable at over 5:1 contrast even when a white card scrolls underneath.

**Files to look at**

- `src/components/Navbar.astro`: switches the logo to `cravins-lockup-light.svg` and the "Log in" button to `pill--glass`.
- `src/styles/global.css`: the `--nav-glass` tokens and the `.navbar` rules.

**New idea: `backdrop-filter` vs `filter`**

`filter: blur()` blurs the element itself (including its text). `backdrop-filter: blur()` blurs only what sits *behind* the element, as long as the element's background is partly see-through (`rgba`).

**Try it yourself**

In `src/styles/global.css`, change `blur(22px)` on `.navbar` to `blur(4px)`, then scroll the home page. You'll see the headings and cards behind the bar turn almost sharp instead of frosted.

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

A one-page site that explains Cravins to a restaurant owner. Guests scan a QR code on the table. The menu, the waiter, and the bill open in the phone browser. The first launch is in Africa, and the product is for restaurants anywhere.

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
