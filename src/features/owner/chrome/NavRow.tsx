import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { usePathname, useRouter, type Href } from 'expo-router';
import { hapticSelection } from '@/lib/haptics';
import { tokens } from '@/theme/tokens';
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
  // The selected item changes colour AND weight, so state never rests on colour alone.
  const iconInk = current ? theme.ink : theme.muted;
  const labelInk = current ? (compact ? theme.ink : theme.text) : theme.muted;
  // The count is read after the name ("Orders, 2"), and the name stays the button's label.
  const value = shown ? { text: shown } : undefined;

  return (
    <Pressable
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
        !compact && (current || pressed || hovered) && { backgroundColor: theme.wash },
        compact && pressed && { opacity: 0.7 },
      ]}
    >
      {/* A short orange bar marks the open page in the sidebar, like a bookmark. */}
      {!compact && current ? <View style={[styles.marker, { backgroundColor: theme.ink }]} /> : null}
      <View>
        <Icon color={iconInk} size={compact ? 24 : 20} strokeWidth={current ? 2.4 : 2} />
        {shown && (compact || iconOnly) ? (
          <View style={[styles.dot, { backgroundColor: theme.fill, borderColor: theme.surface }]}>
            <Text variant="caption" style={[styles.micro, { color: theme.onFill }]}>
              {shown}
            </Text>
          </View>
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
              color: hovered && !current ? theme.text : labelInk,
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
    </Pressable>
  );
}

const DOT = tokens.owner.micro.line + tokens.space[1];

const styles = StyleSheet.create({
  row: {
    minHeight: tokens.button.height.md - tokens.space[1],
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingHorizontal: tokens.space[3],
    borderRadius: tokens.radius.sm,
    borderCurve: 'continuous',
  },
  marker: {
    position: 'absolute',
    left: 0,
    top: tokens.space[2],
    bottom: tokens.space[2],
    width: 3,
    borderRadius: tokens.radius.full,
  },
  iconOnly: { justifyContent: 'center', paddingHorizontal: 0 },
  rowLabel: { flex: 1, fontSize: tokens.type.body.size - 1, lineHeight: tokens.type.body.line },
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
