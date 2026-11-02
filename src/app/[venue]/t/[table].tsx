import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { z } from 'zod';
import { api } from '@/lib/api';
import { useGuestSession } from '@/features/session';
import { peekOpenOrder } from '@/mocks/openOrder';
import { ErrorState, LoadingState } from '@/ui/states';
const tableSchema = z.string().regex(/^[A-Za-z0-9-]{1,12}$/);

export default function TableEntry() {
  const params = useLocalSearchParams<{ venue: string; table: string }>();
  const router = useRouter();
  const saveGuest = useGuestSession((state) => state.saveGuest);
  const parsed = tableSchema.safeParse(params.table);
  const tableCode = parsed.success ? parsed.data : null;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!tableCode) return;
    const venue = params.venue ?? '';
    let live = true;
    api
      .createGuestSession({ venueSlug: venue, tableCode })
      .then((session) => {
        if (!live) return;
        saveGuest({
          token: session.guestToken,
          slug: venue,
          tableCode: session.table?.code ?? tableCode,
          orderId: peekOpenOrder(session.guestToken),
        });
        router.replace(`/${venue}`);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [params.venue, router, saveGuest, tableCode]);

  if (!parsed.success || failed) return <ErrorState onRetry={() => router.replace('/')} />;
  return <LoadingState />;
}
