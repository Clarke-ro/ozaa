import type { FeedbackItem } from '@/lib/api/types';

type Note = Pick<FeedbackItem, 'sentiment' | 'score' | 'text' | 'createdAt'>;

const short = (text: string) => (text.length > 90 ? `${text.slice(0, 87)}…` : text);

/**
 * A plain answer about the guest notes, worked out from the notes themselves: how many, the mood
 * split, the average score, and quotes that fit the question. Never invents a trend.
 */
export function feedbackSummary(notes: readonly Note[], question: string): string {
  if (notes.length === 0) return 'There are no guest notes yet, so there is nothing to sum up.';
  const count = (s: Note['sentiment']) => notes.filter((n) => n.sentiment === s).length;
  const pct = (n: number) => Math.round((n / notes.length) * 100);
  const avg = notes.reduce((sum, n) => sum + n.score, 0) / notes.length;
  const newest = [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const q = question.toLowerCase();
  const asksBad = /complain|bad|worst|unhappy|problem|negative/.test(q);
  const asksGood = /love|good|best|happy|praise|positive/.test(q);
  const quotes = newest
    .filter((n) =>
      asksBad ? n.sentiment === 'negative' : asksGood ? n.sentiment === 'positive' : true,
    )
    .slice(0, 3)
    .map((n) => `"${short(n.text)}"`);
  const head = `${notes.length} notes: ${pct(count('positive'))}% happy, ${pct(count('neutral'))}% neutral, ${pct(count('negative'))}% unhappy. Average score ${avg.toFixed(1)} of 5.`;
  if (quotes.length === 0)
    return `${head} None of them are ${asksBad ? 'complaints' : 'happy notes'}.`;
  return `${head} ${asksBad ? 'Latest complaints' : asksGood ? 'Latest happy notes' : 'Latest notes'}: ${quotes.join(' ')}`;
}
