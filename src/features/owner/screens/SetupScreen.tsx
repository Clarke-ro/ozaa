import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { parseGhanaPhone } from '@/lib/phone';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { DeskWait, OwnerPage } from '../chrome/OwnerPage';

const STEPS = ['name', 'tables', 'wifi', 'payout', 'done'] as const;

export function SetupScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const venue = useQuery({ queryKey: ['owner-venue', venueId], queryFn: () => api.ownerGetVenue(venueId), enabled: Boolean(venueId) });
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [codes, setCodes] = useState('1, 2, 3');
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [business, setBusiness] = useState('');
  const [phone, setPhone] = useState('');
  const current = STEPS[step] ?? 'done';
  const save = useMutation({
    mutationFn: async () => {
      if (current === 'name') {
        await api.ownerUpdateVenue(venueId, { name: name || venue.data?.name, location: { label: location || venue.data?.location.label || '' } });
      }
      if (current === 'tables') {
        const list = codes.split(',').map((code) => code.trim()).filter(Boolean);
        if (list.length) await api.ownerCreateTables(venueId, { codes: list });
      }
      if (current === 'wifi') {
        await api.ownerUpdateVenue(venueId, { wifi: { ssid, password, security: 'WPA' } });
      }
      if (current === 'payout') {
        const parsed = parseGhanaPhone(phone);
        if (!parsed) throw new Error('phone');
        await api.ownerSetPayoutAccount(venueId, { businessName: business || venue.data?.name || 'Venue', settlement: { type: 'momo', provider: parsed.provider ?? 'mtn', phone: parsed.phone } });
      }
    },
    onSuccess: () => setStep((value) => value + 1),
  });
  const titles = { name: t('owner.setupName'), tables: t('owner.setupTables'), wifi: t('owner.setupWifi'), payout: t('owner.setupPayout'), done: t('owner.setup') };

  return (
    <OwnerPage title={titles[current]} subtitle={current === 'done' ? t('owner.setupDone') : t('owner.setupLead')}>
      <DeskWait loading={venue.isLoading} error={venue.isError} onRetry={() => void venue.refetch()}>
        {current === 'name' ? (
          <View style={styles.stack}>
            <TextInput accessibilityLabel={t('owner.setupName')} value={name} onChangeText={setName} placeholder={venue.data?.name} style={[styles.input, { borderColor: theme.line, color: theme.text }]} />
            <TextInput accessibilityLabel={t('owner.location')} value={location} onChangeText={setLocation} placeholder={venue.data?.location.label} style={[styles.input, { borderColor: theme.line, color: theme.text }]} />
          </View>
        ) : null}
        {current === 'tables' ? <TextInput accessibilityLabel={t('owner.tableCodes')} value={codes} onChangeText={setCodes} style={[styles.input, { borderColor: theme.line, color: theme.text }]} /> : null}
        {current === 'wifi' ? (
          <View style={styles.stack}>
            <TextInput accessibilityLabel={t('owner.ssid')} value={ssid} onChangeText={setSsid} style={[styles.input, { borderColor: theme.line, color: theme.text }]} />
            <TextInput accessibilityLabel={t('owner.password')} value={password} onChangeText={setPassword} style={[styles.input, { borderColor: theme.line, color: theme.text }]} />
          </View>
        ) : null}
        {current === 'payout' ? (
          <View style={styles.stack}>
            <TextInput accessibilityLabel={t('owner.business')} value={business} onChangeText={setBusiness} placeholder={t('owner.business')} style={[styles.input, { borderColor: theme.line, color: theme.text }]} />
            <TextInput accessibilityLabel={t('owner.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={[styles.input, { borderColor: theme.line, color: theme.text }]} />
          </View>
        ) : null}
        {save.isError ? <Text>{t('errors.generic')}</Text> : null}
        {current === 'done' ? (
          <Button label={t('owner.floor')} onPress={() => router.push('/owner/floor')} />
        ) : (
          <Button label={current === 'payout' ? t('owner.finish') : t('owner.next')} onPress={() => save.mutate()} loading={save.isPending} />
        )}
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[3] },
  input: { borderWidth: 1, borderRadius: tokens.radius.md, minHeight: 48, paddingHorizontal: tokens.space[3] },
});
