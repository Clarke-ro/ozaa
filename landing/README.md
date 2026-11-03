# Ozaa landing page

This folder is the marketing site. It is separate from the guest and owner app.

The page is for restaurant owners anywhere; Africa is the first launch. It covers table service only (menu, ordering, waiter calls, the bill request, loyalty and feedback). Taking money comes in a later build, so the page doesn't describe it, and a test keeps it that way.

## Run it

From this folder:

```
npm install
npm test
npm run check
npm run dev
```

`npm run dev` serves the page at http://localhost:4321.

```
npm run build
npm run preview
```

`npm run build` writes the static site to `dist/`.

## Where "Get started" goes

Every "Get started", "Log in" and "Try a sample table" link goes to the Ozaa web app (the Expo app's web build). Set its address when you build:

```
PUBLIC_APP_URL=https://app.example.com npm run build
```

Without it, the links go to the local Expo web server at http://localhost:8081, so run `npm run web` in the app folder to follow them. The code is in `src/content/links.ts`.

## Where to edit

- **Words:** every piece of copy is in `src/content/page.ts`.
- **Look:** colours, radii, shadows, spacing and type sizes are tokens at the top of `src/styles/global.css`. Components use the tokens, never raw values.
- **Sections:** one component each in `src/components/`, in page order in `src/pages/index.astro`.
- **Placeholders** (an empty `url` shows the item without a link until it's real):
  - `footer.socials`: the Instagram, X, Facebook and TikTok addresses.
  - `footer.legal`: the Privacy and Terms pages.
  - `site.url`: the public domain, with no slash at the end. The page uses it for the canonical link and the social image.

## Sample screens

`public/screens/` holds screenshots of the real app, taken from a build with payments off at 393×764 pt and 2× (an iPhone 16 Pro screen without its status bar and home bar, which `IPhone.astro` draws). Retake them when the app's screens change. A test checks each file is used exactly once.

Do not add customer names, quotes, counts or logos. The phone pictures are sample screens.
