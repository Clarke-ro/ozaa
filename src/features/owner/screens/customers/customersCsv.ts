import type { LoyaltyCustomerSummary } from '@/lib/api/types';

const HEADER = 'Phone,Name,Stamps,Rewards Available,Marketing Opt-In,Last Stamp';

// CSV wraps text in quotes; a quote inside the text is written twice, or the row breaks.
const quoted = (text: string) => `"${text.replace(/"/g, '""')}"`;

/**
 * The members list as a spreadsheet file. Phones stay masked, as on screen: the export never
 * carries more personal data than the owner can already see (Act 843).
 */
export function customersCsv(items: readonly LoyaltyCustomerSummary[]): string {
  const rows = items.map((c) =>
    [
      quoted(c.phoneMasked),
      quoted(c.name ?? ''),
      c.stamps,
      c.rewardsAvailable,
      c.wantsOffers ? 'YES' : 'NO',
      quoted(c.lastStampAt),
    ].join(','),
  );
  return [HEADER, ...rows].join('\n');
}
