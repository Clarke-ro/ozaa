# Cravins v5: guest home with services, video review stories, Play while you wait, new logo

Everything here is sample data. No real restaurant, guest or payment is involved.

## Logo (logo/)
Five non-heart shapes were tried: speech bubble, plate, scan frame, pin and drop (`logo/logo-variants-v5.png`, 240/48/24/16 px).
Chosen: **speech bubble**. It links to talking, reviews and story circles, the tail gives a shape food-delivery logos don't use, and it still reads at 16 px.
Files: cravins-icon.svg, cravins-icon-small.svg (bolder cuts for 48 px and below), cravins-icon-black(.svg/-small.svg), cravins-icon-white.svg,
cravins-icon-512/192/48/24/16.png, cravins-icon-black-512.png, cravins-lockup(.svg/.png), cravins-lockup-mono(.svg/.png), cravins-wordmark.svg.
Generator: `logo5.py`.

## Guest app (app/), reusable as a frontend
- `index.html?venue=mamas#home` is a single page with hash routes: home, story/<id>, menu, wifi, waiter, waiter/sent, loyalty, review, review/record, play, status, pay, plus offers, reserve, events, feedback, about.
- `owner.html` (reviews) and `owner.html#services` (toggles) are the owner side, in Cravins chrome.
- `data.js` has the services catalogue in 4 sections (At your table, Rewards, Fun while you wait, More), each venue's toggles, the stories, Wi-Fi, loyalty and game settings.
- `theme.js` gives venue theming (unchanged from v4). `?accent=none` gives the Cravins default.
- `game.js` is Plate Stack, the Play while you wait game.
- `vendor/qrcode.js` is the MIT QR generator. The Wi-Fi QR code is real and scannable.
- The video menu is paused and on the roadmap. It is not built and is not in the services list.

## Real vs placeholder
| Thing | Status |
|---|---|
| Layout, theming, routes, buttons, copy | Real, working HTML/CSS/JS |
| Play while you wait game | Real and playable. Tap or Space. Offline, no ads, no network calls. |
| Leaderboard | Real but local to the browser (localStorage). Sample names are marked "sample". A shared venue board needs the Cravins backend. |
| Loyalty stamp for a high score | Real in the page (owner toggle in data.js `game.stampReward/stampScore`). In-memory and localStorage only. |
| "Your food is ready!" banner | Real UI. It fires from BroadcastChannel('cravins-order'), the localStorage key `cravins:order-ready`, or `?ready=<s>` for demos. The kitchen feed is not built. |
| Wi-Fi QR | Real QR for the sample network/password |
| Video recorder | Uses the real camera and MediaRecorder when allowed. Otherwise it shows a sample still. Upload is not built. |
| Story video (Ama) | AI-generated sample video (`app/media/review-ama.mp4`) |
| Other stories (Kofi, Efua, Yaw, Akua), avatars | AI-generated sample stills |
| Food and banner photos | AI-generated samples (from v4) |
| Dish videos (`app/media/dish-*.mp4`) | AI-generated samples kept for the later video menu. Not used in v5 screens. |
| Payments (MoMo, card) | Mock UI only. No provider logos. |
| Owner review moderation | Mock UI. Feature/Hide toggles locally. |

## Renders (renders/, 390x844 @2x)
home-mamas, home-mamas-scrolled, home-default, home-default-scrolled, story, menu, wifi, waiter, waiter-sent, loyalty, review, review-record, game-start, game, game-over, status, pay, owner-reviews, owner-services.
`mockups.png` puts them side by side. Re-render with `render.sh name "query#route"`, `render-owner.sh`, then `python3 mockups.py`.

## Game test
`node --experimental-websocket game-test.mjs` drives real Chrome over CDP with mouse taps. The result is in `renders/game-test.txt`:
start, then 16 aligned taps for a score of 16 and a stamp earned, then a deliberate miss for game over and best score saved, then nickname "Clarke" saved and shown on the leaderboard, then the food-ready banner shows, with 0 non-file network requests.
