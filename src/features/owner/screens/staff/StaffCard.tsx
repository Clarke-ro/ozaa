import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react-native';
import type { StaffMember } from '@/lib/api/types';
import { timeAgo } from '@/lib/time';
import { STATUS_TONES } from '@/theme/palette';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { cardStyle } from '../../kit';

/**
 * One person on the team as one row (design canvas): initials with a green dot when on shift,
 * name, role and masked phone, then "On shift" or when they were last seen, and today's orders,
 * calls and pick-up time on the right. Tapping opens their details.
 */
export function StaffCard({
  member,
  now,
  wide,
  onPress,
}: {
  member: StaffMember;
  now: number;
  /** Room to keep the numbers on the same line as the name. */
  wide: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const tones = STATUS_TONES[theme.scheme];
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
        cardStyle(theme),
        styles.row,
        !wide && styles.wrap,
        pressed && { backgroundColor: theme.wash },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: theme.tint }]}>
        <Text style={[styles.initials, { color: theme.badgeInk }]}>{initials}</Text>
        {member.onShift ? (
          <View
            style={[
              styles.dot,
              { backgroundColor: tones.success.line, borderColor: theme.surface },
            ]}
          />
        ) : null}
      </View>
      <View style={styles.who}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.sub, { color: theme.meta }]} numberOfLines={1}>
          {t(`ownerSettings.roles.${member.role}`)} · {member.phoneMasked}
        </Text>
      </View>
      {invited ? (
        <Text style={[styles.state, { color: tones.bill.line }]}>{t('ownerStaff.pending')}</Text>
      ) : member.onShift ? (
        <Text style={[styles.state, { color: tones.success.line }]}>{t('ownerStaff.onShift')}</Text>
      ) : seen ? (
        <Text style={[styles.sub, { color: theme.meta }]}>{seen}</Text>
      ) : null}
      {today && !invited ? (
        <View style={styles.stats}>
          <Stat label={t('ownerStaff.ordersShort')} value={String(today.ordersHandled)} />
          <Stat label={t('ownerStaff.callsShort')} value={String(today.callsAnswered)} />
          <Stat
            label={t('ownerStaff.pickupShort')}
            value={
              today.avgPickupMinutes == null
                ? '–'
                : t('ownerCalls.minutes', { count: today.avgPickupMinutes })
            }
          />
        </View>
      ) : null}
      <ChevronRight size={20} color={theme.meta} />
    </Pressable>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.num}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.meta }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Canvas row: at least 80 px, 14 px top and bottom, 18 px on the left.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 20,
    rowGap: tokens.space[3],
    minHeight: 80,
    paddingVertical: 14,
    paddingLeft: 18,
    paddingRight: tokens.space[4],
  },
  wrap: { flexWrap: 'wrap' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontSize: 15, lineHeight: 20, fontFamily: fontFamily.strong },
  dot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  who: { flexGrow: 1, flexShrink: 1, flexBasis: 200, minWidth: 0, gap: 2 },
  name: { fontSize: 16, lineHeight: 22, fontFamily: fontFamily.strong },
  sub: { fontSize: 14, lineHeight: 20 },
  state: { fontSize: 14, lineHeight: 20, fontFamily: fontFamily.strong },
  stats: { flexDirection: 'row', gap: tokens.space[4] },
  stat: { minWidth: 64, alignItems: 'flex-end', gap: 2 },
  num: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: fontFamily.strong,
    fontVariant: ['tabular-nums'],
  },
  statLabel: { fontSize: 12, lineHeight: 16 },
});
