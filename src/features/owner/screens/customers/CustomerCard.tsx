import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react-native';
import type { CustomerTag, LoyaltyCustomerSummary } from '@/lib/api/types';
import { timeAgo } from '@/lib/time';
import { STATUS_TONES, type StatusTone } from '@/theme/palette';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { cardStyle } from '../../kit';
import { initialsOf } from './initials';

// The tag colours on the canvas: regulars green, a reward ready orange, new blue, quiet amber.
const TAG_TONE: Record<CustomerTag, StatusTone> = {
  regular: 'success',
  reward_ready: 'order',
  new: 'info',
  quiet: 'bill',
};
// One tag per row, the most useful first.
const TAG_ORDER: readonly CustomerTag[] = ['reward_ready', 'regular', 'new', 'quiet'];

/**
 * One loyalty member as a row (design canvas): initials, name with one coloured tag, the masked
 * phone, visits and stamps, and when they last came on the right. Opens their own page.
 */
export function CustomerCard({
  customer,
  stampsRequired,
  now,
  onOpen,
}: {
  customer: LoyaltyCustomerSummary;
  /** Stamps on a full card, for "7 of 8 stamps"; missing while the programme loads. */
  stampsRequired?: number;
  now: number;
  onOpen: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const name = customer.name || customer.phoneMasked;
  const tags = customer.tags ?? [];
  const tag = TAG_ORDER.find(
    (x) => tags.includes(x) || (x === 'reward_ready' && customer.rewardsAvailable > 0),
  );
  const tone = tag ? STATUS_TONES[theme.scheme][TAG_TONE[tag]] : null;
  const stamps = stampsRequired
    ? t('ownerMembers.stampsOf', { count: customer.stamps, total: stampsRequired })
    : t('ownerMembers.stamps', { count: customer.stamps });
  const last = customer.lastVisitAt ?? customer.lastStampAt;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityHint={t('ownerMembers.openHint')}
      onPress={onOpen}
      style={({ pressed, hovered }) => [
        cardStyle(theme),
        styles.row,
        (pressed || hovered) && { backgroundColor: theme.wash },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: theme.wash }]}>
        <Text style={styles.initials}>{initialsOf(customer)}</Text>
      </View>
      <View style={styles.words}>
        <View style={styles.top}>
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
        <Text style={[styles.sub, { color: theme.meta }]} numberOfLines={1}>
          {[
            customer.phoneMasked,
            t('ownerMembers.visits', { count: customer.visitCount ?? 0 }),
            stamps,
          ].join(' · ')}
        </Text>
      </View>
      {last ? (
        <Text style={[styles.sub, { color: theme.meta }]}>{timeAgo(last, now, t)}</Text>
      ) : null}
      <ChevronRight size={18} color={theme.meta} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[4],
    minHeight: 80,
    paddingVertical: 14,
    paddingLeft: tokens.owner.controls.cardPadding,
    paddingRight: tokens.space[4],
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontSize: 15, lineHeight: 20, fontFamily: fontFamily.strong },
  words: { flex: 1, minWidth: 0, gap: 2 },
  top: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: tokens.space[2] },
  name: { fontSize: 16, lineHeight: 22, fontFamily: fontFamily.strong },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: tokens.radius.full },
  tagText: { fontSize: 13, lineHeight: 16, fontFamily: fontFamily.strong },
  sub: { fontSize: 14, lineHeight: 20 },
});
