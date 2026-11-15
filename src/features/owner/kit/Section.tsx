import { Children, Fragment, isValidElement, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronDown, ChevronUp, type LucideIcon } from 'lucide-react-native';
import { useOwnerLayout } from '../chrome/layout';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { cardStyle } from './cardStyle';

/**
 * One group of settings as a white card: a bold title (with an optional icon, a grey line under
 * it, a status badge and one small control on the right) inside the top of the card, then the
 * rows split by hairlines, and an optional one-line note under the card.
 * `collapsible` makes the head a button that folds the rows away, as on an integrations list.
 */
export function Section({
  title,
  subtitle,
  icon: Icon,
  badge,
  note,
  action,
  collapsible,
  defaultOpen = false,
  children,
}: {
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  /** A small status pill beside the title, e.g. "Active". */
  badge?: ReactNode;
  /** One short line under the card. Keep it to what the owner can't guess. */
  note?: string;
  /** Optional small control on the right of the title, such as a text button. */
  action?: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const theme = useTheme();
  const { wide } = useOwnerLayout();
  const [open, setOpen] = useState(defaultOpen);
  const shown = !collapsible || open;
  const rows = Children.toArray(children).filter(isValidElement);
  const Chevron = open ? ChevronUp : ChevronDown;

  const head =
    title || action ? (
      <View style={[styles.head, Icon && styles.headIcon, Icon && !wide && styles.headIconPhone]}>
        {Icon ? (
          // Canvas: a plain 22 px icon in a 32 px slot, no tinted bubble.
          <View style={styles.chip}>
            <Icon size={22} color={theme.text} />
          </View>
        ) : null}
        <View style={styles.words}>
          {title ? (
            <View style={styles.titleRow}>
              <Text variant="title" accessibilityRole="header" style={styles.title}>
                {title}
              </Text>
              {badge}
            </View>
          ) : null}
          {subtitle ? (
            <Text variant="caption" style={{ color: theme.muted }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {action}
        {collapsible ? <Chevron size={18} color={theme.meta} /> : null}
      </View>
    ) : null;

  // Canvas: a plain section's title sits above its card (18 px, 20 px gap); sections with an
  // icon or that fold keep their head inside the card, like an integration.
  const outside = !collapsible && !Icon && Boolean(head);

  return (
    <View style={[styles.wrap, outside && (wide ? styles.wrapOutside : styles.wrapOutsidePhone)]}>
      {outside ? <View style={styles.outsideHead}>{head}</View> : null}
      <View style={[styles.card, cardStyle(theme)]}>
        {outside ? null : collapsible && head ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={title}
            accessibilityState={{ expanded: open }}
            onPress={() => setOpen((v) => !v)}
            style={({ pressed }) => [pressed && { backgroundColor: theme.wash }]}
          >
            {head}
          </Pressable>
        ) : (
          head
        )}
        {shown
          ? rows.map((row, index) => (
              <Fragment key={row.key ?? index}>
                {index > 0 ? <View style={[styles.rule, { backgroundColor: theme.wash }]} /> : null}
                {row}
              </Fragment>
            ))
          : null}
      </View>
      {note && shown ? (
        <Text variant="caption" style={[styles.note, { color: theme.muted }]}>
          {note}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space[2] },
  wrapOutside: { gap: tokens.space[4] },
  // Phones: the title sits closer to its card.
  wrapOutsidePhone: { gap: 10 },
  outsideHead: {
    marginHorizontal: -tokens.space[4],
    marginTop: -tokens.space[4],
    marginBottom: -tokens.space[1],
  },
  card: { overflow: 'hidden' },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingHorizontal: tokens.space[4],
    paddingTop: tokens.space[4],
    paddingBottom: tokens.space[1],
  },
  // Canvas integration row: at least 52 px, 20 px each side.
  headIcon: {
    minHeight: 76,
    paddingTop: tokens.space[3],
    paddingBottom: tokens.space[3],
    paddingHorizontal: tokens.owner.controls.cardPadding,
    gap: tokens.space[4],
  },
  // Phones: a slimmer head, 16 px in, so the card is a little tighter than on the web.
  headIconPhone: { minHeight: 60, paddingHorizontal: tokens.space[4], gap: tokens.space[3] },
  chip: { width: 32, alignItems: 'center', justifyContent: 'center' },
  words: { flex: 1, minWidth: 0, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: tokens.space[2] },
  title: { flexShrink: 1 },
  rule: { height: 1 },
  note: { paddingHorizontal: tokens.space[1] },
});
