# Cravins brand rules (v5.1, 31 Oct 2026)

A summary of the brand Page for the coding agent. The numbers are in `tokens.json`. The screens are in `renders/`, and the working HTML prototype is in `prototype/`. Where this file and a render disagree, the render wins for layout and this file wins for rules. Ask Clarke if both seem wrong.

## 1. Logo: scan frame

- An orange circle (#FC5205). Inside it sits a white rounded square with four QR-style corner marks, and a fork and knife cut out of the square, so they show orange.
- Three drawings, picked by size (made by `logo/make_logo.py`):
  - **full** for 64 px and up
  - **small** for 33 to 63 px: thicker, shorter corner marks and bolder utensils
  - **micro** for 32 px and below: no corner marks, a bigger square and fat utensils. This is what keeps the favicon and tab icon clean.
- Never redraw the logo by hand, recolour it, add effects or put it on a busy photo. On dark backgrounds use `cravins-lockup-on-dark`.
- Variants in `logo/svg/`: icon (orange), black, white (an orange mark on a white disc), mono glyph (no circle), lockups (icon plus "cravins" wordmark in Unbounded), and the Android adaptive foreground, background and monochrome layers.
- Expo files ready to use are in `logo/expo/`: `icon.png` (1024, opaque), `adaptive-icon-foreground.png`, `adaptive-icon-background.png`, `adaptive-icon-monochrome.png`, `splash-icon.png`, `favicon.png` (48), `favicon.ico`.
- `logo/preview.png` shows every size side by side.

## 2. Colour

| Token                     | Hex                                   | Use                                                                          |
| ------------------------- | ------------------------------------- | ---------------------------------------------------------------------------- |
| brand                     | #FC5205                               | The logo only                                                                |
| primary                   | #D24000                               | Cravins buttons, icons, radio dots, focus rings (white text on it passes AA) |
| hover                     | #BA3800                               | Hover on web                                                                 |
| pressed                   | #A33000                               | Pressed                                                                      |
| tint                      | #FFF1EA                               | Icon-button fill, selected rows                                              |
| text                      | #111111                               | All body text                                                                |
| grey600 / 500 / 200 / 100 | #52525B / #6B6B73 / #E4E4E7 / #F4F4F5 | Secondary text, captions, borders, disabled fills                            |
| success / error           | #15803D / #B91C1C                     | Status only                                                                  |
| white                     | #FFFFFF                               | Every background                                                             |

- Cards are white. Pages sit on the soft canvas (`palette.canvas`) so the white cards stand out, in the guest app as in the owner app (Clarke, 16 Nov 2026). No gradients, no coloured headers, no shadows. Two exceptions: the bottom-sheet shadow `0 -8px 24px rgba(0,0,0,.06)`, and the soft card shadow `0 4px 16px rgba(17,17,17,.07)` on the guest home service cards (Clarke, 2 Nov 2026).
- Orange goes only on buttons, icons, radio dots and focus rings, never on large areas.

## 3. Type

- **Guest pages: Noto Sans** for everything (400 body, 600 bold, 800 headings), from 23 Nov 2026 (Clarke). It replaced Unbounded and Inter on guest pages. Of 20 fonts checked, only Noto Sans and Inter draw every Ghanaian letter (ɛ ɔ ŋ ɖ ƒ ʋ ɣ ɓ ɗ ƙ ẹ ọ ṣ) and ₵ ₦; Plus Jakarta Sans has no ɛ or ɔ.
- **Owner app: Inter** (400 and 600).
- All fonts are self-hosted subsets in `assets/fonts/` (WOFF2 for the web, TTF for native), loaded with `expo-font`.
- Scale (size/line height): display-l 28/36 · display-m 22/28 · title 600 18/24 · body 15/22 · caption 13/18 · button 16/20 600.
- Prices use tabular figures. The symbol comes from the venue currency. The Accra sample looks like `GH₵65` (whole cedis) or `GH₵65.50`.
- A venue can pick a heading font: Noto Sans (the Cravins default), Noto Serif or Montserrat. Body text stays Noto Sans.

## 4. Space, grid, radius

- Spacing steps: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
- Mobile grid: 4 columns, 20 px side margins, 12 px gutter. Touch targets are at least 44 px.
- Radius: sm 8, md 12, lg 16, xl 24, full.

## 5. Buttons and icons

- **Primary:** fill #D24000 (or the venue fill), white text, 52 px tall, radius 12. **One filled button per screen**, pinned at the bottom.
- **Secondary:** white with a 1.5 px #111 border. **Ghost:** text only.
- **Icon button:** a 40 px circle with tint fill and a primary-colour icon.
- **Disabled:** #F4F4F5 fill and #6B6B73 text.
- Icons are Lucide (`lucide-react-native`) at 20 or 24 px with a 2 px stroke. No emoji as icons.

## 6. Guest home (renders: home-mamas, home-mamas-scrolled, home-default, home-default-scrolled)

1. **Banner:** an edge-to-edge photo, 150 px below the status bar and running up under it. It stays still while the page scrolls over it (Clarke, 23 Nov 2026). Share (left) and language (right) are white circles on it.
2. **Header sheet:** a white sheet with 24 px rounded top corners rides 24 px up over the banner. It holds a 44 px logo circle (initials on the venue colour when there is no logo), the name in the heading font with the area under it, and the bell on the right.
3. **Info boxes:** small grey boxes under the name: the table ("12 · your table") and the hours ("Open · until 10 PM" on green, or "Closed · opens …"). A thin grey gap separates the header from the services, which sit on white.
4. **Story circles ("Guests are saying"):** video reviews. Unwatched rings use the venue colour; watched ones are grey. Tapping one opens the viewer: full screen, progress bars, tap left or right to move, swipe down to close, and "Add to order" for the dish.
5. **Services** in four sections, each item opening its own screen:
   - **At your table:** Menu (a wide card), Call waiter, Order status, Pay & split bill, Wi-Fi (2-column cards)
   - **Rewards:** Loyalty card, Specials & offers, Leave a review (list rows)
   - **Fun while you wait:** Play while you wait
   - **More:** Reserve a table, Events, Feedback & complaints, About & contact

   A section with no services switched on is hidden.

6. **Bottom bar:** shows the live order status, or "View order · 3 · GH₵143" in the Accra sample while on the menu. A compact header pins on scroll.
7. The footer line reads "Powered by Cravins", with the micro logo.

## 7. Other guest screens

- **Waiter:** pick a reason (Water, The bill, Cutlery, Order more, Clean the table, Something else), then see "Kwesi is on the way. Usually under 3 minutes."
- **Order status:** four steps (Received, Being prepared, Ready, Served) with the ETA. A bar of four segments under the headline fills to the current step, and a paid order shows a green "Paid" pill (24 Nov 2026).
- **Order paid / Not paid (24 Nov 2026):** the venue and order on top, a round badge with two soft rings (green tick, red cross), a bold headline, a grey details card, then Done or Try again.
- **Your order and payment (one page, 24 Nov 2026):** dish cards, Add more dishes, then How are you paying (a grey segmented control: Whole bill, Split equally, My items; tables only), the tip as four equal boxes (No tip to start), and MoMo, Cash or Card as three square boxes. Place order opens Paystack's own page for MoMo or card; Cash at a table asks the waiter for the bill. Pay & split bill on the table home still pays an order later.
- **Review:** stars, "what stood out" chips and text, or record a 15–30 s video on the front camera. Done unlocks at 15 s. The feature-consent box is ticked by default and the guest can untick it.
- **Game (Plate Stack):** one point per plate, with your best score kept on the phone. The leaderboard shows this week's top 5 at the venue, and a nickname is optional. A stamp can be earned at the owner's target score (for example 15), once per visit. The game works offline and has no ads.
- **Food ready:** a black banner slides down over any screen, the game included, with a View button.

## 8. Owner side (Cravins chrome: always Cravins orange, never the venue colour)

- **Clean screens (Clarke, 24 Nov 2026), on every owner page:**
  - Each part of a page sits in its own card.
  - Its title goes above the card, never inside it (`TitledSection`).
  - Keep inline text to a minimum: no explaining sentences under titles or controls when the label already says it. A placeholder or one short line is enough.
  - Sheets: a short title, at most a short count or name under it.

- **Video reviews** (render: owner-reviews): tabs To check, Featured and Hidden. Each card shows the thumbnail and length, first name, stars, dish, quote and consent state, with Hide and Feature buttons. Low ratings get a note suggesting a private reply.
- **Services** (render: owner-services): an on/off switch for every service, plus a game-stamp switch with its target score.
- **Customise** (renders: v4-reference/customise*.png): banner, logo, colour (presets or hex) with a live contrast note and preview, heading font, name, description, location and hours, then "Save and publish".
- **Orders dashboard** (render: v4-reference/04-owner-dashboard.png for content; restyle it to v5 chrome): live orders by status, waiter calls and today's takings.

## 9. Venue theming (`prototype/theme.js`, function `deriveTheme`)

A venue picks one colour, which goes on buttons, the active category chip, add buttons, Popular badges, quick-action icons, story rings and the stamp card. Everything else stays black, white and grey.

1. **Text on the colour:** white if it reaches 4.5:1. If not, #111111 if that reaches 4.5:1. If neither does, darken the colour until white passes.
2. **Colour on white** (icons and links): darken in 2% steps until it reaches 4.5:1. Yellow #FFC21A, for example, becomes #94710F.
3. **Badges:** a tint mixing 14% colour with white, with the badge text darkened until it reaches 4.5:1 on the tint.
4. **Pressed state:** 14% darker (8% when the text is dark).
5. **Warning:** if the colour is within CIE76 ΔE 20 of Cravins orange, Customise warns the owner.
6. Customise shows the ratios and any fallback as soon as the owner picks a colour.

Port this function to `src/features/theming/deriveTheme.ts` with tests first. The renders show the results for #B5432A, #1F5C3F and #FFC21A.

## 10. Words

Talk to the guest in plain, short sentences. Say what happens next and that the money is safe. Never mention TakeOrder. The money sentences below are the Accra sample. Another currency uses its own symbol in the same sentence.

| Moment       | Copy                                                                                               |
| ------------ | -------------------------------------------------------------------------------------------------- |
| Menu         | What are you having?                                                                               |
| Add          | Add to order · GH₵70                                                                               |
| Checkout     | Pay GH₵143 with MoMo. You approve it on your phone.                                                |
| Waiting      | Check your phone and enter your PIN to approve.                                                    |
| Paid         | Paid. Your order is with the kitchen.                                                              |
| Failed       | That didn't go through and nothing was taken. Try again?                                           |
| Loyalty      | 6 of 10. Four more and the next one is on us.                                                      |
| Call waiter  | Kwesi is on the way. Usually under 3 minutes.                                                      |
| Food ready   | Your food is ready! Jollof & chicken is on its way to table 12.                                    |
| Game         | A quick game. Beat the top score here.                                                             |
| Video review | Mama's Kitchen can feature this video in their stories. Only your first name and rating are shown. |
| Owner        | You made GH₵2,480 today, 12% more than last Saturday.                                              |

## 11. Sample content

The photos, avatars, story stills and review video in `prototype/img` and `prototype/media` are AI-generated placeholders. Label them "Sample" in the app, and replace them with each venue's own photos before launch. The dish videos were left out of this kit because the video menu is on the roadmap only.

## 12. Still open (not for the coding agent to decide)

- A trademark search (Ghana Registrar-General, OAPI, WIPO, and the offices for later countries).
- A meaning check of "cravins" with speakers of French, Portuguese, Arabic, Swahili, and the languages of the first cities.
- Domains: cravins.africa, cravins.app, getcravins.com and cravinspay.com were free on 31 Oct 2026, and cravins.com is taken. Nothing has been bought.
