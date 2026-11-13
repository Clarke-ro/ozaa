import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Gift } from 'lucide-react-native';
import type { LoyaltyCustomerSummary } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { cardStyle } from '../../kit';
import { initialsOf } from './initials';

const AVATAR = tokens.space[10];

/**
 * One loyalty member as a small card: initials, name, stamp count, and a badge when a reward is
 * ready. Everything else (phone, visits, offers consent) is on their own page, one tap away.
 */
export function CustomerCard({
  customer,
  onOpen,
}: {
  customer: LoyaltyCustomerSummary;
  onOpen: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const name = customer.name || customer.phoneMasked;
  const ready = customer.rewardsAvailable > 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityHint={t('ownerMembers.openHint')}
      onPress={onOpen}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        cardStyle(theme),
        styles.card,
        (pressed || hovered) && { backgroundColor: theme.wash },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: theme.tint }]}>
        <Text variant="body-strong" style={{ color: theme.badgeInk }}>
          {initialsOf(customer)}
        </Text>
      </View>
      <View style={styles.words}>
        <Text variant="body-strong" numberOfLines={1}>
          {name}
        </Text>
        <View style={styles.meta}>
          <Text variant="caption" numberOfLines={1} style={{ color: theme.muted }}>
            {[
              customer.phoneMasked,
              t('ownerMembers.visits', { count: customer.visitCount ?? 0 }),
              t('ownerMembers.stamps', { count: customer.stamps }),
            ].join(' · ')}
          </Text>
          {(customer.tags ?? [])
            .filter((tag) => tag !== 'reward_ready')
            .map((tag) => (
              <Text
                key={tag}
                variant="caption"
                style={[styles.tag, { backgroundColor: theme.wash }]}
              >
                {t(`ownerMembers.tags.${tag}`)}
              </Text>
            ))}
          {ready ? (
            <View style={[styles.ready, { backgroundColor: theme.tint }]}>
              <Gift size={12} color={theme.badgeInk} />
              <Text variant="caption" style={{ color: theme.badgeInk }}>
                {t('ownerMembers.rewardShort', { count: customer.rewardsAvailable })}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <ChevronRight size={18} color={theme.meta} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tag: {
    paddingHorizontal: tokens.space[2],
    paddingVertical: 2,
    borderRadius: tokens.radius.sm,
    overflow: 'hidden',
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    padding: tokens.space[4],
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  words: { flex: 1, minWidth: 0, gap: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: tokens.space[2] },
  ready: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[1],
    paddingHorizontal: tokens.space[2],
    borderRadius: tokens.radius.full,
  },
});
