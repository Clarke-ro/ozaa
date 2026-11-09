import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { WifiSecurity } from '@/features/venue';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { Segmented, Toggle, cardStyle } from '../../kit';
import type { WifiForm } from '../services/WifiSection';
import { SetupField } from './SetupField';

// The four guests will actually meet; WEP and 'nopass' stay if the venue already uses them.
const SECURITY: WifiSecurity[] = ['WPA2', 'WPA3', 'WPA', 'OPEN'];

/** Wi-Fi in Setup: the same fields as Services, laid out like the other Setup steps. */
export function WifiStep({
  value,
  onChange,
}: {
  value: WifiForm;
  onChange: <K extends keyof WifiForm>(key: K, next: WifiForm[K]) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const open = value.security === 'OPEN' || value.security === 'nopass';
  const options = SECURITY.includes(value.security) ? SECURITY : [value.security, ...SECURITY];
  return (
    <>
      <SetupField
        label={t('ownerServices.network')}
        value={value.ssid}
        onChangeText={(v) => onChange('ssid', v)}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={32}
      />
      {open ? null : (
        <SetupField
          label={t('ownerServices.password')}
          value={value.password}
          onChangeText={(v) => onChange('password', v)}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={63}
        />
      )}
      <View style={styles.group}>
        <Text variant="body-strong" style={styles.label}>
          {t('ownerServices.security')}
        </Text>
        <Segmented<WifiSecurity>
          label={t('ownerServices.security')}
          value={value.security}
          onChange={(v) => onChange('security', v)}
          options={options.map((id) => ({
            id,
            label: id === 'OPEN' || id === 'nopass' ? t('ownerServices.open') : id,
          }))}
        />
      </View>
      <View style={[cardStyle(theme), styles.switch]}>
        <Text variant="body" style={styles.flex}>
          {t('ownerServices.hidden')}
        </Text>
        <Toggle
          value={value.hidden}
          onChange={(v) => onChange('hidden', v)}
          label={t('ownerServices.hidden')}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  group: { gap: tokens.space[2] },
  // Same size as Field's label, so every label on the step lines up.
  label: { fontSize: tokens.owner.type['body-strong'].size },
  switch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    minHeight: tokens.touchTarget + tokens.space[3],
    paddingHorizontal: tokens.space[4],
    borderRadius: tokens.radius.lg,
  },
  flex: { flex: 1 },
});
