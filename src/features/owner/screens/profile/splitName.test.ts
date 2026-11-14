import { splitName } from './splitName';

describe('splitName', () => {
  it('keeps a single name as the first name', () => {
    expect(splitName(' Ama ')).toEqual({ firstName: 'Ama', lastName: null });
  });
  it('splits at the first space and keeps the rest together', () => {
    expect(splitName('Ama  Serwaa Owusu')).toEqual({ firstName: 'Ama', lastName: 'Serwaa Owusu' });
  });
  it('gives an empty first name for blank input', () => {
    expect(splitName('   ')).toEqual({ firstName: '', lastName: null });
  });
});
