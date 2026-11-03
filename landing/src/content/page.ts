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
  demoMamas: {
    src: "/screens/demo-mamas-kitchen.webp",
    alt: "Mama's Kitchen's sample menu.",
  },
  demoBean: {
    src: "/screens/demo-bean-there.webp",
    alt: "Bean There café's sample menu.",
  },
  demoAkos: {
    src: "/screens/demo-auntie-akos.webp",
    alt: "Auntie Akos Chop Bar's sample menu.",
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

/** The site's pages. Every navbar and footer link is one of these routes. */
export const routes = {
  home: "/",
  features: "/features",
  demo: "/demo",
  pricing: "/pricing",
  blog: "/blog",
  contact: "/contact",
  terms: "/terms",
  privacy: "/privacy",
  cookies: "/cookies",
  login: "/login",
  start: "/get-started",
} as const;

export const nav = {
  links: [
    { href: routes.home, label: "Home" },
    { href: routes.features, label: "Features" },
    { href: routes.demo, label: "Demo" },
    { href: routes.pricing, label: "Pricing" },
    { href: routes.blog, label: "Blog" },
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
        { label: "Home", href: routes.home },
        { label: "Features", href: routes.features },
        { label: "Demo", href: routes.demo },
        { label: "Pricing", href: routes.pricing },
      ],
    },
    {
      heading: "Company",
      links: [
        { label: "Blog", href: routes.blog },
        { label: "Contact", href: routes.contact },
        { label: "Log in", href: routes.login },
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
  legal: [
    { label: "Terms", href: routes.terms },
    { label: "Privacy", href: routes.privacy },
    { label: "Cookies", href: routes.cookies },
  ],
  cookieSettings: "Cookie settings",
  /** The huge word set into the bottom edge of the footer. */
  watermark: "OZAA",
} as const;

export const floating = { label: "Get started" } as const;

/* ---------- Other pages ---------- */

export const featuresPage = {
  title: "Features",
  description:
    "Every Ozaa feature for restaurants: table ordering, waiter calls, bill requests, QR codes, the menu builder, loyalty and more.",
  chip: "Features",
  heading: "Everything your tables need, in one place",
  lead: "From the first scan to the last stamp, Ozaa runs table service on the guest's own phone.",
  smallHeading: "And the details that make it work",
  small: [
    { icon: "wifi", title: "Wi-Fi QR", body: "Guests join your Wi-Fi in one tap. No password on a chalkboard." },
    { icon: "link", title: "Custom links", body: "Add buttons for bookings, delivery or your socials to the table page." },
    { icon: "shield", title: "Feedback and review gating", body: "Happy guests go to Google; unhappy ones reach you privately first." },
    { icon: "chart", title: "Analytics", body: "Busy hours, popular dishes and repeat guests at a glance." },
    { icon: "team", title: "Multi-location teams", body: "One login for every branch, with roles for owners, managers, waiters and kitchen." },
    { icon: "store", title: "Your venue page", body: "Your name, banner, logo and colours on every table." },
  ],
} as const;

export const demoPage = {
  title: "Demo",
  description: "Open a live Ozaa demo menu and see what your guests would see.",
  heading: "See Ozaa at a sample table",
  lead: "Each menu below is a live demo. Open one and order, call a waiter or join the loyalty card, just like a guest would.",
  preview: "Preview",
  menus: [
    { name: "Mama's Kitchen", kind: "Home-style restaurant", slug: "mamas-kitchen", table: "12", screen: "demoMamas" },
    { name: "Bean There", kind: "Café", slug: "bean-there", table: "1", screen: "demoBean" },
    { name: "Auntie Akos Chop Bar", kind: "Chop bar", slug: "auntie-akos", table: "1", screen: "demoAkos" },
  ],
  stripHeading: "What every demo includes",
  strip: ["Menu with photos", "Table ordering", "Waiter calls", "Bill requests", "Loyalty stamps", "Wi-Fi QR"],
  stripMore: "See all features",
} as const;

export const pricingPage = {
  title: "Pricing",
  description: "Simple plans for restaurants of every size. Start free and upgrade when you're ready.",
  chip: "Pricing",
  heading: "Simple plans for every kind of table",
  lead: "Start free. Upgrade when your tables are busy.",
  faqHeading: "Pricing questions",
  faq: [
    { question: "Can I start for free?", answer: "Yes. The Free plan has a menu, table ordering and waiter calls for a few tables, with no time limit." },
    { question: "Can I change plans later?", answer: "Yes. Move up or down at any time and your menu, tables and settings stay as they are." },
    { question: "Is there a contract?", answer: "No. Monthly plans can stop at the end of any month." },
    { question: "Are these the final prices?", answer: "Not yet. Prices on this page are placeholders until launch." },
  ],
} as const;

export const contactPage = {
  title: "Contact",
  description: "Questions about Ozaa for your restaurant? Send us a message.",
  heading: "Get in touch",
  lead: "Questions about Ozaa for your restaurant? Send a message and we'll get back to you.",
  form: {
    name: "Your name",
    email: "Email",
    message: "Message",
    messagePlaceholder: "Tell us about your restaurant and what you'd like to know",
    send: "Send message",
    sending: "Sending…",
    success: "Thanks, your message is on its way. We'll reply by email.",
    error: "That didn't send. Check your connection and try again.",
    notSetUp: "Sending isn't set up yet, so this message wasn't sent. Please try again later.",
    missingName: "Add your name.",
    badEmail: "Add an email address we can reply to.",
    missingMessage: "Add a message.",
  },
  /** Placeholders: an empty value shows "Coming soon". */
  info: [
    { icon: "mail", title: "Email", value: "", note: "We read every message." },
    { icon: "clock", title: "Response time", value: "Within 1 working day", note: "Usually much sooner." },
    { icon: "chat", title: "WhatsApp", value: "", note: "Chat with the team." },
  ],
  comingSoon: "Coming soon",
  faqHeading: "Before you write",
  faq: [
    { question: "Can I try Ozaa first?", answer: "Yes. Open a sample table from the Demo page and order like a guest would." },
    { question: "Do you help with setup?", answer: "Yes. Tell us about your restaurant and we'll help you get your menu and tables ready." },
    { question: "Is Ozaa available where I am?", answer: "Ozaa is built for restaurants anywhere, and the first launch is in Africa. Ask us about your city." },
  ],
} as const;

export const authPages = {
  login: {
    title: "Log in",
    heading: "Log in to Ozaa",
    lead: "Owners and staff sign in with their phone number in the Ozaa app.",
    button: "Continue to sign in",
    other: "New to Ozaa?",
    otherLink: "Get started",
  },
  start: {
    title: "Get started",
    heading: "Set up your restaurant",
    lead: "Sign in with your phone number, then add your menu and print your table codes. You can look around a sample restaurant first.",
    button: "Start with your phone number",
    sample: "Try a sample table first",
    other: "Already have an account?",
    otherLink: "Log in",
  },
  back: "Back to the site",
} as const;

export const notFound = {
  eyebrow: "ERROR 404",
  heading: "Page not found.",
  lead: "The page you're looking for has moved or never existed.",
  button: "Back to home",
} as const;

export const blogPage = {
  title: "Blog",
  description: "Ideas and guides for running busier, smoother tables.",
  heading: "Blog",
  lead: "Ideas and guides for running busier, smoother tables.",
  readMore: "Read more",
  minRead: "min read",
  back: "Back to blog",
  keepReading: "Keep reading",
  ctaHeading: "Try ozaa free",
  ctaBody: "Put your menu on every table and take orders from the guest's own phone.",
  ctaButton: "Get started free",
  perPage: 12,
  newer: "Newer posts",
  older: "Older posts",
} as const;

export const cookieBanner = {
  title: "Cookies",
  body: "We store your choice in your browser. Optional cookies for analytics and marketing only run if you allow them.",
  policy: "Cookie policy",
  reject: "Reject all",
  choose: "Choose",
  accept: "Accept all",
  save: "Save choices",
  necessary: { title: "Necessary", body: "Remembers this choice. Always on." },
  analytics: { title: "Analytics", body: "Helps us see which pages are useful." },
  marketing: { title: "Marketing", body: "Lets us measure campaigns." },
} as const;
