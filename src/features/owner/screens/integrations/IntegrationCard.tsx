import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { STATUS_TONES } from '@/theme/palette';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { cardStyle, Toggle } from '../../kit';

/**
 * One integration as a card (design canvas): a brand mark or plain icon, the name and what it does, its status in
 * words and a switch on the right; when switched on, its details sit under a light line. A row with
 * no switch can show a grey badge instead, e.g. "Coming soon".
 */
export function IntegrationCard({
  icon: Icon,
  logo,
  title,
  subtitle,
  status,
  on,
  onToggle,
  badge,
  children,
}: {
  icon?: LucideIcon;
  /** A brand mark drawn instead of a plain icon (Paystack, Google…). */
  logo?: ReactNode;
  title: string;
  subtitle: string;
  /** "On", "Off", "Connected"… shown before the switch. */
  status?: string;
  on?: boolean;
  onToggle?: (next: boolean) => void;
  badge?: string;
  children?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={[cardStyle(theme), styles.card]}>
      <View style={styles.head}>
        <View style={styles.icon}>
          {logo ?? (Icon ? <Icon size={22} color={theme.text} /> : null)}
        </View>
        <View style={styles.words}>
          <Text style={styles.title}>{title}</Text>
          <Text style={[styles.sub, { color: theme.meta }]}>{subtitle}</Text>
        </View>
        {status ? (
          <Text
            style={[
              styles.status,
              { color: on ? STATUS_TONES[theme.scheme].success.line : theme.meta },
            ]}
          >
            {status}
          </Text>
        ) : null}
        {badge ? (
          <View style={[styles.badge, { backgroundColor: theme.wash }]}>
            <Text style={[styles.badgeText, { color: theme.muted }]}>{badge}</Text>
          </View>
        ) : null}
        {onToggle ? <Toggle value={Boolean(on)} label={title} onChange={onToggle} /> : null}
      </View>
      {on && children ? (
        <View style={[styles.body, { borderTopColor: theme.wash }]}>{children}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: tokens.space[3], paddingHorizontal: tokens.owner.controls.cardPadding },
  head: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: tokens.space[4],
    rowGap: 10,
    minHeight: 52,
  },
  icon: { width: 32, alignItems: 'center' },
  words: { flexGrow: 1, flexShrink: 1, flexBasis: 220, minWidth: 0, gap: 2 },
  title: { fontSize: 16, lineHeight: 22, fontFamily: fontFamily.strong },
  sub: { fontSize: 14, lineHeight: 20 },
  status: { fontSize: 14, lineHeight: 20, fontFamily: fontFamily.strong },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: tokens.radius.full },
  badgeText: { fontSize: 13, lineHeight: 18, fontFamily: fontFamily.strong },
  body: {
    gap: tokens.space[5],
    marginTop: tokens.space[3],
    paddingTop: tokens.space[5],
    paddingBottom: tokens.space[2],
    borderTopWidth: 1,
  },
});
