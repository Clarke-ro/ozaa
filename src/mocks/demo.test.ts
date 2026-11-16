import venuesFile from './fixtures/venues.json';
import { DEMO_VENUE_NAMES, STAFF } from './demo';

const venues = venuesFile as Record<string, { name: string }>;

describe('demo data', () => {
  it('names each sample venue as the fixture does', () => {
    for (const [slug, name] of Object.entries(DEMO_VENUE_NAMES)) {
      expect(venues[slug]?.name).toBe(name);
    }
  });

  it('has a name for every venue a sample staff member works at', () => {
    for (const person of STAFF) expect(DEMO_VENUE_NAMES[person.slug]).toBeDefined();
  });
});
