/**
 * Every word on the landing page, in one place. Components only lay it out.
 * Taking money comes in a later build, so no copy here describes it (page.test.ts checks).
 */

/**
 * Sample screens, captured from the app at 393×764 pt and 2×: an iPhone 16 Pro screen minus
 * its status bar and home bar, which IPhone.astro draws around them.
 */
export const screenSize = { width: 786, height: 1528 } as const;

export const screens = {
  home: {
    src: "/screens/home.webp",
    alt: "A sample restaurant's table page with the menu, call waiter, order status and Wi-Fi.",
  },
  menu: {
    src: "/screens/menu.webp",
    alt: "A sample menu with dish photos, prices and a View order bar.",
  },
  waiter: {
    src: "/screens/waiter.webp",
    alt: "A waiter call that has been sent, with its live status.",
  },
  bill: {
    src: "/screens/bill.webp",
    alt: "The call waiter screen with The bill picked.",
  },
  loyalty: {
    src: "/screens/loyalty.webp",
    alt: "A digital stamp card with five of eight stamps filled.",
  },
  ownerOrders: {
    src: "/screens/owner-orders.webp",
    alt: "The orders screen, sorted by stage, with an open ticket for table 3.",
  },
  ownerMenu: {
    src: "/screens/owner-menu.webp",
    alt: "The menu builder with a sold-out switch on each dish.",
  },
  ownerTables: {
    src: "/screens/owner-tables.webp",
    alt: "A printable table card with the restaurant name, table 12 and its QR code.",
  },
} as const;

export type ScreenName = keyof typeof screens;

export const site = {
  name: "Ozaa",
  title: "Ozaa. Turn every table into a smart ordering point",
  description:
    "Guests scan the QR on their table to see the menu, order, call a waiter or ask for the bill, with no app to download.",
  url: "",
} as const;

export const nav = {
  links: [
    { href: "#features", label: "Features" },
    { href: "#how", label: "How it works" },
    { href: "#who", label: "For who" },
    { href: "#why", label: "Why ozaa" },
    { href: "#faq", label: "FAQ" },
  ],
  login: "Log in",
  start: "Get started",
  open: "Open menu",
  close: "Close menu",
} as const;

export const hero = {
  before: "Turn every table into a ",
  highlight: "smart ordering point",
  after: ".",
  lead: "Guests scan the QR on their table to see your menu, order, call a waiter or ask for the bill. No app to download.",
  primary: "Get started free",
  secondary: "See how it works",
  screen: "home" as const satisfies ScreenName,
} as const;

export const statement = {
  text: "One QR code on the table, and your menu, your orders and every guest request are in the same place. Change a dish once and every table sees it.",
  marquee: ["Scan", "Order", "Call waiter", "Ask for bill", "Loyalty", "Feedback"],
} as const;

/** Each card's picture is an app screen sitting on a coloured tile. */
export const features = {
  badge: "Features",
  heading: "Everything a table needs, on the guest's own phone",
  more: "See all features",
  cards: [
    {
      title: "Order from the table",
      body: "Guests browse photos and prices, then send their order straight to the kitchen.",
      screen: "menu",
      tile: "orange",
    },
    {
      title: "Call a waiter",
      body: "Water, cutlery or help with the menu. The call reaches staff with the table number.",
      screen: "waiter",
      tile: "peach",
    },
    {
      title: "Ask for the bill",
      body: "One tap lets your team know the table is ready for the bill.",
      screen: "bill",
      tile: "rose",
    },
    {
      title: "Per-table QR codes",
      body: "Every table gets its own code, ready to print as a tent card, stand or sticker.",
      screen: "ownerTables",
      tile: "apricot",
    },
    {
      title: "Menu builder",
      body: "Add dishes, photos and sections, and mark an item sold out in seconds.",
      screen: "ownerMenu",
      tile: "coral",
    },
    {
      title: "Loyalty stamps",
      body: "A digital stamp card that fills up with every visit and brings guests back.",
      screen: "loyalty",
      tile: "peach",
    },
  ],
} as const;

export const how = {
  heading: "How it works",
  steps: [
    {
      title: "Build your menu",
      body: "Add your dishes, prices and photos, and pick your colours.",
    },
    {
      title: "Print your table QR codes",
      body: "Each table gets its own code. Print them and set them out.",
    },
    {
      title: "Take orders live on the orders screen",
      body: "New orders and waiter calls appear straight away, sorted by stage.",
    },
  ],
  cta: "Get started",
  screen: "ownerOrders" as const satisfies ScreenName,
} as const;

export const who = {
  heading: "Built for every kind of table",
  rows: [
    ["Restaurants", "Cafés", "Bars", "Lounges"],
    ["Hotels", "Food courts", "Chop bars", "Beach clubs"],
  ],
} as const;

export const why = {
  badge: "Why ozaa",
  heading: "A smoother service for guests and staff",
  cards: [
    {
      icon: "phone",
      title: "No app for guests",
      body: "Guests scan and go. Nothing to download and no account to make.",
    },
    {
      icon: "turns",
      title: "Faster table turns",
      body: "Orders and requests reach staff straight away, so tables move sooner.",
    },
    {
      icon: "check",
      title: "Fewer order mistakes",
      body: "Guests pick dishes and notes themselves, so nothing is lost between table and kitchen.",
    },
    {
      icon: "screen",
      title: "Live orders screen",
      body: "Every ticket in one place, from new to cooking to ready.",
    },
    {
      icon: "star",
      title: "Guest feedback and reviews",
      body: "Hear from unhappy guests privately, and send happy ones to Google.",
    },
    {
      icon: "chart",
      title: "Simple analytics",
      body: "Busy hours, popular dishes and repeat guests at a glance.",
    },
  ],
} as const;

export type WhyIcon = (typeof why.cards)[number]["icon"];

export const faq = {
  heading: "Questions, answered",
  items: [
    {
      question: "How long does setup take?",
      answer:
        "You can add your menu and print your table codes in one sitting. There's no hardware to install: Ozaa runs on the phones, tablets and computers you already have.",
    },
    {
      question: "Do guests need to download an app?",
      answer:
        "No. Guests scan the QR code on the table and your menu opens in their phone's browser. No download and no account.",
    },
    {
      question: "How much does Ozaa cost?",
      answer:
        "You can try Ozaa free with a sample restaurant. Pricing for restaurants isn't set yet; it will be published here first.",
    },
    {
      question: "Can I update the menu at any time?",
      answer:
        "Yes. Change a dish, a photo or a section and every table sees it straight away. Mark an item sold out and it stops guests ordering it.",
    },
    {
      question: "Does it work offline?",
      answer:
        "Guests need mobile data or your Wi-Fi to order. If the signal drops, the menu they already opened stays on screen.",
    },
    {
      question: "How do waiter calls work?",
      answer:
        "A guest picks what they need, like water or the bill. The call reaches staff phones with the table number, and the guest sees when someone is on the way.",
    },
  ],
} as const;

export const footer = {
  cta: "Ready to upgrade your tables?",
  ctaButton: "Get started free",
  tagline: "Every table, one scan away.",
  columns: [
    {
      heading: "Product",
      links: [
        { label: "Features", href: "#features" },
        { label: "How it works", href: "#how" },
        { label: "For who", href: "#who" },
        { label: "FAQ", href: "#faq" },
      ],
    },
    {
      heading: "Company",
      links: [
        { label: "Log in", href: "app:owner" },
        { label: "Try a sample table", href: "app:sample" },
        { label: "Get started", href: "app:app" },
      ],
    },
  ],
  social: "Stay connected",
  /** Placeholders: an empty url shows the icon without a link until the account exists. */
  socials: [
    { name: "Instagram", icon: "instagram", url: "" },
    { name: "X", icon: "x", url: "" },
    { name: "Facebook", icon: "facebook", url: "" },
    { name: "TikTok", icon: "tiktok", url: "" },
  ],
  /** Placeholders until the pages are written; an empty url shows plain text. */
  legal: [
    { label: "Privacy", url: "" },
    { label: "Terms", url: "" },
  ],
} as const;

export const floating = { label: "Get started" } as const;
