import { Pressable, StyleSheet } from 'react-native';
import { Plus } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

/**
 * A wide dashed "+ Add …" box at the end of a list, in the accent colour. It reads as an empty
 * slot waiting to be filled, so it never competes with the page's one filled button.
 */
export function AddDashed({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.box,
        // Canvas: a grey dashed edge, black words, no fill.
        { borderColor: theme.line, backgroundColor: pressed ? theme.wash : 'transparent' },
      ]}
    >
      <Plus size={20} color={theme.text} />
      <Text variant="button" style={{ color: theme.text }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space[2],
    minHeight: 56,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: tokens.owner.controls.cardRadius,
  },
});
