# Ozaa landing page

This folder is the marketing site. It is separate from the guest and owner app.

The page is for restaurant owners anywhere. Africa is the first launch. Guests pay by card or by mobile money. MoMo is one mobile money option.

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

## Where to edit

Copy, sample-screen labels, and the three placeholders live in `src/content/page.ts`.

- `site.url` stays empty until there is a public domain. Then set it to the origin, with no slash at the end. The page uses it for the canonical link and the social image URL.
- `contact` is a placeholder. The form does not send. When a WhatsApp number, a phone number, and an email exist, change `status` to `"ready"` and add `whatsappHref`, `phoneHref`, and `emailHref`.
- `pricing` is a placeholder. There is no price and no currency. When a price exists, change `status` to `"ready"` and add `plans`. Put the amount in the currency the restaurant pays in.

Do not add customer names, quotes, counts, or logos. The phone pictures are sample screens.
