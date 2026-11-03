import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react-native';
import type { StaffMember } from '@/lib/api/types';
import { timeAgo } from '@/lib/time';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { StatusPill } from '../../kit';

/**
 * One person on the team: who they are, whether they are on shift (or when they were last seen),
 * and what they did today. Tapping opens their details.
 */
export function StaffCard({
  member,
  now,
  onPress,
}: {
  member: StaffMember;
  now: number;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const name = [member.firstName, member.lastName].filter(Boolean).join(' ');
  const initials = [member.firstName, member.lastName]
    .filter(Boolean)
    .map((part) => part?.slice(0, 1).toUpperCase())
    .join('');
  const invited = member.status === 'invited';
  const seen = member.lastActiveAt
    ? t('ownerStaff.seen', { when: timeAgo(member.lastActiveAt, now, t) })
    : null;
  const today = member.today;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[name, t(`ownerSettings.roles.${member.role}`), seen]
        .filter(Boolean)
        .join(', ')}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: pressed ? theme.wash : theme.surface, borderColor: theme.line },
      ]}
    >
      <View style={styles.head}>
        <View style={[styles.avatar, { backgroundColor: theme.tint }]}>
          <Text variant="body-strong" style={{ color: theme.badgeInk }}>
            {initials}
          </Text>
          {member.onShift ? (
            <View
              style={[styles.dot, { backgroundColor: theme.success, borderColor: theme.surface }]}
            />
          ) : null}
        </View>
        <View style={styles.flex}>
          <Text variant="body-strong" numberOfLines={1}>
            {name}
          </Text>
          <Text variant="caption" numberOfLines={1} style={{ color: theme.muted }}>
            {t(`ownerSettings.roles.${member.role}`)} · {member.phoneMasked}
          </Text>
        </View>
        {invited ? (
          <StatusPill label={t('ownerStaff.pending')} tone="waiting" boxed icon={false} />
        ) : member.onShift ? (
          <StatusPill label={t('ownerStaff.onShift')} tone="success" boxed icon={false} />
        ) : seen ? (
          <Text variant="caption" style={{ color: theme.meta }}>
            {seen}
          </Text>
        ) : null}
        <ChevronRight size={18} color={theme.meta} />
      </View>
      {today && !invited ? (
        <View style={[styles.stats, { borderColor: theme.line }]}>
          <Stat label={t('ownerStaff.orders')} value={String(today.ordersHandled)} />
          <Stat label={t('ownerStaff.calls')} value={String(today.callsAnswered)} />
          <Stat
            label={t('ownerStaff.pickup')}
            value={
              today.avgPickupMinutes == null
                ? '–'
                : t('ownerCalls.minutes', { count: today.avgPickupMinutes })
            }
          />
        </View>
      ) : null}
    </Pressable>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text variant="body-strong" style={styles.num}>
        {value}
      </Text>
      <Text variant="caption" style={{ color: theme.muted }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: tokens.space[3],
    padding: tokens.space[4],
    boxShadow: tokens.shadow.card,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  flex: { flex: 1 },
  stats: {
    flexDirection: 'row',
    paddingTop: tokens.space[3],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  stat: { flex: 1, gap: 2 },
  num: { fontVariant: ['tabular-nums'] },
});
