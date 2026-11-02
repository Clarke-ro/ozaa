import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { useTheme } from '@/ui/theme';

/**
 * A plain line icon in the primary colour (red for alerts), sized like the old tile so rows keep
 * their rhythm. No tile behind it: the same clean style as the guest home list.
 */
export function IconTile({
  icon: Icon,
  size = 44,
  tone = 'wash',
}: {
  icon: LucideIcon;
  size?: number;
  tone?: 'wash' | 'tint' | 'alert';
}) {
  const theme = useTheme();
  const ink = tone === 'alert' ? theme.error : theme.ink;
  return (
    <View
      style={[styles.tile, { width: size, height: size }]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Icon size={Math.round(size * 0.5)} color={ink} strokeWidth={2} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { borderRadius: tokens.radius.md, alignItems: 'center', justifyContent: 'center' },
});
