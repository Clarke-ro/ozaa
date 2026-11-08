# Owner app: MenuRite layout, Ozaa look

Clarke asked (2026-11-07) for the owner app to follow the layout of the MenuRite dashboard.
Screenshots of their pages are in `shots/menurite/` (gitignored, never committed).

We take their **layout and structure**. We keep Ozaa's colours, type, icons, copy and logo
(`design/brand.md`). We copy none of their assets or wording.

## What their layout does

- **Light sidebar.** Same warm off-white as the page, no border box. Groups: main items, then
  SALES, then SETTINGS, then help items, then the signed-in person (photo, name, email) at the
  bottom. The active item gets a pale orange pill with orange text and icon. Collapse button
  next to the logo.
- **No top bar on computers.** Each page starts with a bold title and a grey one-line subtitle,
  with one or two actions on the right (a period picker, a black "Create order" button, a
  "Need help" pill).
- **Narrow, centred content.** About 860 px on Home, 650 px on Orders, 760 px on Insights.
  The page never fills a wide screen.
- **White cards on the off-white page**, soft corners, no shadows, faint border.
- **Phone:** a slim header (logo and one action), the same cards stacked, and a bottom tab bar
  (Home, Menu, Orders, Sales, More).

## Page by page

| Theirs | Ours | Change |
|---|---|---|
| Home | Today | Rebuild in their order (below) |
| Orders | Orders | Title row with period picker and Create order; pill tabs with counts; dashed empty box |
| Sales | Sales | Title and subtitle, period picker, grid of stat cards with small caps labels |
| Insights | Insights | Two-across stat cards, then full-width table cards |
| Staff, Billing, settings | Staff, Payments, settings | Title and subtitle, one white card per section |
| Menu (live preview + side panel) | Menu | Leave for later; it is a much bigger change |
| (none) | Floor, Calls | Same page header and cards; table tiles stay |
| Customers, Promos, Delivery | (none) | Not in Ozaa; not built |

## Today, in their Home order

1. Greeting ("Good evening, Ama") and the subtitle "Here's how Mama's Kitchen is doing today".
2. One status banner when something blocks guests (menu hidden, store closed, payments off).
3. Stats row: a **black** "Sales today" card with a "View sales" pill, then three white cards:
   Orders today, Waiting (new + cooking), Visitors today. On phones the black card is full width
   and the three small cards sit in a row under it.
4. **Needs you**: list rows in the same white row style as their setup list.
5. **Live orders**: the same row style, one row per open ticket, step button on the right.
6. **Complete your setup** with an orange percent badge and one row per step (owners only).
7. **Quick actions**: a grid of icon tiles, 4 across on computers, 3 on phones.

Items 4 and 5 are ours; MenuRite has nothing like them.

## Where this broke our earlier rules (Clarke decided yes to all four, 2026-11-07)

1. **Sidebar colour.** Part 1 made the sidebar black. Theirs is light. Decided: switch to light.
2. **Side-by-side cards.** Today had no two-column layouts. Their stats row and tile grid put
   cards side by side. Decided: allowed for the stats row and Quick actions only.
3. **Button colour.** Their main buttons are black. Decided: Ozaa's one filled button per screen
   stays orange; black is used only for the Sales today card.
4. **Renders.** Decided: for owner screens, MenuRite's layout plus Clarke's screenshot approval
   replaces `design/renders/`. Noted at the top of BUILD.md.

## Type (Clarke, 2026-11-08)

Clarke asked for MenuRite's type too. Their dashboard was measured in the browser: Inter only,
weights 400 to 800, page titles 19 to 22 px, body 13 to 15 px, small capital labels 11 to 12 px,
figures 20 to 30 px. The owner app now uses that scale (`tokens.owner.type`), with Inter for
numbers instead of Unbounded. Their 500 maps to our 400 and their 700 and 800 to our 600,
because the app ships five font files (BUILD.md section 11). Guest pages keep the scale in
`design/brand.md` section 3.
