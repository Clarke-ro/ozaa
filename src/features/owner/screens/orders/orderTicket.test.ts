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
  it('keeps every line, extra, note and the total', () => {
    const html = ticketHtml(words);
    for (const text of ['2×', 'Extra shito', 'No pepper', 'GH₵130', 'Table 3 · #25']) {
      expect(html).toContain(text);
    }
  });
  it("prints the guest's note for the whole order, escaped, under the dishes", () => {
    const html = ticketHtml({ ...words, note: 'Note: All at <once>' });
    expect(html).toContain('Note: All at &lt;once&gt;');
    expect(html.indexOf('Note: All')).toBeGreaterThan(html.indexOf('No pepper'));
    expect(html.indexOf('Note: All')).toBeLessThan(html.indexOf('Total'));
  });
  it('prints no note row when the order has none', () => {
    expect(ticketHtml(words)).not.toContain('class="o"');
  });
});

describe('canPrint', () => {
  it('prints anything but a cancelled order', () => {
    expect(canPrint({ status: 'served' })).toBe(true);
    expect(canPrint({ status: 'cancelled' })).toBe(false);
  });
});
