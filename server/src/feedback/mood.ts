/**
 * A first, plain read of a guest note's mood, so the Feedback page can sort the unhappy ones to
 * the top. Word lists, not AI: it never sends a guest's words anywhere. Mixed or unclear notes
 * stay neutral. Score 1 (unhappy) to 5 (happy), 3 for neutral.
 */
const GOOD = ['love', 'loved', 'great', 'amazing', 'delicious', 'tasty', 'excellent', 'perfect', 'friendly', 'nice', 'good', 'best', 'fast', 'thank', 'thanks', 'enjoyed', 'sweet'];
const BAD = ['bad', 'cold', 'slow', 'rude', 'dirty', 'late', 'wrong', 'terrible', 'awful', 'worst', 'bland', 'expensive', 'waited', 'waiting', 'never', 'disappointed', 'hair', 'stale', 'raw', 'burnt', 'sick'];

export function moodOf(text: string): { sentiment: 'positive' | 'neutral' | 'negative'; score: number } {
  const words = text.toLowerCase().match(/[a-z']+/g) ?? [];
  // "not good" reads as bad: a "not" or "no" just before a word flips it.
  let good = 0;
  let bad = 0;
  words.forEach((word, i) => {
    const flipped = words[i - 1] === 'not' || words[i - 1] === 'no';
    if (GOOD.includes(word)) flipped ? (bad += 1) : (good += 1);
    else if (BAD.includes(word)) flipped ? (good += 1) : (bad += 1);
  });
  if (good === bad) return { sentiment: 'neutral', score: 3 };
  if (good > bad) return { sentiment: 'positive', score: good - bad >= 2 ? 5 : 4 };
  return { sentiment: 'negative', score: bad - good >= 2 ? 1 : 2 };
}
