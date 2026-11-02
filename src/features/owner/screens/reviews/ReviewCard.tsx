import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react-native';
import type { WrittenReview } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

/** One guest review: stars, name, date, what stood out, the note, and the owner's reply. */
export function ReviewCard({
  review,
  onReply,
  sending,
}: {
  review: WrittenReview;
  onReply: (text: string) => void;
  sending: boolean;
}) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const [draft, setDraft] = useState('');
  const date = new Date(review.createdAt).toLocaleDateString(i18n.language, {
    day: 'numeric',
    month: 'short',
  });
  return (
    <View style={[styles.card, { borderColor: theme.line, backgroundColor: theme.surface }]}>
      <View style={styles.head}>
        <View
          style={styles.stars}
          accessible
          accessibilityLabel={t('review.starsA11y', { count: review.stars })}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              size={16}
              color={n <= review.stars ? theme.ink : theme.line}
              fill={n <= review.stars ? theme.ink : 'transparent'}
            />
          ))}
        </View>
        <Text variant="body-strong" style={styles.flex} numberOfLines={1}>
          {review.firstName}
        </Text>
        <Text variant="caption" style={{ color: theme.muted }}>
          {date}
        </Text>
      </View>
      {review.highlights?.length ? (
        <Text variant="caption" style={{ color: theme.muted }}>
          {review.highlights.map((h) => t(`review.highlights.${h}`)).join(' · ')}
        </Text>
      ) : null}
      {review.text ? <Text variant="body">{review.text}</Text> : null}
      {review.reply ? (
        <View style={[styles.reply, { backgroundColor: theme.wash }]}>
          <Text variant="caption" style={{ color: theme.muted, fontFamily: 'Inter_600' }}>
            {t('ownerReviews.yourReply')}
          </Text>
          <Text variant="body">{review.reply}</Text>
        </View>
      ) : (
        <View style={styles.replyBox}>
          <TextInput
            accessibilityLabel={t('ownerReviews.replyTo', { name: review.firstName })}
            value={draft}
            onChangeText={setDraft}
            placeholder={t('ownerReviews.replyHint')}
            placeholderTextColor={theme.meta}
            multiline
            maxLength={500}
            style={[styles.input, { borderColor: theme.line, color: theme.text }]}
          />
          <Button
            label={t('owner.sendReply')}
            tone="secondary"
            size="md"
            disabled={!draft.trim()}
            loading={sending}
            onPress={() => onReply(draft.trim())}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: tokens.space[2],
    padding: tokens.space[4],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.lg,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  stars: { flexDirection: 'row', gap: 2 },
  flex: { flex: 1 },
  reply: { gap: 2, padding: tokens.space[3], borderRadius: tokens.radius.md },
  replyBox: { gap: tokens.space[2] },
  input: {
    minHeight: 64,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space[3],
    fontFamily: 'Inter_400',
    fontSize: 16,
    textAlignVertical: 'top',
  },
});
