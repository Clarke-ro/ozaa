import { StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { OwnerDashboard } from '@/lib/api/types';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { useOwnerLayout } from '../../chrome/layout';
import { canOpen } from '../../chrome/nav';
import { salesLine } from '../../desk/dashboardModel';
import { figureText } from './figureText';
import { HeroCard } from './HeroCard';
import { StatCard } from './StatCard';
import { todayFigures, type Figure } from './todayFigures';

/**
 * The top of Today: the dark card with the day's main number, then three small cards. Wide
 * screens put all four in one row, the dark card twice as wide; phones give the dark card the
 * full width and put the three small ones in a row under it.
 */
export function StatsRow({ dashboard: d }: { dashboard: OwnerDashboard }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { wide } = useOwnerLayout();
  const role = useOwnerSession((state) => state.role) ?? 'waiter';
  const { hero, cards } = todayFigures(d);
  const go = (f: Figure) => (canOpen(role, f.href) ? () => router.push(f.href as Href) : undefined);
  const top = figureText(hero, d.currency, t);
  // Sales carry the brand sentence ("You made GH₵2,480 today, 12% more than yesterday.").
  const line = salesLine(d);
  const note = t(line.key, { amount: top.value, percent: line.percent ?? 0 });

  const small = cards.map((f) => {
    const text = figureText(f, d.currency, t);
    return (
      <StatCard key={f.key} label={text.label} value={text.value} onPress={go(f)} compact={!wide} />
    );
  });

  return (
    <View style={wide ? styles.row : styles.stack}>
      <View style={wide ? styles.heroWide : undefined}>
        <HeroCard
          label={top.label}
          value={top.value}
          note={note}
          link={t('ownerDash.viewSales')}
          onPress={go(hero)}
        />
      </View>
      <View style={[styles.row, wide && styles.smallWide]}>{small}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.owner.controls.listGap },
  row: { flexDirection: 'row', gap: tokens.owner.controls.listGap },
  // The dark card takes two parts of the row and the three small cards three, so the dark card
  // is about twice as wide as one small card.
  heroWide: { flex: 2 },
  smallWide: { flex: 3 },
});
