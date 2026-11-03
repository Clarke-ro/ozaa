import { addTag } from './tags';

const known = [
  { id: 'vegan', label: 'Vegan' },
  { id: 'gluten_free', label: 'Gluten free' },
];

describe('addTag', () => {
  it('adds a new label, trimmed and with single spaces', () => {
    expect(addTag('  low   sugar ', { custom: [], known, max: 6, maxLength: 24 })).toEqual({
      kind: 'custom',
      next: ['low sugar'],
    });
  });

  it('picks the standard tag when the typed text matches its name in any case', () => {
    expect(addTag('VEGAN', { custom: [], known, max: 6, maxLength: 24 })).toEqual({
      kind: 'known',
      id: 'vegan',
    });
  });

  it('refuses empty, duplicate, too long, and one past the limit', () => {
    const opts = { custom: ['Keto'], known, max: 2, maxLength: 5 };
    expect(addTag('   ', opts)).toEqual({ kind: 'error', reason: 'empty' });
    expect(addTag('keto', opts)).toEqual({ kind: 'error', reason: 'duplicate' });
    expect(addTag('Paleo diet', opts)).toEqual({ kind: 'error', reason: 'long' });
    expect(addTag('Raw', { ...opts, custom: ['Keto', 'Low'] })).toEqual({
      kind: 'error',
      reason: 'full',
    });
  });
});
