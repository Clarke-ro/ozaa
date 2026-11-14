import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

/** One question that opens to its answer and a link to the page it is about. */
export function FaqItem({
  question,
  answer,
  linkLabel,
  to,
  open,
  first,
  onToggle,
}: {
  question: string;
  answer: string;
  linkLabel: string;
  to: Href;
  open: boolean;
  first: boolean;
  onToggle: () => void;
}) {
  const theme = useTheme();
  const router = useRouter();
  const Chevron = open ? ChevronUp : ChevronDown;
  return (
    <View style={[!first && styles.rule, { borderTopColor: theme.line }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={({ pressed }) => [styles.head, pressed && { backgroundColor: theme.wash }]}
      >
        <Text variant="body" style={styles.flex}>
          {question}
        </Text>
        <Chevron size={16} color={theme.meta} />
      </Pressable>
      {open ? (
        <View style={styles.body}>
          <Text variant="body" style={{ color: theme.muted }}>
            {answer}
          </Text>
          <Button
            label={linkLabel}
            tone="secondary"
            onPress={() => router.push(to)}
            style={styles.link}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  rule: { borderTopWidth: StyleSheet.hairlineWidth },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    minHeight: tokens.owner.controls.rowMinHeight,
    paddingHorizontal: tokens.owner.controls.cardPadding,
  },
  flex: { flex: 1 },
  body: {
    gap: tokens.space[3],
    paddingHorizontal: tokens.owner.controls.cardPadding,
    paddingBottom: tokens.space[4],
  },
  link: { alignSelf: 'flex-start', minHeight: 40 },
});
