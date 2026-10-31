import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { Button } from '@/ui/Button';
import { PageHeader } from '@/ui/PageHeader';
import { SafeScreen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { ErrorState, LoadingState } from '@/ui/states';
import { useTheme } from '@/ui/theme';
import { useOffers, useVenue } from '@/features/venue';

export function SimpleScreen({ slug, kind }: { slug: string; kind: 'offers' | 'about' | 'feedback' | 'reserve' | 'events' }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const venue = useVenue(slug);
  const offers = useOffers(slug);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  if (venue.isLoading) return <LoadingState />;
  if (!venue.data) return <ErrorState onRetry={() => void venue.refetch()} />;
  const title = t(`services.${kind}.title`);
  return (
    <SafeScreen>
      <PageHeader title={title} subtitle={venue.data.name} />
      <View style={{ padding: 20, gap: 12 }}>
        {kind === 'offers'
          ? (offers.data?.items ?? []).map((offer) => (
              <View key={offer.id} style={[styles.card, { borderColor: theme.line }]}>
                <Text variant="body-strong">{offer.title.en}</Text>
                <Text variant="caption" style={{ color: theme.muted }}>{offer.detail?.en}</Text>
              </View>
            ))
          : null}
        {kind === 'about' ? (
          <>
            <Text variant="display-m">{venue.data.name}</Text>
            <Text variant="body">{venue.data.description.en}</Text>
            <Text variant="body">{venue.data.location.label}</Text>
          </>
        ) : null}
        {kind === 'reserve' || kind === 'events' ? (
          <>
            <Text variant="display-m">{title}</Text>
            <Text variant="body">{t('simple.coming')}</Text>
          </>
        ) : null}
        {kind === 'feedback' ? (
          <>
            <Text variant="display-m">{t('simple.feedback')}</Text>
            <Text variant="body" style={{ color: theme.muted }}>{t('simple.feedbackLead')}</Text>
            <TextInput accessibilityLabel={t('simple.feedback')} value={message} onChangeText={setMessage} multiline style={[styles.input, { borderColor: theme.line }]} />
            {sent ? <Text>{t('simple.sent')}</Text> : <Button label={t('simple.send')} onPress={() => { void api.sendFeedback({ message }).then(() => setSent(true)); }} />}
          </>
        ) : null}
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 4 },
  input: { borderWidth: 1, borderRadius: 12, minHeight: 96, padding: 12, textAlignVertical: 'top' },
});
