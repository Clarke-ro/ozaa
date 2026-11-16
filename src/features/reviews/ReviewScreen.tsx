import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { useTranslation } from 'react-i18next';
import { CircleCheck, Star } from 'lucide-react-native';
import { api } from '@/lib/api';
import { useVenue } from '@/features/venue';
import { Button } from '@/ui/Button';
import { PageHeader } from '@/ui/PageHeader';
import { SafeScreen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { guestHomeHref, useGuestSession } from '@/features/session';

const HIGHLIGHTS = ['food', 'service', 'speed', 'value', 'vibe'] as const;
type Highlight = (typeof HIGHLIGHTS)[number];

/** A written review: stars (required), what stood out, and an optional note. Every guest is thanked the same way. */
export function ReviewScreen({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  // Back to this guest's own home: their table, or the online menu.
  const tableCode = useGuestSession((state) => (state.slug === slug ? state.tableCode : null));
  const venue = useVenue(slug);
  // Nothing is chosen for the guest: a pre-filled rating would nudge the score.
  const [stars, setStars] = useState(0);
  const [picked, setPicked] = useState<Highlight[]>([]);
  const [text, setText] = useState('');
  // One key per review, so a double tap or a retry after a timeout never posts it twice.
  const [key] = useState(() => Crypto.randomUUID());

  const post = useMutation({
    mutationFn: () =>
      api.createReview(
        { stars, highlights: picked, text: text.trim() || undefined },
        { idempotencyKey: key },
      ),
  });

  if (post.isSuccess) {
    return (
      <SafeScreen>
        <PageHeader title={t('review.title')} subtitle={venue.data?.name} />
        <View style={styles.done}>
          <CircleCheck size={48} color={theme.success} />
          <Text variant="title" style={styles.center}>
            {t('review.thanks')}
          </Text>
          <Text variant="body" style={[styles.center, { color: theme.muted }]}>
            {t('review.thanksBody', { venue: venue.data?.name ?? '' })}
          </Text>
          <Button
            label={t('review.backHome')}
            tone="secondary"
            onPress={() => router.replace(guestHomeHref(slug, tableCode))}
          />
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <PageHeader title={t('review.title')} subtitle={venue.data?.name} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text variant="title" style={styles.center}>
          {t('review.how')}
        </Text>
        <View
          style={styles.stars}
          accessibilityRole="radiogroup"
          accessibilityLabel={t('review.how')}
        >
          {[1, 2, 3, 4, 5].map((value) => (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityLabel={t('review.starsA11y', { count: value })}
              aria-checked={value === stars}
              onPress={() => setStars(value)}
              style={styles.star}
            >
              <Star
                size={36}
                color={value <= stars ? theme.fill : theme.line}
                fill={value <= stars ? theme.fill : 'transparent'}
              />
            </Pressable>
          ))}
        </View>
        <Text variant="body-strong">{t('review.stoodOut')}</Text>
        <View style={styles.row}>
          {HIGHLIGHTS.map((item) => {
            const on = picked.includes(item);
            return (
              <Pressable
                key={item}
                accessibilityRole="checkbox"
                aria-checked={on}
                onPress={() =>
                  setPicked((current) =>
                    on ? current.filter((v) => v !== item) : [...current, item],
                  )
                }
                style={[
                  styles.chip,
                  {
                    backgroundColor: on ? theme.tint : theme.white,
                    borderColor: on ? theme.ink : theme.line,
                  },
                ]}
              >
                <Text variant="body" style={{ color: on ? theme.badgeInk : theme.text }}>
                  {t(`review.highlights.${item}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <TextInput
          accessibilityLabel={t('review.more')}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
          placeholder={t('review.more')}
          placeholderTextColor={theme.meta}
          style={[
            styles.input,
            { borderColor: theme.line, color: theme.text, backgroundColor: theme.surface },
          ]}
        />
        {post.isError ? (
          <Text variant="body" accessibilityLiveRegion="polite" style={{ color: theme.error }}>
            {t('review.failed')}
          </Text>
        ) : null}
        <Button
          label={t('review.post')}
          disabled={stars === 0}
          loading={post.isPending}
          onPress={() => post.mutate()}
        />
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 16 },
  center: { textAlign: 'center' },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 4 },
  star: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    minHeight: 40,
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 96,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter_400',
    textAlignVertical: 'top',
  },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
});
