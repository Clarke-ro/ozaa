import { initialsOf } from './initials';

describe('initialsOf', () => {
  it('takes the first and last word of a full name', () => {
    expect(initialsOf({ name: 'Kofi Mensah', phoneMasked: '024 *** 4567' })).toBe('KM');
    expect(initialsOf({ name: 'Ama Serwaa Owusu', phoneMasked: '024 *** 4567' })).toBe('AO');
  });

  it('takes two letters of a one-word name', () => {
    expect(initialsOf({ name: 'abena', phoneMasked: '024 *** 4567' })).toBe('AB');
  });

  it('falls back to the phone with no name', () => {
    expect(initialsOf({ name: '  ', phoneMasked: '024 *** 4567' })).toBe('02');
  });
});
