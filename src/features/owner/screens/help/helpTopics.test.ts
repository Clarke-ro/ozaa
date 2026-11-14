import { HELP_GROUPS, searchHelp, type HelpTopic } from './helpTopics';

const text: Record<string, string> = {
  order: 'How do guests order from the table? Scan the QR code',
  prices: 'How do I change prices or hide a dish?',
  staff: 'How do I add my staff?',
  payouts: 'How do card and MoMo payments reach me? Paystack',
  notPaid: 'Why does an order say Not paid?',
  stamps: 'How do loyalty stamps work?',
  reviews: 'Can I only ask happy guests for Google reviews?',
};
const textOf = (topic: HelpTopic) => text[topic.id] ?? '';

describe('searchHelp', () => {
  it('returns every group for an empty query', () => {
    expect(searchHelp(HELP_GROUPS, '  ', textOf)).toBe(HELP_GROUPS);
  });
  it('matches words in any order and case, and drops empty groups', () => {
    const found = searchHelp(HELP_GROUPS, 'PAYSTACK momo', textOf);
    expect(found.map((g) => g.id)).toEqual(['money']);
    expect(found[0]?.topics.map((t) => t.id)).toEqual(['payouts']);
  });
  it('finds a topic in more than one group', () => {
    const found = searchHelp(HELP_GROUPS, 'order', textOf);
    expect(found.flatMap((g) => g.topics.map((t) => t.id))).toEqual(['order', 'notPaid']);
  });
  it('returns nothing when no topic matches', () => {
    expect(searchHelp(HELP_GROUPS, 'pizza', textOf)).toEqual([]);
  });
});
