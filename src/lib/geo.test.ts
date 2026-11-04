import { distanceKm } from './geo';

test('the same point is 0 km away', () => {
  expect(distanceKm({ lat: 5.556, lng: -0.1969 }, { lat: 5.556, lng: -0.1969 })).toBe(0);
});

test('Osu to Accra Mall is about 7 km in a straight line', () => {
  const osu = { lat: 5.556, lng: -0.1822 };
  const mall = { lat: 5.6211, lng: -0.1737 };
  expect(distanceKm(osu, mall)).toBeCloseTo(7.3, 0);
});

test('one degree of latitude is about 111 km', () => {
  expect(distanceKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111.2, 0);
});
