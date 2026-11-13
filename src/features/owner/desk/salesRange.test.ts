import { previousSalesRange, salesRange } from './salesRange';

// Wednesday 4 Nov 2026, 15:30 in Accra (UTC+0).
const now = Date.parse('2026-11-04T15:30:00Z');
const accra = 'Africa/Accra';

describe('salesRange', () => {
  it('this week starts on Monday at the venue’s midnight', () => {
    expect(salesRange({ id: 'week' }, now, accra)).toEqual({ since: '2026-11-02T00:00:00.000Z' });
  });

  it('this month starts on the 1st', () => {
    expect(salesRange({ id: 'month' }, now, accra)).toEqual({ since: '2026-11-01T00:00:00.000Z' });
  });

  it('picked dates include the whole last day', () => {
    expect(salesRange({ id: 'custom', from: '2026-10-01', to: '2026-10-03' }, now, accra)).toEqual({
      since: '2026-10-01T00:00:00.000Z',
      until: '2026-10-04T00:00:00.000Z',
    });
  });

  it('keeps the shared ranges', () => {
    expect(salesRange({ id: 'today' }, now, accra)).toEqual({ since: '2026-11-04T00:00:00.000Z' });
  });
});

describe('previousSalesRange', () => {
  it('compares this week with last week', () => {
    expect(previousSalesRange({ id: 'week' }, now, accra)).toEqual({
      since: '2026-10-26T00:00:00.000Z',
      until: '2026-11-02T00:00:00.000Z',
    });
  });

  it('compares this month with the whole month before', () => {
    expect(previousSalesRange({ id: 'month' }, now, accra)).toEqual({
      since: '2026-10-01T00:00:00.000Z',
      until: '2026-11-01T00:00:00.000Z',
    });
  });

  it('compares picked dates with the same number of days just before', () => {
    expect(
      previousSalesRange({ id: 'custom', from: '2026-10-01', to: '2026-10-03' }, now, accra),
    ).toEqual({ since: '2026-09-28T00:00:00.000Z', until: '2026-10-01T00:00:00.000Z' });
  });
});
