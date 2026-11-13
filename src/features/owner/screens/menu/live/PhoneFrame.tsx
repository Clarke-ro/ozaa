import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { PHONE_FRAME } from '@/theme/palette';
import { useTheme } from '@/ui/theme';

// The width the guest renders are drawn at (BUILD.md: 390×844), so the preview matches them.
const PHONE_WIDTH = 390;
const PHONE_HEIGHT = 760;
// Canvas phone: a 2 px grey rim, 9 px of black body, 58 px outer corners.
const BEZEL = 9;
const CORNER = 58;

/** A phone outline in the guest's theme, shared by the online and walk-in previews. */
export function PhoneFrame({ label, children }: { label: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View
      accessibilityLabel={label}
      style={[styles.rim, { borderColor: PHONE_FRAME.rim, backgroundColor: PHONE_FRAME.body }]}
    >
      <View style={[styles.screen, { backgroundColor: theme.bg }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  rim: {
    width: '100%',
    maxWidth: PHONE_WIDTH,
    height: PHONE_HEIGHT,
    alignSelf: 'center',
    padding: BEZEL,
    borderWidth: 2,
    borderRadius: CORNER,
    borderCurve: 'continuous',
  },
  screen: {
    flex: 1,
    borderRadius: CORNER - BEZEL - 2,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
});
