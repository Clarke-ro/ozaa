import { changedFields } from './draft';

test('only edits that differ from the server count as changes', () => {
  expect(changedFields({ a: 'x', b: 'y' }, { a: 'x', b: 'z' })).toEqual({ b: 'z' });
});

test('no edits, no changes', () => {
  expect(changedFields({ a: 1 }, {})).toEqual({});
});

test('arrays and objects compare by content, not identity', () => {
  expect(changedFields({ list: ['a', 'b'] }, { list: ['a', 'b'] })).toEqual({});
  expect(changedFields({ list: ['a', 'b'] }, { list: ['b', 'a'] })).toEqual({ list: ['b', 'a'] });
});
