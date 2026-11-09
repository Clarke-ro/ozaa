import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { cardStyle } from '../../kit';
import type { Note } from '../../desk/notifications';
import { useNoteLine } from './useNoteLine';

const CHIP = tokens.space[8] + tokens.space[1];

/**
 * One notification as a white card row: the icon on a soft tint of its tone (red for alerts,
 * green for good news, grey for the rest), what happened and when, and a tap to the screen that
 * deals with it. The words say the same thing as the colour, so colour is never the only signal.
 */
export function NoteCard({ note, now }: { note: Note; now: number }) {
  const theme = useTheme();
  const router = useRouter();
  const { Icon, title, when, ink } = useNoteLine(note, now);
  const chip =
    note.tone === 'alert' ? theme.errorTint : note.tone === 'good' ? theme.successTint : theme.wash;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${when}`}
      onPress={() => router.push(note.href as Href)}
      style={({ pressed }) => [
        styles.row,
        cardStyle(theme),
        pressed && { backgroundColor: theme.wash },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: chip }]}>
        <Icon size={18} color={ink} />
      </View>
      <View style={styles.flex}>
        <Text variant="body-strong" numberOfLines={2}>
          {title}
        </Text>
        <Text variant="caption" style={{ color: theme.muted }}>
          {when}
        </Text>
      </View>
      <ChevronRight size={18} color={theme.meta} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    minHeight: tokens.touchTarget + tokens.space[4],
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
  },
  icon: {
    width: CHIP,
    height: CHIP,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, gap: 2 },
});
