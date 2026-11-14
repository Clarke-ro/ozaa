import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { usePathname, useRouter, type Href } from 'expo-router';
import { hapticSelection } from '@/lib/haptics';
import { tokens } from '@/theme/tokens';
import { PressableScale } from '@/ui/PressableScale';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import type { OwnerNavId } from './nav';
import { NAV_ICONS } from './navIcons';

export { NAV_ICONS } from './navIcons';

/**
 * Opens a top-level section (a tab or a sidebar item). It clears the screens stacked on top
 * first, so a tab always lands on its own root and Back never walks through old tabs.
 */
export function useGoTo() {
  const router = useRouter();
  const path = usePathname();
  return useCallback(
    (href: string) => {
      if (href === path) return;
      if (router.canDismiss()) router.dismissAll();
      router.replace(href as Href);
    },
    [router, path],
  );
}

/**
 * One sidebar item or one phone tab. `count` shows a small number (orders waiting, open calls);
 * zero shows nothing, so the sidebar stays quiet when nothing is waiting.
 */
export function NavRow({
  id,
  href,
  label,
  current,
  compact,
  iconOnly,
  count,
}: {
  id: OwnerNavId | 'more';
  href: string;
  label: string;
  current: boolean;
  compact?: boolean;
  /** The collapsed sidebar: icon only, the label stays for screen readers. */
  iconOnly?: boolean;
  count?: number;
}) {
  const theme = useTheme();
  const goTo = useGoTo();
  const [hovered, setHovered] = useState(false);
  const Icon = NAV_ICONS[id];
  const shown = count && count > 0 ? (count > 99 ? '99+' : String(count)) : null;
  // The selected item changes colour AND weight, so state never rests on colour alone. In the
  // sidebar the other items stay in the text colour, like a list; tabs grey them out. On the pale
  // orange pill the ink is badgeInk, which deriveTheme checks at 4.5:1 against the tint.
  const onInk = compact ? theme.ink : theme.badgeInk;
  const iconInk = current ? onInk : compact ? theme.muted : theme.text;
  const labelInk = current ? onInk : compact ? theme.muted : theme.text;
  // The count is read after the name ("Orders, 2"), and the name stays the button's label.
  const value = shown ? { text: shown } : undefined;

  return (
    <PressableScale
      // A phone tab gives a little more under the thumb than a card; sidebar rows stay still.
      scale={compact ? 0.92 : 1}
      accessibilityRole={compact ? 'tab' : 'button'}
      accessibilityLabel={label}
      accessibilityValue={value}
      accessibilityState={{ selected: current }}
      // aria-selected is what React Native Web passes to the browser; accessibilityState alone is not.
      aria-selected={current}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={() => {
        if (compact) void hapticSelection();
        goTo(href);
      }}
      style={({ pressed }) => [
        compact ? styles.tab : styles.row,
        iconOnly && styles.iconOnly,
        !compact && (pressed || hovered) && { backgroundColor: theme.wash },
        // The open page sits in a pale orange pill, the one place the sidebar uses the brand colour.
        !compact && current && { backgroundColor: theme.tint },
      ]}
    >
      <View>
        <Icon color={iconInk} size={compact ? 24 : 18} strokeWidth={current ? 2.4 : 1.75} />
        {shown && compact ? (
          <View style={[styles.dot, { backgroundColor: theme.fill, borderColor: theme.surface }]}>
            <Text variant="caption" style={[styles.micro, { color: theme.onFill }]}>
              {shown}
            </Text>
          </View>
        ) : null}
        {/* Folded sidebar: a plain dot says "something waits"; the number is read out by name. */}
        {shown && iconOnly ? (
          <View
            style={[styles.railDot, { backgroundColor: theme.fill, borderColor: theme.surface }]}
          />
        ) : null}
      </View>
      {iconOnly ? null : (
        <Text
          variant="caption"
          numberOfLines={1}
          maxFontSizeMultiplier={1.4}
          style={[
            compact ? styles.tabLabel : styles.rowLabel,
            {
              color: labelInk,
              fontFamily: current ? fontFamily.strong : fontFamily.regular,
            },
          ]}
        >
          {label}
        </Text>
      )}
      {shown && !compact && !iconOnly ? (
        <View style={[styles.pill, { backgroundColor: theme.fill }]}>
          <Text variant="caption" style={[styles.micro, { color: theme.onFill }]}>
            {shown}
          </Text>
        </View>
      ) : null}
    </PressableScale>
  );
}

const DOT = tokens.owner.micro.line + tokens.space[1];

const RAIL_DOT = tokens.space[2] + 2;

const styles = StyleSheet.create({
  railDot: {
    position: 'absolute',
    top: -2,
    right: -3,
    width: RAIL_DOT,
    height: RAIL_DOT,
    borderRadius: RAIL_DOT / 2,
    borderWidth: 2,
  },
  // Canvas sidebar row: 36 px tall, 10 px inside, 10 px corners, 18 px icon, 13.5 px label.
  row: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderCurve: 'continuous',
  },
  iconOnly: { justifyContent: 'center', paddingHorizontal: 0 },
  rowLabel: { flex: 1, fontSize: 13.5, lineHeight: 18 },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabLabel: { fontSize: tokens.owner.micro.size, lineHeight: tokens.owner.micro.line - 1 },
  pill: {
    minWidth: DOT + tokens.space[1],
    height: DOT,
    paddingHorizontal: tokens.space[1] + 2,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: -tokens.space[2],
    right: -tokens.space[3],
    minWidth: DOT,
    height: DOT,
    paddingHorizontal: tokens.space[1],
    borderRadius: tokens.radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micro: {
    fontFamily: fontFamily.strong,
    fontSize: tokens.owner.micro.size,
    lineHeight: tokens.owner.micro.line,
  },
});
