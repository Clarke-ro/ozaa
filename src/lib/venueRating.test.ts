import { ratingOf } from './venueRating';

test('no reviews: no rating, not a zero', () => {
  expect(ratingOf([])).toBeNull();
});

test('the average of every review, to one decimal', () => {
  expect(ratingOf([5, 4, 4])).toEqual({ average: 4.3, count: 3 });
  expect(ratingOf([1, 5])).toEqual({ average: 3, count: 2 });
});
