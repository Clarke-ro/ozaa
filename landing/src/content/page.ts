import { type PublicContact } from "./contact.ts";

/**
 * Sample screens, captured from the app at 393×764 pt and 2×: an iPhone 16 Pro screen minus
 * its status bar and home bar, which the mockup draws around them.
 */
export const screenSize = { width: 786, height: 1528 } as const;

export const screens = {
  home: {
    src: "/screens/home.webp",
    alt: "A sample restaurant's table page, with the menu, call waiter, order status, pay and Wi-Fi.",
  },
  menu: {
    src: "/screens/menu.webp",
    alt: "A sample menu with dish photos, prices and a View order bar.",
  },
  order: {
    src: "/screens/order.webp",
    alt: "A guest's order with a quantity control on each dish and the total.",
  },
  waiter: {
    src: "/screens/waiter.webp",
    alt: "A waiter call that has been sent, with its live status.",
  },
  status: {
    src: "/screens/status.webp",
    alt: "Order status, showing the steps from received to ready.",
  },
  wifi: {
    src: "/screens/wifi.webp",
    alt: "The Wi-Fi page with the network name, password and a join QR code.",
  },
  loyalty: {
    src: "/screens/loyalty.webp",
    alt: "A digital stamp card with filled stamps and a small QR code.",
  },
  review: {
    src: "/screens/review.webp",
    alt: "A review screen with star ratings and quick tags.",
  },
  game: {
    src: "/screens/game.webp",
    alt: "A short stacking game guests can play while they wait.",
  },
  pay: {
    src: "/screens/pay.webp",
    alt: "The bill, with whole bill, split equally and my items, a tip choice and payment methods.",
  },
  ownerToday: {
    src: "/screens/owner-today.webp",
    alt: "The owner's Today screen with sales and what needs attention now.",
  },
  ownerOrders: {
    src: "/screens/owner-orders.webp",
    alt: "The owner's orders, sorted by stage, with an open ticket.",
  },
  ownerMenu: {
    src: "/screens/owner-menu.webp",
    alt: "The owner's menu editor with a sold-out switch on each dish.",
  },
  ownerLoyalty: {
    src: "/screens/owner-loyalty.webp",
    alt: "The owner's loyalty settings: the reward, stamps needed and time between stamps.",
  },
} as const;

export type ScreenName = keyof typeof screens;

export const site = {
  name: "Ozaa",
  title: "Ozaa. Menu, waiter and bill, one scan away",
  description:
    "Guests scan the QR on their table to read the menu, order, call a waiter and pay from their own phone. Restaurants run it all from one app.",
  url: "",
} as const;

export const hero = {
  eyebrow: "No app for guests to install",
  heading: "Menu, waiter and bill. One scan away.",
  lead: "Guests scan the QR on their table to read the menu, order, call a waiter and pay, all from their own phone. You run the whole thing from one simple app.",
  cta: "Get Ozaa",
  secondary: "Try a sample table",
  screen: "home" as const satisfies ScreenName,
  note: "The screens on this page show sample restaurants.",
};

export const sections = [
  { id: "how", nav: "How it works", heading: "Three steps to a live table" },
  { id: "guests", nav: "Guests", heading: "Everything at the table" },
  { id: "owners", nav: "Owners", heading: "Run it from one app" },
  { id: "pay", nav: "Payments", heading: "Guests pay their way" },
  { id: "pricing", nav: "Pricing", heading: "Pricing" },
  { id: "questions", nav: "Questions", heading: "Questions" },
  { id: "contact", nav: "Contact", heading: "Get Ozaa for your restaurant" },
] as const;

export type SectionId = (typeof sections)[number]["id"];

/** The sections worth a link in the header; the footer lists them all. */
export const headerNav: readonly SectionId[] = ["how", "guests", "owners", "pay", "questions"];

export const howLead = "From sign-up to the first order, with the phones and tablets you already have.";

export const steps = [
  {
    title: "Add your menu",
    body: "Put in your dishes, prices and photos, and pick your colours. Switch on only the services you want.",
  },
  {
    title: "Print your table codes",
    body: "Every table gets its own QR code. Print them as cards or stickers and set them out.",
  },
  {
    title: "Guests scan and order",
    body: "Orders and waiter calls reach your phone or tablet straight away, with the table number on each.",
  },
] as const;

export const guestLead =
  "Each table opens your restaurant's own page, in your colours. Guests see only what you switch on.";

/** Shown two to a row; keep the count even. */
export const guestFeatures: readonly {
  title: string;
  body: string;
  screen: ScreenName;
}[] = [
  {
    title: "A menu worth browsing",
    body: "Photos, dietary tags and what's popular. Guests add dishes as they go.",
    screen: "menu",
  },
  {
    title: "Order from the table",
    body: "Guests check their order, change amounts and send it to the kitchen.",
    screen: "order",
  },
  {
    title: "Call a waiter",
    body: "Water, the bill or help with the menu. The table sees when someone is on the way.",
    screen: "waiter",
  },
  {
    title: "Know when it's coming",
    body: "Live order status, from received to ready, without asking.",
    screen: "status",
  },
  {
    title: "Wi-Fi without asking",
    body: "The network and password in one place, with a QR code to join.",
    screen: "wifi",
  },
  {
    title: "A stamp card on the phone",
    body: "Stamps fill in with each visit. Guests tap the card to show staff its QR code.",
    screen: "loyalty",
  },
  {
    title: "Reviews you hear first",
    body: "Happy guests can share on Google. Unhappy ones reach you privately.",
    screen: "review",
  },
  {
    title: "Something to do while they wait",
    body: "A quick game with no ads. A high score can earn a stamp.",
    screen: "game",
  },
];

export const ownerLead = "The owner app runs on a phone, a tablet or the web.";

/** Shown two to a row; keep the count even. */
export const ownerNow: readonly {
  title: string;
  body: string;
  screen: ScreenName;
}[] = [
  {
    title: "Your day at a glance",
    body: "Sales, open tables and anything that needs you right now.",
    screen: "ownerToday",
  },
  {
    title: "Orders by stage",
    body: "New, cooking and ready. Move each ticket on with one tap.",
    screen: "ownerOrders",
  },
  {
    title: "Change the menu in seconds",
    body: "Edit dishes, mark an item sold out and reorder sections.",
    screen: "ownerMenu",
  },
  {
    title: "Your loyalty programme",
    body: "Choose the reward, how many stamps it takes and the time between stamps.",
    screen: "ownerLoyalty",
  },
];

export const laterIntro = "On the way, not ready yet.";

export const later = [
  { title: "Counter till", body: "Staff take orders and cash at the counter." },
  { title: "Stock", body: "Track what you have and mark items sold out automatically." },
  { title: "AI waiter", body: "Guests ask questions and order by text or voice." },
  { title: "Marketing", body: "Message only the guests who agreed to hear from you." },
] as const;

export const payments = {
  lead: "Guests pay the whole bill, split it equally or pay for their own dishes, and can add a tip. They use the payment method they already trust.",
  methods: [
    { title: "Cards", body: "Debit and credit cards." },
    { title: "Mobile money", body: "The wallets people use every day." },
    { title: "Local options", body: "Other methods the payment provider offers in your country." },
  ],
  direct: {
    title: "Paid straight to you",
    body: "Each payment goes to your restaurant's own account through the payment provider. Ozaa never holds the money.",
  },
  screen: "pay" as const satisfies ScreenName,
} as const;

export type Pricing =
  | {
      readonly status: "placeholder";
      readonly body: string;
    }
  | {
      readonly status: "ready";
      readonly plans: readonly {
        readonly name: string;
        readonly price: string;
        readonly detail: string;
      }[];
    };

export const pricing: Pricing = {
  status: "placeholder",
  body: "Pricing isn't set yet. This is a placeholder until it is, and it will be shown in the currency your restaurant pays in.",
};

export const questions = [
  {
    question: "Do guests need to download an app?",
    answer:
      "No. They scan the QR code on the table and your page opens in their phone's browser. No account, no download.",
  },
  {
    question: "How do guests pay?",
    answer:
      "With a card, mobile money or another method the payment provider offers where you are. They can pay the whole bill, split it equally or pay for their own dishes, and add a tip.",
  },
  {
    question: "Does Ozaa hold my money?",
    answer: "No. Each payment goes to your restaurant's own account through the payment provider.",
  },
  {
    question: "Do I need new hardware?",
    answer:
      "No. Print the table QR codes and use the phones, tablets or computers you already have. The owner app runs on all three.",
  },
  {
    question: "Can I choose what guests see?",
    answer:
      "Yes. Every service, from the menu to the game, has its own switch. A service that's off doesn't appear on the table page.",
  },
  {
    question: "Where is Ozaa available?",
    answer: "Ozaa is built for restaurants anywhere. The first launch is in Africa.",
  },
  {
    question: "What does it cost?",
    answer: "Pricing isn't set yet. It will be shown here first.",
  },
] as const;

export const contactLead =
  "Open the app to try a sample table, or sign in to set up your own restaurant.";

export const contact: PublicContact = {
  status: "placeholder",
  notice:
    "This form is a placeholder and doesn't send messages yet. A WhatsApp number, phone number and email address will be added here.",
  held: "Nothing was sent. This form is a placeholder.",
  missingRestaurant: "Add the restaurant name.",
  missingName: "Add your name.",
  missingReach: "Add a phone number, an email address or a WhatsApp number.",
};

export const footer = {
  line: "The table QR for restaurants anywhere. The first launch is in Africa.",
  appHeading: "Try Ozaa",
  pageHeading: "On this page",
  openApp: "Open the app",
  owner: "Owner sign in",
} as const;
