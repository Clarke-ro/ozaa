import { amountDue, orderSteps } from './orderSteps';

const at = {
  createdAt: '2026-11-09T10:00:00Z',
  updatedAt: '2026-11-09T10:30:00Z',
  readyAt: '2026-11-09T10:20:00Z',
};

describe('orderSteps', () => {
  it('marks only the first stage done for a new order, with its time', () => {
    const steps = orderSteps({ ...at, status: 'received', readyAt: null });
    expect(steps.map((s) => [s.id, s.state])).toEqual([
      ['received', 'done'],
      ['accepted', 'current'],
      ['preparing', 'todo'],
      ['ready', 'todo'],
      ['served', 'todo'],
    ]);
    expect(steps[0]?.at).toBe(at.createdAt);
  });

  it('puts Start cooking next once the order is accepted', () => {
    const steps = orderSteps({ ...at, status: 'accepted', readyAt: null });
    expect(steps.map((s) => s.state)).toEqual(['done', 'done', 'current', 'todo', 'todo']);
    expect(steps[1]?.at).toBeNull();
  });

  it('shows the ready time once the food is ready', () => {
    const steps = orderSteps({ ...at, status: 'ready' });
    expect(steps.map((s) => s.state)).toEqual(['done', 'done', 'done', 'done', 'current']);
    expect(steps[3]?.at).toBe(at.readyAt);
  });

  it('marks every stage done once served, using the last update as the served time', () => {
    const steps = orderSteps({ ...at, status: 'served' });
    expect(steps.every((s) => s.state === 'done')).toBe(true);
    expect(steps[4]?.at).toBe(at.updatedAt);
  });

  it('ends a cancelled order on a cancelled step', () => {
    const steps = orderSteps({ ...at, status: 'cancelled', readyAt: null });
    expect(steps.map((s) => [s.id, s.state])).toEqual([
      ['received', 'done'],
      ['cancelled', 'done'],
    ]);
    expect(steps[1]?.at).toBe(at.updatedAt);
  });
});

describe('amountDue', () => {
  it('is the total minus what was paid', () => {
    expect(amountDue({ totalPesewas: 14300, paidPesewas: 5000 })).toBe(9300);
  });

  it('never goes below zero', () => {
    expect(amountDue({ totalPesewas: 1000, paidPesewas: 1500 })).toBe(0);
  });
});
