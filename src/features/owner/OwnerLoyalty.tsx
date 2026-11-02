import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, setAccessToken } from '@/lib/api';
import { walletFromWire } from '@/features/loyalty';
import { useOwnerSession } from '@/features/session';
import { Button } from '@/ui/Button';
import { SafeScreen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { ozaaTheme, ThemeProvider, useTheme } from '@/ui/theme';
import { OwnerLoyaltySetup } from './OwnerLoyaltySetup';

const VENUES = [
  { id: 'ven_mamas', slug: 'mamas-kitchen', label: "Mama's Kitchen", phone: '+233240000001' },
  { id: 'ven_bean', slug: 'bean-there', label: 'Bean There', phone: '+233240000004' },
  { id: 'ven_akos', slug: 'auntie-akos', label: "Auntie Ako's", phone: '+233240000005' },
] as const;

export function OwnerLoyalty() {
  return (
    <ThemeProvider theme={ozaaTheme}>
      <OwnerLoyaltyBody />
    </ThemeProvider>
  );
}

function OwnerLoyaltyBody() {
  const { t } = useTranslation();
  const theme = useTheme();
  const client = useQueryClient();
  const sessionVenueId = useOwnerSession((state) => state.venueId);
  const accessToken = useOwnerSession((state) => state.accessToken);
  const saveOwner = useOwnerSession((state) => state.saveOwner);
  const venueId = sessionVenueId ?? 'ven_mamas';
  const currentVenue = VENUES.find((v) => v.id === venueId) ?? VENUES[0];
  const venueSlug = currentVenue.slug;

  const [code, setCode] = useState('');
  const [confirmNote, setConfirmNote] = useState<string | null>(null);

  const ensureOwnerAuth = () => {
    setAccessToken(accessToken ?? `acc_owner_login_${currentVenue.phone}`);
  };

  const loyalty = useQuery({
    queryKey: ['owner-loyalty', venueId],
    queryFn: () => {
      ensureOwnerAuth();
      return api.ownerGetLoyalty(venueId);
    },
  });
  const membersQuery = useQuery({
    queryKey: ['owner-loyalty-members', venueId],
    queryFn: () => {
      ensureOwnerAuth();
      return api.ownerListLoyaltyMembers(venueId);
    },
  });

  const nowIso = new Date().toISOString();

  const confirm = useMutation({
    mutationFn: (claimCode: string) => {
      ensureOwnerAuth();
      return api.ownerConfirmRedemption(venueId, { code: claimCode.trim().toUpperCase() });
    },
    onSuccess: (card) => {
      const wallet = walletFromWire(card, new Date().toISOString(), venueSlug);
      const latestConfirm = [...card.member.facts]
        .reverse()
        .find((f) => f.kind === 'confirm');
      const rewardTitle =
        latestConfirm && latestConfirm.kind === 'confirm'
          ? latestConfirm.title
          : (card.programme.rewards[0]?.title ?? 'Reward');
      setConfirmNote(
        t('owner.loyaltyConfirmed', {
          title: rewardTitle,
          name: `${card.member.firstName ?? card.member.phoneMasked} (${wallet.progress.balance} left)`,
        }),
      );
      setCode('');
      void client.invalidateQueries({ queryKey: ['owner-loyalty-members', venueId] });
      void client.invalidateQueries({ queryKey: ['loyalty'] });
    },
    onError: () => setConfirmNote(t('owner.loyaltyCodeNotFound')),
  });

  const cards = membersQuery.data?.items ?? [];
  const projected = cards.map((card) => ({
    card,
    wallet: walletFromWire(card, nowIso, venueSlug),
  }));
  const hasActivity = cards.some((c) => c.member.facts.some((f) => f.kind === 'earn'));
  const liveClaims = projected.filter((p) => p.wallet.liveClaim !== null);
  const confirmedList = cards.flatMap((c) =>
    c.member.facts
      .filter((f): f is Extract<typeof f, { kind: 'confirm' }> => f.kind === 'confirm')
      .map((conf) => ({
        id: conf.id,
        at: conf.at,
        member: c.member.firstName ?? c.member.phoneMasked,
        title: conf.title,
        units: conf.units,
      })),
  );

  return (
    <SafeScreen includeBottom={false}>
      <ScrollView
        contentContainerStyle={styles.page}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text variant="display-m">{t('owner.loyalty')}</Text>
        <View style={styles.rowWrap}>
          {VENUES.map((v) => {
            const active = venueId === v.id;
            return (
              <Pressable
                key={v.id}
                accessibilityRole="button"
                onPress={() => {
                  setConfirmNote(null);
                  saveOwner({
                    accessToken: `acc_owner_login_${v.phone}`,
                    refreshToken: `ref_owner_login_${v.phone}`,
                    venueId: v.id,
                    role: 'owner',
                    firstName: 'Ama',
                  });
                }}
                style={[
                  styles.venueChip,
                  {
                    backgroundColor: active ? theme.fill : theme.white,
                    borderColor: active ? theme.fill : theme.line,
                  },
                ]}
              >
                <Text variant="caption" style={{ color: active ? theme.onFill : theme.text }}>
                  {v.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.card, { borderColor: theme.line }]}>
          <Text variant="title">{t('owner.loyaltyConfirmTitle')}</Text>
          <Text variant="caption" style={{ color: theme.meta }}>
            {t('owner.loyaltyConfirmLead')}
          </Text>
          {liveClaims.length > 0 ? (
            <View style={styles.rowWrap}>
              {liveClaims.map(({ card, wallet }) =>
                wallet.liveClaim ? (
                  <Pressable
                    key={wallet.liveClaim.code}
                    accessibilityRole="button"
                    onPress={() => setCode(wallet.liveClaim?.code ?? '')}
                    style={[
                      styles.claimChip,
                      { borderColor: theme.fill, backgroundColor: theme.wash },
                    ]}
                  >
                    <Text variant="caption" style={{ color: theme.fill }}>
                      {wallet.liveClaim.code} · {card.member.firstName ?? card.member.phoneMasked} (
                      {wallet.liveClaim.title})
                    </Text>
                  </Pressable>
                ) : null,
              )}
            </View>
          ) : null}
          <View style={styles.row}>
            <TextInput
              accessibilityLabel={t('owner.loyaltyCodePlaceholder')}
              value={code}
              onChangeText={(val) => setCode(val.toUpperCase())}
              placeholder="ABC234"
              autoCapitalize="characters"
              maxLength={6}
              style={[styles.codeInput, { borderColor: theme.line }]}
            />
            <View style={{ flex: 1 }}>
              <Button
                label={t('owner.loyaltyConfirmBtn')}
                disabled={code.trim().length < 6}
                loading={confirm.isPending}
                onPress={() => confirm.mutate(code)}
              />
            </View>
          </View>
          {confirmNote ? (
            <Text variant="caption" style={{ color: theme.fill }}>
              {confirmNote}
            </Text>
          ) : null}
        </View>

        {loyalty.data ? (
          <OwnerLoyaltySetup
            key={venueId}
            venueId={venueId}
            program={loyalty.data}
            hasActivity={hasActivity}
          />
        ) : null}

        <View style={[styles.card, { borderColor: theme.line }]}>
          <Text variant="title">
            {t('owner.loyaltyMembersTitle', { count: projected.length })}
          </Text>
          {projected.length === 0 ? (
            <Text variant="caption" style={{ color: theme.meta }}>
              {t('owner.loyaltyMembersEmpty')}
            </Text>
          ) : (
            projected.map(({ card, wallet }) => (
              <View key={card.member.id} style={[styles.memberRow, { borderColor: theme.line }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="body-strong">
                    {card.member.firstName ?? 'Guest'} · {card.member.phoneMasked}
                  </Text>
                  <Text variant="caption" style={{ color: theme.meta }}>
                    {t('owner.loyaltyMemberBalance', {
                      balance: wallet.progress.balance,
                      lifetime: wallet.progress.lifetime,
                      tier: t(`loyalty.tiers.${wallet.tier}`),
                    })}
                  </Text>
                  <Text variant="caption" style={{ color: theme.meta }}>
                    {card.member.consent.marketing
                      ? t('owner.loyaltyMarketingYes')
                      : t('owner.loyaltyMarketingNo')}
                  </Text>
                </View>
                <View style={[styles.tierTag, { borderColor: theme.line }]}>
                  <Text variant="caption">{t(`loyalty.tiers.${wallet.tier}`)}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={[styles.card, { borderColor: theme.line }]}>
          <Text variant="title">{t('owner.loyaltyRedemptionsTitle')}</Text>
          {confirmedList.length === 0 ? (
            <Text variant="caption" style={{ color: theme.meta }}>
              {t('owner.loyaltyNoRedemptions')}
            </Text>
          ) : (
            confirmedList.map((item) => (
              <View key={item.id} style={[styles.memberRow, { borderColor: theme.line }]}>
                <View style={{ flex: 1 }}>
                  <Text variant="body-strong">
                    {item.title} · {item.member}
                  </Text>
                  <Text variant="caption" style={{ color: theme.meta }}>
                    {item.at.slice(0, 10)}
                  </Text>
                </View>
                <Text variant="body-strong">−{item.units}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, gap: 14, backgroundColor: '#fff' },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  venueChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  claimChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  codeInput: {
    borderWidth: 1,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 12,
    width: 124,
    letterSpacing: 2,
    fontWeight: '700',
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 8,
  },
  tierTag: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
