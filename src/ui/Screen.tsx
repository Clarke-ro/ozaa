import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '@/theme/tokens';
import { useTheme } from './theme';

/** Insets every screen. The home banner is the one surface that stays under the status bar. */
export function SafeScreen({
  children,
  includeTop = true,
  includeBottom = true,
}: {
  children: ReactNode;
  includeTop?: boolean;
  includeBottom?: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: theme.white,
          paddingTop: includeTop ? insets.top : 0,
          paddingBottom: includeBottom ? insets.bottom : 0,
        },
      ]}
    >
      {children}
    </View>
  );
}

export function Screen({
  children,
  footer,
  scroll = true,
}: {
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const body = scroll ? (
    <ScrollView contentContainerStyle={{ paddingBottom: footer ? 120 : 32 }}>{children}</ScrollView>
  ) : (
    <View style={{ flex: 1 }}>{children}</View>
  );
  return (
    <View style={[styles.screen, { backgroundColor: theme.white, paddingTop: insets.top }]}>
      {body}
      {footer ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: theme.white }]}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}

export function screenPad(): ViewStyle {
  return { paddingHorizontal: tokens.grid.mobile.margin };
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: tokens.grid.mobile.margin,
    paddingTop: 12,
  },
});
