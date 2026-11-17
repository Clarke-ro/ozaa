import { finishWord, statusKey, timelineSteps } from './guestTimeline';

describe('timelineSteps', () => {
  it('ticks a step the moment staff mark it, and highlights the next one', () => {
    expect(timelineSteps('accepted')).toEqual(['done', 'next', 'todo', 'todo']);
    expect(timelineSteps('preparing')).toEqual(['done', 'done', 'next', 'todo']);
    expect(timelineSteps('ready')).toEqual(['done', 'done', 'done', 'next']);
  });

  it('ticks every step once served (or picked up, or delivered)', () => {
    expect(timelineSteps('served')).toEqual(['done', 'done', 'done', 'done']);
  });

  it('shows the first step as next while nobody has accepted the order yet', () => {
    expect(timelineSteps('received')).toEqual(['next', 'todo', 'todo', 'todo']);
  });
});

describe('finishWord', () => {
  it('says served at a table, picked up for pickup and delivered for delivery', () => {
    expect(finishWord('table')).toBe('served');
    expect(finishWord(undefined)).toBe('served');
    expect(finishWord('pickup')).toBe('pickedUp');
    expect(finishWord('delivery')).toBe('delivered');
  });
});

describe('statusKey', () => {
  it('words a finished order by how it ended', () => {
    expect(statusKey({ status: 'served', source: 'delivery' })).toBe('statusLabel.delivered');
    expect(statusKey({ status: 'served', source: 'table' })).toBe('statusLabel.served');
    expect(statusKey({ status: 'ready', source: 'pickup' })).toBe('statusLabel.ready');
  });
});
