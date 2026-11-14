import { useRef, useState, type ComponentRef } from 'react';
import { Image, Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react-native';
import type { GeoPoint } from '@/lib/api/types';
import { env } from '@/lib/env';
import { geoToPoint, pointToGeo, tilesAround, TILE } from '@/lib/mapTiles';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

const HEIGHT = 200;
// Street level: close enough to pick the right door.
const ZOOM = 17;
const PIN = 28;
// Central Accra, for a location with no pin yet. Cravins is Ghana-only for now.
const ACCRA = { lat: 5.5571, lng: -0.2012 };

/**
 * The venue's map pin (canvas). Delivery fees use the straight-line distance from it. "Move the
 * pin", then tap where the door is. Tiles are plain images, so no map library ships to guests.
 */
export function LocationMap({
  geo,
  onChange,
}: {
  geo: GeoPoint | null;
  onChange: (next: GeoPoint) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [width, setWidth] = useState(0);
  const box = useRef<ComponentRef<typeof View>>(null);
  // Measure the tap against the map itself: on the web the event's own x and y can be relative
  // to the tile image under the finger instead.
  const place = (e: GestureResponderEvent) => {
    const { pageX, pageY } = e.nativeEvent;
    box.current?.measure(
      (_x: number, _y: number, w: number, h: number, left: number, top: number) => {
        const px = pageX - left;
        const py = pageY - top;
        if (px >= 0 && py >= 0 && px <= w && py <= h)
          onChange(pointToGeo(center, ZOOM, w, h, px, py));
      },
    );
  };
  const [moving, setMoving] = useState(false);
  // The map stays where it opened, so the tiles don't jump while the owner taps.
  const [center] = useState(() => geo ?? ACCRA);
  const tiles = width ? tilesAround(center, ZOOM, width, HEIGHT).tiles : [];
  const pin = geo && width ? geoToPoint(center, geo, ZOOM, width, HEIGHT) : null;
  const url = (x: number, y: number) =>
    env.EXPO_PUBLIC_MAP_TILES.replace('{z}', String(ZOOM))
      .replace('{x}', String(x))
      .replace('{y}', String(y));

  return (
    <View
      ref={box}
      onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}
      style={[styles.map, { borderColor: theme.line, backgroundColor: theme.wash }]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={moving ? t('ownerBusiness.map.tapHere') : t('ownerBusiness.map.label')}
        disabled={!moving}
        onPress={place}
        style={StyleSheet.absoluteFill}
      >
        {tiles.map((tile) => (
          <Image
            key={`${tile.x}-${tile.y}`}
            source={{ uri: url(tile.x, tile.y) }}
            style={[styles.tile, { left: tile.left, top: tile.top }]}
            accessibilityIgnoresInvertColors
          />
        ))}
        {pin ? (
          // The pin's point sits on the spot, so it is drawn up and to the left of it.
          <View
            pointerEvents="none"
            style={[styles.pin, { left: pin.left - PIN / 2, top: pin.top - PIN }]}
          >
            <MapPin size={PIN} color={theme.fill} fill={theme.surface} strokeWidth={2.2} />
          </View>
        ) : null}
      </Pressable>
      {moving ? (
        <View pointerEvents="none" style={[styles.hint, { backgroundColor: theme.surface }]}>
          <Text variant="caption">{t('ownerBusiness.map.tapHere')}</Text>
        </View>
      ) : null}
      <Button
        label={moving ? t('ownerBusiness.map.done') : t('ownerBusiness.map.move')}
        tone="secondary"
        onPress={() => setMoving((m) => !m)}
        style={styles.move}
      />
      {/* OpenStreetMap's licence asks for this credit wherever its map shows. */}
      <Text style={[styles.credit, { backgroundColor: theme.surface, color: theme.muted }]}>
        © OpenStreetMap
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    height: HEIGHT,
    borderWidth: 1,
    borderRadius: tokens.owner.controls.cardRadius,
    overflow: 'hidden',
  },
  tile: { position: 'absolute', width: TILE, height: TILE },
  pin: { position: 'absolute' },
  hint: {
    position: 'absolute',
    top: tokens.space[3],
    alignSelf: 'center',
    paddingHorizontal: tokens.space[3],
    paddingVertical: 4,
    borderRadius: tokens.radius.full,
  },
  move: { position: 'absolute', right: tokens.space[3], bottom: tokens.space[3], minHeight: 36 },
  credit: { position: 'absolute', left: 0, bottom: 0, fontSize: 10, paddingHorizontal: 4 },
});
