import { StyleSheet } from 'react-native';
import { Plus } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { PressableScale } from '@/ui/PressableScale';
import { useTheme } from '@/ui/theme';
import { useOwnerLayout } from '../chrome/layout';

/**
 * A page's "add" action in its header (Create order, Add dish). Wide screens show the named
 * button from the canvas. Phones show a round orange + in the same spot, like iOS's add button,
 * so the title row stays one slim line; the name is still read out.
 */
export function HeaderAdd({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const { wide } = useOwnerLayout();
  if (wide) return <Button label={label} size="md" onPress={onPress} disabled={disabled} />;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.plus,
        { backgroundColor: disabled ? theme.wash : pressed ? theme.pressed : theme.fill },
      ]}
    >
      <Plus size={22} color={disabled ? theme.meta : theme.onFill} strokeWidth={2.4} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  plus: {
    width: tokens.touchTarget,
    height: tokens.touchTarget,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
