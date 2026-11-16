import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { Chips, Field, ModalSheet, Segmented } from '../../kit';
import { timeOptions } from '../../desk/noticeForm';
import { daysIn, monthOptions } from './closedDayPick';

const MONTHS = 12;
type Kind = 'closed' | 'hours';
export type ClosedDayPick = {
  date: string;
  name: string;
  hours?: { opens: string; closes: string };
};

/** Pick a special day without typing a date: month, day, a name, and closed or its own hours. */
export function ClosedDaySheet({
  visible,
  saving,
  error,
  onClose,
  onAdd,
}: {
  visible: boolean;
  saving: boolean;
  error?: string;
  onClose: () => void;
  onAdd: (pick: ClosedDayPick) => void;
}) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const [today] = useState(() => new Date());
  const months = monthOptions(today, MONTHS);
  const [month, setMonth] = useState(months[0] ?? '');
  const [day, setDay] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<Kind>('closed');
  const [opens, setOpens] = useState('14:00');
  const [closes, setCloses] = useState('22:00');
  const locale = i18n.language === 'en' ? 'en-GB' : i18n.language;
  const monthName = (m: string) =>
    new Date(`${m}-01T12:00:00Z`).toLocaleDateString(locale, {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  const days = Array.from({ length: daysIn(month) }, (_, i) => i + 1);
  const times = timeOptions().map((x) => ({ id: x, label: x }));
  const date = day ? `${month}-${String(day).padStart(2, '0')}` : '';

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title={t('ownerBusiness.addClosed')}
      footer={
        <Button
          label={t('ownerBusiness.addClosed')}
          loading={saving}
          disabled={!date}
          onPress={() =>
            onAdd({ date, name, ...(kind === 'hours' ? { hours: { opens, closes } } : {}) })
          }
          style={styles.grow}
        />
      }
    >
      <Field
        label={t('ownerBusiness.closedName')}
        placeholder={t('ownerBusiness.closedNameHint')}
        value={name}
        onChangeText={setName}
        maxLength={40}
      />
      <Text variant="body-strong">{t('ownerBusiness.month')}</Text>
      <Chips<string>
        single
        label={t('ownerBusiness.month')}
        options={months.map((m) => ({ id: m, label: monthName(m) }))}
        selected={[month]}
        onChange={(ids) => {
          if (!ids[0]) return;
          setMonth(ids[0]);
          setDay((d) => (d && d <= daysIn(ids[0]!) ? d : null));
        }}
      />
      <Text variant="body-strong">{t('ownerBusiness.dayOfMonth')}</Text>
      <Chips<number>
        single
        label={t('ownerBusiness.dayOfMonth')}
        options={days.map((d) => ({ id: d, label: String(d) }))}
        selected={day ? [day] : []}
        onChange={(ids) => setDay(ids[0] ?? null)}
      />
      <Segmented<Kind>
        equal
        label={t('ownerBusiness.closedKind')}
        value={kind}
        onChange={setKind}
        options={[
          { id: 'closed', label: t('ownerBusiness.closedAllDay') },
          { id: 'hours', label: t('ownerBusiness.ownHours') },
        ]}
      />
      {kind === 'hours' ? (
        <View style={styles.block}>
          <Text variant="body-strong">{t('ownerBusiness.opens')}</Text>
          <Chips<string>
            single
            label={t('ownerBusiness.opens')}
            options={times}
            selected={[opens]}
            onChange={(ids) => ids[0] && setOpens(ids[0])}
          />
          <Text variant="body-strong">{t('ownerBusiness.closes')}</Text>
          <Chips<string>
            single
            label={t('ownerBusiness.closes')}
            options={times}
            selected={[closes]}
            onChange={(ids) => ids[0] && setCloses(ids[0])}
          />
        </View>
      ) : null}
      {error ? (
        <Text variant="caption" style={{ color: theme.error }}>
          {error}
        </Text>
      ) : null}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  block: { gap: tokens.space[3] },
});
