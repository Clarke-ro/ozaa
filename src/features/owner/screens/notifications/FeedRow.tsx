import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  BellRing,
  ChevronRight,
  MessageSquareText,
  Receipt,
  Star,
  UtensilsCrossed,
} from 'lucide-react-native';
import type { OwnerNotification } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { cardStyle } from '../../kit';
import { feedHref } from '../../data/useOwnerFeed';
import { agoLabel } from './agoLabel';

const ICONS = {
  order: UtensilsCrossed,
  call: BellRing,
  bill: Receipt,
  guest_note: MessageSquareText,
  review: Star,
} as const;

/**
 * One notification: a plain icon, what happened, when, and a dot while it's unread. Tapping marks
 * it read and opens the screen that deals with it. "Unread" is also said in words for screen readers.
 * `compact` is the one-line row on Today ("Needs you"): no icon, the title, then the time on the right.
 */
export function FeedRow({
  item,
  now,
  onOpen,
  compact,
}: {
  item: OwnerNotification;
  now: number;
  onOpen: (item: OwnerNotification) => void;
  compact?: boolean;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const Icon = ICONS[item.kind];
  const unread = item.readAt === null;
  const when = agoLabel(t, item.createdAt, now);
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={[unread ? t('ownerNotes.unread') : null, item.title, item.detail, when]
        .filter(Boolean)
        .join(', ')}
      onPress={() => {
        onOpen(item);
        router.push(feedHref(item) as Href);
      }}
      style={({ pressed }) => [
        styles.row,
        cardStyle(theme),
        compact && styles.compact,
        pressed && { backgroundColor: theme.wash },
      ]}
    >
      {compact ? null : <Icon size={22} color={theme.text} />}
      {compact ? (
        <>
          <Text style={styles.compactTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.compactWhen, { color: theme.meta }]} numberOfLines={1}>
            {when}
          </Text>
        </>
      ) : (
        <View style={styles.copy}>
          <Text variant={unread ? 'body-strong' : 'body'} numberOfLines={2}>
            {item.title}
          </Text>
          <Text variant="caption" numberOfLines={1} style={{ color: theme.muted }}>
            {item.detail ? `${item.detail} · ${when}` : when}
          </Text>
        </View>
      )}
      {unread && !compact ? <View style={[styles.dot, { backgroundColor: theme.fill }]} /> : null}
      <ChevronRight size={20} color={theme.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[4],
    minHeight: 72,
    paddingHorizontal: tokens.space[5],
    paddingVertical: tokens.space[3],
  },
  compact: { minHeight: tokens.owner.controls.rowMinHeight, paddingVertical: tokens.space[2] },
  compactTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: tokens.owner.type.rowLabel.size,
    lineHeight: tokens.owner.type.rowLabel.line,
  },
  compactWhen: { fontSize: 15, lineHeight: 20 },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
