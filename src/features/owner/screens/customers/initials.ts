import type { LoyaltyCustomerSummary } from '@/lib/api/types';

/**
 * A member's initials for their avatar: first and last word of the name ("Kofi Mensah" → "KM"),
 * the first two letters of a one-word name, or the start of the masked phone with no name.
 */
export function initialsOf(customer: Pick<LoyaltyCustomerSummary, 'name' | 'phoneMasked'>) {
  const name = customer.name?.trim();
  if (!name) return customer.phoneMasked.slice(0, 2);
  const words = name.split(/\s+/);
  const first = words[0] ?? '';
  const last = words[words.length - 1] ?? '';
  return (words.length > 1 ? `${first[0]}${last[0]}` : name.slice(0, 2)).toUpperCase();
}
