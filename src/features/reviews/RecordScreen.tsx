import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useVenue } from '@/features/venue';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

export function RecordScreen({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const venue = useVenue(slug);
  const [consent, setConsent] = useState(true);
  const [seconds, setSeconds] = useState(0);
  return (
    <View style={[styles.page, { backgroundColor: theme.black }]}>
      <Text variant="body" style={styles.light}>{t('review.hint')}</Text>
      <Text variant="display-m" style={styles.light}>{`0:${String(seconds).padStart(2, '0')} / 0:30`}</Text>
      <Text variant="caption" style={styles.light}>{t('review.consent', { name: venue.data?.name ?? '' })}</Text>
      <Button label={consent ? t('review.done') : t('review.done')} disabled={seconds < 15} onPress={() => setSeconds((value) => Math.min(30, value + 15))} />
      <Button label={t('common.sample')} tone="secondary" onPress={() => setConsent((value) => !value)} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: 'flex-end', padding: 20, gap: 12 },
  light: { color: '#fff' },
});
