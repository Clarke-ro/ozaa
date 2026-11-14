import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { LoyaltyCustomerDetail } from '@/lib/api/types';
import { STATUS_TONES } from '@/theme/palette';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { cardStyle } from '../../kit';
import { pickTag, TAG_TONE } from './customerTag';
import { initialsOf } from './initials';

/** Canvas member card: initials, name with a coloured tag, masked phone, member since, Add a stamp. */
export function CustomerHead({
  customer,
  stamping,
  onStamp,
}: {
  customer: LoyaltyCustomerDetail;
  stamping: boolean;
  onStamp: () => void;
}) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const name = customer.name || customer.phoneMasked;
  const tag = pickTag(customer);
  const tone = tag ? STATUS_TONES[theme.scheme][TAG_TONE[tag]] : null;
  const since = new Date(customer.consent.loyaltyAt).toLocaleDateString(i18n.language, {
    month: 'long',
    year: 'numeric',
  });
  return (
    <View style={[cardStyle(theme), styles.card]}>
      <View style={[styles.avatar, { backgroundColor: theme.tint }]}>
        <Text style={[styles.initials, { color: theme.badgeInk }]}>{initialsOf(customer)}</Text>
      </View>
      <View style={styles.who}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {tag && tone ? (
            <View style={[styles.tag, { backgroundColor: tone.bg }]}>
              <Text style={[styles.tagText, { color: tone.ink }]}>
                {t(`ownerMembers.tagOne.${tag}`)}
              </Text>
            </View>
          ) : null}
        </View>
        <Text variant="caption" style={{ color: theme.muted }} numberOfLines={1}>
          {[customer.phoneMasked, t('ownerMembers.since', { date: since })].join(' · ')}
        </Text>
      </View>
      <Button
        label={t('ownerMembers.addStamp')}
        loading={stamping}
        onPress={onStamp}
        style={styles.short}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: tokens.space[3],
    padding: tokens.owner.controls.cardPadding,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontSize: 15, fontFamily: fontFamily.strong },
  who: { flex: 1, minWidth: 200, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  name: { fontSize: 18, lineHeight: 24, fontFamily: fontFamily.strong, flexShrink: 1 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: tokens.radius.full },
  tagText: { fontSize: 12, lineHeight: 16, fontFamily: fontFamily.strong },
  short: { minHeight: 40 },
});
