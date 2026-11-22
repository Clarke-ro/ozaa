import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react-native';
import { api } from '@/lib/api';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ChipRow, EmptyCard, toast } from '../../kit';
import { useOwnerLayout } from '../../chrome/layout';
import { RatingSummary } from './RatingSummary';
import { ReviewCard } from './ReviewCard';
import { ownerKeys } from '../../data/keys';

type Filter = 'reply' | 'replied' | 'all';
const FILTERS: readonly Filter[] = ['reply', 'replied', 'all'];

/**
 * Written reviews from guests (design canvas): the average and a bar per star level, chips for
 * needs a reply / replied / all, then one card per review, newest first.
 */
export function ReviewsScreen() {
  const { t } = useTranslation();
  const client = useQueryClient();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const [filter, setFilter] = useState<Filter>('reply');
  const { wide } = useOwnerLayout();
  const key = ownerKeys.reviews(venueId);
  const reviews = useQuery({
    queryKey: key,
    queryFn: () => api.ownerListWrittenReviews(venueId),
    enabled: Boolean(venueId),
  });

  const reply = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      api.ownerReplyToReview(id, { text }, { idempotencyKey: Crypto.randomUUID() }),
    onSuccess: () => {
      toast.success(t('ownerReviews.sent'));
      void client.invalidateQueries({ queryKey: key });
    },
    onError: () => toast.error(t('ownerKit.saveFailed')),
  });

  const all = [...(reviews.data?.items ?? [])].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  const open = all.filter((r) => !r.reply);
  const counts: Record<Filter, number> = {
    reply: open.length,
    replied: all.length - open.length,
    all: all.length,
  };
  const shown = filter === 'reply' ? open : filter === 'replied' ? all.filter((r) => r.reply) : all;

  return (
    <OwnerPage title={t('owner.reviews')} subtitle={t('ownerLead.reviews')}>
      <DeskWait
        loading={reviews.isPending}
        error={reviews.isError}
        onRetry={() => void reviews.refetch()}
      >
        <View style={styles.stack}>
          {all.length > 0 ? <RatingSummary reviews={all} wide={wide} /> : null}
          <View style={styles.list}>
            <ChipRow<Filter>
              label={t('ownerReviews.show')}
              value={filter}
              onChange={setFilter}
              items={FILTERS.map((id) => ({
                id,
                label: t(`ownerReviews.filter.${id}`),
                count: counts[id],
              }))}
            />
            {shown.length === 0 ? (
              <EmptyCard
                icon={Star}
                title={filter === 'reply' ? t('ownerReviews.allAnswered') : t('ownerReviews.empty')}
                description={t('ownerReviews.emptyBody')}
              />
            ) : (
              shown.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  sending={reply.isPending && reply.variables?.id === review.id}
                  onReply={(text) => reply.mutate({ id: review.id, text })}
                />
              ))
            )}
          </View>
        </View>
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  // Canvas: 56 px from the rating cards to the chips; 10 px between cards.
  stack: { gap: tokens.owner.controls.todayGap },
  list: { gap: tokens.owner.controls.listGap },
});
