import { useTranslation } from 'react-i18next';
import type { WifiSecurity } from '@/features/venue';
import { InputRow, Section, SectionBody, Segmented, SwitchRow } from '../../kit';

export type WifiForm = { ssid: string; password: string; security: WifiSecurity; hidden: boolean };

// The four guests will actually meet; WEP and the 'nopass' alias are kept if a venue already uses them.
const SECURITY: WifiSecurity[] = ['WPA2', 'WPA3', 'WPA', 'OPEN'];

/** The Wi-Fi guests join from the table. Saved with the page's Save bar. */
export function WifiSection({
  value,
  onChange,
  error,
  bare,
}: {
  value: WifiForm;
  onChange: <K extends keyof WifiForm>(key: K, next: WifiForm[K]) => void;
  error?: string;
  /** No heading of its own, when the page title already says Wi-Fi (Setup). */
  bare?: boolean;
}) {
  const { t } = useTranslation();
  const open = value.security === 'OPEN' || value.security === 'nopass';
  const options = SECURITY.includes(value.security) ? SECURITY : [value.security, ...SECURITY];
  return (
    <Section title={bare ? undefined : t('ownerServices.wifi')}>
      <InputRow
        label={t('ownerServices.network')}
        value={value.ssid}
        onChangeText={(v) => onChange('ssid', v)}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={32}
        error={error}
      />
      {open ? null : (
        <InputRow
          label={t('ownerServices.password')}
          value={value.password}
          onChangeText={(v) => onChange('password', v)}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={63}
        />
      )}
      <SectionBody>
        <Segmented<WifiSecurity>
          label={t('ownerServices.security')}
          value={value.security}
          onChange={(v) => onChange('security', v)}
          options={options.map((id) => ({
            id,
            label: id === 'OPEN' || id === 'nopass' ? t('ownerServices.open') : id,
          }))}
        />
      </SectionBody>
      <SwitchRow
        label={t('ownerServices.hidden')}
        value={value.hidden}
        onChange={(v) => onChange('hidden', v)}
      />
    </Section>
  );
}
