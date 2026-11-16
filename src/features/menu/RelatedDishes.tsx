import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { MenuItem } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { VenueImage } from '@/ui/VenueImage';
import { useTheme } from '@/ui/theme';

const MINI = 132;

/** "You might also like": other dishes from the same section, as small square cards. */
export function RelatedDishes({
  dishes,
  money,
  onOpen,
}: {
  dishes: MenuItem[];
  money: (pesewas: number) => string;
  onOpen: (id: string) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <>
      {dishes.length ? (
        <View style={styles.group}>
          <Text variant="title">{t('menu.alsoLike')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.related}
          >
            {dishes.map((r) => (
              <Pressable
                key={r.id}
                accessibilityRole="button"
                accessibilityLabel={r.name.en}
                onPress={() => onOpen(r.id)}
                style={[styles.mini, { borderColor: theme.line }]}
              >
                <View style={[styles.miniPhoto, { backgroundColor: theme.wash }]}>
                  {r.photo ? (
                    <VenueImage url={r.photo.url} alt="" style={StyleSheet.absoluteFill} />
                  ) : null}
                </View>
                <Text variant="caption" numberOfLines={1} style={styles.miniText}>
                  {r.name.en}
                </Text>
                <Text variant="caption" style={[styles.miniText, { color: theme.muted }]}>
                  {money(r.pricePesewas)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  related: { gap: 12 },
  mini: {
    width: MINI,
    borderWidth: 1,
    borderRadius: tokens.radius.md + 2,
    overflow: 'hidden',
    paddingBottom: tokens.space[2],
  },
  // Square, like the dish photos themselves, so nothing is cut off.
  miniPhoto: { width: MINI, aspectRatio: 1 },
  miniText: { paddingHorizontal: 8, paddingTop: 4 },
});
