import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { canOpen } from '../../chrome/nav';
import type { Note } from '../../desk/notifications';
import { useNoteLine } from '../notifications/useNoteLine';

/**
 * One urgent item in Needs you, drawn as an alert bar: a coloured edge on the left, the note's
 * icon, what happened and when, and a tap to the screen that fixes it. Alerts sit on a soft red,
 * good news on a soft green, the rest on white, and the words always say the same thing, so the
 * colour is never the only signal. The feed does not know about roles, so a note whose page this
 * person cannot open (a payout alert for a waiter) shows as plain text with no tap.
 */
export function AttentionRow({ note, now }: { note: Note; now: number }) {
  const theme = useTheme();
  const router = useRouter();
  const role = useOwnerSession((state) => state.role) ?? 'waiter';
  const { Icon, title, when, ink } = useNoteLine(note, now);
  const bg =
    note.tone === 'alert'
      ? theme.errorTint
      : note.tone === 'good'
        ? theme.successTint
        : theme.surface;
  const spoken = `${title}, ${when}`;
  const mayOpen = canOpen(role, note.href);
  const body = (
    <>
      <View style={[styles.edge, { backgroundColor: ink }]} />
      <Icon size={20} color={ink} />
      <View style={styles.copy}>
        <Text variant="body-strong" numberOfLines={2}>
          {title}
        </Text>
        <Text variant="caption" style={{ color: theme.muted }} numberOfLines={1}>
          {when}
        </Text>
      </View>
      {mayOpen ? <ChevronRight size={20} color={theme.meta} /> : null}
    </>
  );

  if (!mayOpen) {
    return (
      <View style={[styles.bar, { backgroundColor: bg }]} accessible accessibilityLabel={spoken}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={spoken}
      onPress={() => router.push(note.href as Href)}
      style={({ pressed }) => [styles.bar, { backgroundColor: pressed ? theme.wash : bg }]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    minHeight: tokens.touchTarget + tokens.space[2],
    paddingVertical: tokens.space[3],
    paddingLeft: tokens.space[4] + tokens.owner.statusEdge,
    paddingRight: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  edge: { position: 'absolute', left: 0, top: 0, bottom: 0, width: tokens.owner.statusEdge },
  copy: { flex: 1, gap: tokens.space[1] / 2 },
});
