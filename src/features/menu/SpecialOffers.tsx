import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Percent, Plus, Tag } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { VenueImage } from '@/ui/VenueImage';
import { fontFamily, useTheme } from '@/ui/theme';
import { DishPrice } from './DishPrice';
import type { SpecialOffer } from './specialOffers';

/**
 * "Special offers": a row of cards that scrolls sideways, shown only while something is on
 * offer. A dish card opens the dish and has its own add button; a general offer is a note.
 */
export function SpecialOffers({
  offers,
  currency,
  onOpen,
  onAdd,
}: {
  offers: SpecialOffer[];
  currency: string;
  onOpen: (menuItemId: string) => void;
  /** Null for a dish that needs choices first; it opens instead. */
  onAdd: (offer: Extract<SpecialOffer, { kind: 'dish' }>) => (() => void) | null;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  if (offers.length === 0) return null;
  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text variant="title" accessibilityRole="header">
          {t('menu.offersTitle')}
        </Text>
        <View style={[styles.badge, { backgroundColor: theme.fill }]}>
          <Percent size={12} color={theme.onFill} strokeWidth={3} />
        </View>
      </View>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {offers.map((offer) => {
          const card = [styles.card, { backgroundColor: theme.surface, borderColor: theme.line }];
          if (offer.kind === 'note') {
            return (
              <View key={offer.id} style={[card, styles.note]}>
                <Tag size={18} color={theme.ink} strokeWidth={2} />
                <Text variant="body" numberOfLines={2} style={styles.strong}>
                  {offer.title}
                </Text>
                {offer.detail ? (
                  <Text variant="caption" numberOfLines={2} style={{ color: theme.muted }}>
                    {offer.detail}
                  </Text>
                ) : null}
              </View>
            );
          }
          const { item, label } = offer;
          const add = onAdd(offer);
          return (
            <View key={item.id} style={card}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={label ? `${item.name.en}, ${label}` : item.name.en}
                onPress={() => onOpen(item.id)}
                style={({ pressed }) => [styles.open, pressed && styles.pressed]}
              >
                <View style={styles.copy}>
                  <Text variant="body" numberOfLines={2} style={styles.strong}>
                    {item.name.en}
                  </Text>
                  {label ? (
                    <Text
                      variant="caption"
                      numberOfLines={1}
                      style={[styles.strong, { color: theme.ink }]}
                    >
                      {label}
                    </Text>
                  ) : null}
                  <DishPrice item={item} currency={currency} />
                </View>
                <View style={[styles.photo, { backgroundColor: theme.wash }]}>
                  {item.photo ? (
                    <VenueImage
                      url={item.photo.url}
                      alt={item.photo.alt ?? item.name.en}
                      blurhash={item.photo.blurhash}
                      style={StyleSheet.absoluteFill}
                    />
                  ) : null}
                </View>
              </Pressable>
              {add ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('menu.addA11y', { name: item.name.en })}
                  hitSlop={6}
                  onPress={add}
                  style={({ pressed }) => [
                    styles.add,
                    { backgroundColor: pressed ? theme.pressed : theme.fill },
                  ]}
                >
                  <Plus size={18} color={theme.onFill} strokeWidth={2.5} />
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const CARD_W = 280;
const CARD_H = 112;
const ADD = 36;

const styles = StyleSheet.create({
  section: { gap: tokens.space[3], paddingTop: tokens.space[2] },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    paddingHorizontal: tokens.grid.mobile.margin,
  },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { gap: tokens.space[3], paddingHorizontal: tokens.grid.mobile.margin },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  note: { padding: tokens.space[4], gap: tokens.space[1], justifyContent: 'center' },
  open: { flex: 1, flexDirection: 'row' },
  pressed: { opacity: 0.85 },
  copy: {
    flex: 1,
    gap: 2,
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
    justifyContent: 'center',
  },
  strong: { fontFamily: fontFamily.strong },
  photo: { width: CARD_H, height: CARD_H },
  add: {
    position: 'absolute',
    end: tokens.space[2],
    bottom: tokens.space[2],
    width: ADD,
    height: ADD,
    borderRadius: ADD / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
