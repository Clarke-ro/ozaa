import type { CustomerTag, LoyaltyCustomerSummary } from '@/lib/api/types';
import type { StatusTone } from '@/theme/palette';

// The tag colours on the canvas: regulars green, a reward ready orange, new blue, quiet amber.
export const TAG_TONE: Record<CustomerTag, StatusTone> = {
  regular: 'success',
  reward_ready: 'order',
  new: 'info',
  quiet: 'bill',
};
// One tag per member, the most useful first.
const TAG_ORDER: readonly CustomerTag[] = ['reward_ready', 'regular', 'new', 'quiet'];

/** The one tag to show for a member. A reward to claim counts even before the tag is worked out. */
export function pickTag(
  customer: Pick<LoyaltyCustomerSummary, 'tags' | 'rewardsAvailable'>,
): CustomerTag | undefined {
  const tags = customer.tags ?? [];
  return TAG_ORDER.find(
    (x) => tags.includes(x) || (x === 'reward_ready' && customer.rewardsAvailable > 0),
  );
}
