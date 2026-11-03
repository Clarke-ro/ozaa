import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { hapticSelection } from '@/lib/haptics';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import type { Wallet } from './facts';
import { stampCard } from './loyaltyRules';
import { WalletCardBack } from './WalletCardBack';
import { WalletCardFront } from './WalletCardFront';

// Width to height. A touch taller than a bank card, so the stamp circles have room.
const CARD_RATIO = 1.1;
const FLIP_MS = 300;
// How far away the eye is for the 3D turn; smaller looks more dramatic.
const PERSPECTIVE = 1200;

/**
 * The guest's card. The front shows the stamps; tapping the card turns it over to a big QR
 * for staff to scan, and tapping again turns it back.
 */
export function WalletCard({
  venueName,
  venueInitials,
  wallet,
  rewardCosts,
  flipped,
  onFlip,
}: {
  venueName: string;
  venueInitials: string;
  wallet: Wallet;
  /** Every reward's cost, so the card can mark each one and count toward the next. */
  rewardCosts: readonly number[];
  flipped: boolean;
  onFlip: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const turn = useSharedValue(flipped ? 1 : 0);
  useEffect(() => {
    turn.value = withTiming(flipped ? 1 : 0, { duration: FLIP_MS });
  }, [flipped, turn]);

  const card = stampCard(wallet.progress.balance, rewardCosts);
  const qrText = wallet.liveClaim ? wallet.liveClaim.code : wallet.qrPayload;

  // With Reduce Motion on, the faces fade instead of turning.
  const front = useAnimatedStyle(() =>
    reduceMotion
      ? { opacity: 1 - turn.value }
      : {
          opacity: turn.value < 0.5 ? 1 : 0,
          transform: [
            { perspective: PERSPECTIVE },
            { rotateY: `${interpolate(turn.value, [0, 1], [0, 180])}deg` },
          ],
        },
  );
  const back = useAnimatedStyle(() =>
    reduceMotion
      ? { opacity: turn.value }
      : {
          opacity: turn.value < 0.5 ? 0 : 1,
          transform: [
            { perspective: PERSPECTIVE },
            { rotateY: `${interpolate(turn.value, [0, 1], [180, 360])}deg` },
          ],
        },
  );

  const status = t('loyalty.cardA11y', {
    venue: venueName,
    counter: card.counter,
    tier: t(`loyalty.tiers.${wallet.tier}`),
  });

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={flipped ? t('loyalty.backA11y') : status}
        accessibilityHint={flipped ? t('loyalty.tapBack') : t('loyalty.tapToScan')}
        onPress={() => {
          void hapticSelection();
          onFlip();
        }}
        style={({ pressed }) => [styles.card, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
      >
        <Animated.View
          style={[StyleSheet.absoluteFill, front]}
          pointerEvents={flipped ? 'none' : 'auto'}
        >
          <WalletCardFront
            venueName={venueName}
            venueInitials={venueInitials}
            wallet={wallet}
            card={card}
            qrText={qrText}
          />
        </Animated.View>
        <Animated.View
          style={[StyleSheet.absoluteFill, back]}
          pointerEvents={flipped ? 'auto' : 'none'}
        >
          <WalletCardBack wallet={wallet} qrText={qrText} />
        </Animated.View>
      </Pressable>
      <Text variant="caption" style={[styles.hint, { color: theme.meta }]}>
        {flipped ? t('loyalty.tapBack') : t('loyalty.tapToScan')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space[3] },
  card: { width: '100%', aspectRatio: CARD_RATIO },
  hint: { textAlign: 'center' },
});
