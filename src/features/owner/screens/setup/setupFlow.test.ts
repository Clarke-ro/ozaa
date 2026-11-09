import { footerFor, setupSummary } from './setupFlow';

describe('footerFor', () => {
  test('the first step has no Back and no Skip', () => {
    expect(footerFor('venue', false)).toEqual({ back: false, skip: null, primary: 'next' });
  });

  test('Wi-Fi can be skipped', () => {
    expect(footerFor('wifi', false)).toEqual({ back: true, skip: 'skip', primary: 'next' });
  });

  test('payments: connect Paystack, or skip for now and pay in person', () => {
    expect(footerFor('payments', false)).toEqual({
      back: true,
      skip: 'skipForNow',
      primary: 'connect',
    });
  });

  test('payments with Paystack already connected just finishes', () => {
    expect(footerFor('payments', true)).toEqual({ back: true, skip: null, primary: 'finish' });
  });
});

describe('setupSummary', () => {
  const base = { venueName: "Mama's Kitchen", tableCount: 10, wifiName: '', paystack: false };

  test('one row per step, in step order', () => {
    expect(setupSummary(base).map((row) => row.step)).toEqual([
      'venue',
      'tables',
      'wifi',
      'payments',
    ]);
  });

  test('says what is set, and marks what is still missing', () => {
    const rows = setupSummary(base);
    expect(rows[0]).toEqual({ step: 'venue', done: true, value: "Mama's Kitchen" });
    expect(rows[1]).toEqual({ step: 'tables', done: true, value: 10 });
    expect(rows[2]).toEqual({ step: 'wifi', done: false, value: null });
    // In person always works, so payments is never "missing"; online is the extra.
    expect(rows[3]).toEqual({ step: 'payments', done: true, value: 'inPerson' });
  });

  test('with Wi-Fi and Paystack set, every row is done', () => {
    const rows = setupSummary({ ...base, wifiName: 'MamasGuest', paystack: true });
    expect(rows.every((row) => row.done)).toBe(true);
    expect(rows[2]?.value).toBe('MamasGuest');
    expect(rows[3]?.value).toBe('online');
  });

  test('no name or no tables yet is not done', () => {
    const rows = setupSummary({ ...base, venueName: '  ', tableCount: 0 });
    expect(rows[0]?.done).toBe(false);
    expect(rows[1]?.done).toBe(false);
  });
});
