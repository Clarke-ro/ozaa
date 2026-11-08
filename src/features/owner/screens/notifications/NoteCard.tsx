import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import type { Note } from '../../desk/notifications';
import { useNoteLine } from './useNoteLine';

/** One notification as its own card on Notifications: icon by tone, the line, when, and a tap to the right screen. */
export function NoteCard({ note, now }: { note: Note; now: number }) {
  const theme = useTheme();
  const router = useRouter();
  const { Icon, title, when, ink } = useNoteLine(note, now);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => router.push(note.href as Href)}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? theme.wash : theme.surface, borderColor: theme.line },
      ]}
    >
      <View style={styles.icon}>
        <Icon size={20} color={ink} />
      </View>
      <View style={styles.flex}>
        <Text variant="body-strong" numberOfLines={2}>
          {title}
        </Text>
        <Text variant="caption" style={{ color: theme.muted }}>
          {when}
        </Text>
      </View>
      <ChevronRight size={20} color={theme.meta} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    minHeight: 64,
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, gap: 2 },
});
