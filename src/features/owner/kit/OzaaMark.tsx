import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

// The "small" logo drawing is meant for 33–63 px (design/brand.md §1), so the header uses it at 44 px.
const MARK = require('../../../../assets/images/ozaa-mark-96.png');

/** Ozaa logo mark for owner headers. Never recolour or redraw it. */
export function OzaaMark({ size = 44 }: { size?: number }) {
  return (
    <Image
      source={MARK}
      style={[styles.mark, { width: size, height: size, borderRadius: size / 2 }]}
      accessibilityLabel="Ozaa"
    />
  );
}

const styles = StyleSheet.create({
  mark: {},
});
