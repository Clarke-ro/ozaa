import { StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { OwnerDashboard } from '@/lib/api/types';
import { PAYMENTS_ENABLED } from '@/lib/features';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { canOpen } from '../../chrome/nav';
import { Band } from './Band';
import { heroText, lineText } from './figureText';
import { InlineFigure } from './InlineFigure';
import { PulseFigure } from './PulseFigure';
import { todayFigures, type Figure } from './todayFigures';

/**
 * The top of Today: the day's big number, then one line of smaller figures under it
 * ("14 orders today  40 visitors  5 tables seated  4.6 from 12 ratings"). Each opens the page
 * behind it when this person's role may open that page; otherwise it is plain text.
 */
export function TodayPulse({ dashboard: d }: { dashboard: OwnerDashboard }) {
  const { t } = useTranslation();
  const router = useRouter();
  const role = useOwnerSession((state) => state.role) ?? 'waiter';
  const { hero, line } = todayFigures(d, { payments: PAYMENTS_ENABLED });
  const go = (f: Figure) =>
    canOpen(role, f.href) ? () => router.push(f.href as Href) : undefined;

  return (
    <Band first>
      <PulseFigure text={heroText(hero, d, t)} onPress={go(hero)} />
      <View style={styles.line}>
        {line.map((f) => {
          const text = lineText(f, d, t);
          return (
            <InlineFigure key={f.key} value={text.value} words={text.words} onPress={go(f)} />
          );
        })}
      </View>
    </Band>
  );
}

const styles = StyleSheet.create({
  // Pulled left by each figure's own padding, so the first number lines up with the big one.
  line: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: tokens.space[4],
    marginLeft: -tokens.space[2],
  },
});
