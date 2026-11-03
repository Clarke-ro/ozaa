import { MAX_BATCH, planTables } from './planTables';

const blank = { start: '', end: '', prefix: '', list: '' };

test('a range makes one code per number, with the prefix', () => {
  expect(
    planTables('range', { ...blank, start: '1', end: '3', prefix: 'Patio' }, []).codes,
  ).toEqual(['Patio 1', 'Patio 2', 'Patio 3']);
});

test('a backwards or huge range explains the problem instead of creating anything', () => {
  expect(planTables('range', { ...blank, start: '5', end: '1' }, [])).toEqual({
    codes: [],
    error: 'ownerTables.errOrder',
  });
  expect(planTables('range', { ...blank, start: '1', end: String(MAX_BATCH + 1) }, []).error).toBe(
    'ownerTables.errTooMany',
  );
  expect(planTables('range', { ...blank, start: 'a', end: '2' }, []).error).toBe(
    'ownerTables.errNumbers',
  );
});

test('a list is trimmed and de-duplicated', () => {
  expect(planTables('list', { ...blank, list: ' VIP 1, Bar 4 ,, VIP 1' }, []).codes).toEqual([
    'VIP 1',
    'Bar 4',
  ]);
});

test('tables that already exist are skipped, ignoring case', () => {
  expect(planTables('range', { ...blank, start: '1', end: '3' }, ['2']).codes).toEqual(['1', '3']);
  expect(planTables('list', { ...blank, list: 'bar 4' }, ['Bar 4'])).toEqual({
    codes: [],
    error: 'ownerTables.errAllExist',
  });
});
