import { canPrint, ticketHtml } from './orderTicket';

const words = {
  title: 'Table 3 · #25',
  placed: 'Ordered 08:18',
  lines: [
    {
      qty: 2,
      name: 'Jollof <b>& chicken</b>',
      extras: ['Extra shito'],
      note: 'No pepper',
      price: 'GH₵130',
    },
  ],
  sums: [{ label: 'Total', value: 'GH₵130', strong: true }],
  footer: 'Cravins',
};

describe('ticketHtml', () => {
  it('escapes what owners and guests typed', () => {
    const html = ticketHtml(words);
    expect(html).toContain('Jollof &lt;b&gt;&amp; chicken&lt;/b&gt;');
    expect(html).not.toContain('<b>');
  });
  it("shows the guest's order note under the time, escaped", () => {
    const html = ticketHtml({ ...words, note: 'Less <i>salt</i>' });
    expect(html).toContain('<div class="o">Less &lt;i&gt;salt&lt;/i&gt;</div>');
  });
  it('leaves the order note out when there is none', () => {
    expect(ticketHtml(words)).not.toContain('class="o"');
  });
  it('keeps every line, extra, note and the total', () => {
    const html = ticketHtml(words);
    for (const text of ['2×', 'Extra shito', 'No pepper', 'GH₵130', 'Table 3 · #25']) {
      expect(html).toContain(text);
    }
  });
});

describe('canPrint', () => {
  it('prints anything but a cancelled order', () => {
    expect(canPrint({ status: 'served' })).toBe(true);
    expect(canPrint({ status: 'cancelled' })).toBe(false);
  });
});
