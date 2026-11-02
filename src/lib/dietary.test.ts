import { DIETARY, dietOptions } from './dietary';

describe('dietary tags', () => {
  it('has every tag the contract allows, in display order', () => {
    expect(DIETARY).toEqual(['vegetarian', 'vegan', 'gluten_free', 'halal', 'spicy']);
  });

  it('offers only tags that dishes on this menu carry: standard first, then typed ones A to Z', () => {
    const items = [
      { dietary: ['vegan', 'vegetarian'], dietaryCustom: ['Keto'] },
      { dietary: ['spicy'], dietaryCustom: ['Dairy free', 'keto'] },
      { dietary: [] },
    ];
    expect(dietOptions(items)).toEqual(['vegetarian', 'vegan', 'spicy', 'Dairy free', 'Keto']);
  });

  it('offers nothing when no dish has a tag', () => {
    expect(dietOptions([{ dietary: [] }])).toEqual([]);
  });
});
