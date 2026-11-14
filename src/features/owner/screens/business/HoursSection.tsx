import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { VenueSettings } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { ownerKeys } from '../../data/keys';
import { TitledSection, Toggle, toast } from '../../kit';
import { daysFrom, weeklyFrom, type DayDraft } from './hoursForm';

/** The open location's week, one line a day (canvas): name, opens "to" closes, and a switch. */
export function HoursSection({ venue }: { venue: VenueSettings }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const client = useQueryClient();
  const [days, setDays] = useState<DayDraft[]>(() => daysFrom(venue.hours));
  const [dirty, setDirty] = useState(false);
  const [bad, setBad] = useState<number | null>(null);
  const set = (i: number, patch: Partial<DayDraft>) => {
    setDays((now) => now.map((d, j) => (j === i ? { ...d, ...patch } : d)));
    setDirty(true);
    setBad(null);
  };
  const save = useMutation({
    mutationFn: (weekly: VenueSettings['hours']['weekly']) =>
      api.ownerUpdateVenue(venue.id, { hours: { ...venue.hours, weekly } }),
    onSuccess: () => {
      toast.success(t('ownerKit.saved'));
      setDirty(false);
      void client.invalidateQueries({ queryKey: ownerKeys.venue(venue.id) });
    },
    onError: () => toast.error(t('ownerKit.saveFailed')),
  });
  const submit = () => {
    const result = weeklyFrom(days);
    if (result.ok) save.mutate(result.weekly);
    else setBad(result.day);
  };
  const time = (i: number, key: 'opens' | 'closes', label: string) => (
    <TextInput
      accessibilityLabel={`${t(`ownerBusiness.dayFull.${i}`)}, ${label}`}
      value={days[i]?.[key]}
      placeholder={key === 'opens' ? '11:00' : '22:00'}
      placeholderTextColor={theme.meta}
      onChangeText={(text) => set(i, { [key]: text })}
      maxLength={5}
      style={[
        styles.time,
        { color: theme.text, borderColor: bad === i ? theme.error : theme.line },
      ]}
    />
  );

  return (
    <TitledSection title={t('ownerBusiness.hours')} cardStyle={styles.card}>
      {days.map((day, i) => (
        <View
          key={i}
          style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: theme.line }]}
        >
          <Text variant="body" style={styles.day}>
            {t(`ownerBusiness.dayFull.${i}`)}
          </Text>
          {day.open ? (
            <View style={styles.times}>
              {time(i, 'opens', t('ownerBusiness.opens'))}
              <Text variant="caption" style={{ color: theme.muted }}>
                {t('ownerBusiness.to')}
              </Text>
              {time(i, 'closes', t('ownerBusiness.closes'))}
            </View>
          ) : (
            <Text variant="caption" style={{ color: theme.muted }}>
              {t('ownerBusiness.closed')}
            </Text>
          )}
          <Toggle
            label={t('ownerBusiness.openOn', { day: t(`ownerBusiness.dayFull.${i}`) })}
            value={day.open}
            onChange={(open) => set(i, { open })}
          />
        </View>
      ))}
      {bad !== null ? (
        <Text variant="caption" style={[styles.error, { color: theme.error }]}>
          {t('ownerBusiness.timeError')}
        </Text>
      ) : null}
      {dirty ? (
        <View style={styles.end}>
          <Button
            label={t('ownerBusiness.saveHours')}
            tone="secondary"
            loading={save.isPending}
            onPress={submit}
          />
        </View>
      ) : null}
    </TitledSection>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 2, paddingHorizontal: tokens.space[4] },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3], minHeight: 50 },
  day: { flex: 1 },
  times: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  time: {
    width: 72,
    height: 34,
    borderWidth: 1,
    borderRadius: 17,
    textAlign: 'center',
    fontFamily: fontFamily.regular,
    fontSize: 14,
    padding: 0,
  },
  error: { paddingBottom: tokens.space[2] },
  end: { alignItems: 'flex-end', paddingBottom: tokens.space[3] },
});
