/**
 * Plans and prices for /pricing. These are PLACEHOLDERS: Clarke hasn't set real prices.
 * Change the numbers (and set `placeholder: false`) when they are decided.
 * Prices are whole amounts per month; yearly shows the monthly equivalent when paid yearly.
 * Cravins doesn't take money from guests in this build, so no plan lists anything like that.
 */
export const pricing = {
  placeholder: true,
  currency: "USD",
  notice: "Placeholder prices. Real prices will be shown here before launch.",
  periods: { monthly: "Monthly", yearly: "Yearly" },
  yearlyNote: "Save about 2 months",
  perMonth: "/month",
  billedYearly: "per month, billed yearly",
  cta: "Get started",
  popular: "Most popular",
  plans: [
    {
      id: "free",
      name: "Free",
      blurb: "Try Cravins at a few tables.",
      monthly: 0,
      yearly: 0,
      features: [
        { label: "Digital menu with photos", included: true },
        { label: "Up to 5 table QR codes", included: true },
        { label: "Table ordering", included: true },
        { label: "Waiter calls and bill requests", included: true },
        { label: "Loyalty stamps", included: false },
        { label: "Feedback and review gating", included: false },
        { label: "Analytics", included: false },
        { label: "Multiple locations", included: false },
      ],
    },
    {
      id: "pro",
      name: "Pro",
      blurb: "Everything a busy restaurant needs.",
      monthly: 29,
      yearly: 24,
      popular: true,
      features: [
        { label: "Digital menu with photos", included: true },
        { label: "Unlimited table QR codes", included: true },
        { label: "Table ordering", included: true },
        { label: "Waiter calls and bill requests", included: true },
        { label: "Loyalty stamps", included: true },
        { label: "Feedback and review gating", included: true },
        { label: "Analytics", included: true },
        { label: "Multiple locations", included: false },
      ],
    },
    {
      id: "business",
      name: "Business",
      blurb: "For groups with more than one location.",
      monthly: 79,
      yearly: 66,
      features: [
        { label: "Digital menu with photos", included: true },
        { label: "Unlimited table QR codes", included: true },
        { label: "Table ordering", included: true },
        { label: "Waiter calls and bill requests", included: true },
        { label: "Loyalty stamps", included: true },
        { label: "Feedback and review gating", included: true },
        { label: "Analytics", included: true },
        { label: "Multiple locations and teams", included: true },
      ],
    },
  ],
} as const;

export type Plan = (typeof pricing.plans)[number];
