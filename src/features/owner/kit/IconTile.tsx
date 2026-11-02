import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { useTheme } from '@/ui/theme';

/** Square grey tile holding a primary-colour icon (render: owner-services rows). */
export function IconTile({ icon: Icon, size = 44, tone = 'wash' }: { icon: LucideIcon; size?: number; tone?: 'wash' | 'tint' | 'alert' }) {
  const theme = useTheme();
  const bg = tone === 'tint' ? theme.tint : tone === 'alert' ? '#FEF2F2' : theme.wash;
  const ink = tone === 'alert' ? theme.error : theme.ink;
  return (
    <View style={[styles.tile, { width: size, height: size, backgroundColor: bg }]} accessibilityElementsHidden importantForAccessibility="no">
      <Icon size={Math.round(size * 0.5)} color={ink} strokeWidth={2} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { borderRadius: tokens.radius.md, alignItems: 'center', justifyContent: 'center' },
});
