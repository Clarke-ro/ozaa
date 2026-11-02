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

export function FeedbackCard({
  item,
  onArchive,
  busy,
}: {
  item: FeedbackItem;
  onArchive: (archived: boolean) => void;
  busy: boolean;
}) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const mood = moodLook(theme)[item.sentiment];
  const MoodIcon = mood.icon;
  const when = new Date(item.createdAt).toLocaleString(i18n.language, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: item.sentiment === 'negative' ? theme.error : theme.line,
          backgroundColor: theme.surface,
        },
      ]}
    >
      <View style={styles.head}>
        <View style={[styles.mood, { backgroundColor: mood.bg }]}>
          <MoodIcon size={16} color={mood.ink} />
          <Text variant="caption" style={{ color: mood.ink, fontFamily: 'Inter_600' }}>
            {t(`ownerFeedback.mood.${item.sentiment}`)}
          </Text>
        </View>
        <View
          style={styles.score}
          accessible
          accessibilityLabel={t('ownerFeedback.scoreA11y', { score: item.score })}
        >
          <Star size={14} color={theme.muted} />
          <Text variant="caption" style={{ color: theme.muted }}>
            {item.score}/5
          </Text>
        </View>
        <Text variant="caption" style={[styles.when, { color: theme.muted }]}>
          {when}
        </Text>
      </View>

      <Text variant="body">{item.text}</Text>

      {item.photoUrl ? (
        <Image
          source={{ uri: item.photoUrl }}
          style={styles.photo}
          accessibilityLabel={t('ownerFeedback.photo')}
        />
      ) : null}

      <View style={styles.actions}>
        {item.contactPhone ? (
          <Action
            icon={Phone}
            label={
              item.contactName
                ? t('ownerFeedback.callName', { name: item.contactName })
                : t('ownerFeedback.call')
            }
            onPress={() => void Linking.openURL(`tel:${item.contactPhone}`)}
            accent
          />
        ) : (
          <Text variant="caption" style={[styles.flex, { color: theme.muted }]}>
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
        { borderColor: theme.line, opacity: disabled ? 0.5 : 1 },
        pressed && { backgroundColor: theme.wash },
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
    padding: tokens.space[4],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2], flexWrap: 'wrap' },
  mood: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[1],
    paddingHorizontal: tokens.space[2],
    paddingVertical: 2,
    borderRadius: tokens.radius.full,
  },
  score: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  when: { marginLeft: 'auto' },
  photo: { width: '100%', aspectRatio: 4 / 3, maxHeight: 240, borderRadius: tokens.radius.md },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    minHeight: tokens.touchTarget,
    paddingHorizontal: tokens.space[3],
    borderWidth: 1,
    borderRadius: tokens.radius.md,
  },
  flex: { flex: 1 },
});
