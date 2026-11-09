import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/ui/theme';

// The width the guest renders are drawn at (BUILD.md: 390×844), so the preview matches them.
const PHONE_WIDTH = 390;
const PHONE_HEIGHT = 760;
const BEZEL = 8;
const CORNER = 40;

/** A phone outline in the guest's theme, shared by the online and walk-in previews. */
export function PhoneFrame({ label, children }: { label: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View
      accessibilityLabel={label}
      style={[styles.phone, { backgroundColor: theme.bg, borderColor: theme.line }]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  phone: {
    width: '100%',
    maxWidth: PHONE_WIDTH,
    height: PHONE_HEIGHT,
    alignSelf: 'center',
    borderWidth: BEZEL,
    borderRadius: CORNER,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
});
