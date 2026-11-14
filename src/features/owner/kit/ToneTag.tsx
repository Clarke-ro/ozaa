import { StyleSheet, View } from 'react-native';
import { STATUS_TONES, type StatusTone } from '@/theme/palette';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';

/** A small coloured tag in one of the canvas status colours (Cooking blue, Paid green, ...). */
export function ToneTag({ label, tone }: { label: string; tone: StatusTone }) {
  const theme = useTheme();
  const colours = STATUS_TONES[theme.scheme][tone];
  return (
    <View style={[styles.tag, { backgroundColor: colours.bg }]}>
      <Text style={[styles.text, { color: colours.ink }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, alignSelf: 'flex-start' },
  text: { fontSize: 12, lineHeight: 16, fontFamily: fontFamily.strong },
});
