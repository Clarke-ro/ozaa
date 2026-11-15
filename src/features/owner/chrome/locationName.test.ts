import { splitLocationName } from './locationName';

describe('splitLocationName', () => {
  it('splits a branch name into the venue and the area', () => {
    expect(splitLocationName("Mama's Kitchen - Osu")).toEqual({
      title: "Mama's Kitchen",
      area: 'Osu',
    });
    expect(splitLocationName('Bean There – Airport')).toEqual({
      title: 'Bean There',
      area: 'Airport',
    });
  });
  it('keeps a name with no area whole', () => {
    expect(splitLocationName('Bean There Cafe')).toEqual({ title: 'Bean There Cafe', area: null });
  });
});
