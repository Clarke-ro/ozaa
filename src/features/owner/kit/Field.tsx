import { makeStyles } from '@/ui/makeStyles';
import { TextInput, View, type TextInputProps } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

/** Labelled text field used by every owner form. The label is also the accessibility name. */
export function Field({
  label,
  hint,
  error,
  style,
  ...rest
}: TextInputProps & { label: string; hint?: string; error?: string }) {
  const styles = useStyles();
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <Text variant="body-strong" style={{ fontSize: 14, lineHeight: 20, color: theme.muted }}>
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

const useStyles = makeStyles((theme) => ({
  // Grows to share a row with another field, but keeps its own height in a column.
  wrap: { gap: tokens.space[2], flexGrow: 1, flexShrink: 1, flexBasis: 'auto', minWidth: 120 },
  input: {
    // Canvas fields: 48 px pills with 15 px text; a multi-line box keeps 16 px corners.
    minHeight: tokens.owner.controls.height,
    borderWidth: 1,
    borderRadius: tokens.radius.full,
    paddingHorizontal: tokens.space[4] + 2,
    fontFamily: 'Inter_400',
    fontSize: 15,
    backgroundColor: theme.surface,
  },
  multi: {
    minHeight: 96,
    borderRadius: tokens.owner.controls.cardRadius,
    paddingTop: tokens.space[3],
    textAlignVertical: 'top',
  },
}));
