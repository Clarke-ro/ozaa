import { pricing } from '../../../../../landing/src/content/pricing';
import type { Business } from '@/lib/api/types';

// The pricing page is the one place plans are written down. Read it from there, so the
// owner app and the website can never show different plans. Prices are still placeholders.
export const PLANS = pricing.plans;
export const PLANS_ARE_PLACEHOLDERS = pricing.placeholder;

export type PlanId = Business['plan'];
export type PlanInfo = (typeof PLANS)[number];

export function planById(id: PlanId): PlanInfo | undefined {
  return PLANS.find((plan) => plan.id === id);
}

/** "$29" style price for one month, from the whole-number amount on the pricing page. */
export function monthlyPrice(plan: PlanInfo): string {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency: pricing.currency,
    maximumFractionDigits: 0,
  }).format(plan.monthly);
}
