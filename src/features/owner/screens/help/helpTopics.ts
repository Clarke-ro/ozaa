import type { Href } from 'expo-router';

/** One question on the Help page. The words live in en.json under ownerHelp.q.<id>. */
export type HelpTopic = { id: string; to: Href };
export type HelpGroup = { id: 'start' | 'money' | 'guests'; topics: HelpTopic[] };

// The canvas order. Each answer ends with a link to the page it talks about.
export const HELP_GROUPS: HelpGroup[] = [
  {
    id: 'start',
    topics: [
      { id: 'order', to: '/owner/tables' },
      { id: 'prices', to: '/owner/menu' },
      { id: 'staff', to: '/owner/staff' },
    ],
  },
  {
    id: 'money',
    topics: [
      { id: 'payouts', to: '/owner/integrations' },
      { id: 'notPaid', to: '/owner/orders' },
    ],
  },
  {
    id: 'guests',
    topics: [
      { id: 'stamps', to: '/owner/loyalty' },
      { id: 'reviews', to: '/owner/reviews' },
    ],
  },
];

/**
 * Groups with only the topics whose question or answer holds every word typed, ignoring case.
 * Groups left empty are dropped.
 */
export function searchHelp(
  groups: HelpGroup[],
  query: string,
  textOf: (topic: HelpTopic) => string,
): HelpGroup[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return groups;
  return groups
    .map((group) => ({
      ...group,
      topics: group.topics.filter((topic) => {
        const text = textOf(topic).toLowerCase();
        return words.every((word) => text.includes(word));
      }),
    }))
    .filter((group) => group.topics.length > 0);
}
