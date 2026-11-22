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
import { NeedsYou } from './NeedsYou';
import { StatsRow } from './StatsRow';
import { POLL_MS } from '@/lib/polling';

const SKELETON = tokens.space[16] + tokens.space[12];

/**
 * Today, laid out like a home dashboard in one centred column: a greeting, the stats row (the
 * day's main number in a dark card and three small cards), the setup steps (owners, until done)
 * then what needs someone now (from the notification feed), the setup steps (owners, until done)
 * and a grid of shortcuts. Every block is a white card on the warm grey page, split by space.
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
  // Good morning or evening by the venue's clock, not the phone's.
  const timeZone = venue.data?.hours.timezone;
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone }).format(
      new Date(),
    ),
  );
  const part = dayPart(hour);
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
      compactTitle
      // Phones: the location sits at the top, in the bar. Wide screens have it in the sidebar.
      barStart={<LocationSwitcher variant="chip" />}
    >
      <DeskWait
        loading={desk.isPending}
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
          <View style={wide ? styles.stack : styles.stackPhone}>
            <StatsRow dashboard={d} />
            <NeedsYou />
            <SetupList />
            <QuickActions />
          </View>
        ) : null}
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  // The canvas puts 56 px between Today's sections; phones use 32 so more fits on one screen.
  stack: { gap: tokens.owner.controls.todayGap },
  stackPhone: { gap: tokens.space[8] },
});
