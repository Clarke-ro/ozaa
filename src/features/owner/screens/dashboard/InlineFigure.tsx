import { Pressable, StyleSheet, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

/**
 * A number with its words after it, read as one phrase: "14 orders today", "3 Cooking".
 * Several sit in one wrapping line, like a sentence, so on a wide screen they spread along the
 * line and on a phone they wrap; they never form columns. Tappable only when `onPress` is given.
 */
export function InlineFigure({
  value,
  words,
  ink,
  big,
  onPress,
}: {
  /** Null shows the words alone, e.g. "No ratings yet". */
  value: string | null;
  words: string;
  /** Colour for the number when it carries a state (late); words stay grey. */
  ink?: string;
  /** The kitchen counts use the display font; the day's smaller figures use the title size. */
  big?: boolean;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const spoken = value ? `${value} ${words}` : words;
  const body = (
    <>
      {value ? (
        <Text
          variant={big ? 'display-m' : 'title'}
          style={[styles.num, { color: ink ?? theme.text }]}
          numberOfLines={1}
        >
          {value}
        </Text>
      ) : null}
      <Text variant="body" style={{ color: theme.muted }} numberOfLines={1}>
        {words}
      </Text>
    </>
  );

  if (!onPress) {
    return (
      <View style={styles.item} accessible accessibilityLabel={spoken}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={spoken}
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && { backgroundColor: theme.surface }]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: tokens.space[1],
    minHeight: tokens.touchTarget,
    paddingHorizontal: tokens.space[2],
    paddingVertical: tokens.space[2],
    borderRadius: tokens.radius.md,
  },
  num: { fontVariant: ['tabular-nums'] },
});
