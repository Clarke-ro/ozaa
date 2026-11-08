import { Pressable, StyleSheet, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { cardStyle } from './cardStyle';

/**
 * One figure in a white card on a report page. `labelFirst` puts a small capital label over the
 * number with a grey note under it (Sales); `valueFirst` puts the number on top and what it
 * counts under it (Insights). Tappable when `onPress` is given.
 */
export function FigureCard({
  label,
  value,
  note,
  order,
  onPress,
}: {
  label: string;
  value: string;
  note?: string;
  order: 'labelFirst' | 'valueFirst';
  onPress?: () => void;
}) {
  const theme = useTheme();
  const number = (
    <Text
      variant="display-m"
      style={[styles.value, order === 'labelFirst' && styles.small]}
      numberOfLines={1}
      adjustsFontSizeToFit
    >
      {value}
    </Text>
  );
  const body =
    order === 'labelFirst' ? (
      <>
        <Text variant="caption" style={[styles.caps, { color: theme.text }]} numberOfLines={2}>
          {label.toUpperCase()}
        </Text>
        {number}
        {note ? (
          <Text variant="caption" style={{ color: theme.muted }} numberOfLines={2}>
            {note}
          </Text>
        ) : null}
      </>
    ) : (
      <>
        {number}
        <Text variant="body" style={{ color: theme.muted }} numberOfLines={2}>
          {label}
        </Text>
      </>
    );
  const spoken = `${label}: ${value}${note ? `, ${note}` : ''}`;

  if (!onPress) {
    return (
      <View style={[styles.card, cardStyle(theme)]} accessible accessibilityLabel={spoken}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={spoken}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        cardStyle(theme),
        pressed && { backgroundColor: theme.wash },
      ]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 0, padding: tokens.space[4], gap: tokens.space[2] },
  caps: { fontFamily: fontFamily.strong, letterSpacing: tokens.owner.type.caps.letterSpacing },
  value: { fontVariant: ['tabular-nums'] },
  // Sales sets its figures smaller than Insights, as MenuRite does.
  small: { fontSize: tokens.owner.type.figure.size, lineHeight: tokens.owner.type.figure.line },
});
