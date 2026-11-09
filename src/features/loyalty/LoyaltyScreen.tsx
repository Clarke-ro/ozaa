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
import { Phone, Trash2 } from 'lucide-react-native';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { PageHeader } from '@/ui/PageHeader';
import { SafeScreen } from '@/ui/Screen';
import { tokens } from '@/theme/tokens';
import { ActivityList } from './ActivityList';
import { CardAction } from './CardAction';
import { ClaimBox } from './ClaimBox';
import { programmeFromWire, walletFromWire } from './facts';
import { HowToEarn } from './HowToEarn';
import { LoyaltyIntro } from './LoyaltyIntro';
import { RewardsList } from './RewardsList';
import { LoyaltyJoinCard } from './LoyaltyJoinCard';
import { WalletCard } from './WalletCard';
import { guestKeys } from '@/lib/queryKeys';
import { DEMO_CODE, DEMO_LOYALTY_PHONES } from '@/mocks/demo';

const CONSENT = 'consent-2026-10-v1';

export function LoyaltyScreen({ slug }: { slug: string }) {
  const { t } = useTranslation();
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
  // The join form waits until the guest asks for it, so the page leads with what they get.
  const [joining, setJoining] = useState(false);
  // Deleting a card can't be undone, so it asks first.
  const [confirmLeave, setConfirmLeave] = useState(false);

  const programQuery = useQuery({
    queryKey: guestKeys.loyaltyProgram(slug),
    queryFn: () => api.getVenueLoyaltyProgram(slug),
  });

  const cardQuery = useQuery({
    queryKey: guestKeys.loyaltyCard(slug, token),
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
      queryClient.setQueryData(guestKeys.loyaltyCard(slug, tokens.accessToken), saved);
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
      queryClient.setQueryData(guestKeys.loyaltyCard(slug, token), updated);
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
      void queryClient.removeQueries({ queryKey: guestKeys.loyaltyVenue(slug) });
    },
    onSuccess: () => {
      setConfirmLeave(false);
      // Back to the start: the card is gone, so the page offers Join again.
      setJoining(false);
    },
  });

  const openSample = async () => {
    setErrorMessage(null);
    // Demo builds only (the button shows only then): this venue's sample member.
    const sample = DEMO_LOYALTY_PHONES[slug] ?? DEMO_LOYALTY_PHONES['mamas-kitchen'] ?? '';
    const tokens = await api.verifyOtp({
      phone: sample,
      code: DEMO_CODE,
      purpose: 'guest_loyalty',
    });
    setLoyaltyToken(tokens.accessToken);
    const existing = await api.getMyLoyaltyCard(slug);
    setJoinedCard(existing);
    queryClient.setQueryData(guestKeys.loyaltyCard(slug, tokens.accessToken), existing);
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
              rewardCosts={programme.rewards.map((reward) => reward.cost)}
              flipped={flipped}
              onFlip={() => setFlipped((value) => !value)}
            />
            {wallet.liveClaim ? <ClaimBox claim={wallet.liveClaim} /> : null}
            <RewardsList
              programme={programme}
              wallet={wallet}
              redeemingId={redeem.isPending ? (redeem.variables ?? null) : null}
              onRedeem={(rewardId) => redeem.mutate(rewardId)}
            />
            <HowToEarn programme={programme} gameMinScore={gameMinScore} />
            <ActivityList history={wallet.history} programme={programme} />
            <View style={styles.actions}>
              <CardAction
                icon={Phone}
                label={t('loyalty.switchPhone')}
                onPress={() => {
                  setJoinedCard(null);
                  setLoyaltyToken(null);
                  setSent(false);
                }}
              />
              <CardAction
                icon={Trash2}
                tone="danger"
                label={t('loyalty.leave')}
                onPress={() => {
                  leave.reset();
                  setConfirmLeave(true);
                }}
              />
            </View>
          </>
        ) : (
          <>
            {joining ? (
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
            ) : (
              <LoyaltyIntro venueName={placeName} onJoin={() => setJoining(true)} />
            )}
            {/* Rewards and tiers only mean something once you have a card, so a visitor sees how to earn. */}
            {programme ? <HowToEarn programme={programme} gameMinScore={gameMinScore} /> : null}
          </>
        )}
      </ScrollView>
      <ConfirmDialog
        visible={confirmLeave}
        destructive
        title={t('loyalty.leaveTitle')}
        message={
          leave.isError ? t('loyalty.leaveFailed') : t('loyalty.leaveBody', { venue: placeName })
        }
        confirmLabel={t('loyalty.leaveConfirm')}
        loading={leave.isPending}
        onConfirm={() => leave.mutate()}
        onCancel={() => setConfirmLeave(false)}
      />
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: tokens.grid.mobile.margin,
    gap: tokens.space[6],
    paddingBottom: tokens.space[12],
  },
  actions: { gap: tokens.space[3] },
});
