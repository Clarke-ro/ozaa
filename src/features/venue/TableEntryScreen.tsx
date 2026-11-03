import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { z } from 'zod/mini';
import { api } from '@/lib/api';
import { useGuestSession } from '@/features/session';
// Mock only: the contract does not return the open order on the session yet, so the mock keeps
// it on the side. In http mode this always answers null.
import { peekOpenOrder } from '@/mocks/openOrder';
import { ErrorState, LoadingState } from '@/ui/states';

const tableSchema = z.string().check(z.regex(/^[A-Za-z0-9-]{1,12}$/));

/**
 * Where a table's QR code lands (/slug/t/12): open a guest session for that table, then go
 * to the venue's home. A bad code goes back to the start; a failed request can be retried.
 */
export function TableEntryScreen({ slug, table }: { slug: string; table: string | undefined }) {
  const router = useRouter();
  const saveGuest = useGuestSession((state) => state.saveGuest);
  const parsed = tableSchema.safeParse(table);
  const tableCode = parsed.success ? parsed.data : null;
  const [failed, setFailed] = useState(false);
  // Bumped by Try again to run the request once more.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!tableCode) return;
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
        router.replace(`/${slug}`);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [slug, router, saveGuest, tableCode, attempt]);

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
  return <LoadingState />;
}
