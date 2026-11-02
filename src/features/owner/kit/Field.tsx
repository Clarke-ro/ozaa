import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

/** Labelled text field used by every owner form. The label is also the accessibility name. */
export function Field({ label, hint, error, style, ...rest }: TextInputProps & { label: string; hint?: string; error?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <Text variant="body-strong" style={{ fontSize: 14 }}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={theme.meta}
        {...rest}
        style={[
          styles.input,
          { borderColor: error ? theme.error : theme.line, color: theme.text },
          rest.multiline && styles.multi,
          style,
        ]}
      />
      {error ? (
        <Text variant="caption" style={{ color: theme.error }}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" style={{ color: theme.meta }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space[2], flex: 1, minWidth: 120 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space[3],
    fontFamily: 'Inter_400',
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  multi: { minHeight: 96, paddingTop: tokens.space[3], textAlignVertical: 'top' },
});
