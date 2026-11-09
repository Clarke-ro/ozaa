import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { LocationSwitcher } from '../../chrome/LocationSwitcher';
import { useOwnerLayout } from '../../chrome/layout';
import { DeskWait, OwnerPage, SkeletonBlock } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { dayPart } from './greeting';
import { QuickActions } from './QuickActions';
import { SetupList } from './SetupList';
import { StatsRow } from './StatsRow';
import { POLL_MS } from '@/lib/polling';

const SKELETON = tokens.space[16] + tokens.space[12];

/**
 * Today, laid out like a home dashboard in one centred column: a greeting, the stats row (the
 * day's main number in a dark card and three small cards), the setup steps (owners, until done)
 * and a grid of shortcuts. Live tickets live on Orders and urgent items behind the bell, so
 * Today stays a calm overview. Every block is a white card on the grey page, split by space.
 */
export function DashboardScreen() {
  const { t } = useTranslation();
  const { wide } = useOwnerLayout();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const firstName = useOwnerSession((state) => state.firstName);
  const desk = useQuery({
    queryKey: ownerKeys.dashboard(venueId),
    queryFn: () => api.ownerGetDashboard(venueId),
    enabled: Boolean(venueId),
    refetchInterval: POLL_MS.owner,
  });
  const venue = useQuery({
    queryKey: ownerKeys.venue(venueId),
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });
  const part = dayPart(new Date().getHours());
  const title = firstName
    ? t(`ownerDash.greet.${part}`, { name: firstName })
    : t(`ownerDash.greetPlain.${part}`);
  const name = venue.data?.name;
  const d = desk.data;

  return (
    <OwnerPage
      title={title}
      subtitle={name ? t('ownerDash.howToday', { venue: name }) : undefined}
      bell
    >
      {/* Wide screens have the location at the top of the sidebar. */}
      {wide ? null : (
        <View style={styles.location}>
          <LocationSwitcher variant="chip" />
        </View>
      )}
      <DeskWait
        loading={desk.isLoading}
        error={desk.isError}
        onRetry={() => void desk.refetch()}
        skeleton={
          <>
            <SkeletonBlock height={SKELETON} />
            <SkeletonBlock height={SKELETON} />
          </>
        }
      >
        {d ? (
          <View style={styles.stack}>
            <StatsRow dashboard={d} />
            <SetupList />
            <QuickActions />
          </View>
        ) : null}
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  location: { flexDirection: 'row' },
  stack: { gap: tokens.space[8] },
});
