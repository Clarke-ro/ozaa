import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { useGuestSession } from '@/features/session';
// Mock only: the contract does not return the open order on the session yet, so the mock keeps
// it on the side. In http mode this always answers null.
import { peekOpenOrder } from '@/mocks/openOrder';
import { ErrorState, LoadingState } from '@/ui/states';
import { HomeScreen } from './HomeScreen';

const TABLE_CODE = /^[A-Za-z0-9-]{1,12}$/;

/**
 * Where a table's QR code lands (/slug/t/12), and the table guest's home from then on: open a
 * guest session for that table, then show the venue's home with its services right here. The
 * address stays /slug/t/12, so it never mixes with the online-ordering link (/slug).
 * A bad code goes back to the start; a failed request can be retried.
 */
export function TableEntryScreen({ slug, table }: { slug: string; table: string | undefined }) {
  const router = useRouter();
  const tableCode = typeof table === 'string' && TABLE_CODE.test(table) ? table : null;
  const saveGuest = useGuestSession((state) => state.saveGuest);
  // On phones the saved visit is read back a moment after start. Saving the table before that
  // finished let the old visit (no table) overwrite it, and orders then said "table only".
  const hydrated = useGuestSession((state) => state.hydrated);
  // Already at this table (back from the menu, or a reload): no new session needed.
  const here = useGuestSession(
    (state) => state.slug === slug && state.tableCode === tableCode && Boolean(state.token),
  );
  const [failed, setFailed] = useState(false);
  // Bumped by Try again to run the request once more.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!tableCode || here || !hydrated) return;
    let live = true;
    api
      .createGuestSession({ venueSlug: slug, tableCode })
      .then((session) => {
        if (!live) return;
        saveGuest({
          token: session.guestToken,
          slug,
          tableCode: session.table?.code ?? tableCode,
          orderId: peekOpenOrder(session.guestToken),
        });
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [slug, saveGuest, tableCode, here, hydrated, attempt]);

  if (!tableCode) return <ErrorState onRetry={() => router.replace('/')} />;
  if (failed) {
    return (
      <ErrorState
        onRetry={() => {
          setFailed(false);
          setAttempt((n) => n + 1);
        }}
      />
    );
  }
  return here ? <HomeScreen slug={slug} /> : <LoadingState />;
}
