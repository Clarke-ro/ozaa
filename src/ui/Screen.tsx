import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './theme';

/** Insets every screen. The home banner is the one surface that stays under the status bar. */
export function SafeScreen({
  children,
  includeTop = true,
  includeBottom = true,
  background,
}: {
  children: ReactNode;
  includeTop?: boolean;
  includeBottom?: boolean;
  /** Missing = the soft canvas. The guest menu is white. */
  background?: string;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.screen,
        {
          // The page is the soft canvas; cards on it are white (theme.surface).
          backgroundColor: background ?? theme.bg,
          paddingTop: includeTop ? insets.top : 0,
          paddingBottom: includeBottom ? insets.bottom : 0,
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
