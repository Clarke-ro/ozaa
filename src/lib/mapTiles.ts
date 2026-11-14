/**
 * Web-map tile maths ("slippy map"), so a page can draw a small map from plain tile images with
 * no map library. The world is a square of 256 px tiles; zoom z has 2^z tiles across.
 * Formulas: https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
 */
export const TILE = 256;

type Geo = { lat: number; lng: number };

/** Where a point sits in world pixels at this zoom (Web Mercator). */
function toWorld({ lat, lng }: Geo, zoom: number) {
  const size = TILE * 2 ** zoom;
  const sin = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * size,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size,
  };
}

function fromWorld(x: number, y: number, zoom: number): Geo {
  const size = TILE * 2 ** zoom;
  const n = Math.PI - (2 * Math.PI * y) / size;
  return {
    lat: (180 / Math.PI) * Math.atan(Math.sinh(n)),
    lng: (x / size) * 360 - 180,
  };
}

/** The tiles that fill a width × height box centred on `center`, with where each one goes. */
export function tilesAround(center: Geo, zoom: number, width: number, height: number) {
  const c = toWorld(center, zoom);
  const left = c.x - width / 2;
  const top = c.y - height / 2;
  const tiles: { x: number; y: number; left: number; top: number }[] = [];
  for (let x = Math.floor(left / TILE); x * TILE < left + width; x++) {
    for (let y = Math.floor(top / TILE); y * TILE < top + height; y++) {
      tiles.push({ x, y, left: x * TILE - left, top: y * TILE - top });
    }
  }
  return { tiles };
}

/** The place under a tap at (px, py) inside the box. */
export function pointToGeo(
  center: Geo,
  zoom: number,
  width: number,
  height: number,
  px: number,
  py: number,
): Geo {
  const c = toWorld(center, zoom);
  return fromWorld(c.x - width / 2 + px, c.y - height / 2 + py, zoom);
}

/** Where `point` falls inside the box, in pixels from its top-left corner. */
export function geoToPoint(center: Geo, point: Geo, zoom: number, width: number, height: number) {
  const c = toWorld(center, zoom);
  const p = toWorld(point, zoom);
  return { left: p.x - c.x + width / 2, top: p.y - c.y + height / 2 };
}
