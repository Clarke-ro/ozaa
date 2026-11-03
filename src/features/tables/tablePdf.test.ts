import { generateTableCardHtml } from './tablePdf';
import type { Table } from '@/lib/api/types';

describe('generateTableCardHtml', () => {
  const tables: Table[] = [
    { id: 'tbl_1', code: '4', label: 'Table 4', qrUrl: 'https://ozaa.app/mamas-kitchen/t/4' },
  ];

  test('generates valid HTML document with venue and table code', () => {
    const html = generateTableCardHtml(
      tables,
      { template: 'folded_tent', accentColor: '#D24000', ctaText: 'Scan for Menu & Pay' },
      "Mama's Kitchen",
    );

    expect(html).toContain("Mama's Kitchen");
    expect(html).toContain('Table 4');
    expect(html).toContain('Scan for Menu &amp; Pay');
    expect(html).toContain('<!DOCTYPE html>');
  });
});

test('names are escaped so a venue or table name cannot break the printed page', () => {
  const html = generateTableCardHtml(
    [{ id: 't1', code: '1', label: 'Bar <VIP>', qrUrl: 'https://ozaa.app/x/t/1' }],
    { template: 'sticker', accentColor: '#D24000', ctaText: 'Scan & order' },
    "Mama's <Kitchen>",
  );
  expect(html).not.toContain('<VIP>');
  expect(html).toContain('Bar &lt;VIP&gt;');
  expect(html).toContain("Mama's &lt;Kitchen&gt;");
  expect(html).toContain('Scan &amp; order');
});
