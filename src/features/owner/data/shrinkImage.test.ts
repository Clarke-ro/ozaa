import { fitWithin, LONG_EDGE } from './shrinkImage';

describe('fitWithin', () => {
  it('scales the long edge down to the limit, keeping the shape', () => {
    expect(fitWithin(4032, 3024, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3024, 4032, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it('never makes a small photo bigger', () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });

  it('has a size for each kind of photo', () => {
    expect(LONG_EDGE).toEqual({ dish_photo: 1600, banner: 2000, logo: 512 });
  });
});
