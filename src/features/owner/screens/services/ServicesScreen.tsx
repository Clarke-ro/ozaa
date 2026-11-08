import { StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { ServiceSettings } from '@/lib/api/types';
import { NOT_BUILT, type WifiSecurity } from '@/features/venue';
import { PAYMENT_SERVICES } from '@/lib/features';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { useDraft } from '../../data/useDraft';
import { useSaveVenue } from '../../data/useSaveVenue';
import { InfoRow, SaveBar, Section, SectionBody, Stepper, SwitchRow, toast } from '../../kit';
import { WifiSection } from './WifiSection';

type Toggle = ServiceSettings['services'][number];
const SECTIONS: Toggle['section'][] = ['table', 'rewards', 'fun', 'more'];

/** What guests can do from the table (each switch saves at once), and the venue Wi-Fi. */
export function ServicesScreen() {
  const { t } = useTranslation();
    const client = useQueryClient();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const key = ownerKeys.services(venueId);
  const services = useQuery({
    queryKey: key,
    queryFn: () => api.ownerGetServices(venueId),
    enabled: Boolean(venueId),
  });
  const venue = useQuery({
    queryKey: ownerKeys.venue(venueId),
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });
  const wifi = venue.data?.wifi;
  const draft = useDraft({
    ssid: wifi?.ssid ?? '',
    password: wifi?.password ?? '',
    security: (wifi?.security ?? 'WPA2') as WifiSecurity,
    hidden: wifi?.hidden ?? false,
  });
  const saveWifi = useSaveVenue(venueId, draft.reset);

  const save = useMutation({
    mutationFn: (next: ServiceSettings) => api.ownerSetServices(venueId, next),
    onMutate: async (next) => {
      await client.cancelQueries({ queryKey: key });
      const before = client.getQueryData<ServiceSettings>(key);
      client.setQueryData(key, next);
      return { before };
    },
    onError: (_e, _next, context) => {
      if (context?.before) client.setQueryData(key, context.before);
      toast.error(t('ownerKit.saveFailed'));
    },
    onSettled: () => client.invalidateQueries({ queryKey: key }),
  });

  const s = services.data;
  const toggle = (item: Toggle, enabled: boolean) =>
    s &&
    save.mutate({
      ...s,
      services: s.services.map((x) => (x.id === item.id ? { ...x, enabled } : x)),
    });
  const submitWifi = () => {
    if (!draft.value.ssid.trim()) return toast.error(t('ownerServices.networkMissing'));
    saveWifi.mutate({ wifi: { ...draft.value, ssid: draft.value.ssid.trim() } });
  };

  return (
    <OwnerPage
      title={t('owner.services')}
      footer={
        <SaveBar
          visible={draft.dirty}
          saving={saveWifi.isPending}
          onDiscard={draft.reset}
          onSave={submitWifi}
        />
      }
    >
      <DeskWait
        loading={services.isLoading}
        error={services.isError}
        onRetry={() => void services.refetch()}
      >
        {s ? (
          <View style={styles.stack}>
            <View style={styles.stack}>
              {SECTIONS.map((section) => {
                const items = s.services.filter(
                  (item) => item.section === section && !PAYMENT_SERVICES.includes(item.id),
                );
                if (!items.length && section !== 'fun') return null;
                return (
                  <Section key={section} title={t(`home.sections.${section}`)}>
                    {items.map((item) =>
                      NOT_BUILT.includes(item.id) ? (
                        <InfoRow
                          key={item.id}
                          label={t(`services.${item.id}.title`)}
                          value={t('ownerServices.later')}
                        />
                      ) : (
                        <SwitchRow
                          key={item.id}
                          label={t(`services.${item.id}.title`)}
                          value={item.enabled}
                          onChange={(on) => toggle(item, on)}
                        />
                      ),
                    )}
                    {section === 'fun' ? (
                      <SwitchRow
                        label={t('ownerServices.gameStamp')}
                        value={s.game.enabled}
                        onChange={(enabled) => save.mutate({ ...s, game: { ...s.game, enabled } })}
                      />
                    ) : null}
                    {section === 'fun' && s.game.enabled ? (
                      <SectionBody>
                        <View style={styles.row}>
                          <Text variant="body" style={styles.flex}>
                            {t('ownerServices.targetScore')}
                          </Text>
                          <Stepper
                            label={t('ownerServices.targetScore')}
                            value={s.game.minScore}
                            min={1}
                            max={200}
                            onChange={(minScore) =>
                              save.mutate({ ...s, game: { ...s.game, minScore } })
                            }
                          />
                        </View>
                      </SectionBody>
                    ) : null}
                  </Section>
                );
              })}
            </View>
            <View>
              <WifiSection value={draft.value} onChange={draft.set} />
            </View>
          </View>
        ) : null}
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[5] },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  flex: { flex: 1 },
});
