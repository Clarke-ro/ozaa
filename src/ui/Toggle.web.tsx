import { Pressable, StyleSheet, View } from 'react-native';
import { hapticImpactLight } from '@/lib/haptics';
import { tokens } from '@/theme/tokens';
import { useTheme } from '@/ui/theme';
import { useReducedMotion } from './useReducedMotion.web';
import { transition } from './webMotion';

const WIDTH = 52;
const KNOB = 24;
const PAD = 3;
const TRAVEL = WIDTH - KNOB - PAD * 2;

/** The web version of Toggle (see Toggle.tsx): the same slide and fade, as CSS transitions. */
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
  const theme = useTheme();
  const reduce = useReducedMotion();
  const ms = reduce ? 0 : tokens.motion.toggle;
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      aria-checked={value}
      aria-disabled={disabled}
      disabled={disabled}
      hitSlop={8}
      onPress={() => {
        void hapticImpactLight();
        onChange(!value);
      }}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <View
        style={[
          styles.track,
          { backgroundColor: value ? theme.fill : theme.line },
          transition('background-color', ms, 'ease-out'),
        ]}
      >
        <View
          style={[
            styles.knob,
            { backgroundColor: theme.onFill, transform: [{ translateX: value ? TRAVEL : 0 }] },
            transition('transform', ms, 'ease-out'),
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: WIDTH,
    height: KNOB + PAD * 2,
    borderRadius: (KNOB + PAD * 2) / 2,
    padding: PAD,
    justifyContent: 'center',
  },
  knob: { width: KNOB, height: KNOB, borderRadius: KNOB / 2 },
});
