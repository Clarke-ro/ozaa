import { StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { qrSvg } from '@/lib/qrSvg';
import { QR_PAPER } from '@/theme/palette';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import type { Wallet } from './facts';

const BIG_QR = 196;

/**
 * The back: one big QR for staff to scan. Under it, the code they can type instead (the claim
 * code while a reward is waiting, otherwise the card number), since Scan also takes typed codes.
 */
export function WalletCardBack({ wallet, qrText }: { wallet: Wallet; qrText: string }) {
  const theme = useTheme();
  const ink = theme.onFill;
  return (
    <View style={[styles.face, { backgroundColor: theme.fill }]}>
      <View style={styles.qr}>
        <SvgXml xml={qrSvg(qrText, BIG_QR)} width={BIG_QR} height={BIG_QR} />
      </View>
      {wallet.liveClaim ? (
        <Text variant="display-m" style={[styles.claim, { color: ink }]}>
          {wallet.liveClaim.code}
        </Text>
      ) : (
        <Text variant="caption" style={[styles.number, { color: ink }]}>
          {wallet.cardNumber}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  face: {
    ...StyleSheet.absoluteFill,
    borderRadius: tokens.radius.xl,
    borderCurve: 'continuous',
    padding: tokens.space[5],
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space[3],
    backfaceVisibility: 'hidden',
  },
  qr: { backgroundColor: QR_PAPER, borderRadius: tokens.radius.lg, padding: tokens.space[3] },
  claim: { letterSpacing: 4, fontVariant: ['tabular-nums'] },
  number: { letterSpacing: 1, fontVariant: ['tabular-nums'], opacity: 0.9 },
});
