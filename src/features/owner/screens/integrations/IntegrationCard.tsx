import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, type LucideIcon } from 'lucide-react-native';
import { STATUS_TONES } from '@/theme/palette';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { useOwnerLayout } from '../../chrome/layout';
import { cardStyle, Toggle } from '../../kit';

/**
 * One integration as a card (design canvas): a brand mark or plain icon, the name and what it
 * does, its status in words and a switch on the right; when switched on, its details sit under a
 * light line. A row with no switch can show a grey badge instead, e.g. "Coming soon".
 *
 * The details open when the switch goes on, close again once they're saved (the parent bumps
 * `closeSignal`), and the header opens or closes them by hand. A finished card is just its row.
 *
 * Phones keep the switch on the first line, top right like an iOS settings row, set the mark in a
 * 44 px soft tile (Clarke's reference, 2026-11-14), and put the status or badge under the name,
 * so nothing drops onto a line of its own.
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
  closeSignal = 0,
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
  /** Bump after a save succeeds to close the details back to the plain row. */
  closeSignal?: number;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  // Opening when the switch goes on, and closing on a new closeSignal, follow the props as they
  // change (React's "adjust state while rendering" pattern, no effect needed).
  const [seenOn, setSeenOn] = useState(on);
  if (on !== seenOn) {
    setSeenOn(on);
    if (on) setOpen(true);
  }
  const [seenSignal, setSeenSignal] = useState(closeSignal);
  if (closeSignal !== seenSignal) {
    setSeenSignal(closeSignal);
    setOpen(false);
  }
  const expandable = Boolean(on && children);
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
  const toggle = onToggle ? <Toggle value={Boolean(on)} label={title} onChange={onToggle} /> : null;

  return (
    <View style={[cardStyle(theme), styles.card, { paddingHorizontal: cardPad }]}>
      <View style={[styles.head, !wide && styles.headPhone]}>
        <View style={[styles.icon, !wide && [styles.iconPhone, { backgroundColor: theme.wash }]]}>
          {logo ?? (Icon ? <Icon size={22} color={theme.text} /> : null)}
        </View>
        <Pressable
          disabled={!expandable}
          accessibilityRole={expandable ? 'button' : undefined}
          accessibilityLabel={
            expandable
              ? open
                ? t('ownerPay.hideDetails', { name: title })
                : t('ownerPay.showDetails', { name: title })
              : undefined
          }
          accessibilityState={expandable ? { expanded: open } : undefined}
          aria-expanded={expandable ? open : undefined}
          onPress={() => setOpen((now) => !now)}
          style={[styles.words, !wide && styles.wordsPhone]}
        >
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
        </Pressable>
        {expandable ? (
          open ? (
            <ChevronUp size={18} color={theme.meta} />
          ) : (
            <ChevronDown size={18} color={theme.meta} />
          )
        ) : null}
        {wide ? statusText : null}
        {wide ? badgeTag : null}
        {toggle}
      </View>
      {expandable && open ? (
        <View style={[styles.body, { borderTopColor: theme.wash }]}>{children}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: tokens.space[3] },
  head: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: tokens.space[4],
    rowGap: 10,
    minHeight: 52,
  },
  headPhone: { flexWrap: 'nowrap', alignItems: 'center', columnGap: tokens.space[3] },
  icon: { width: 32, alignItems: 'center' },
  iconPhone: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    borderCurve: 'continuous',
  },
  words: { flexGrow: 1, flexShrink: 1, flexBasis: 220, minWidth: 0, gap: 2 },
  wordsPhone: { flexBasis: 0 },
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
  body: {
    gap: tokens.space[5],
    marginTop: tokens.space[3],
    paddingTop: tokens.space[5],
    paddingBottom: tokens.space[2],
    borderTopWidth: 1,
  },
});
