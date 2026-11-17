import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  BellOff,
  BellRing,
  ChefHat,
  ChevronRight,
  CircleCheck,
  ClipboardCheck,
  Footprints,
  ThumbsUp,
  type LucideIcon,
} from 'lucide-react-native';
import { timeAgo } from '@/lib/time';
import { tokens } from '@/theme/tokens';
import { PageHeader } from '@/ui/PageHeader';
import { SafeScreen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import type { GuestNote, GuestNoteKind } from './guestNotes';
import { useGuestNotes, useGuestNotesSeen } from './useGuestNotes';

const ICON: Record<GuestNoteKind, LucideIcon> = {
  order_sent: ClipboardCheck,
  order_accepted: ThumbsUp,
  order_cooking: ChefHat,
  order_ready: BellRing,
  order_served: CircleCheck,
  call_sent: BellRing,
  call_coming: Footprints,
};

// "2 minutes ago" only needs to move every half minute.
const TICK_MS = 30_000;

/** Updates about this visit: the order and waiter calls, newest first. Leaving marks them seen. */
export function GuestNotificationsScreen({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { notes } = useGuestNotes(slug);
  const mark = useGuestNotesSeen((s) => s.mark);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => {
      clearInterval(id);
      mark(Date.now());
    };
  }, [mark]);

  return (
    <SafeScreen>
      <PageHeader title={t('notices.title')} />
      <ScrollView contentContainerStyle={styles.page}>
        {notes.length === 0 ? (
          <View style={styles.empty}>
            <BellOff size={28} color={theme.meta} />
            <Text variant="body-strong">{t('notices.empty')}</Text>
            <Text variant="body" style={[styles.center, { color: theme.muted }]}>
              {t('notices.emptyBody')}
            </Text>
          </View>
        ) : (
          notes.map((note) => (
            <NoteRow
              key={note.id}
              note={note}
              now={now}
              onPress={() => router.push(`/${slug}/${note.href}`)}
            />
          ))
        )}
      </ScrollView>
    </SafeScreen>
  );
}

function NoteRow({ note, now, onPress }: { note: GuestNote; now: number; onPress: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const Icon = ICON[note.kind];
  const reason =
    typeof note.vars.reason === 'string' ? t(`waiter.reasons.${note.vars.reason}`) : '';
  const title = t(`notices.kind.${note.kind}`, { ...note.vars, reason });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? theme.wash : theme.surface },
      ]}
    >
      <Icon size={24} color={note.kind === 'order_ready' ? theme.success : theme.ink} />
      <View style={styles.copy}>
        <Text variant="body-strong">{title}</Text>
        <Text variant="caption" style={{ color: theme.muted }}>
          {timeAgo(note.at, now, t)}
        </Text>
      </View>
      <ChevronRight size={20} color={theme.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { padding: tokens.grid.mobile.margin, gap: tokens.space[3] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[4],
    minHeight: 64,
    paddingVertical: tokens.space[3],
    paddingHorizontal: tokens.space[5],
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
    boxShadow: tokens.shadow.card,
  },
  copy: { flex: 1, gap: 2 },
  empty: { alignItems: 'center', gap: tokens.space[2], paddingTop: tokens.space[16] },
  center: { textAlign: 'center' },
});
