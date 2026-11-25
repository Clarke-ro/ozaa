import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Percent, Tag } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { guestFont, useTheme } from '@/ui/theme';
import { DishTile, tileStyle } from './DishTile';
import { MenuStrip } from './MenuStrip';
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
  const mark = (
    <View style={[styles.badge, { backgroundColor: theme.fill }]}>
      <Percent size={12} color={theme.onFill} strokeWidth={3} />
    </View>
  );
  return (
    <MenuStrip title={t('menu.offersTitle')} mark={mark}>
      {offers.map((offer) =>
        offer.kind === 'note' ? (
          <View
            key={offer.id}
            style={[
              tileStyle.card,
              styles.note,
              { backgroundColor: theme.surface, borderColor: theme.line },
            ]}
          >
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
        ) : (
          <DishTile
            key={offer.item.id}
            item={offer.item}
            label={offer.label}
            currency={currency}
            onOpen={() => onOpen(offer.item.id)}
            onAdd={onAdd(offer)}
          />
        ),
      )}
    </MenuStrip>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: { padding: tokens.space[4], gap: tokens.space[1], justifyContent: 'center' },
  strong: { fontFamily: guestFont.strong },
});
