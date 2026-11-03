import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react-native';
import { api } from '@/lib/api';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { EmptyCard, Segmented, toast } from '../../kit';
import { ReviewCard } from './ReviewCard';
import { ownerKeys } from '../../data/keys';

type Filter = 'all' | 'reply';

/** Written reviews from guests, newest first, with the average and a reply on each. */
export function ReviewsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const client = useQueryClient();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const [filter, setFilter] = useState<Filter>('all');
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
  const shown = filter === 'reply' ? open : all;
  const average = all.length ? all.reduce((sum, r) => sum + r.stars, 0) / all.length : null;

  return (
    <OwnerPage title={t('owner.reviews')}>
      <DeskWait
        loading={reviews.isLoading}
        error={reviews.isError}
        onRetry={() => void reviews.refetch()}
      >
        {average != null ? (
          <View
            style={styles.summary}
            accessible
            accessibilityLabel={t('ownerReviews.summaryA11y', {
              avg: average.toFixed(1),
              count: all.length,
            })}
          >
            <Star size={22} color={theme.ink} fill={theme.ink} />
            <Text variant="display-m">{average.toFixed(1)}</Text>
            <Text variant="body" style={{ color: theme.muted }}>
              {t('ownerReviews.count', { count: all.length })}
            </Text>
          </View>
        ) : null}
        <Segmented<Filter>
          label={t('ownerReviews.show')}
          value={filter}
          onChange={setFilter}
          options={[
            { id: 'all', label: t('ownerReviews.all') },
            { id: 'reply', label: t('ownerReviews.needsReply', { count: open.length }) },
          ]}
        />
        {shown.length === 0 ? (
          <EmptyCard
            icon={Star}
            title={filter === 'reply' ? t('ownerReviews.allAnswered') : t('ownerReviews.empty')}
            description={t('ownerReviews.emptyBody')}
          />
        ) : (
          <View style={styles.list}>
            {shown.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                sending={reply.isPending && reply.variables?.id === review.id}
                onReply={(text) => reply.mutate({ id: review.id, text })}
              />
            ))}
          </View>
        )}
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  list: { gap: tokens.space[3] },
});
