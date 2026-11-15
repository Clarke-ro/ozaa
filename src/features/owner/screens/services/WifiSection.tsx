import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { WifiSecurity } from '@/features/venue';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { Field, Segmented, TitledSection, Toggle } from '../../kit';

export type WifiForm = { ssid: string; password: string; security: WifiSecurity; hidden: boolean };

// The four guests will actually meet; WEP and the 'nopass' alias are kept if a venue already uses them.
const SECURITY: WifiSecurity[] = ['WPA2', 'WPA3', 'WPA', 'OPEN'];

/**
 * The Wi-Fi guests join from the table (canvas): name and password side by side, the security
 * type, and whether the network is hidden. Saved with the page's Save bar.
 */
export function WifiSection({
  value,
  onChange,
  error,
}: {
  value: WifiForm;
  onChange: <K extends keyof WifiForm>(key: K, next: WifiForm[K]) => void;
  error?: string;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const open = value.security === 'OPEN' || value.security === 'nopass';
  const options = SECURITY.includes(value.security) ? SECURITY : [value.security, ...SECURITY];
  return (
    <TitledSection title={t('ownerServices.wifi')} cardStyle={styles.card}>
      <View style={styles.row}>
        <View style={styles.half}>
          <Field
            label={t('ownerServices.network')}
            value={value.ssid}
            onChangeText={(v) => onChange('ssid', v)}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={32}
            error={error}
          />
        </View>
        <View style={styles.half}>
          {/* An open network has no password, so the box goes away rather than sit unused. */}
          {open ? null : (
            <Field
              label={t('ownerServices.password')}
              value={value.password}
              onChangeText={(v) => onChange('password', v)}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={63}
            />
          )}
        </View>
      </View>
      <View style={styles.block}>
        <Text variant="body-strong" style={[styles.label, { color: theme.muted }]}>
          {t('ownerServices.security')}
        </Text>
        <View style={styles.security}>
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
      </View>
      <View style={styles.switchRow}>
        <Text variant="body" style={styles.flex}>
          {t('ownerServices.hidden')}
        </Text>
        <Toggle
          label={t('ownerServices.hidden')}
          value={value.hidden}
          onChange={(v) => onChange('hidden', v)}
        />
      </View>
    </TitledSection>
  );
}

const styles = StyleSheet.create({
  card: { padding: tokens.owner.controls.cardPadding, gap: tokens.space[4] },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  half: { flexGrow: 1, flexShrink: 1, flexBasis: 240, minWidth: 0 },
  block: { gap: tokens.space[2] },
  label: { fontSize: 14, lineHeight: 20 },
  // Canvas: the security switch takes about half the card.
  security: { maxWidth: 520 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3], minHeight: 44 },
  flex: { flex: 1 },
});
