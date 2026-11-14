import { StyleSheet, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { ownerKeys } from '../../data/keys';
import { toast } from '../../kit';
import { QrImage } from '../tables/QrImage';

const QR = 150;

/**
 * The code panel on the Pair a device card (canvas): empty until asked, then the one-time
 * pairing code as a QR the scanner phone reads, with the digits under it for typing in. The
 * code comes from the server, never from this app; the device is named by its order.
 */
export function PairCode({ venueId, count }: { venueId: string; count: number }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const client = useQueryClient();
  const pair = useMutation({
    mutationFn: () =>
      api.ownerPairScannerDevice(venueId, {
        name: t('ownerDevices.defaultName', { n: count + 1 }),
      }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ownerKeys.devices(venueId) }),
    onError: () => toast.error(t('ownerKit.saveFailed')),
  });
  const code = pair.data?.pairingCode;
  return (
    <View style={[styles.panel, { borderColor: theme.line }]}>
      {code ? (
        <View
          style={styles.center}
          accessible
          accessibilityLabel={t('ownerDevices.codeA11y', { code: code.split('').join(' ') })}
        >
          <QrImage url={code} size={QR} />
          <Text selectable style={styles.digits}>
            {code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code}
          </Text>
        </View>
      ) : (
        <Button
          label={t('ownerDevices.getCode')}
          tone="secondary"
          loading={pair.isPending}
          onPress={() => pair.mutate()}
          style={styles.button}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: 190,
    minHeight: 190,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.space[3],
  },
  center: { alignItems: 'center', gap: tokens.space[2] },
  digits: { fontSize: 20, letterSpacing: 2, fontFamily: fontFamily.strong },
  button: { minHeight: 40 },
});
