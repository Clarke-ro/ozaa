import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { MenuCategory } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { Chips, Field, ModalSheet, Section, SectionBody, SwitchRow, toast } from '../../kit';
import { checkSection, dayNumber, WEEK } from './forms';

const EVERY_DAY = WEEK.map(dayNumber);

/** Create or edit a menu section: name, hide from guests, and optional serving hours. */
export function SectionEditor({
  section,
  kind,
  venueId,
  onClose,
  onSaved,
}: {
  section: MenuCategory | null;
  kind: 'food' | 'drinks';
  venueId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [name, setName] = useState(section?.name.en ?? '');
  const [hidden, setHidden] = useState(section?.hidden ?? false);
  const [scheduled, setScheduled] = useState(Boolean(section?.schedule));
  // Older sections saved Sunday as 7; read it back as 0 so it shows as ticked.
  const [days, setDays] = useState<number[]>(
    (section?.schedule?.days ?? EVERY_DAY).map((d) => d % 7),
  );
  const [start, setStart] = useState(section?.schedule?.startTime ?? '11:00');
  const [end, setEnd] = useState(section?.schedule?.endTime ?? '22:00');
  const [showErrors, setShowErrors] = useState(false);
  const check = checkSection({ name, scheduled, days, start, end });
  const error = (field: string) =>
    showErrors && !check.ok && check.field === field ? t(`ownerMenu.err.${field}`) : undefined;

  const save = useMutation({
    mutationFn: () => {
      if (!check.ok) throw new Error('invalid');
      const body = {
        name: { ...section?.name, en: check.name },
        kind,
        hidden,
        schedule: check.schedule,
        position: section?.position,
      };
      return section
        ? api.ownerUpdateCategory(venueId, section.id, body)
        : api.ownerCreateCategory(venueId, body);
    },
    onSuccess: () => {
      toast.success(t('ownerKit.saved'));
      onSaved();
    },
    onError: () => toast.error(t('ownerKit.saveFailed')),
  });

  return (
    <ModalSheet
      visible
      onClose={onClose}
      title={section ? t('ownerMenu.editSectionTitle') : t('ownerMenu.newSection')}
      footer={
        <Button
          label={t('ownerKit.save')}
          style={styles.flex}
          loading={save.isPending}
          onPress={() => (check.ok ? save.mutate() : setShowErrors(true))}
        />
      }
    >
      <Field
        label={t('ownerMenu.sectionName')}
        value={name}
        onChangeText={setName}
        placeholder={t('ownerMenu.sectionNameHint')}
        error={error('name')}
      />
      <Section>
        <SwitchRow
          label={t('ownerMenu.hideSection')}
          hint={t('ownerMenu.hideSectionHint')}
          value={hidden}
          onChange={setHidden}
        />
        <SwitchRow
          label={t('ownerMenu.servingHours')}
          hint={t('ownerMenu.servingHoursHint')}
          value={scheduled}
          onChange={setScheduled}
        />
        {scheduled ? (
          <SectionBody>
            <Chips
              label={t('ownerMenu.days')}
              options={WEEK.map((day) => ({
                id: dayNumber(day),
                label: t(`ownerMenu.week.${day}`),
              }))}
              selected={days}
              onChange={setDays}
            />
            {error('days') ? (
              <Text variant="caption" style={{ color: theme.error }}>
                {error('days')}
              </Text>
            ) : null}
            <View style={styles.row}>
              <Field
                label={t('ownerMenu.from')}
                value={start}
                onChangeText={setStart}
                placeholder="11:00"
                keyboardType="numbers-and-punctuation"
                error={error('start')}
              />
              <Field
                label={t('ownerMenu.until')}
                value={end}
                onChangeText={setEnd}
                placeholder="22:00"
                keyboardType="numbers-and-punctuation"
                error={error('end')}
              />
            </View>
          </SectionBody>
        ) : null}
      </Section>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: tokens.space[3] },
});
