/** How many reviews gave each number of stars, 5 first, for the bars beside the average. */
export function starCounts(
  reviews: readonly { stars: number }[],
): { stars: number; count: number }[] {
  return [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((r) => Math.round(r.stars) === stars).length,
  }));
}
