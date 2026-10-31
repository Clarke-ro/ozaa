import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { parseGhanaPhone } from '@/lib/phone';
import { useGuestSession } from '@/features/session';
import { stampsLeftPhrase } from './loyaltyRules';
import { Button } from '@/ui/Button';
import { PageHeader } from '@/ui/PageHeader';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

const CONSENT = 'consent-2026-10-v1';

export function LoyaltyScreen({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const setLoyaltyToken = useGuestSession((state) => state.setLoyaltyToken);
  const token = useGuestSession((state) => state.loyaltyToken);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [loyaltyBox, setLoyaltyBox] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const card = useQuery({
    queryKey: ['loyalty', slug, token],
    queryFn: () => api.getMyLoyaltyCard(slug),
    enabled: Boolean(token),
    retry: false,
  });
  const request = useMutation({
    mutationFn: async () => {
      const parsed = parseGhanaPhone(phone);
      if (!parsed) throw new Error('phone');
      await api.requestOtp({ phone: parsed.phone, purpose: 'guest_loyalty' });
      setSent(true);
    },
  });
  const verify = useMutation({
    mutationFn: async () => {
      const parsed = parseGhanaPhone(phone);
      if (!parsed) throw new Error('phone');
      const tokens = await api.verifyOtp({ phone: parsed.phone, code, purpose: 'guest_loyalty' });
      setLoyaltyToken(tokens.accessToken);
      return api.joinLoyalty(slug, { consent: { loyalty: true, marketing, textVersion: CONSENT } });
    },
  });

  return (
    <View style={{ flex: 1, backgroundColor: theme.white }}>
      <PageHeader title={t('loyalty.title')} />
      <View style={{ padding: 20, gap: 12 }}>
        {card.data ? (
          <View style={[styles.card, { backgroundColor: theme.fill }]}>
            <Text variant="display-m" style={{ color: theme.onFill }}>{card.data.stamps}/{card.data.stampsNeeded}</Text>
            <Text variant="body" style={{ color: theme.onFill }}>{stampsLeftPhrase(card.data.stamps, card.data.stampsNeeded)}</Text>
            <Text variant="caption" style={{ color: theme.onFill }}>{card.data.reward.title}</Text>
          </View>
        ) : (
          <>
            <TextInput accessibilityLabel={t('loyalty.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder={t('loyalty.phone')} style={[styles.input, { borderColor: theme.line }]} />
            {sent ? <TextInput accessibilityLabel={t('loyalty.code')} value={code} onChangeText={setCode} keyboardType="number-pad" placeholder={t('loyalty.code')} style={[styles.input, { borderColor: theme.line }]} /> : null}
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: loyaltyBox }} onPress={() => setLoyaltyBox((value) => !value)}>
              <Text>{loyaltyBox ? '☑ ' : '☐ '}{t('loyalty.consent')}</Text>
            </Pressable>
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: marketing }} onPress={() => setMarketing((value) => !value)}>
              <Text>{marketing ? '☑ ' : '☐ '}{t('loyalty.marketing')}</Text>
            </Pressable>
            {sent ? (
              <Button label={t('loyalty.confirm')} disabled={!loyaltyBox} loading={verify.isPending} onPress={() => verify.mutate()} />
            ) : (
              <Button label={t('loyalty.sendCode')} loading={request.isPending} onPress={() => request.mutate()} />
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 18, gap: 8 },
  input: { borderWidth: 1, borderRadius: 12, height: 48, paddingHorizontal: 12 },
});
