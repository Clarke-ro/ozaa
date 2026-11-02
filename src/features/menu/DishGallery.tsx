import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { components } from '@/lib/api/schema';
import { hapticSelection } from '@/lib/haptics';
import { VenueImage } from '@/ui/VenueImage';
import { tokens } from '@/theme/tokens';
import { useTheme } from '@/ui/theme';

type Photo = components['schemas']['Image'];

// Food reads best a little wider than tall; the photo spans the full screen width.
const RATIO = 4 / 3;

/**
 * The dish photos as full-width, swipeable pages (no crop to a circle): the main `photo` first, then the `gallery` extras.
 * One photo shows on its own with no dots. Dots also jump to a page, for mouse users on web.
 */
export function DishGallery({ photos, name }: { photos: Photo[]; name: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const scroller = useRef<ScrollViewInstance>(null);
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);

  const [first] = photos;
  if (!first) return null;
  if (photos.length === 1) {
    return (
      <VenueImage
        url={first.url}
        alt={first.alt ?? name}
        blurhash={first.blurhash}
        style={styles.photo}
      />
    );
  }

  const goTo = (index: number) => {
    scroller.current?.scrollTo({ x: index * width, animated: true });
    setPage(index);
  };

  return (
    <View style={styles.wrap} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        accessibilityLabel={t('menu.photos', { name })}
        onScroll={(e) => {
          if (!width) return;
          const next = Math.round(e.nativeEvent.contentOffset.x / width);
          if (next !== page && next >= 0 && next < photos.length) {
            setPage(next);
            void hapticSelection();
          }
        }}
      >
        {photos.map((photo, index) => (
          <View key={photo.url} style={[styles.page, width ? { width } : styles.full]}>
            <VenueImage
              url={photo.url}
              blurhash={photo.blurhash}
              alt={`${photo.alt ?? name}. ${t('menu.photoOf', { index: index + 1, count: photos.length })}`}
              style={styles.photo}
            />
          </View>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {photos.map((photo, index) => {
          const on = index === page;
          return (
            <Pressable
              key={photo.url}
              accessibilityRole="button"
              accessibilityLabel={t('menu.photoOf', { index: index + 1, count: photos.length })}
              accessibilityState={{ selected: on }}
              hitSlop={{ top: 16, bottom: 16, left: 6, right: 6 }}
              onPress={() => goTo(index)}
              style={[
                styles.dot,
                on ? styles.dotOn : null,
                { backgroundColor: on ? theme.ink : theme.line },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch', gap: tokens.space[3], paddingBottom: tokens.space[3] },
  page: { alignItems: 'stretch' },
  full: { width: '100%' },
  // Rounded inside the soft panel on the dish page.
  photo: { width: '100%', aspectRatio: RATIO, borderRadius: tokens.radius.lg },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: tokens.space[2] },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOn: { width: 22 },
});
