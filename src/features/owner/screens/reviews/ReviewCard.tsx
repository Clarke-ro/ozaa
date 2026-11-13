import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react-native';
import type { WrittenReview } from '@/lib/api/types';
import { STATUS_TONES } from '@/theme/palette';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { cardStyle } from '../../kit';

/**
 * One guest review (design canvas): initial, name, what stood out and the date, the stars on the
 * right, the note, then under a line either "Waiting for your reply" with a tinted Reply button
 * (which opens the reply box) or your reply.
 */
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
  const [writing, setWriting] = useState(false);
  const [draft, setDraft] = useState('');
  const date = new Date(review.createdAt).toLocaleDateString(i18n.language, {
    day: 'numeric',
    month: 'short',
  });
  const sub = [...(review.highlights ?? []).map((h) => t(`review.highlights.${h}`)), date].join(
    ' · ',
  );
  return (
    <View style={[cardStyle(theme), styles.card]}>
      <View style={styles.head}>
        <View style={[styles.avatar, { backgroundColor: theme.tint }]}>
          <Text style={[styles.initial, { color: theme.badgeInk }]}>
            {review.firstName.slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.name} numberOfLines={1}>
            {review.firstName}
          </Text>
          <Text style={[styles.sub, { color: theme.meta }]} numberOfLines={1}>
            {sub}
          </Text>
        </View>
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
      </View>
      {review.text ? <Text style={styles.text}>{review.text}</Text> : null}
      <View style={[styles.foot, { borderTopColor: theme.wash }]}>
        {review.reply ? (
          <View style={[styles.reply, { backgroundColor: theme.wash }]}>
            <Text style={[styles.sub, { color: theme.muted, fontFamily: fontFamily.strong }]}>
              {t('ownerReviews.yourReply')}
            </Text>
            <Text variant="body">{review.reply}</Text>
          </View>
        ) : writing ? (
          <View style={styles.replyBox}>
            <TextInput
              accessibilityLabel={t('ownerReviews.replyTo', { name: review.firstName })}
              value={draft}
              onChangeText={setDraft}
              placeholder={t('ownerReviews.replyHint')}
              placeholderTextColor={theme.meta}
              multiline
              autoFocus
              maxLength={500}
              style={[styles.input, { borderColor: theme.line, color: theme.text }]}
            />
            <View style={styles.actions}>
              <Button label={t('common.cancel')} tone="ghost" onPress={() => setWriting(false)} />
              <Button
                label={t('owner.sendReply')}
                tone="tinted"
                disabled={!draft.trim()}
                loading={sending}
                onPress={() => onReply(draft.trim())}
              />
            </View>
          </View>
        ) : (
          <View style={styles.waiting}>
            <Text style={[styles.waitText, { color: STATUS_TONES[theme.scheme].bill.line }]}>
              {t('ownerReviews.waiting')}
            </Text>
            <Button
              label={t('ownerReviews.reply')}
              tone="tinted"
              onPress={() => setWriting(true)}
              style={styles.short}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: tokens.owner.controls.cardPadding, gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { fontSize: 15, lineHeight: 20, fontFamily: fontFamily.strong },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontSize: 16, lineHeight: 22, fontFamily: fontFamily.strong },
  sub: { fontSize: 14, lineHeight: 20 },
  stars: { flexDirection: 'row', gap: 2 },
  text: { fontSize: 16, lineHeight: 24 },
  foot: { paddingTop: 14, borderTopWidth: 1 },
  waiting: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  waitText: { flex: 1, fontSize: 14, lineHeight: 20, fontFamily: fontFamily.strong },
  short: { minHeight: 44 },
  reply: { gap: 2, padding: tokens.space[3], borderRadius: tokens.radius.md },
  replyBox: { gap: tokens.space[2] },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: tokens.space[2] },
  input: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: tokens.owner.controls.cardRadius,
    padding: tokens.space[3],
    fontFamily: fontFamily.regular,
    fontSize: 15,
    textAlignVertical: 'top',
  },
});
