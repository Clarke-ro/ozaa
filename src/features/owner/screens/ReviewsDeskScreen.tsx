import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import * as Crypto from 'expo-crypto';
import { Play, Star } from 'lucide-react-native';
import { api } from '@/lib/api';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { DeskWait, OwnerPage } from '../chrome/OwnerPage';
import { DeskCard, DeskTabs, Field, StatusPill } from '../kit';

type ReviewTab = 'pending' | 'featured' | 'hidden' | 'ratings';

export function ReviewsDeskScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const client = useQueryClient();

  const [tab, setTab] = useState<ReviewTab>('pending');
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
    mutationFn: (input: { id: string; state: 'featured' | 'hidden' }) =>
      api.ownerModerateVideoReview(input.id, { state: input.state }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['owner-reviews', venueId] }),
  });

  const send = useMutation({
    mutationFn: (id: string) =>
      api.ownerReplyToReview(
        id,
        { text: drafts[id] ?? '' },
        { idempotencyKey: Crypto.randomUUID() }
      ),
    onSuccess: (_saved, id) => {
      setDrafts((current) => ({ ...current, [id]: '' }));
      void client.invalidateQueries({ queryKey: ['owner-written', venueId] });
    },
  });

  const allVideos = videos.data?.items ?? [];
  const pendingCount = allVideos.filter((v) => v.state === 'pending').length;
  const featuredCount = allVideos.filter((v) => v.state === 'featured').length;
  const hiddenCount = allVideos.filter((v) => v.state === 'hidden').length;
  const writtenCount = written.data?.items?.length ?? 0;

  const tabs = [
    { id: 'pending' as const, label: t('owner.toCheck'), count: pendingCount },
    { id: 'featured' as const, label: t('owner.featured'), count: featuredCount },
    { id: 'hidden' as const, label: t('owner.hidden'), count: hiddenCount },
    { id: 'ratings' as const, label: t('owner.ratings'), count: writtenCount },
  ];

  const currentVideos = allVideos.filter((v) => v.state === tab);

  return (
    <OwnerPage
      title={t('owner.reviews')}
      subtitle="Guests only appear here if they agreed to be featured. Featured videos show as story circles on your guest page."
    >
      <DeskTabs tabs={tabs} value={tab} onChange={setTab} />

      <DeskWait
        loading={videos.isLoading || written.isLoading}
        error={videos.isError}
        onRetry={() => void videos.refetch()}
      >
        <View style={styles.stack}>
          {tab === 'ratings' ? (
            /* Written Ratings Tab */
            <>
              {(written.data?.items ?? []).length === 0 ? (
                <Text variant="body" style={{ color: theme.muted }}>
                  {t('owner.noReviews')}
                </Text>
              ) : null}

              {(written.data?.items ?? []).map((review) => {
                const isLow = review.stars <= 3;
                return (
                  <DeskCard key={review.id} style={styles.reviewCard}>
                    <View style={styles.cardHeader}>
                      <View>
                        <Text variant="title">{review.firstName}</Text>
                        <View style={styles.starsRow}>
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star
                              key={i}
                              size={16}
                              color={i <= review.stars ? '#F59E0B' : theme.line}
                              fill={i <= review.stars ? '#F59E0B' : 'transparent'}
                            />
                          ))}
                        </View>
                      </View>
                      <StatusPill
                        label={isLow ? 'Private rating' : 'Public'}
                        tone={isLow ? 'waiting' : 'success'}
                        boxed
                        icon={false}
                      />
                    </View>

                    {review.text ? (
                      <Text variant="body" style={styles.quoteText}>
                        &ldquo;{review.text}&rdquo;
                      </Text>
                    ) : null}

                    {review.reply ? (
                      <View style={[styles.replyBox, { backgroundColor: theme.wash }]}>
                        <Text variant="caption" style={{ color: theme.meta }}>
                          Your reply:
                        </Text>
                        <Text variant="body">{review.reply}</Text>
                      </View>
                    ) : (
                      <View style={styles.replyForm}>
                        {isLow ? (
                          <Text variant="caption" style={{ color: theme.meta }}>
                            {t('owner.privateReply')}
                          </Text>
                        ) : null}
                        <Field
                          label=""
                          placeholder="Type a reply to this guest..."
                          value={drafts[review.id] ?? ''}
                          onChangeText={(text) =>
                            setDrafts((curr) => ({ ...curr, [review.id]: text }))
                          }
                        />
                        <Button
                          label={t('owner.sendReply')}
                          tone="secondary"
                          onPress={() => send.mutate(review.id)}
                          loading={send.isPending}
                        />
                      </View>
                    )}
                  </DeskCard>
                );
              })}
            </>
          ) : (
            /* Video Reviews Tabs */
            <>
              {currentVideos.length === 0 ? (
                <Text variant="body" style={{ color: theme.muted }}>
                  {t('owner.noReviews')}
                </Text>
              ) : null}

              {currentVideos.map((video) => {
                const seconds = Math.round(video.video.durationSeconds);
                const duration = `0:${seconds < 10 ? '0' : ''}${seconds}`;

                return (
                  <DeskCard key={video.id} style={styles.reviewCard}>
                    <View style={styles.cardHeader}>
                      <View style={styles.reviewerInfo}>
                        <Text variant="title">{video.firstName}</Text>
                        <View style={styles.starsRow}>
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star
                              key={i}
                              size={16}
                              color={i <= video.stars ? '#F59E0B' : theme.line}
                              fill={i <= video.stars ? '#F59E0B' : 'transparent'}
                            />
                          ))}
                        </View>
                      </View>

                      <StatusPill
                        label={
                          video.featureConsent ? 'Agreed to feature' : 'Private only'
                        }
                        tone={video.featureConsent ? 'success' : 'neutral'}
                        boxed
                        icon={video.featureConsent}
                      />
                    </View>

                    {/* Video preview thumbnail representation */}
                    <View style={styles.videoContentRow}>
                      <View style={[styles.videoThumb, { backgroundColor: theme.black }]}>
                        <View style={styles.playIconCircle}>
                          <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
                        </View>
                        <View style={styles.durationPill}>
                          <Text variant="caption" style={styles.durationText}>
                            {duration}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.videoDetails}>
                        <Text variant="caption" style={{ color: theme.meta }}>
                          Ordered Jollof &amp; chicken
                        </Text>
                        {video.quote ? (
                          <Text variant="body-strong" style={styles.quoteText}>
                            &ldquo;{video.quote}&rdquo;
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    {/* Moderation Actions */}
                    <View style={styles.actionsRow}>
                      {tab !== 'hidden' ? (
                        <Button
                          label={t('owner.hide')}
                          tone="secondary"
                          onPress={() => moderate.mutate({ id: video.id, state: 'hidden' })}
                          loading={moderate.isPending}
                          style={styles.actionBtn}
                        />
                      ) : null}

                      {video.featureConsent && tab !== 'featured' ? (
                        <Button
                          label={t('owner.feature')}
                          tone="primary"
                          onPress={() => moderate.mutate({ id: video.id, state: 'featured' })}
                          loading={moderate.isPending}
                          style={styles.actionBtn}
                        />
                      ) : null}
                    </View>
                  </DeskCard>
                );
              })}
            </>
          )}
        </View>
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[4], marginTop: tokens.space[2] },
  reviewCard: { gap: tokens.space[3] },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: tokens.space[2],
  },
  reviewerInfo: { gap: 2 },
  starsRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  videoContentRow: {
    flexDirection: 'row',
    gap: tokens.space[3],
    alignItems: 'center',
  },
  videoThumb: {
    width: 88,
    height: 110,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  playIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 2,
  },
  durationPill: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'Inter_600',
  },
  videoDetails: {
    flex: 1,
    gap: tokens.space[1],
  },
  quoteText: {
    fontStyle: 'italic',
    lineHeight: 22,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: tokens.space[3],
    paddingTop: tokens.space[2],
    borderTopWidth: 1,
    borderTopColor: '#F4F4F5',
  },
  actionBtn: {
    flex: 1,
  },
  replyBox: {
    padding: tokens.space[3],
    borderRadius: tokens.radius.md,
    gap: 4,
  },
  replyForm: {
    gap: tokens.space[2],
  },
});
