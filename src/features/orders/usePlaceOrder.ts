import { useState } from 'react';
import { useRouter, type Href } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { api } from '@/lib/api';
import type { CreateOrderRequest } from '@/lib/api/types';
import { toMessageKey } from '@/lib/api/errors';
import { useRetryKey } from '@/lib/retryKey';
import { useCart, type CartLine } from '@/features/cart';
import { pastOrderFrom, useOrderHistory } from '@/features/history';
import { openCheckout, placeOrderPlan, type PayInput } from '@/features/pay';
import { useGuestSession, useMyCalls } from '@/features/session';

/**
 * Place order, in one tap (design canvas, Clarke 2026-11-23):
 *   make the order → MoMo or card: quote the bill, start the payment, open the payment page
 *                  → cash at a table: ask the waiter for the bill → the order's status
 *                  → cash on delivery, or a venue with no payments in the app: the order's status
 * Paystack's page sends the guest back to /{slug}/pay?reference=…, which checks the payment and
 * shows paid or not. If starting the payment fails, the order is already in, so the guest lands
 * on the Pay page to try again rather than ordering twice.
 */
export function usePlaceOrder({
  slug,
  online,
  table,
  place,
  currency,
  payNext,
}: {
  slug: string;
  online: boolean;
  table: boolean;
  place: string;
  currency: string;
  payNext: boolean;
}) {
  const router = useRouter();
  const keyFor = useRetryKey();
  const clear = useCart((state) => state.clear);
  const setOrderId = useGuestSession((state) => state.setOrderId);
  const saveGuest = useGuestSession((state) => state.saveGuest);
  const hasSession = useGuestSession((state) => state.slug === slug && Boolean(state.token));
  const remember = useOrderHistory((state) => state.remember);
  const rememberCalls = useMyCalls((state) => state.add);
  const [sending, setSending] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const go = (path: string) => router.replace(path as Href);

  const pay = async (orderId: string, input: PayInput, lineIds: string[]) => {
    const quote = await api.quoteBill(orderId, {
      mode: input.mode,
      parts: input.mode === 'equal' ? input.parts : undefined,
      lineIds: input.mode === 'items' ? lineIds : undefined,
      tip: { percent: input.tip },
    });
    // No phone and no network: Paystack's page asks for them (contract, 2026-11-23).
    const payment = await api.initializePayment(
      { quoteId: quote.quoteId, method: input.pick === 'card' ? 'card' : 'momo' },
      { idempotencyKey: Crypto.randomUUID() },
    );
    if (!payment.authorizationUrl) return go(`/${slug}/pay`);
    const where = await openCheckout(payment.authorizationUrl, (path) => router.push(path as Href));
    // In the app the page opens in a browser sheet; when it closes, check the payment.
    if (where === 'back') go(`/${slug}/pay?reference=${payment.reference}`);
  };

  const placeOrder = async (
    lines: readonly CartLine[],
    fulfilment: CreateOrderRequest['fulfilment'] | undefined,
    input: PayInput,
    note = '',
  ) => {
    setSending(true);
    setErrorKey(null);
    const body = {
      lines: lines.map((line) => ({
        menuItemId: line.menuItemId,
        quantity: line.quantity,
        modifierOptionIds: line.modifierOptionIds,
        note: line.note,
      })),
      ...(fulfilment ? { fulfilment } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    };
    // A retry of the same basket reuses the id, so a lost reply never makes a second order.
    const clientOrderId = keyFor(body);
    let orderId: string;
    let lineIds: string[] = [];
    try {
      // A menu-link visit has no table scan to start a session, so start one now (no personal data).
      if (online && !hasSession) {
        const session = await api.createGuestSession({ venueSlug: slug });
        saveGuest({ token: session.guestToken, slug, tableCode: null });
      }
      const order = await api.createOrder(
        { clientOrderId, ...body },
        { idempotencyKey: clientOrderId },
      );
      // Online customers find it again under My orders (no account, no personal data kept).
      if (online) remember(pastOrderFrom(order, slug, place, currency));
      setOrderId(order.id);
      clear();
      orderId = order.id;
      // My items: the order keeps the basket's line order, so the ticked lines map across.
      lineIds = order.lines
        .filter((_, index) => input.mine.includes(lines[index]?.key ?? ''))
        .map((line) => line.id);
    } catch (failure) {
      setErrorKey(toMessageKey(failure));
      setSending(false);
      return;
    }
    const plan = payNext ? placeOrderPlan(input.pick, { table }) : 'send';
    try {
      if (plan === 'checkout') return await pay(orderId, input, lineIds);
      if (plan === 'bill') {
        // Asking for the bill is a waiter call, so staff see it with the table's other calls.
        const call = await api.callWaiter(
          { reason: 'bill' },
          { idempotencyKey: Crypto.randomUUID() },
        );
        rememberCalls([call.id]);
      }
      go(`/${slug}/status`);
    } catch {
      go(plan === 'checkout' ? `/${slug}/pay` : `/${slug}/status`);
    }
  };

  return { placeOrder, sending, errorKey };
}
