import { geoToPoint, pointToGeo, tilesAround, TILE } from './mapTiles';

const osu = { lat: 5.556, lng: -0.1822 };

describe('tilesAround', () => {
  it('covers the whole box with 256 px tiles', () => {
    const { tiles } = tilesAround(osu, 16, 560, 200);
    const right = Math.max(...tiles.map((t) => t.left + TILE));
    const bottom = Math.max(...tiles.map((t) => t.top + TILE));
    expect(Math.min(...tiles.map((t) => t.left))).toBeLessThanOrEqual(0);
    expect(Math.min(...tiles.map((t) => t.top))).toBeLessThanOrEqual(0);
    expect(right).toBeGreaterThanOrEqual(560);
    expect(bottom).toBeGreaterThanOrEqual(200);
  });
  it('names real tile numbers for Accra at zoom 16', () => {
    const { tiles } = tilesAround(osu, 16, 256, 256);
    // Accra sits just west of Greenwich and just north of the equator.
    for (const t of tiles) {
      expect(t.x).toBeGreaterThan(32700);
      expect(t.x).toBeLessThan(32768);
      expect(t.y).toBeLessThan(32768);
      expect(t.y).toBeGreaterThan(31700);
    }
  });
});

describe('pointToGeo', () => {
  it('gives back the centre for the middle of the box', () => {
    const geo = pointToGeo(osu, 16, 560, 200, 280, 100);
    expect(geo.lat).toBeCloseTo(osu.lat, 6);
    expect(geo.lng).toBeCloseTo(osu.lng, 6);
  });
  it('moves east to the right and north up', () => {
    const geo = pointToGeo(osu, 16, 560, 200, 400, 20);
    expect(geo.lng).toBeGreaterThan(osu.lng);
    expect(geo.lat).toBeGreaterThan(osu.lat);
  });
});

describe('geoToPoint', () => {
  it('is the reverse of pointToGeo', () => {
    const geo = pointToGeo(osu, 16, 560, 200, 123, 45);
    const back = geoToPoint(osu, geo, 16, 560, 200);
    expect(back.left).toBeCloseTo(123, 6);
    expect(back.top).toBeCloseTo(45, 6);
  });
});
