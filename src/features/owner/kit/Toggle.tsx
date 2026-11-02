import { makeStyles } from '@/ui/makeStyles';
import { Pressable, View } from 'react-native';
import { useTheme } from '@/ui/theme';
import { hapticImpactLight } from '@/lib/haptics';

/** On/off switch drawn to match owner-services.png (orange track, white knob). */
export function Toggle({
  value,
  onChange,
  label,
  disabled,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  const styles = useStyles();
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => {
        void hapticImpactLight();
        onChange(!value);
      }}
      style={[
        styles.track,
        { backgroundColor: value ? theme.fill : theme.line, opacity: disabled ? 0.5 : 1 },
      ]}
    >
      <View style={[styles.knob, { alignSelf: value ? 'flex-end' : 'flex-start' }]} />
    </Pressable>
  );
}

const useStyles = makeStyles((theme) => ({
  track: { width: 52, height: 30, borderRadius: 15, padding: 3, justifyContent: 'center' },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: theme.onFill },
}));
