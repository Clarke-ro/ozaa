import { PLANS, monthlyPrice, planById } from './plans';

test('every plan id the API can send has a plan on the pricing page', () => {
  for (const id of ['free', 'pro', 'business'] as const) {
    expect(planById(id)?.id).toBe(id);
  }
});

test('monthly price is a whole amount with the currency sign', () => {
  const pro = PLANS.find((plan) => plan.id === 'pro');
  expect(pro && monthlyPrice(pro)).toBe('$29');
});
