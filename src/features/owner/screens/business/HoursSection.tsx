import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { VenueSettings } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { ownerKeys } from '../../data/keys';
import { cardStyle, Field, SectionLabel, Toggle, toast } from '../../kit';
import { daysFrom, weeklyFrom, type DayDraft } from './hoursForm';

/** The open location's week: each day open or closed, with its times. Guests see these hours. */
export function HoursSection({ venue }: { venue: VenueSettings }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const client = useQueryClient();
  const [days, setDays] = useState<DayDraft[]>(() => daysFrom(venue.hours));
  const [bad, setBad] = useState<number | null>(null);
  const set = (i: number, patch: Partial<DayDraft>) => {
    setDays((now) => now.map((d, j) => (j === i ? { ...d, ...patch } : d)));
    setBad(null);
  };
  const save = useMutation({
    mutationFn: (weekly: VenueSettings['hours']['weekly']) =>
      api.ownerUpdateVenue(venue.id, { hours: { ...venue.hours, weekly } }),
    onSuccess: () => {
      toast.success(t('ownerKit.saved'));
      void client.invalidateQueries({ queryKey: ownerKeys.venue(venue.id) });
    },
    onError: () => toast.error(t('ownerKit.saveFailed')),
  });
  const submit = () => {
    const result = weeklyFrom(days);
    if (result.ok) save.mutate(result.weekly);
    else setBad(result.day);
  };

  return (
    <View style={styles.group}>
      <SectionLabel title={t('ownerBusiness.hours')} />
      <View style={cardStyle(theme)}>
        {days.map((day, i) => (
          <View
            key={i}
            style={[
              styles.row,
              i > 0 && { borderTopColor: theme.line, borderTopWidth: StyleSheet.hairlineWidth },
            ]}
          >
            <Text variant="body" style={styles.day}>
              {t(`ownerPromos.dayNames.${i}`)}
            </Text>
            <View style={styles.times}>
              {day.open ? (
                <>
                  <Field
                    label={t('ownerBusiness.opens')}
                    value={day.opens}
                    placeholder="11:00"
                    onChangeText={(opens) => set(i, { opens })}
                    error={bad === i ? t('ownerBusiness.timeError') : undefined}
                  />
                  <Field
                    label={t('ownerBusiness.closes')}
                    value={day.closes}
                    placeholder="22:00"
                    onChangeText={(closes) => set(i, { closes })}
                  />
                </>
              ) : (
                <Text variant="body" style={{ color: theme.muted }}>
                  {t('ownerBusiness.closed')}
                </Text>
              )}
            </View>
            <Toggle
              label={t('ownerBusiness.openOn', { day: t(`ownerPromos.dayNames.${i}`) })}
              value={day.open}
              onChange={(open) => set(i, { open })}
            />
          </View>
        ))}
      </View>
      <View style={styles.end}>
        <Button
          label={t('ownerBusiness.saveHours')}
          tone="secondary"
          size="md"
          loading={save.isPending}
          onPress={submit}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: tokens.space[3] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[4],
    minHeight: 64,
    paddingHorizontal: tokens.space[5],
    paddingVertical: tokens.space[2],
  },
  day: { width: 56 },
  times: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space[2],
    alignItems: 'center',
  },
  end: { alignItems: 'flex-end' },
});
