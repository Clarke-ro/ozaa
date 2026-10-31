import { StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { qrSvg } from '@/lib/qrSvg';
import { Button } from '@/ui/Button';
import { PageHeader } from '@/ui/PageHeader';
import { SafeScreen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { ErrorState, LoadingState } from '@/ui/states';
import { useTheme } from '@/ui/theme';
import { useVenue, useWifi } from '@/features/venue';

export function WifiScreen({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const wifi = useWifi(slug);
  const venue = useVenue(slug);
  if (wifi.isLoading) return <LoadingState />;
  if (wifi.isError || !wifi.data) return <ErrorState onRetry={() => void wifi.refetch()} />;
  const password = wifi.data.password ?? '';
  const payload = `WIFI:T:${wifi.data.security};S:${wifi.data.ssid};P:${password};;`;
  const copy = () => {
    const board = globalThis.navigator?.clipboard;
    if (board) void board.writeText(password);
  };
  return (
    <SafeScreen>
      <PageHeader title={t('wifi.title')} subtitle={venue.data?.name} />
      <View style={{ padding: 20, gap: 16 }}>
        <Text variant="display-m">{t('wifi.heading')}</Text>
        <Text variant="body" style={{ color: theme.muted }}>
          {t('wifi.lead')}
        </Text>
        <View style={[styles.box, { borderColor: theme.line }]}>
          <Text variant="caption" style={{ color: theme.meta }}>
            {t('wifi.network')}
          </Text>
          <Text variant="body-strong">{wifi.data.ssid}</Text>
          <Text variant="caption" style={{ color: theme.meta, marginTop: 12 }}>
            {t('wifi.password')}
          </Text>
          <Text variant="body-strong">{password}</Text>
        </View>
        <View style={[styles.box, { borderColor: theme.line, alignItems: 'center' }]}>
          <Text variant="body-strong">{t('wifi.qr')}</Text>
          <Text variant="caption" style={{ color: theme.muted, textAlign: 'center' }}>
            {t('wifi.qrLead')}
          </Text>
          <SvgXml xml={qrSvg(payload, 176)} width={176} height={176} />
        </View>
        <Text variant="caption" style={{ color: theme.meta }}>
          {t('wifi.private', { name: venue.data?.name ?? '' })}
        </Text>
      </View>
      <View style={styles.footer}>
        <Button label={t('wifi.copyPassword')} onPress={copy} />
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 4 },
  footer: { position: 'absolute', left: 20, right: 20, bottom: 16 },
});
