import type { ApiClient, TokenSource } from './client';
import { createHttpContext } from './httpContext';
import { httpAuthCalls } from './httpAuthCalls';
import { httpGuestCalls } from './httpGuestCalls';
import { httpOwnerVenueCalls } from './httpOwnerVenueCalls';
import { httpOwnerOrderCalls } from './httpOwnerOrderCalls';
import { httpOwnerMoreCalls } from './httpOwnerMoreCalls';
import { httpOwnerExtraCalls } from './httpOwnerExtraCalls';

/** The app's client for the real server, one file per area. Every call is typed by api/openapi.yaml. */
export function createHttpClient(baseUrl: string, tokens: TokenSource): ApiClient {
  const ctx = createHttpContext(baseUrl, tokens);
  return {
    ...httpAuthCalls(ctx),
    ...httpGuestCalls(ctx),
    ...httpOwnerVenueCalls(ctx),
    ...httpOwnerOrderCalls(ctx),
    ...httpOwnerMoreCalls(ctx),
    ...httpOwnerExtraCalls(ctx),
  };
}
