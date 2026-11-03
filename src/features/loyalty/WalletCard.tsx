import { Pressable, StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { Gift, QrCode, RotateCcw, Utensils } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { qrSvg } from '@/lib/qrSvg';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import type { Wallet } from './facts';
import { stampsLeftPhrase } from './loyaltyRules';

function scanFrameWatermarkSvg(fill: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="220" height="220"><defs><mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512"><rect x="112" y="112" width="288" height="288" rx="72" fill="#fff"/><g fill="#000"><g transform="translate(256 258) scale(0.78) translate(-252 -261)"><rect x="174.0" y="166" width="18" height="80" rx="9.0"/><rect x="201.0" y="166" width="18" height="80" rx="9.0"/><rect x="228.0" y="166" width="18" height="80" rx="9.0"/><path d="M174.0 228 H246.0 V244 C246.0 264 230.0 274 210 274 C190.0 274 174.0 264 174.0 244 Z"/><rect x="199.0" y="250" width="22" height="108" rx="11.0"/><path d="M286 164 C 326 172 340 226 322 276 H 286 Z"/><rect x="286" y="262" width="24" height="96" rx="12.0"/></g><path d="M150 184 V150 H184" fill="none" stroke="#000" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/><path d="M362 184 V150 H328" fill="none" stroke="#000" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/><path d="M150 328 V362 H184" fill="none" stroke="#000" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/><path d="M362 328 V362 H328" fill="none" stroke="#000" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/></g></mask></defs><rect width="512" height="512" fill="${fill}" mask="url(#m)"/></svg>`;
}

export function WalletCard({
  venueName,
  venueInitials,
  wallet,
  flipped,
  onFlip,
}: {
  venueName: string;
  venueInitials: string;
  wallet: Wallet;
  flipped: boolean;
  onFlip: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const target = wallet.progress.nextCost ?? 8;
  const slotCount = Math.max(3, Math.min(target, 12));
  const qrText = wallet.liveClaim ? wallet.liveClaim.code : wallet.qrPayload;

  return (
    <View style={[styles.card, { backgroundColor: theme.fill }]}>
      <View pointerEvents="none" style={styles.watermark}>
        <SvgXml xml={scanFrameWatermarkSvg(theme.onFill)} width={220} height={220} />
      </View>
      <View style={styles.topRow}>
        <View style={[styles.logoBadge, { borderColor: theme.onFill }]}>
          <Text variant="body-strong" style={{ color: theme.onFill }}>
            {venueInitials}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="body-strong" style={{ color: theme.onFill }}>
            {venueName}
          </Text>
          <Text variant="caption" style={{ color: theme.onFill, opacity: 0.86 }}>
            {wallet.guestName ? `${wallet.guestName} · ` : ''}
            {t('loyalty.since', { date: wallet.memberSince })}
          </Text>
        </View>
        <View style={styles.rightTop}>
          <View style={[styles.tierPill, { borderColor: theme.onFill }]}>
            <Text variant="caption" style={[styles.tierText, { color: theme.onFill }]}>
              {t(`loyalty.tiers.${wallet.tier}`)}
            </Text>
          </View>
          <Text variant="display-m" style={[styles.counter, { color: theme.onFill }]}>
            {wallet.progress.kind === 'stamps'
              ? `${wallet.progress.balance}/${target}`
              : `${wallet.progress.balance} pts`}
          </Text>
        </View>
      </View>

      {flipped ? (
        <View style={styles.backFace}>
          <View style={styles.qrPad}>
            <SvgXml xml={qrSvg(qrText, 124)} width={124} height={124} />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            {wallet.liveClaim ? (
              <>
                <Text variant="caption" style={{ color: theme.onFill, opacity: 0.88 }}>
                  {wallet.liveClaim.title}
                </Text>
                <Text variant="display-m" style={[styles.codeText, { color: theme.onFill }]}>
                  {wallet.liveClaim.code}
                </Text>
                <Text variant="caption" style={{ color: theme.onFill }}>
                  {t('loyalty.claimTitle')}
                </Text>
              </>
            ) : (
              <>
                <Text variant="caption" style={{ color: theme.onFill, opacity: 0.86 }}>
                  {t('loyalty.cardNumber')}
                </Text>
                <Text variant="body-strong" style={[styles.mono, { color: theme.onFill }]}>
                  {wallet.cardNumber}
                </Text>
                <Text variant="caption" style={{ color: theme.onFill }}>
                  {t('loyalty.scanAtTable')}
                </Text>
              </>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.frontBody}>
          {wallet.progress.kind === 'stamps' ? (
            <View style={styles.stampsGrid}>
              {Array.from({ length: slotCount }, (_, index) => {
                const filled = index < wallet.progress.balance;
                const isLast = index === slotCount - 1;
                return (
                  <View
                    key={index}
                    style={[
                      styles.stampCircle,
                      filled
                        ? {
                            backgroundColor: theme.onFill,
                            borderColor: theme.onFill,
                            borderStyle: 'solid',
                          }
                        : { borderColor: theme.onFill, borderStyle: 'dashed' },
                    ]}
                  >
                    {filled ? (
                      <Utensils color={theme.fill} size={18} strokeWidth={2.2} />
                    ) : isLast ? (
                      <Gift color={theme.onFill} size={18} strokeWidth={2} />
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              <View style={[styles.track, { borderColor: theme.onFill }]}>
                <View
                  style={[
                    styles.trackFill,
                    {
                      backgroundColor: theme.onFill,
                      width: `${Math.min(100, Math.round((wallet.progress.balance / Math.max(1, target)) * 100))}%`,
                    },
                  ]}
                />
              </View>
              <Text variant="caption" style={{ color: theme.onFill }}>
                {t('loyalty.progressPoints', {
                  balance: wallet.progress.balance,
                  total: target,
                  left: wallet.progress.left ?? 0,
                })}
              </Text>
            </View>
          )}
          <Text variant="body-strong" style={{ color: theme.onFill }}>
            {wallet.liveClaim
              ? t('loyalty.progressClaim', { code: wallet.liveClaim.code })
              : wallet.progress.kind === 'stamps'
                ? stampsLeftPhrase(wallet.progress.balance, target)
                : wallet.progress.state === 'ready'
                  ? t('loyalty.progressReady')
                  : t('loyalty.progressPoints', {
                      balance: wallet.progress.balance,
                      total: target,
                      left: wallet.progress.left ?? 0,
                    })}
          </Text>
        </View>
      )}

      <View style={[styles.footerRow, { borderTopColor: theme.onFill }]}>
        <Text variant="caption" style={[styles.mono, { color: theme.onFill }]}>
          {wallet.cardNumber} · {wallet.phoneMasked}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={flipped ? t('loyalty.flipToFront') : t('loyalty.flipToQr')}
          onPress={onFlip}
          style={[styles.flipBtn, { borderColor: theme.onFill }]}
        >
          {flipped ? (
            <RotateCcw color={theme.onFill} size={14} strokeWidth={2} />
          ) : (
            <QrCode color={theme.onFill} size={14} strokeWidth={2} />
          )}
          <Text variant="caption" style={{ color: theme.onFill, fontFamily: 'Inter_600' }}>
            {flipped ? t('loyalty.flipToFront') : t('loyalty.flipToQr')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, padding: 20, gap: 16, overflow: 'hidden', position: 'relative' },
  watermark: { position: 'absolute', right: -36, bottom: -36, opacity: 0.1 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightTop: { alignItems: 'flex-end', gap: 4 },
  tierPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 },
  tierText: { fontFamily: 'Inter_600', textTransform: 'uppercase', fontSize: 11 },
  counter: { fontVariant: ['tabular-nums'] },
  frontBody: { gap: 14 },
  stampsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  stampCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: { height: 12, borderRadius: 999, borderWidth: 1.5, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: 999 },
  backFace: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 4 },
  qrPad: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 10 },
  codeText: { letterSpacing: 2, fontVariant: ['tabular-nums'] },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  mono: { fontVariant: ['tabular-nums'] },
  flipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    height: 34,
  },
});
