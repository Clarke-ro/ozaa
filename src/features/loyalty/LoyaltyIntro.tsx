import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Gift } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { guestFont, useTheme } from '@/ui/theme';
import type { Programme } from './factsTypes';

const STAMP = 44;
const PER_ROW = 5;

/**
 * Loyalty for someone not yet in (canvas): an empty stamp card in the venue colour, so the guest
 * sees what they would collect, then Join. A points programme shows the card without circles.
 */
export function LoyaltyIntro({
  venueName,
  programme,
  onJoin,
}: {
  venueName: string;
  programme: Programme | null;
  onJoin: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const ink = theme.onFill;
  // The last reward is the full card; earlier ones are stops on the way.
  const goal = programme?.rewards[programme.rewards.length - 1];
  const stamps = programme?.earn.kind === 'stamps' && goal ? goal.cost : 0;
  return (
    <View style={styles.stack}>
      <View style={[styles.card, { backgroundColor: theme.fill }]}>
        <View style={styles.head}>
          <Text
            style={[styles.venue, { color: ink, fontFamily: theme.displayFont }]}
            numberOfLines={1}
          >
            {venueName}
          </Text>
          {stamps ? (
            <Text style={[styles.count, { color: ink }]}>
              {t('loyalty.introCount', { total: stamps })}
            </Text>
          ) : null}
        </View>
        {stamps ? (
          <View style={styles.dots} accessibilityElementsHidden>
            {Array.from({ length: stamps }, (_, i) => (
              <View
                key={i}
                style={[styles.dot, { borderColor: ink }, i === stamps - 1 && styles.dashed]}
              >
                {i === stamps - 1 ? <Gift size={16} color={ink} /> : null}
              </View>
            ))}
          </View>
        ) : null}
        <Text variant="body" style={{ color: ink }}>
          {goal
            ? stamps
              ? t('loyalty.introGoal', { count: stamps, reward: goal.title })
              : t('loyalty.introPoints', { reward: goal.title })
            : t('loyalty.introTitle', { venue: venueName })}
        </Text>
      </View>
      <Button label={t('loyalty.join')} onPress={onJoin} />
      <Text variant="caption" style={[styles.note, { color: theme.muted }]}>
        {t('loyalty.introFree')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[3] },
  card: {
    gap: tokens.space[4],
    padding: tokens.space[5],
    borderRadius: tokens.radius.xl,
    borderCurve: 'continuous',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  venue: { flex: 1, fontSize: 18, lineHeight: 24 },
  count: { fontSize: 14, fontFamily: guestFont.strong },
  // Five across, like the canvas card.
  dots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space[3],
    maxWidth: STAMP * PER_ROW + tokens.space[3] * (PER_ROW - 1),
  },
  dot: {
    width: STAMP,
    height: STAMP,
    borderRadius: STAMP / 2,
    borderWidth: 1.5,
    opacity: 0.85,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashed: { borderStyle: 'dashed' },
  note: { textAlign: 'center' },
});
