import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { useVenue } from '@/features/venue';
import { Button } from '@/ui/Button';
import { PageHeader } from '@/ui/PageHeader';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

const HIGHLIGHTS = ['food', 'service', 'speed', 'value', 'vibe'] as const;

export function ReviewScreen({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const venue = useVenue(slug);
  const [stars, setStars] = useState(4);
  const [picked, setPicked] = useState<string[]>(['food']);
  const [text, setText] = useState('');
  const [done, setDone] = useState<{ google: string | null } | null>(null);

  return (
    <View style={{ flex: 1, backgroundColor: theme.white }}>
      <PageHeader title={t('review.title')} subtitle={venue.data?.name} />
      <View style={{ padding: 20, gap: 12 }}>
        <Text variant="display-m" style={{ textAlign: 'center' }}>{t('review.how')}</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((value) => (
            <Pressable key={value} accessibilityRole="button" accessibilityLabel={`${value}`} onPress={() => setStars(value)}>
              <Text variant="display-m" style={{ color: value <= stars ? theme.fill : theme.line }}>★</Text>
            </Pressable>
          ))}
        </View>
        <Text variant="body-strong">{t('review.stoodOut')}</Text>
        <View style={styles.row}>
          {HIGHLIGHTS.map((item) => {
            const on = picked.includes(item);
            return (
              <Pressable key={item} accessibilityRole="button" onPress={() => setPicked((current) => (on ? current.filter((value) => value !== item) : [...current, item]))} style={[styles.chip, { backgroundColor: on ? theme.fill : theme.white, borderColor: theme.line }]}>
                <Text variant="caption" style={{ color: on ? theme.onFill : theme.text }}>{t(`review.highlights.${item}`)}</Text>
              </Pressable>
            );
          })}
        </View>
        <TextInput accessibilityLabel={t('review.more')} value={text} onChangeText={setText} multiline placeholder={t('review.more')} style={[styles.input, { borderColor: theme.line }]} />
        <Pressable accessibilityRole="button" onPress={() => router.push(`/${slug}/review/record`)}>
          <Text variant="body-strong">{t('review.video')}</Text>
          <Text variant="caption" style={{ color: theme.muted }}>{t('review.videoBody')}</Text>
        </Pressable>
        {done?.google ? <Text>{t('review.google')}</Text> : null}
        {done && !done.google ? <Text>{t('review.private')}</Text> : null}
        <Button
          label={t('review.post')}
          onPress={() => {
            void api
              .createReview(
                { stars, highlights: picked as ('food' | 'service' | 'speed' | 'value' | 'vibe')[], text },
                { idempotencyKey: Crypto.randomUUID() },
              )
              .then((result) => setDone({ google: result.googleReviewUrl }));
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, height: 36, justifyContent: 'center' },
  input: { borderWidth: 1, borderRadius: 12, minHeight: 88, padding: 12 },
});
