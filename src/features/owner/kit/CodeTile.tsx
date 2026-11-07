import { StyleSheet, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

/** Grey rounded square with a short code inside: table numbers ("T4"), initials, "TA" for takeaway. */
export function CodeTile({
  code,
  size = 52,
  tone = 'wash',
}: {
  code: string;
  size?: number;
  tone?: 'wash' | 'tint' | 'alert';
}) {
  const theme = useTheme();
  const bg = tone === 'tint' ? theme.tint : tone === 'alert' ? theme.errorTint : theme.wash;
  const ink = tone === 'tint' ? theme.badgeInk : tone === 'alert' ? theme.error : theme.text;
  return (
    <View style={[styles.tile, { width: size, height: size, backgroundColor: bg }]}>
      <Text variant="button" style={{ color: ink }} numberOfLines={1}>
        {code}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { borderRadius: tokens.radius.md, alignItems: 'center', justifyContent: 'center' },
});
