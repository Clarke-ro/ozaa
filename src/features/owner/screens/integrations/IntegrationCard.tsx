import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { STATUS_TONES } from '@/theme/palette';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { useOwnerLayout } from '../../chrome/layout';
import { cardStyle, Toggle } from '../../kit';

/**
 * One integration on the Integrations list: a brand mark or plain icon, the name and what it does,
 * its status in words and a switch. Its settings live on their own page (Clarke, 25 Nov 2026),
 * so a card with `onOpen` shows a chevron and opens that page when tapped. A card with no switch
 * can show a grey badge instead, e.g. "Coming soon".
 *
 * Phones keep the switch top right like an iOS settings row, set the mark in a 44 px soft tile,
 * and put the status or badge under the name.
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
  onOpen,
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
  /** Opens this integration's own settings page. */
  onOpen?: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { wide, cardPad } = useOwnerLayout();
  const statusText = status ? (
    <Text
      style={[styles.status, { color: on ? STATUS_TONES[theme.scheme].success.line : theme.meta }]}
    >
      {status}
    </Text>
  ) : null;
  const badgeTag = badge ? (
    <View style={[styles.badge, { backgroundColor: theme.wash }]}>
      <Text style={[styles.badgeText, { color: theme.muted }]}>{badge}</Text>
    </View>
  ) : null;

  return (
    <View style={[cardStyle(theme), styles.card, { paddingHorizontal: cardPad }]}>
      <Pressable
        disabled={!onOpen}
        accessibilityRole={onOpen ? 'button' : undefined}
        accessibilityLabel={onOpen ? t('ownerPay.openSettings', { name: title }) : undefined}
        onPress={onOpen}
        style={({ pressed }) => [styles.main, pressed && onOpen ? { opacity: 0.7 } : null]}
      >
        <View style={[styles.icon, !wide && [styles.iconPhone, { backgroundColor: theme.wash }]]}>
          {logo ?? (Icon ? <Icon size={22} color={theme.text} /> : null)}
        </View>
        <View style={styles.words}>
          <Text style={[styles.title, !wide && styles.titlePhone]} numberOfLines={2}>
            {title}
          </Text>
          <Text
            style={[styles.sub, !wide && styles.subPhone, { color: theme.meta }]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
          {!wide && (statusText || badgeTag) ? (
            <View style={styles.meta}>
              {statusText}
              {badgeTag}
            </View>
          ) : null}
        </View>
        {wide ? statusText : null}
        {wide ? badgeTag : null}
        {onOpen ? <ChevronRight size={18} color={theme.meta} /> : null}
      </Pressable>
      {onToggle ? <Toggle value={Boolean(on)} label={title} onChange={onToggle} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Taller cards with room to breathe (Clarke, 25 Nov 2026).
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[4],
    minHeight: 108,
    paddingVertical: tokens.space[5],
  },
  main: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: tokens.space[4] },
  icon: { width: 32, alignItems: 'center' },
  iconPhone: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    borderCurve: 'continuous',
  },
  words: { flex: 1, minWidth: 0, gap: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2], marginTop: 4 },
  title: { fontSize: 16, lineHeight: 22, fontFamily: fontFamily.strong },
  sub: { fontSize: 14, lineHeight: 20 },
  titlePhone: { fontSize: 15, lineHeight: 20 },
  subPhone: { fontSize: 13, lineHeight: 18 },
  status: { fontSize: 13, lineHeight: 18, fontFamily: fontFamily.strong },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: tokens.radius.full,
  },
  badgeText: { fontSize: 12, lineHeight: 16, fontFamily: fontFamily.strong },
});
