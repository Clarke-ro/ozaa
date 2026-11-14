import { generateTableCardHtml, PAGE_SIZE } from './tablePdf';
import type { Table } from '@/lib/api/types';

const tables: Table[] = [
  { id: 'tbl_1', code: '4', label: 'Table 4', qrUrl: 'https://cravins.app/mamas-kitchen/t/4' },
];
const settings = {
  accentColor: '#D24000',
  ctaText: 'Scan for Menu & Pay',
  shortText: 'Scan to order',
};

describe('generateTableCardHtml', () => {
  test('generates valid HTML document with venue and table code', () => {
    const html = generateTableCardHtml(
      tables,
      { ...settings, template: 'folded_tent' },
      "Mama's Kitchen",
    );
    expect(html).toContain("Mama's Kitchen");
    expect(html).toContain('Table 4');
    expect(html).toContain('Scan for Menu &amp; Pay');
    expect(html).toContain('<!DOCTYPE html>');
  });

  test.each(['folded_tent', 'acrylic_stand', 'sticker'] as const)(
    '%s prints on its own paper size, in the picked colour',
    (template) => {
      const html = generateTableCardHtml(tables, { ...settings, template }, 'Mama');
      expect(html).toContain(`size: ${PAGE_SIZE[template]}`);
      expect(html).toContain('#D24000');
    },
  );

  test('a colour that is not a hex code falls back to Cravins orange', () => {
    const html = generateTableCardHtml(
      tables,
      { ...settings, template: 'sticker', accentColor: 'red;}</style><script>' },
      'Mama',
    );
    expect(html).not.toContain('<script>');
    expect(html).toContain('#D24000');
  });

  test('prints the venue logo when there is one', () => {
    const html = generateTableCardHtml(
      tables,
      { ...settings, template: 'folded_tent', logoUrl: 'https://cdn.cravins.app/logo.png' },
      'Mama',
    );
    expect(html).toContain('src="https://cdn.cravins.app/logo.png"');
  });
});

test('names are escaped so a venue or table name cannot break the printed page', () => {
  const html = generateTableCardHtml(
    [{ id: 't1', code: '1', label: 'Bar <VIP>', qrUrl: 'https://cravins.app/x/t/1' }],
    {
      template: 'acrylic_stand',
      accentColor: '#D24000',
      ctaText: 'Scan',
      shortText: 'Scan & order',
    },
    "Mama's <Kitchen>",
  );
  expect(html).not.toContain('<VIP>');
  expect(html).toContain('Bar &lt;VIP&gt;');
  expect(html).toContain("Mama's &lt;Kitchen&gt;");
  expect(html).toContain('Scan &amp; order');
});
