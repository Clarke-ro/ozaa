import { menuRows } from './menuRows';

const sections = [
  { id: 'mains', name: { en: 'Mains' } },
  { id: 'drinks', name: { en: 'Drinks' } },
];
const d = (id: string, categoryId: string) => ({ id, categoryId });
const items = [
  d('jollof', 'mains'),
  d('waakye', 'mains'),
  d('banku', 'mains'),
  d('sobolo', 'drinks'),
];

describe('menuRows', () => {
  it('groups by section with a heading when showing every section', () => {
    const rows = menuRows(items, sections, { grouped: true, view: 'list', columns: 2 });
    expect(
      rows.map((r) =>
        r.type === 'heading' ? `# ${r.title}` : r.type === 'dish' ? r.item.id : 'grid',
      ),
    ).toEqual(['# Mains', 'jollof', 'waakye', 'banku', '# Drinks', 'sobolo']);
  });

  it('chunks a section into grid rows of the column count, with no headings when not grouped', () => {
    const rows = menuRows(items.slice(0, 3), sections, {
      grouped: false,
      view: 'grid',
      columns: 2,
    });
    expect(rows.map((r) => (r.type === 'grid' ? r.items.map((i) => i.id) : r.type))).toEqual([
      ['jollof', 'waakye'],
      ['banku'],
    ]);
  });

  it('gives every row a stable, unique key', () => {
    const keys = menuRows(items, sections, { grouped: true, view: 'grid', columns: 2 }).map(
      (r) => r.key,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });
});
