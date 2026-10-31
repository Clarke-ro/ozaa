import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import * as Crypto from 'expo-crypto';
import { api } from '@/lib/api';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { DeskWait, OwnerPage } from '../chrome/OwnerPage';

const TABS = ['pending', 'featured', 'hidden', 'ratings'] as const;

export function ReviewsDeskScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const client = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]>('pending');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const videos = useQuery({
    queryKey: ['owner-reviews', venueId],
    queryFn: () => api.ownerListVideoReviews(venueId),
    enabled: Boolean(venueId),
  });
  const written = useQuery({
    queryKey: ['owner-written', venueId],
    queryFn: () => api.ownerListWrittenReviews(venueId),
    enabled: Boolean(venueId),
  });
  const moderate = useMutation({
    mutationFn: (input: { id: string; state: 'featured' | 'hidden' }) => api.ownerModerateVideoReview(input.id, { state: input.state }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['owner-reviews', venueId] }),
  });
  const send = useMutation({
    mutationFn: (id: string) => api.ownerReplyToReview(id, { text: drafts[id] ?? '' }, { idempotencyKey: Crypto.randomUUID() }),
    onSuccess: (_saved, id) => {
      setDrafts((current) => ({ ...current, [id]: '' }));
      void client.invalidateQueries({ queryKey: ['owner-written', venueId] });
    },
  });
  const labels = { pending: t('owner.toCheck'), featured: t('owner.featured'), hidden: t('owner.hidden'), ratings: t('owner.ratings') };

  return (
    <OwnerPage title={t('owner.reviews')}>
      <View style={styles.tabs}>
        {TABS.map((value) => (
          <Pressable key={value} accessibilityRole="button" onPress={() => setTab(value)} style={[styles.tab, { borderColor: tab === value ? theme.black : theme.line }]}>
            <Text variant="caption">{labels[value]}</Text>
          </Pressable>
        ))}
      </View>
      <DeskWait loading={videos.isLoading || written.isLoading} error={videos.isError} onRetry={() => void videos.refetch()}>
        {tab === 'ratings'
          ? (written.data?.items ?? []).map((review) => (
              <View key={review.id} style={{ gap: tokens.space[2] }}>
                <Text variant="body-strong">
                  {review.firstName} · {review.stars}
                </Text>
                {review.text ? <Text>{review.text}</Text> : null}
                {review.reply ? <Text variant="caption">{review.reply}</Text> : null}
                {review.stars <= 3 ? <Text variant="caption" style={{ color: theme.meta }}>{t('owner.privateReply')}</Text> : null}
                <TextInput
                  accessibilityLabel={t('owner.reply')}
                  value={drafts[review.id] ?? ''}
                  onChangeText={(text) => setDrafts((current) => ({ ...current, [review.id]: text }))}
                  style={[styles.input, { borderColor: theme.line, color: theme.text }]}
                />
                <Button label={t('owner.sendReply')} tone="secondary" onPress={() => send.mutate(review.id)} loading={send.isPending} />
              </View>
            ))
          : (videos.data?.items ?? [])
              .filter((video) => video.state === tab)
              .map((video) => (
                <View key={video.id} style={[styles.card, { borderColor: theme.line }]}>
                  <Text variant="body-strong">
                    {video.firstName} · {video.stars}
                  </Text>
                  {video.quote ? <Text>{video.quote}</Text> : null}
                  <Text variant="caption" style={{ color: theme.meta }}>
                    {Math.round(video.video.durationSeconds)}s. {video.featureConsent ? t('owner.canFeature') : t('owner.noFeature')}
                  </Text>
                  <View style={styles.actions}>
                    {video.featureConsent ? (
                      <Button label={t('owner.feature')} tone="secondary" onPress={() => moderate.mutate({ id: video.id, state: 'featured' })} loading={moderate.isPending} />
                    ) : null}
                    <Button label={t('owner.hide')} tone="ghost" onPress={() => moderate.mutate({ id: video.id, state: 'hidden' })} />
                  </View>
                </View>
              ))}
        {tab !== 'ratings' && (videos.data?.items ?? []).filter((video) => video.state === tab).length === 0 ? <Text>{t('owner.noReviews')}</Text> : null}
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[2] },
  tab: { minHeight: 44, paddingHorizontal: tokens.space[3], borderWidth: 1, borderRadius: tokens.radius.full, justifyContent: 'center' },
  card: { gap: tokens.space[2], borderWidth: 1, borderRadius: tokens.radius.md, padding: tokens.space[4] },
  actions: { gap: tokens.space[2] },
  input: { borderWidth: 1, borderRadius: tokens.radius.md, minHeight: 48, paddingHorizontal: tokens.space[3] },
});
