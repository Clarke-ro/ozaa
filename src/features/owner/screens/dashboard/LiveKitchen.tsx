import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { DEFAULT_CURRENCY } from '@/lib/money';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { useOwnerLayout } from '../../chrome/layout';
import { canOpen } from '../../chrome/nav';
import { SkeletonBlock } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { useOrderMove } from '../orders/useOrderMove';
import { Band } from './Band';
import { kitchenFlow } from './kitchenFlow';
import { SectionHead } from './SectionHead';
import { TicketTable } from './TicketTable';

// Five is about one screen of tickets; the full list lives on Orders.
const SHOWN = 5;
// Wait times move every half minute; the tickets themselves refresh every 5 seconds.
const TICK_MS = 30_000;
const LIVE_MS = 5000;

/**
 * The kitchen on Today: the New, Cooking and Ready counts and any late stage, then the oldest
 * open tickets. On wide screens the next step works right here. Viewers cannot open Orders, so
 * for them it is read-only. (Named LiveKitchen, not KitchenFlow, because Windows sees
 * `./KitchenFlow` and the pure `./kitchenFlow` as one file.)
 */
export function LiveKitchen({ venueId }: { venueId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { wide } = useOwnerLayout();
  const role = useOwnerSession((s) => s.role) ?? 'waiter';
  const move = useOrderMove(venueId, role);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);
  const orders = useQuery({
    queryKey: ownerKeys.orders(venueId),
    queryFn: () => api.ownerListOrders(venueId),
    enabled: Boolean(venueId),
    refetchInterval: LIVE_MS,
  });
  const venue = useQuery({
    queryKey: ownerKeys.venue(venueId),
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });
  const flow = kitchenFlow(orders.data?.items ?? [], now);
  const currency = venue.data?.currency ?? DEFAULT_CURRENCY;
  const open = canOpen(role, '/owner/orders') ? () => router.push('/owner/orders') : undefined;

  return (
    <Band>
      <SectionHead
        title={t('owner.liveOrders')}
        meta={flow.open.length ? t('ownerDash.openCount', { count: flow.open.length }) : undefined}
        action={open ? t('ownerDash.seeAll') : undefined}
        onAction={open}
      />
      {orders.isLoading ? (
        // Labelled like DeskWait's skeleton, so screenshot tests wait for this section too.
        <View accessibilityRole="progressbar" accessibilityLabel={t('errors.loading')}>
          <SkeletonBlock height={tokens.space[16] * 3} />
        </View>
      ) : (
        <TicketTable
          stages={flow.stages}
          orders={flow.open.slice(0, SHOWN)}
          currency={currency}
          now={now}
          wide={wide}
          move={move}
          onOpen={open}
        />
      )}
    </Band>
  );
}
