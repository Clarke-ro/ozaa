import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { LoyaltyCard } from '@/lib/api/types';
import { asGhanaPhone, countryForVenue, parsePhone } from '@/lib/phone';
import { useVenue } from '@/features/venue';
import { useGuestSession } from '@/features/session';
import { Button } from '@/ui/Button';
import { PageHeader } from '@/ui/PageHeader';
import { SafeScreen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { programmeFromWire, walletFromWire } from './facts';
import { LoyaltyDetails } from './LoyaltyDetails';
import { LoyaltyJoinCard } from './LoyaltyJoinCard';
import { WalletCard } from './WalletCard';

const CONSENT = 'consent-2026-10-v1';

function defaultSamplePhone(slug: string): string {
  if (slug === 'bean-there') return '+233204000099';
  if (slug === 'auntie-akos') return '+233274000099';
  return '+233244000099';
}

export function LoyaltyScreen({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const setLoyaltyToken = useGuestSession((state) => state.setLoyaltyToken);
  const token = useGuestSession((state) => state.loyaltyToken);
  const venue = useVenue(slug);
  const country = countryForVenue({
    timezone: venue.data?.hours.timezone,
    currency: venue.data?.currency,
  });

  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [loyaltyBox, setLoyaltyBox] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [joinedCard, setJoinedCard] = useState<LoyaltyCard | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const programQuery = useQuery({
    queryKey: ['loyalty-program', slug],
    queryFn: () => api.getVenueLoyaltyProgram(slug),
  });

  const cardQuery = useQuery({
    queryKey: ['loyalty', slug, token],
    queryFn: () => api.getMyLoyaltyCard(slug),
    enabled: Boolean(token),
    retry: false,
  });

  const request = useMutation({
    mutationFn: async () => {
      setErrorMessage(null);
      const parsed = asGhanaPhone(parsePhone(phone, country));
      if (!parsed) throw new Error('Enter a valid phone number');
      await api.requestOtp({ phone: parsed, purpose: 'guest_loyalty' });
      setSent(true);
    },
    onError: (err) => setErrorMessage(err instanceof Error ? err.message : t('errors.generic')),
  });

  const verify = useMutation({
    mutationFn: async () => {
      setErrorMessage(null);
      const parsed = asGhanaPhone(parsePhone(phone, country));
      if (!parsed) throw new Error('Enter a valid phone number');
      const tokens = await api.verifyOtp({ phone: parsed, code, purpose: 'guest_loyalty' });
      setLoyaltyToken(tokens.accessToken);
      const cleanName = firstName.trim();
      const cleanBirthday = /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.test(birthday.trim())
        ? birthday.trim()
        : undefined;
      const saved = await api.joinLoyalty(slug, {
        firstName: cleanName ? cleanName : undefined,
        birthdayMonthDay: cleanBirthday,
        consent: { loyalty: true, marketing, textVersion: CONSENT },
      });
      setJoinedCard(saved);
      queryClient.setQueryData(['loyalty', slug, tokens.accessToken], saved);
      return saved;
    },
    onError: (err) => setErrorMessage(err instanceof Error ? err.message : t('errors.generic')),
  });

  const redeem = useMutation({
    mutationFn: async (rewardId: string) => {
      const updated = await api.redeemReward(
        slug,
        { rewardId },
        { idempotencyKey: Crypto.randomUUID() },
      );
      setJoinedCard(updated);
      setFlipped(true);
      queryClient.setQueryData(['loyalty', slug, token], updated);
      return updated;
    },
  });

  const leave = useMutation({
    mutationFn: async () => {
      await api.leaveLoyalty(slug);
      setJoinedCard(null);
      setLoyaltyToken(null);
      setSent(false);
      setCode('');
      void queryClient.removeQueries({ queryKey: ['loyalty', slug] });
    },
  });

  const openSample = async () => {
    setErrorMessage(null);
    const sample = defaultSamplePhone(slug);
    const tokens = await api.verifyOtp({ phone: sample, code: '123456', purpose: 'guest_loyalty' });
    setLoyaltyToken(tokens.accessToken);
    const existing = await api.getMyLoyaltyCard(slug);
    setJoinedCard(existing);
    queryClient.setQueryData(['loyalty', slug, tokens.accessToken], existing);
  };

  const wireCard = cardQuery.data ?? joinedCard;
  const nowIso = new Date().toISOString();
  const wallet = wireCard ? walletFromWire(wireCard, nowIso, slug) : null;
  const programme = wireCard
    ? programmeFromWire(wireCard.programme)
    : programQuery.data
      ? programmeFromWire(programQuery.data)
      : null;
  const placeName = venue.data?.name ?? slug;
  const initials = venue.data?.initials ?? placeName.slice(0, 2).toUpperCase();
  const gameMinScore = venue.data?.game?.enabled ? venue.data.game.minScore : null;

  return (
    <SafeScreen>
      <PageHeader title={t('loyalty.title')} subtitle={placeName} />
      <ScrollView contentContainerStyle={styles.page}>
        {wallet && programme ? (
          <>
            <WalletCard
              venueName={placeName}
              venueInitials={initials}
              wallet={wallet}
              flipped={flipped}
              onFlip={() => setFlipped((value) => !value)}
            />
            <LoyaltyDetails
              programme={programme}
              wallet={wallet}
              gameMinScore={gameMinScore}
              redeemingId={redeem.isPending ? (redeem.variables ?? null) : null}
              onRedeem={(rewardId) => redeem.mutate(rewardId)}
            />
            <View style={[styles.privacyBox, { borderColor: theme.line }]}>
              <Text variant="caption" style={{ color: theme.meta }}>
                {t('loyalty.privacyNote')}
              </Text>
              <View style={styles.privacyActions}>
                <Button
                  label={t('loyalty.switchPhone')}
                  tone="secondary"
                  onPress={() => {
                    setJoinedCard(null);
                    setLoyaltyToken(null);
                    setSent(false);
                  }}
                />
                <Button
                  label={t('loyalty.leave')}
                  tone="ghost"
                  loading={leave.isPending}
                  onPress={() => leave.mutate()}
                />
              </View>
            </View>
          </>
        ) : (
          <>
            <LoyaltyJoinCard
              venueName={placeName}
              firstName={firstName}
              onFirstName={setFirstName}
              phone={phone}
              onPhone={setPhone}
              birthday={birthday}
              onBirthday={setBirthday}
              code={code}
              onCode={setCode}
              sent={sent}
              loyaltyBox={loyaltyBox}
              onToggleLoyalty={() => setLoyaltyBox((value) => !value)}
              marketing={marketing}
              onToggleMarketing={() => setMarketing((value) => !value)}
              sending={request.isPending}
              verifying={verify.isPending}
              errorMessage={errorMessage}
              onSendCode={() => request.mutate()}
              onConfirm={() => verify.mutate()}
              onOpenSample={() => void openSample()}
            />
            {programme ? (
              <LoyaltyDetails
                programme={programme}
                wallet={null}
                gameMinScore={gameMinScore}
                redeemingId={null}
              />
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, gap: 20, paddingBottom: 48 },
  privacyBox: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  privacyActions: { gap: 8 },
});
