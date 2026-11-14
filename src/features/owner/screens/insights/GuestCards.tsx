import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Svg, { Circle } from 'react-native-svg';
import { Clock } from 'lucide-react-native';
import type { InsightsReport } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { BarChart, hourLabel, TitledSection } from '../../kit';

type Props = { report: InsightsReport; style?: object };

const RING = 150;
const STROKE = 18;

/**
 * Returning guests as a ring (design canvas): the share who came back in the middle, then the
 * two groups under it and a link to the customer list.
 */
export function ReturningCard({ report: r, style }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const share = r.repeatGuests.sharePercent;
  const radius = (RING - STROKE) / 2;
  const around = 2 * Math.PI * radius;
  return (
    <TitledSection title={t('ownerInsights.guests')} style={style} cardStyle={styles.card}>
      <View
        style={styles.ring}
        accessible
        accessibilityLabel={t('ownerInsights.cameBackA11y', { percent: share })}
      >
        <Svg width={RING} height={RING}>
          <Circle
            cx={RING / 2}
            cy={RING / 2}
            r={radius}
            stroke={theme.wash}
            strokeWidth={STROKE}
            fill="none"
          />
          <Circle
            cx={RING / 2}
            cy={RING / 2}
            r={radius}
            stroke={theme.fill}
            strokeWidth={STROKE}
            fill="none"
            strokeDasharray={`${(share / 100) * around} ${around}`}
            // Start at twelve o'clock, like the canvas.
            transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
          />
        </Svg>
        <View style={styles.centre}>
          <Text style={styles.percent}>{share}%</Text>
          <Text style={[styles.small, { color: theme.meta }]}>{t('ownerInsights.cameBack')}</Text>
        </View>
      </View>
      <View style={styles.legend}>
        <Key
          color={theme.fill}
          label={t('ownerInsights.cameBackRow')}
          value={t('ownerInsights.guestsCount', { count: r.repeatGuests.count })}
        />
        <Key color={theme.line} label={t('ownerInsights.firstVisit')} value={`${100 - share}%`} />
      </View>
      <Button
        label={t('ownerInsights.seeCustomers')}
        tone="secondary"
        onPress={() => router.push('/owner/customers')}
        style={styles.button}
      />
    </TitledSection>
  );
}

function Key({ color, label, value }: { color: string; label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.key}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.keyLabel]}>{label}</Text>
      <Text style={[styles.keyValue, { color: theme.muted }]}>{value}</Text>
    </View>
  );
}

/** Visits by hour of the day as bars, with the busiest hour said in words under them. */
export function WhenCard({ report: r, style }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const hours = r.visitsByHour ?? [];
  const busiest = [...hours].sort((a, b) => b.visits - a.visits)[0];
  return (
    <TitledSection
      title={t('ownerInsights.whenGuestsCome')}
      style={style}
      cardStyle={styles.whenCard}
    >
      {hours.length === 0 ? (
        <Text variant="body" style={{ color: theme.muted }}>
          {t('ownerInsights.noVisits')}
        </Text>
      ) : (
        <>
          <BarChart
            bars={hours.map((h) => ({ label: hourLabel(h.hour), value: h.visits }))}
            format={(v) => t('ownerInsights.visits', { count: v })}
            summary={t('ownerInsights.whenGuestsCome')}
          />
          {busiest && busiest.visits > 0 ? (
            <View style={[styles.tip, { borderTopColor: theme.wash }]}>
              <Clock size={18} color={theme.ink} />
              <Text style={styles.tipText}>
                {t('ownerInsights.busiestTip', { hour: hourLabel(busiest.hour) })}
              </Text>
            </View>
          ) : null}
        </>
      )}
    </TitledSection>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: 18 },
  whenCard: { gap: tokens.space[4] },
  ring: { width: RING, height: RING },
  centre: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percent: { fontSize: 24, lineHeight: 30, fontFamily: fontFamily.strong },
  small: { fontSize: 12, lineHeight: 16 },
  legend: { alignSelf: 'stretch', gap: 10 },
  key: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  keyLabel: { flex: 1, fontSize: 15, lineHeight: 20 },
  keyValue: { fontSize: 15, lineHeight: 20, fontFamily: fontFamily.strong },
  button: { alignSelf: 'stretch', minHeight: 44 },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: tokens.space[4],
    borderTopWidth: 1,
  },
  tipText: { flex: 1, fontSize: 15, lineHeight: 22 },
});
