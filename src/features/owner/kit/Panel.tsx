import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

/**
 * A titled block on a page: heading, an optional count or line under it, one optional link on the
 * right, then the content. Lists inside use PanelRow, so there is one box with lines between rows
 * instead of a box per item. Flat, with a thin border (no shadow).
 */
export function Panel({
  title,
  meta,
  action,
  onAction,
  flush,
  children,
  style,
}: {
  title?: string;
  /** A short grey line after the title, e.g. "3 open". */
  meta?: string;
  action?: string;
  onAction?: () => void;
  /** No inner padding, for PanelRow lists that run edge to edge. */
  flush?: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <View
      style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.line }, style]}
    >
      {title ? (
        <View style={styles.head}>
          <View style={styles.heading}>
            <Text variant="body-strong" accessibilityRole="header" numberOfLines={1}>
              {title}
            </Text>
            {meta ? (
              <Text variant="caption" style={{ color: theme.meta }} numberOfLines={1}>
                {meta}
              </Text>
            ) : null}
          </View>
          {action && onAction ? (
            <Pressable
              accessibilityRole="link"
              onPress={onAction}
              hitSlop={tokens.space[2]}
              style={({ pressed }) => [styles.link, pressed && { opacity: 0.7 }]}
            >
              <Text variant="caption" style={[styles.linkText, { color: theme.text }]}>
                {action}
              </Text>
              <ChevronRight size={16} color={theme.muted} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <View style={flush ? undefined : styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space[3],
    minHeight: tokens.touchTarget + tokens.space[2],
    paddingHorizontal: tokens.space[4],
    paddingTop: tokens.space[2],
  },
  heading: { flexDirection: 'row', alignItems: 'baseline', gap: tokens.space[2], flexShrink: 1 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  linkText: { fontFamily: 'Inter_600' },
  body: { paddingHorizontal: tokens.space[4], paddingBottom: tokens.space[4], gap: tokens.space[3] },
});
