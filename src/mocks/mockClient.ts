import type { ApiClient } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import type { Payment } from '@/lib/api/types';
import { decideMockCard } from './cardBox';
import { findOrder, venueById } from './world';
import { createMockContext, type MockOptions } from './mockContext';
import { mockAuthCalls } from './mockAuthCalls';
import { mockOwnerAuth } from './mockOwnerAuth';
import type { OwnerAuth } from '@/lib/auth/ownerAuth';
import { mockGuestCalls } from './mockGuestCalls';
import { mockGuestExtraCalls } from './mockGuestExtraCalls';
import { mockOwnerVenueCalls } from './mockOwnerVenueCalls';
import { mockOwnerOrderCalls } from './mockOwnerOrderCalls';
import { mockOwnerLoyaltyCalls } from './mockOwnerLoyaltyCalls';
import { mockOwnerDeskCalls } from './mockOwnerDeskCalls';
import { mockOwnerBusinessCalls } from './mockOwnerBusinessCalls';
import { mockOwnerPromoCalls } from './mockOwnerPromoCalls';
import { mockOwnerNotificationCalls } from './mockOwnerNotificationCalls';

export type { MockOptions } from './mockContext';

export type SandboxQuote = {
  orderId: string;
  venueSlug: string;
  amountPesewas: number;
  tipPesewas: number;
};

/**
 * Phase 2b only (EXPO_PUBLIC_API_LIVE=payments): lets the real payment calls read the bill quote
 * from this mock and put a succeeded payment on the mock order. Filled in by createMockClient.
 */
export const sandboxBridge: {
  quote: (quoteId: string) => SandboxQuote;
  /** `quoteId` on the first call for a payment, so a "My items" payment marks its own dishes. */
  track: (payment: Payment, quoteId?: string) => Payment;
} = {
  quote: () => {
    throw new Error('The mock API has not started.');
  },
  track: (payment) => payment,
};

/** The mock API on its own, for tests and screens that don't sign anyone in. */
export function createMockClient(options: MockOptions = {}): ApiClient {
  return createMockApi(options).api;
}

/**
 * The whole mock: one in-memory world shared by every call, plus the stand-in for Clerk sign-in
 * on the same world, so a mock sign-in works for the mock owner calls. Each area has its own file.
 */
export function createMockApi(options: MockOptions = {}): { api: ApiClient; auth: OwnerAuth } {
  const ctx = createMockContext(options);
  const { world, now, settle } = ctx;

  // Phase 2b: payments go to the sandbox server while the bill stays here (src/lib/api/index.ts).
  sandboxBridge.quote = (quoteId) => {
    const quote = world.quotes.get(quoteId);
    if (!quote || quote.expiresAt < now())
      throw new ApiError(409, 'quote_expired', 'That bill changed. Ask for a new total.');
    const live = findOrder(world, quote.orderId);
    return {
      orderId: quote.orderId,
      venueSlug: venueById(world, live.order.venueId).slug,
      amountPesewas: quote.share + quote.tip + quote.fee,
      tipPesewas: quote.tip,
    };
  };
  sandboxBridge.track = (payment, quoteId) => {
    const row = world.payments.get(payment.reference);
    if (!row)
      world.payments.set(payment.reference, { payment, phone: '', applied: false, quoteId });
    else if (!row.applied) row.payment = payment;
    // Only the server's "succeeded" puts money on the order, the same way a mock payment does.
    return payment.status === 'succeeded' ? settle(payment.reference) : payment;
  };

  const api: ApiClient = {
    ...mockAuthCalls(ctx),
    ...mockGuestCalls(ctx),
    ...mockGuestExtraCalls(ctx),
    ...mockOwnerVenueCalls(ctx),
    ...mockOwnerOrderCalls(ctx),
    ...mockOwnerLoyaltyCalls(ctx),
    ...mockOwnerDeskCalls(ctx),
    ...mockOwnerBusinessCalls(ctx),
    ...mockOwnerPromoCalls(ctx),
    ...mockOwnerNotificationCalls(ctx),
  };
  return { api, auth: mockOwnerAuth(ctx) };
}

export { decideMockCard };
