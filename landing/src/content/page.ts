import { type PublicContact } from "./contact.ts";

export const screenSize = { width: 520, height: 1125 } as const;

export const screens = {
  home: {
    src: "/screens/home-default.webp",
    alt: "Sample guest home in Ozaa, with the restaurant name, hours, and a way to open the menu.",
  },
  menu: {
    src: "/screens/menu.webp",
    alt: "Sample menu in Ozaa, with dishes and a button to view the order.",
  },
  wifi: {
    src: "/screens/wifi.webp",
    alt: "Sample Wi-Fi screen in Ozaa.",
  },
  waiter: {
    src: "/screens/waiter-sent.webp",
    alt: "Sample screen after a guest calls the waiter.",
  },
  pay: {
    src: "/screens/pay.webp",
    alt: "Sample payment screen in Ozaa, with a bill and a way to pay.",
  },
  loyalty: {
    src: "/screens/loyalty.webp",
    alt: "Sample loyalty stamp card in Ozaa.",
  },
  review: {
    src: "/screens/review.webp",
    alt: "Sample review screen in Ozaa.",
  },
  game: {
    src: "/screens/game.webp",
    alt: "Sample waiting game in Ozaa.",
  },
  reviews: {
    src: "/screens/owner-reviews.webp",
    alt: "Sample owner screen for checking guest video reviews.",
  },
  services: {
    src: "/screens/owner-services.webp",
    alt: "Sample owner screen with a switch for each service.",
  },
} as const;

export type ScreenName = keyof typeof screens;

export const site = {
  name: "Ozaa",
  title: "Ozaa. The table QR for your restaurant",
  description:
    "Guests scan a table QR for the menu, the waiter, and the bill. Pay by card or mobile money. Ozaa is for restaurants anywhere, with the first launch in Africa.",
  url: "",
} as const;

export const hero = {
  heading: "The all-in-one table system built to turn walk-ins into regulars.",
  lead: "Diners scan the table QR for interactive menus, instant bill splitting, and digital stamp cards in Apple and Google Wallet. Zero app downloads. Zero commission fees.",
  support: "Ozaa is for restaurants anywhere. The first launch is in Africa.",
  samples: "The phone pictures on this page are live interactive samples.",
  cta: "Get Ozaa for your restaurant",
  screen: "menu" as const satisfies ScreenName,
  caption: "Sample guest screen.",
};

export const sections = [
  { id: "how", nav: "How it works", heading: "How it works" },
  { id: "guests", nav: "Guests", heading: "What guests can do from the table" },
  { id: "owners", nav: "Owners", heading: "What you can do" },
  { id: "pay", nav: "Payments", heading: "Pay from the phone" },
  { id: "pricing", nav: "Pricing", heading: "Pricing" },
  { id: "questions", nav: "Questions", heading: "Questions" },
  { id: "contact", nav: "Contact", heading: "Get Ozaa for your restaurant" },
] as const;

export type SectionId = (typeof sections)[number]["id"];

export const steps = [
  {
    title: "Put a QR code on each table.",
    body: "A guest points their camera at the code. There is no app to install.",
  },
  {
    title: "The page opens in the browser.",
    body: "They can read the menu, join the Wi-Fi, call the waiter, pay, collect a stamp, leave a review, or play a short game while they wait.",
  },
  {
    title: "You decide what stays on.",
    body: "Each service has a switch. You check a video review before it shows on your page.",
  },
] as const;

export const guestNote =
  "These pictures are sample screens. Names and prices in them are samples, not a list of customers, and not Ozaa's price.";

export const guestFeatures: readonly {
  title: string;
  body: string;
  screen: ScreenName;
}[] = [
  {
    title: "Menu",
    body: "Guests read the menu and order from the table.",
    screen: "menu",
  },
  {
    title: "Wi-Fi",
    body: "The network name and password are on the page, so guests are not asking staff for them.",
    screen: "wifi",
  },
  {
    title: "Waiter",
    body: "A guest picks a reason and calls the waiter from the phone.",
    screen: "waiter",
  },
  {
    title: "The bill",
    body: "They pay the whole bill, split it, or pay for their own items. Card and mobile money are both there.",
    screen: "pay",
  },
  {
    title: "Stamps",
    body: "A stamp card for repeat visits. Joining asks for a phone number and records consent.",
    screen: "loyalty",
  },
  {
    title: "Reviews",
    body: "A written note or a short video. You choose what other guests can see.",
    screen: "review",
  },
  {
    title: "While they wait",
    body: "A short game on the phone. It has no ads.",
    screen: "game",
  },
  {
    title: "The table page",
    body: "Each table opens on that restaurant's own page, with its name, hours, and services.",
    screen: "home",
  },
];

export const ownerIntro = "Two parts are ready to show. The rest comes later.";

export const ownerNow: readonly {
  title: string;
  body: string;
  screen: ScreenName;
}[] = [
  {
    title: "Reviews",
    body: "You watch each video, then feature it on your page or hide it.",
    screen: "reviews",
  },
  {
    title: "Services",
    body: "You turn each service on or off. A service that is off does not appear on the table page.",
    screen: "services",
  },
];

export const laterIntro = "These are not on the table page yet.";

export const later = [
  {
    title: "POS",
    body: "Staff take orders and cash at the counter.",
  },
  {
    title: "Stock",
    body: "Track what you have, and mark an item sold out.",
  },
  {
    title: "Orders",
    body: "The kitchen sees live orders, including takeaway.",
  },
  {
    title: "AI waiter",
    body: "Guests ask questions and order by text or voice.",
  },
  {
    title: "Marketing",
    body: "Send a message only to guests who agreed to hear from the restaurant.",
  },
  {
    title: "Insights",
    body: "See sales, busy hours, and what reviews mention.",
  },
] as const;

export const payments = {
  lead: "Guests pay the whole bill, split it evenly, or pay for their own items. They can add a tip before they confirm.",
  methods: [
    {
      title: "Card",
      body: "A guest can pay by card.",
    },
    {
      title: "Mobile money",
      body: "Mobile money sits next to the card. MoMo is one mobile money option.",
    },
  ],
  close: "The restaurant is paid directly. Ozaa does not hold the money.",
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
  body: "This is a placeholder. No price is set, and this page does not name a currency. When a price exists, it belongs here, in the currency your restaurants pay in.",
};

export const questions = [
  {
    question: "Do guests install an app?",
    answer:
      "No. They scan the QR code and the page opens in the phone's browser. They do not need an account.",
  },
  {
    question: "How can a guest pay?",
    answer:
      "By card or by mobile money. MoMo is one mobile money option. In the first markets, payments run through Paystack. The restaurant is paid directly. Ozaa does not hold the money.",
  },
  {
    question: "Where is Ozaa available?",
    answer:
      "Ozaa is built for restaurants anywhere. The first launch is in Africa. This page does not list cities that are live.",
  },
  {
    question: "What does it cost?",
    answer: "The price is not set. The pricing section is a placeholder.",
  },
  {
    question: "Can I turn a feature off?",
    answer: "Yes. Each service has its own switch.",
  },
  {
    question: "What happens to the details in this form?",
    answer:
      "Nothing. The form is a placeholder. It does not send or store what you type.",
  },
] as const;

export const contact: PublicContact = {
  status: "placeholder",
  notice:
    "Placeholder. This form does not send messages. A WhatsApp number, a phone number, and an email address are not on this page yet.",
  held: "Nothing was sent. This form is a placeholder.",
  missingRestaurant: "Add the restaurant name.",
  missingName: "Add your name.",
  missingReach: "Add a phone number, an email address, or a WhatsApp number.",
};

export const footer = {
  line: "A table QR for restaurants anywhere. The first launch is in Africa.",
} as const;
