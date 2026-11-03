import { generateTableCodes } from './tableRange';

describe('generateTableCodes', () => {
  test('generates sequential numeric table codes', () => {
    expect(generateTableCodes(1, 5)).toEqual(['1', '2', '3', '4', '5']);
  });

  test('generates codes with custom prefix', () => {
    expect(generateTableCodes(1, 3, 'Bar ')).toEqual(['Bar 1', 'Bar 2', 'Bar 3']);
  });

  test('guards against invalid bounds', () => {
    expect(generateTableCodes(5, 1)).toEqual([]);
    expect(generateTableCodes(0, 0)).toEqual([]);
  });
});
