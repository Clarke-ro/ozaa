import { feedbackSummary } from './feedbackSummary';

const note = (
  sentiment: 'positive' | 'neutral' | 'negative',
  score: number,
  text: string,
  at: string,
) => ({
  sentiment,
  score,
  text,
  createdAt: at,
});

test('no notes says so', () => {
  expect(feedbackSummary([], 'summarise')).toMatch(/no guest notes/);
});

test('counts, average and quotes that fit the question', () => {
  const notes = [
    note('positive', 5, 'Lovely jollof', '2026-11-10T10:00:00Z'),
    note('negative', 2, 'Too salty', '2026-11-11T10:00:00Z'),
    note('positive', 4, 'Quick service', '2026-11-12T10:00:00Z'),
  ];
  const any = feedbackSummary(notes, 'summarise');
  expect(any).toMatch(/^3 notes: 67% happy, 0% neutral, 33% unhappy\. Average score 3\.7 of 5\./);
  expect(feedbackSummary(notes, 'biggest complaints?')).toMatch(/"Too salty"$/);
  expect(feedbackSummary(notes, 'what do they love')).toMatch(/"Quick service" "Lovely jollof"$/);
});
