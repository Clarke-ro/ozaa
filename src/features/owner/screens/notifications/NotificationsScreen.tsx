import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Banknote,
  Bell,
  BellOff,
  ChefHat,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Mail,
  MessageSquare,
  UserPlus,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { timeAgo } from '@/lib/time';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { useNotesSeen, useNotifications } from '../../data/useNotifications';
import type { Note, NoteKind } from '../../desk/notifications';
import { EmptyCard, SectionLabel } from '../../kit';

const ICON: Record<NoteKind, LucideIcon> = {
  sold_out: UtensilsCrossed,
  payout: Wallet,
  call: Bell,
  order: ClipboardList,
  order_ready: ChefHat,
  payment: Banknote,
  payment_failed: CircleAlert,
  feedback: MessageSquare,
  staff_joined: UserPlus,
  staff_invited: Mail,
};

/**
 * What happened across the venue: pinned alerts, then new since the last visit, then earlier.
 * Each line opens the screen where it gets handled. Leaving the screen marks everything seen.
 */
export function NotificationsScreen() {
  const { t } = useTranslation();
  const venueId = useOwnerSession((s) => s.venueId) ?? '';
  const markSeen = useNotesSeen((s) => s.markSeen);
  const feed = useNotifications();
  // Fixed while the screen is open, so "New" doesn't empty itself under the owner's eyes.
  const [since] = useState(feed.lastSeen);
  useEffect(() => () => markSeen(venueId, Date.now()), [markSeen, venueId]);

  const pinned = feed.notes.filter((n) => n.at === null);
  const fresh = feed.notes.filter((n) => n.at && (since === null || Date.parse(n.at) > since));
  const earlier = feed.notes.filter((n) => n.at && since !== null && Date.parse(n.at) <= since);
  const groups = [
    { key: 'pinned', title: t('ownerNotes.pinned'), items: pinned },
    { key: 'new', title: t('ownerNotes.new'), items: fresh },
    { key: 'earlier', title: t('ownerNotes.earlier'), items: earlier },
  ].filter((g) => g.items.length > 0);

  return (
    <OwnerPage title={t('ownerNotes.title')}>
      <DeskWait loading={feed.loading} error={feed.error} onRetry={feed.refetch}>
        {groups.length === 0 ? (
          <EmptyCard
            icon={BellOff}
            title={t('ownerNotes.empty')}
            description={t('ownerNotes.emptyBody')}
          />
        ) : (
          groups.map((group) => (
            <View key={group.key} style={styles.group}>
              <SectionLabel title={group.title} caps />
              <View style={styles.list}>
                {group.items.map((note) => (
                  <NoteRow key={note.id} note={note} now={feed.now} />
                ))}
              </View>
            </View>
          ))
        )}
      </DeskWait>
    </OwnerPage>
  );
}

function NoteRow({ note, now }: { note: Note; now: number }) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const Icon = ICON[note.kind];
  const vars =
    typeof note.vars.amount === 'number'
      ? {
          ...note.vars,
          amount: formatMoney(pesewas(note.vars.amount), String(note.vars.currency)),
        }
      : note.vars;
  const reason =
    typeof note.vars.reason === 'string' ? t(`waiter.reasons.${note.vars.reason}`) : '';
  const title = t(`ownerNotes.kind.${note.kind}`, { ...vars, reason });
  const ink =
    note.tone === 'alert' ? theme.error : note.tone === 'good' ? theme.success : theme.text;
  const bg =
    note.tone === 'alert' ? theme.errorTint : note.tone === 'good' ? theme.successTint : theme.wash;
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
      <View style={[styles.icon, { backgroundColor: bg }]}>
        <Icon size={18} color={ink} />
      </View>
      <View style={styles.flex}>
        <Text variant="body-strong" numberOfLines={2}>
          {title}
        </Text>
        <Text variant="caption" style={{ color: theme.muted }}>
          {note.at ? timeAgo(note.at, now, i18n.language) : t('ownerNotes.now')}
        </Text>
      </View>
      <ChevronRight size={18} color={theme.meta} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { gap: tokens.space[2] },
  list: { gap: tokens.space[2] },
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
