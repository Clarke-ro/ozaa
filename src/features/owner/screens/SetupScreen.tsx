import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Check, CheckCircle2, QrCode, Store, Wallet, Wifi } from 'lucide-react-native';
import { api } from '@/lib/api';
import { parseGhanaPhone } from '@/lib/phone';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { DeskWait, OwnerPage } from '../chrome/OwnerPage';
import { DeskCard, IconTile } from '../kit';

const STEPS = ['name', 'tables', 'wifi', 'payout', 'done'] as const;

export function SetupScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const venue = useQuery({
    queryKey: ['owner-venue', venueId],
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });

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
        await api.ownerUpdateVenue(venueId, {
          name: name || venue.data?.name,
          location: { label: location || venue.data?.location.label || '' },
        });
      }
      if (current === 'tables') {
        const list = codes
          .split(',')
          .map((code) => code.trim())
          .filter(Boolean);
        if (list.length) await api.ownerCreateTables(venueId, { codes: list });
      }
      if (current === 'wifi') {
        await api.ownerUpdateVenue(venueId, {
          wifi: { ssid, password, security: 'WPA' },
        });
      }
      if (current === 'payout') {
        const parsed = parseGhanaPhone(phone);
        if (!parsed) throw new Error('phone');
        await api.ownerSetPayoutAccount(venueId, {
          businessName: business || venue.data?.name || 'Venue',
          settlement: {
            type: 'momo',
            provider: parsed.provider ?? 'mtn',
            phone: parsed.phone,
          },
        });
      }
    },
    onSuccess: () => setStep((value) => value + 1),
  });

  const titles = {
    name: t('owner.setupName'),
    tables: t('owner.setupTables'),
    wifi: t('owner.setupWifi'),
    payout: t('owner.setupPayout'),
    done: t('owner.setup'),
  };

  return (
    <OwnerPage
      title={titles[current]}
      subtitle={current === 'done' ? t('owner.setupDone') : t('owner.setupLead')}
    >
      <DeskWait loading={venue.isLoading} error={venue.isError} onRetry={() => void venue.refetch()}>
        {/* Step Progress Tracker */}
        <View style={styles.trackerRow}>
          {['Venue', 'Tables', 'Wi-Fi', 'Payout'].map((label, idx) => {
            const isCompleted = step > idx;
            const isCurrent = step === idx;
            return (
              <View key={label} style={styles.trackerItem}>
                <View
                  style={[
                    styles.trackerDot,
                    {
                      backgroundColor: isCompleted ? '#16A34A' : isCurrent ? '#D24000' : '#E5E7EB',
                    },
                  ]}
                >
                  {isCompleted ? (
                    <Check size={12} color="#FFFFFF" />
                  ) : (
                    <Text
                      variant="caption"
                      style={{
                        color: isCurrent ? '#FFFFFF' : '#6B7280',
                        fontSize: 10,
                        fontWeight: '700',
                      }}
                    >
                      {idx + 1}
                    </Text>
                  )}
                </View>
                <Text
                  variant="caption"
                  style={{
                    color: isCurrent ? '#111111' : '#6B7280',
                    fontWeight: isCurrent ? '700' : '500',
                    fontSize: 11,
                  }}
                >
                  {label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Step 1: Venue Name & Location */}
        {current === 'name' ? (
          <DeskCard style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <IconTile icon={Store} tone="tint" size={36} />
              <View>
                <Text variant="title">Venue Identity</Text>
                <Text variant="caption" style={{ color: theme.meta }}>
                  Your restaurant name and street location shown to guests
                </Text>
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text variant="caption" style={styles.fieldLabel}>
                {t('owner.setupName')}
              </Text>
              <TextInput
                accessibilityLabel={t('owner.setupName')}
                value={name}
                onChangeText={setName}
                placeholder={venue.data?.name ?? "Mama's Kitchen"}
                placeholderTextColor={theme.meta}
                style={[styles.input, { borderColor: theme.line, color: theme.text }]}
              />
            </View>

            <View style={styles.fieldBlock}>
              <Text variant="caption" style={styles.fieldLabel}>
                {t('owner.location')}
              </Text>
              <TextInput
                accessibilityLabel={t('owner.location')}
                value={location}
                onChangeText={setLocation}
                placeholder={venue.data?.location.label ?? 'Osu, Oxford Street, Accra'}
                placeholderTextColor={theme.meta}
                style={[styles.input, { borderColor: theme.line, color: theme.text }]}
              />
            </View>
          </DeskCard>
        ) : null}

        {/* Step 2: Tables & QR */}
        {current === 'tables' ? (
          <DeskCard style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <IconTile icon={QrCode} tone="tint" size={36} />
              <View>
                <Text variant="title">Floor Tables</Text>
                <Text variant="caption" style={{ color: theme.meta }}>
                  Enter table numbers or names separated by commas
                </Text>
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text variant="caption" style={styles.fieldLabel}>
                {t('owner.tableCodes')}
              </Text>
              <TextInput
                accessibilityLabel={t('owner.tableCodes')}
                value={codes}
                onChangeText={setCodes}
                placeholder="1, 2, 3, 4, 5, Patio 1, Bar 1"
                placeholderTextColor={theme.meta}
                style={[styles.input, { borderColor: theme.line, color: theme.text }]}
              />
              <Text variant="caption" style={{ color: theme.meta }}>
                Ozaa will generate unique permanent QR codes for each table.
              </Text>
            </View>
          </DeskCard>
        ) : null}

        {/* Step 3: Guest Wi-Fi */}
        {current === 'wifi' ? (
          <DeskCard style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <IconTile icon={Wifi} tone="tint" size={36} />
              <View>
                <Text variant="title">Guest Wi-Fi Setup</Text>
                <Text variant="caption" style={{ color: theme.meta }}>
                  Guests can connect in one tap from their table menu
                </Text>
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text variant="caption" style={styles.fieldLabel}>
                {t('owner.ssid')}
              </Text>
              <TextInput
                accessibilityLabel={t('owner.ssid')}
                value={ssid}
                onChangeText={setSsid}
                placeholder="e.g. Mamas_Guest_WiFi"
                placeholderTextColor={theme.meta}
                style={[styles.input, { borderColor: theme.line, color: theme.text }]}
              />
            </View>

            <View style={styles.fieldBlock}>
              <Text variant="caption" style={styles.fieldLabel}>
                {t('owner.password')}
              </Text>
              <TextInput
                accessibilityLabel={t('owner.password')}
                value={password}
                onChangeText={setPassword}
                placeholder="Wi-Fi Password"
                placeholderTextColor={theme.meta}
                secureTextEntry
                style={[styles.input, { borderColor: theme.line, color: theme.text }]}
              />
            </View>
          </DeskCard>
        ) : null}

        {/* Step 4: MoMo Payout */}
        {current === 'payout' ? (
          <DeskCard style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <IconTile icon={Wallet} tone="tint" size={36} />
              <View>
                <Text variant="title">Daily MoMo Payout Account</Text>
                <Text variant="caption" style={{ color: theme.meta }}>
                  Direct automated split settlement to your Mobile Money account
                </Text>
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text variant="caption" style={styles.fieldLabel}>
                {t('owner.business')}
              </Text>
              <TextInput
                accessibilityLabel={t('owner.business')}
                value={business}
                onChangeText={setBusiness}
                placeholder={venue.data?.name ?? 'Registered Business Name'}
                placeholderTextColor={theme.meta}
                style={[styles.input, { borderColor: theme.line, color: theme.text }]}
              />
            </View>

            <View style={styles.fieldBlock}>
              <Text variant="caption" style={styles.fieldLabel}>
                {t('owner.phone')} (MoMo wallet number)
              </Text>
              <TextInput
                accessibilityLabel={t('owner.phone')}
                value={phone}
                onChangeText={setPhone}
                placeholder="024 123 4567 (MTN / Telecel / AT)"
                placeholderTextColor={theme.meta}
                keyboardType="phone-pad"
                style={[styles.input, { borderColor: theme.line, color: theme.text }]}
              />
            </View>
          </DeskCard>
        ) : null}

        {/* Step 5: Completed */}
        {current === 'done' ? (
          <DeskCard style={styles.doneCard}>
            <View style={styles.doneIconCircle}>
              <CheckCircle2 size={40} color="#16A34A" />
            </View>
            <Text variant="display-m" style={styles.doneTitle}>
              You are ready to open!
            </Text>
            <Text variant="body" style={styles.doneSubtitle}>
              {t('owner.setupDone')}
            </Text>
          </DeskCard>
        ) : null}

        {save.isError ? (
          <View style={styles.errorBox}>
            <Text variant="caption" style={{ color: '#DC2626', fontWeight: '600' }}>
              {t('errors.generic')}
            </Text>
          </View>
        ) : null}

        {/* Action Button */}
        <View style={styles.actionContainer}>
          {current === 'done' ? (
            <Button label={t('owner.floor')} onPress={() => router.push('/owner/floor')} />
          ) : (
            <Button
              label={current === 'payout' ? t('owner.finish') : t('owner.next')}
              onPress={() => save.mutate()}
              loading={save.isPending}
            />
          )}
        </View>
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  trackerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: tokens.space[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    marginBottom: tokens.space[2],
  },
  trackerItem: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  trackerDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCard: {
    gap: tokens.space[3],
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
  },
  fieldBlock: {
    gap: 6,
  },
  fieldLabel: {
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    minHeight: 48,
    paddingHorizontal: tokens.space[3],
    backgroundColor: '#FFFFFF',
  },
  doneCard: {
    alignItems: 'center',
    textAlign: 'center',
    paddingVertical: tokens.space[5],
    gap: tokens.space[2],
  },
  doneIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.space[1],
  },
  doneTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  doneSubtitle: {
    textAlign: 'center',
    color: '#4B5563',
    maxWidth: 300,
    lineHeight: 20,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    padding: tokens.space[2],
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  actionContainer: {
    paddingTop: tokens.space[2],
  },
});
