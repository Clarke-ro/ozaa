import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import type { HeroText } from './figureText';

/**
 * The big number at the top of Today (sales, or orders when the app takes no payments), straight
 * on the page: a grey label, the number in the display font, and one sentence under it. It is
 * the largest type on the page on purpose, so the eye lands on it first.
 */
export function PulseFigure({
  text,
  onPress,
}: {
  text: HeroText;
  /** Missing when this person may not open the page behind the number. */
  onPress?: () => void;
}) {
  const theme = useTheme();
  const label = `${text.label}: ${text.value}, ${text.note}`;
  const body = (
    <>
      <View style={styles.label}>
        <Text variant="body-strong" style={{ color: theme.muted }}>
          {text.label}
        </Text>
        {onPress ? <ChevronRight size={20} color={theme.meta} /> : null}
      </View>
      <Text variant="display-l" style={styles.num} numberOfLines={1} adjustsFontSizeToFit>
        {text.value}
      </Text>
      <Text variant="body" style={{ color: theme.muted }} numberOfLines={2}>
        {text.note}
      </Text>
    </>
  );

  if (!onPress) {
    return (
      <View style={styles.hero} accessible accessibilityLabel={label}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.hero, pressed && { backgroundColor: theme.surface }]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Padded and pulled back by the same amount, so the words line up with the page title while
  // the pressed fill still has room around them.
  hero: {
    alignSelf: 'flex-start',
    gap: tokens.space[1],
    padding: tokens.space[2],
    margin: -tokens.space[2],
    borderRadius: tokens.radius.md,
  },
  label: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[1] },
  num: { fontVariant: ['tabular-nums'] },
});
