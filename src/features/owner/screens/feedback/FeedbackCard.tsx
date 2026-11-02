import { Image, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  Archive,
  ArchiveRestore,
  Frown,
  Meh,
  Phone,
  Smile,
  Star,
  type LucideIcon,
} from 'lucide-react-native';
import type { FeedbackItem, FeedbackSentiment } from '@/lib/api/types';
import { timeAgo } from '@/lib/time';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme, type Theme } from '@/ui/theme';

// Icon, word and colour together, so the mood never rests on colour alone.
function moodLook(
  theme: Theme,
): Record<FeedbackSentiment, { icon: LucideIcon; ink: string; bg: string }> {
  return {
    positive: { icon: Smile, ink: theme.success, bg: theme.successTint },
    neutral: { icon: Meh, ink: theme.muted, bg: theme.wash },
    negative: { icon: Frown, ink: theme.error, bg: theme.errorTint },
  };
}

/**
 * One private note from a guest: who and when, their stars, what they wrote, then quiet actions.
 * The mood shows as an icon and a word (never colour alone), so the card itself stays calm.
 */
export function FeedbackCard({
  item,
  now,
  onArchive,
  busy,
}: {
  item: FeedbackItem;
  now: number;
  onArchive: (archived: boolean) => void;
  busy: boolean;
}) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const mood = moodLook(theme)[item.sentiment];
  const MoodIcon = mood.icon;
  const who = item.contactName || t('ownerFeedback.anonymousName');

  return (
    <View style={[styles.card, { borderColor: theme.line, backgroundColor: theme.surface }]}>
      <View style={styles.head}>
        <View
          style={[styles.avatar, { backgroundColor: mood.bg }]}
          accessible
          accessibilityLabel={t(`ownerFeedback.mood.${item.sentiment}`)}
        >
          <MoodIcon size={20} color={mood.ink} />
        </View>
        <View style={styles.flex}>
          <Text variant="body-strong" numberOfLines={1}>
            {who}
          </Text>
          <Text variant="caption" style={{ color: theme.muted }}>
            {t(`ownerFeedback.mood.${item.sentiment}`)} ·{' '}
            {timeAgo(item.createdAt, now, t)}
          </Text>
        </View>
        <View
          style={styles.stars}
          accessible
          accessibilityLabel={t('ownerFeedback.scoreA11y', { score: item.score })}
        >
          {STARS.map((n) => (
            <Star
              key={n}
              size={14}
              color={n <= item.score ? theme.text : theme.line}
              fill={n <= item.score ? theme.text : 'transparent'}
            />
          ))}
        </View>
      </View>

      <Text variant="body">{item.text}</Text>

      {item.photoUrl ? (
        <Image
          source={{ uri: item.photoUrl }}
          style={styles.photo}
          accessibilityLabel={t('ownerFeedback.photo')}
        />
      ) : null}

      <View style={[styles.actions, { borderColor: theme.line }]}>
        {item.contactPhone ? (
          <Action
            icon={Phone}
            label={t('ownerFeedback.call')}
            onPress={() => void Linking.openURL(`tel:${item.contactPhone}`)}
            accent
          />
        ) : (
          <Text variant="caption" style={[styles.flex, { color: theme.meta }]}>
            {t('ownerFeedback.anonymous')}
          </Text>
        )}
        <Action
          icon={item.archived ? ArchiveRestore : Archive}
          label={item.archived ? t('ownerFeedback.restore') : t('ownerFeedback.archive')}
          onPress={() => onArchive(!item.archived)}
          disabled={busy}
        />
      </View>
    </View>
  );
}

const STARS = [1, 2, 3, 4, 5] as const;

function Action({
  icon: Icon,
  label,
  onPress,
  accent,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  accent?: boolean;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const ink = accent ? theme.ink : theme.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        { opacity: disabled ? 0.5 : 1, backgroundColor: pressed ? theme.wash : undefined },
      ]}
    >
      <Icon size={16} color={ink} />
      <Text variant="body-strong" style={{ color: ink }} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: tokens.space[3],
    paddingTop: tokens.space[4],
    paddingHorizontal: tokens.space[4],
    paddingBottom: tokens.space[1],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stars: { flexDirection: 'row', gap: 2 },
  photo: { width: '100%', aspectRatio: 4 / 3, maxHeight: 240, borderRadius: tokens.radius.md },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[1],
    justifyContent: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: tokens.space[1],
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    minHeight: tokens.touchTarget,
    paddingHorizontal: tokens.space[3],
    borderRadius: tokens.radius.md,
  },
  flex: { flex: 1 },
});
