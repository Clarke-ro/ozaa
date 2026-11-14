import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
  type TextInputProps,
} from 'react-native';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { Toggle } from './Toggle';

// Above this text size a label and its control no longer fit side by side, so they stack.
const STACK_AT = 1.35;

/** A labelled text input inside a Section. The label is also the accessibility name. */
export function InputRow({
  label,
  icon: Icon,
  error,
  multiline,
  ...input
}: TextInputProps & { label: string; icon?: LucideIcon; error?: string }) {
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  const stacked = multiline || fontScale > STACK_AT;
  return (
    <View style={styles.pad}>
      <View style={[styles.line, stacked && styles.stacked]}>
        {Icon && !stacked ? <Icon size={18} color={theme.text} /> : null}
        <Text variant="body" style={stacked ? undefined : styles.label}>
          {label}
        </Text>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={theme.meta}
          multiline={multiline}
          {...input}
          // Canvas: the value sits in its own rounded field beside the label.
          style={[
            styles.input,
            styles.field,
            { color: theme.text, borderColor: theme.line, backgroundColor: theme.surface },
            multiline && styles.multi,
            input.style,
          ]}
        />
      </View>
      {error ? (
        <Text variant="caption" accessibilityLiveRegion="polite" style={{ color: theme.error }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/** A setting that is on or off, with an optional short hint under the label. */
export function SwitchRow({
  label,
  hint,
  value,
  onChange,
  icon: Icon,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (next: boolean) => void;
  icon?: LucideIcon;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.pad, styles.row]}>
      {Icon ? <Icon size={18} color={theme.text} /> : null}
      <View style={styles.copy}>
        <Text variant="body">{label}</Text>
        {hint ? (
          <Text variant="caption" style={{ color: theme.muted }}>
            {hint}
          </Text>
        ) : null}
      </View>
      <Toggle value={value} onChange={onChange} label={label} />
    </View>
  );
}

/** A row that opens something: icon, label, optional value on the right, chevron. */
export function LinkRow({
  label,
  value,
  icon: Icon,
  onPress,
  destructive,
  trailing,
}: {
  label: string;
  value?: string;
  icon?: LucideIcon;
  onPress: () => void;
  destructive?: boolean;
  trailing?: ReactNode;
}) {
  const theme = useTheme();
  const ink = destructive ? theme.error : theme.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      onPress={onPress}
      style={({ pressed }) => [styles.pad, styles.row, pressed && { backgroundColor: theme.wash }]}
    >
      {Icon ? <Icon size={18} color={destructive ? theme.error : theme.muted} /> : null}
      <Text variant="body" style={[styles.copy, { color: ink }]} numberOfLines={2}>
        {label}
      </Text>
      {value ? (
        <Text variant="body" numberOfLines={1} style={[styles.value, { color: theme.muted }]}>
          {value}
        </Text>
      ) : null}
      {trailing}
      {destructive ? null : <ChevronRight size={18} color={theme.meta} />}
    </Pressable>
  );
}

/** A read-only row: icon, label, value and an optional badge. Not tappable, so it has no chevron. */
export function InfoRow({
  label,
  value,
  icon: Icon,
  trailing,
}: {
  label: string;
  value?: string;
  icon?: LucideIcon;
  trailing?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={value ? `${label}, ${value}` : label}
      style={[styles.pad, styles.row]}
    >
      {Icon ? <Icon size={18} color={theme.text} /> : null}
      <View style={styles.copy}>
        <Text variant="body">{label}</Text>
        {value ? (
          <Text variant="caption" style={{ color: theme.muted }}>
            {value}
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}

/** Plain content inside a Section, padded like the other rows. */
export function SectionBody({ children }: { children: ReactNode }) {
  return <View style={[styles.pad, styles.body]}>{children}</View>;
}

const styles = StyleSheet.create({
  pad: {
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
    minHeight: 52,
    justifyContent: 'center',
    gap: tokens.space[1],
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  line: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  stacked: { flexDirection: 'column', alignItems: 'stretch', gap: tokens.space[1] },
  label: { flexShrink: 0, width: 110, maxWidth: '45%' },
  input: { flex: 1, minHeight: 28, fontFamily: 'Inter_400', fontSize: 15, padding: 0 },
  field: {
    minHeight: 40,
    paddingHorizontal: tokens.space[3],
    borderWidth: 1,
    borderRadius: tokens.radius.full,
  },
  multi: {
    minHeight: 72,
    paddingVertical: tokens.space[2],
    borderRadius: tokens.owner.controls.cardRadius,
    textAlignVertical: 'top',
  },
  copy: { flex: 1, gap: 2 },
  value: { maxWidth: '45%' },
  body: { gap: tokens.space[3] },
});
