import { create } from 'zustand';
import { setAccessToken, setGuestToken, setLoyaltyToken as setApiLoyaltyToken } from '@/lib/api';
import type { StaffRole } from '@/lib/api/types';

type GuestSessionState = {
  token: string | null;
  slug: string | null;
  tableCode: string | null;
  orderId: string | null;
  loyaltyToken: string | null;
  saveGuest: (input: { token: string; slug: string; tableCode: string | null; orderId?: string | null }) => void;
  setOrderId: (orderId: string) => void;
  setLoyaltyToken: (token: string | null) => void;
};

type OwnerSessionState = {
  accessToken: string | null;
  refreshToken: string | null;
  venueId: string | null;
  role: StaffRole | null;
  firstName: string | null;
  saveOwner: (input: {
    accessToken: string;
    refreshToken: string;
    venueId: string;
    role: StaffRole;
    firstName: string;
  }) => void;
  switchVenue: (venueId: string) => void;
  clearOwner: () => void;
};

export const useGuestSession = create<GuestSessionState>((set) => ({
  token: null,
  slug: null,
  tableCode: null,
  orderId: null,
  loyaltyToken: null,
  saveGuest: ({ token, slug, tableCode, orderId = null }) => {
    setGuestToken(token);
    set({ token, slug, tableCode, orderId });
  },
  setOrderId: (orderId) => set({ orderId }),
  setLoyaltyToken: (loyaltyToken) => {
    setApiLoyaltyToken(loyaltyToken);
    set({ loyaltyToken });
  },
}));

export const useOwnerSession = create<OwnerSessionState>((set) => ({
  accessToken: null,
  refreshToken: null,
  venueId: null,
  role: null,
  firstName: null,
  saveOwner: ({ accessToken, refreshToken, venueId, role, firstName }) => {
    setAccessToken(accessToken);
    set({ accessToken, refreshToken, venueId, role, firstName });
  },
  switchVenue: (venueId) => set({ venueId }),
  clearOwner: () => {
    setAccessToken(null);
    set({ accessToken: null, refreshToken: null, venueId: null, role: null, firstName: null });
  },
}));
