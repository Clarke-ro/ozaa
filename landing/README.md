# Cravins marketing site

This folder is the marketing site. It is separate from the guest and owner app.

The site is for restaurant owners anywhere; Africa is the first launch. It covers table service only (menu, ordering, waiter calls, the bill request, loyalty and feedback). Taking money comes in a later build, so the site doesn't describe it, and a test keeps it that way.

## Run it

From this folder:

```
npm install
npm test
npm run check
npm run dev
```

`npm run dev` serves the site at http://localhost:4321. `npm run build` writes the static site to `dist/`, and `npm run preview` serves that build (with a real 404 status for unknown pages).

## Pages

| Route | What it is |
| --- | --- |
| `/` | Home |
| `/features` | Every feature |
| `/demo` | Live sample menus |
| `/pricing` | Plans (placeholder prices) |
| `/blog`, `/blog/<slug>` | Blog index and posts; `/blog/page/<n>` once there are more than 12 posts |
| `/contact` | Contact form |
| `/terms`, `/privacy`, `/cookies` | Legal pages |
| `/login`, `/get-started` | Hand over to the owner sign-in in the app |
| `/sitemap.xml`, `/rss.xml` | Built from the pages and posts |
| anything else | The 404 page, served with a 404 status |

Pages swap through Astro's client router with link prefetching, and no transition animation.

## Settings (env variables at build time)

| Variable | What it does | Until it's set |
| --- | --- | --- |
| `PUBLIC_APP_URL` | Where Log in and Get started go: the real Cravins app | http://localhost:8081, so run `npm run web` in the app folder |
| `PUBLIC_DEMO_URL` | Where Try it, the sample menus and the QR card go: the demo build with sample restaurants | `PUBLIC_APP_URL` |
| `PUBLIC_CONTACT_ENDPOINT` | The form service URL the contact form posts to (for example a Formspree or Web3Forms form). These URLs are public, so no secret key is involved | The form says sending isn't set up yet and sends nothing |
| `SITE_URL` | The public domain, for canonical links, share images, the sitemap and RSS | http://localhost:4321 |

```
PUBLIC_APP_URL=https://app.example.com PUBLIC_CONTACT_ENDPOINT=https://formspree.io/f/xxxx SITE_URL=https://example.com npm run build
```

## Where to edit

- **Words:** every piece of copy is in `src/content/page.ts`.
- **Prices:** `src/content/pricing.ts`. Set `placeholder: false` when the prices are real.
- **Blog:** add `src/content/blog/<kebab-case-slug>.md` with `title`, `description`, `date`, `cover` and `coverAlt` in the frontmatter. Read time is worked out from the word count unless you set `readTime`. Covers go in `public/blog/`.
- **Legal:** paste the real policy into `src/content/legal/terms.md`, `privacy.md` or `cookies.md`, and set `placeholder: false`. Placeholder pages are hidden from search engines and the sitemap.
- **Look:** colours, radii, shadows, spacing and type sizes are tokens at the top of `src/styles/global.css`. Components use the tokens, never raw values.
- **Social links:** `footer.socials` in `page.ts`. An empty `url` shows the icon without a link; a real one opens in a new tab.
- **Contact details:** `contactPage.info` in `page.ts`. An empty value shows "Coming soon".

## Cookies

The banner stores the visitor's choice in `localStorage` under `cravins-cookies`. Nothing optional runs yet; when analytics or marketing scripts are added, load them only if that choice allows it. "Cookie settings" in the footer reopens the banner.

## Sample screens

`public/screens/` holds screenshots of the real app, taken from a build with payments off at 393×764 pt and 2× (an iPhone 16 Pro screen without its status bar and home bar, which `IPhone.astro` draws). Retake them when the app's screens change. A test checks each file is used exactly once.

The hero's `home.webp` and the three `demo-*.webp` venue pages on the Try it page are different: each is the whole screen (393×852 pt at 2×), taken with the phone's safe areas, so the banner photo runs up behind the status bar. They're marked `full: true` in `page.ts`.

The QR code under the statement is drawn at build time and opens the sample table at `PUBLIC_DEMO_URL` (or `PUBLIC_APP_URL` without it). Until that's set it points at localhost, so a phone can't open it yet.

Do not add customer names, quotes, counts or logos. The phone pictures are sample screens.
