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
      "Mama's Kitchen"
    );

    expect(html).toContain("Mama's Kitchen");
    expect(html).toContain('Table 4');
    expect(html).toContain('Scan for Menu & Pay');
    expect(html).toContain('<!DOCTYPE html>');
  });
});
