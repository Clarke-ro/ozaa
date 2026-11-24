import type { ApiClient } from '@/lib/api/client';
import { decideMockCard } from './cardBox';
import { createMockContext, type MockOptions } from './mockContext';
import { mockAuthCalls } from './mockAuthCalls';
import { mockOwnerAuth } from './mockOwnerAuth';
import { loadDemo, saveDemoSoon } from './demoMemory';
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
import { mockOwnerChannelCalls } from './mockOwnerChannelCalls';

export type { MockOptions } from './mockContext';

/**
 * Demo builds: after any owner change, save the owner's settings on this device (demoMemory.ts),
 * so a reload keeps what they switched on.
 */
function rememberOwnerChanges(
  api: ApiClient,
  world: ReturnType<typeof createMockContext>['world'],
): ApiClient {
  const wrapped = { ...api } as Record<string, unknown>;
  for (const [name, value] of Object.entries(api)) {
    if (typeof value !== 'function' || !(name.startsWith('owner') || name === 'updateMyProfile'))
      continue;
    const call = value as (...args: unknown[]) => Promise<unknown>;
    wrapped[name] = async (...args: unknown[]) => {
      const result = await call(...args);
      saveDemoSoon(world);
      return result;
    };
  }
  return wrapped as ApiClient;
}

/** The mock API on its own, for tests and screens that don't sign anyone in. */
export function createMockClient(options: MockOptions = {}): ApiClient {
  return createMockApi(options).api;
}

/**
 * The whole mock: one in-memory world shared by every call, plus the stand-in for Clerk sign-in
 * on the same world, so a mock sign-in works for the mock owner calls. Each area has its own file.
 */
export function createMockApi(options: MockOptions & { remember?: boolean } = {}): {
  api: ApiClient;
  auth: OwnerAuth;
} {
  const ctx = createMockContext(
    options.remember ? { ...options, beforeFirstCall: loadDemo } : options,
  );
  const { world } = ctx;

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
    ...mockOwnerChannelCalls(ctx),
  };
  return {
    api: options.remember ? rememberOwnerChanges(api, world) : api,
    auth: mockOwnerAuth(ctx),
  };
}

export { decideMockCard };
