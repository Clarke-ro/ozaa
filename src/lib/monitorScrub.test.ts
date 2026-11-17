import { scrubEvent } from './monitorScrub';

describe('scrubEvent', () => {
  it('keeps what went wrong and the page path, and drops anything about the person', () => {
    const out = scrubEvent({
      exception: { values: [{ type: 'TypeError', value: 'x is undefined' }] },
      request: {
        url: 'https://cravins-app.vercel.app/mamas-kitchen/pay?reference=pay_abc&phone=0241234567',
        headers: { Authorization: 'Bearer gst.secret' },
        cookies: { a: 'b' },
      },
      user: { ip_address: '1.2.3.4', email: 'ama@example.com' },
      breadcrumbs: [{ message: 'fetch https://api/v1/orders' }],
      extra: { body: 'anything' },
    });
    const text = JSON.stringify(out);
    for (const leak of [
      'secret',
      '0241234567',
      'pay_abc',
      'ama@example.com',
      '1.2.3.4',
      'anything',
      'fetch',
    ]) {
      expect(text).not.toContain(leak);
    }
    expect(out.exception?.values?.[0]?.type).toBe('TypeError');
    expect(out.request?.url).toBe('https://cravins-app.vercel.app/mamas-kitchen/pay');
  });
});
