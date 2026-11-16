import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useMyCalls } from './myCalls';
import { ownerSessionStorage } from './ownerStorage';
import { ownerRefresher } from './ownerRefresh';
import {
  api,
  ownerAuth,
  setAccessToken,
  setOnGuestUnauthorized,
  setGuestToken,
  setLoyaltyToken as setApiLoyaltyToken,
  setOnUnauthorized,
} from '@/lib/api';
import type { StaffRole } from '@/lib/api/types';

type GuestSessionState = {
  token: string | null;
  slug: string | null;
  tableCode: string | null;
  orderId: string | null;
  loyaltyToken: string | null;
  /** False until the saved visit has been read back (instant on web, a moment on phones). */
  hydrated: boolean;
  markHydrated: () => void;
  saveGuest: (input: {
    token: string;
    slug: string;
    tableCode: string | null;
    orderId?: string | null;
  }) => void;
  setOrderId: (orderId: string) => void;
  setLoyaltyToken: (token: string | null) => void;
  /**
   * The online-ordering link (/slug) was opened. A table visit at this venue ends here, so the
   * customer orders online and never to a table they left. Their own online order is kept.
   */
  startOnlineVisit: (slug: string) => void;
};

type OwnerSessionState = {
  /** Clerk's short-lived token, kept so the first calls after a restart don't wait on Clerk. */
  accessToken: string | null;
  venueId: string | null;
  role: StaffRole | null;
  firstName: string | null;
  /** False until the saved session has been read back, so the layout does not bounce to sign-in. */
  hydrated: boolean;
  markHydrated: () => void;
  saveOwner: (input: {
    accessToken: string;
    venueId: string;
    role: StaffRole;
    firstName: string;
  }) => void;
  /** A new token from Clerk; who is signed in stays the same. */
  saveToken: (accessToken: string) => void;
  switchVenue: (venueId: string) => void;
  clearOwner: () => void;
};

/**
 * The guest's visit: table, order and loyalty sign-in. Saved like the owner's sign-in (web:
 * sessionStorage, so a refresh keeps the order and closing the tab ends the visit; phones: the
 * secure keychain). Only ids and tokens, never a phone number or name (Act 843).
 */
export const useGuestSession = create<GuestSessionState>()(
  persist(
    (set, get) => ({
      token: null,
      slug: null,
      tableCode: null,
      orderId: null,
      loyaltyToken: null,
      hydrated: false,
      markHydrated: () => set({ hydrated: true }),
      saveGuest: ({ token, slug, tableCode, orderId = null }) => {
        // A new guest token is a new visit: the last table's waiter calls belong to that visit.
        if (get().token !== token) useMyCalls.getState().clear();
        setGuestToken(token);
        set({ token, slug, tableCode, orderId });
      },
      setOrderId: (orderId) => set({ orderId }),
      setLoyaltyToken: (loyaltyToken) => {
        setApiLoyaltyToken(loyaltyToken);
        set({ loyaltyToken });
      },
      startOnlineVisit: (slug) => {
        const state = get();
        if (state.slug !== slug || state.tableCode === null) return;
        useMyCalls.getState().clear();
        setGuestToken(null);
        set({ token: null, tableCode: null, orderId: null });
      },
    }),
    {
      name: 'cravins-guest-visit',
      storage: createJSONStorage(() => ownerSessionStorage),
      partialize: ({ token, slug, tableCode, orderId, loyaltyToken }) => ({
        token,
        slug,
        tableCode,
        orderId,
        loyaltyToken,
      }),
      onRehydrateStorage: (initial) => (state) => {
        // The API client keeps its own copies of the tokens; hand it the saved ones.
        if (state?.token) setGuestToken(state.token);
        if (state?.loyaltyToken) setApiLoyaltyToken(state.loyaltyToken);
        (state ?? initial).markHydrated();
      },
    },
  ),
);

export const useOwnerSession = create<OwnerSessionState>()(
  persist(
    (set) => ({
      accessToken: null,
      venueId: null,
      role: null,
      firstName: null,
      hydrated: false,
      markHydrated: () => set({ hydrated: true }),
      saveOwner: ({ accessToken, venueId, role, firstName }) => {
        setAccessToken(accessToken);
        set({ accessToken, venueId, role, firstName });
      },
      saveToken: (accessToken) => {
        setAccessToken(accessToken);
        set({ accessToken });
      },
      switchVenue: (venueId) => set({ venueId }),
      clearOwner: () => {
        setAccessToken(null);
        set({ accessToken: null, venueId: null, role: null, firstName: null });
      },
    }),
    {
      name: 'cravins-owner-session',
      storage: createJSONStorage(() => ownerSessionStorage),
      partialize: ({ accessToken, venueId, role, firstName }) => ({
        accessToken,
        venueId,
        role,
        firstName,
      }),
      onRehydrateStorage: (initial) => (state) => {
        // The API client keeps its own copy of the token; hand it the saved one.
        if (state?.accessToken) setAccessToken(state.accessToken);
        // If storage failed there is no state; mark the initial one so sign-in still shows.
        (state ?? initial).markHydrated();
      },
    },
  ),
);

// An expired owner token is swapped for a new one from Clerk behind the scenes
// (src/lib/api/ownerRetry.ts). If the Clerk sign-in has ended, the layout shows sign-in.
setOnUnauthorized(
  ownerRefresher({
    freshToken: () => ownerAuth.getToken({ fresh: true }),
    save: (token) => useOwnerSession.getState().saveToken(token),
    signOut: () => useOwnerSession.getState().clearOwner(),
  }),
);

// A guest's session runs out (or, in the demo, a page reload forgets it). When sending an order or
// calling the waiter comes back 401, start a new session for the same venue and table and try
// once more, so a guest never sees "unauthorized" (src/lib/api/guestRetry.ts).
setOnGuestUnauthorized(async () => {
  const { slug, tableCode } = useGuestSession.getState();
  if (!slug) return false;
  const session = await api.createGuestSession({
    venueSlug: slug,
    tableCode: tableCode ?? undefined,
  });
  useGuestSession.getState().saveGuest({ token: session.guestToken, slug, tableCode });
  return true;
});
