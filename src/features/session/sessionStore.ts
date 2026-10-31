import { create } from 'zustand';
import { setAccessToken, setGuestToken, setLoyaltyToken as setApiLoyaltyToken } from '@/lib/api';

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
  role: 'owner' | 'manager' | 'waiter' | 'kitchen' | null;
  firstName: string | null;
  saveOwner: (input: {
    accessToken: string;
    refreshToken: string;
    venueId: string;
    role: 'owner' | 'manager' | 'waiter' | 'kitchen';
    firstName: string;
  }) => void;
  clearOwner: () => void;
};

export const useGuestSession = create<GuestSessionState>((set) => ({
  token: null,
  slug: null,
  tableCode: null,
  orderId: null,
  loyaltyToken: null,
  saveGuest: (input) => {
    setGuestToken(input.token);
    set({ token: input.token, slug: input.slug, tableCode: input.tableCode, orderId: input.orderId ?? null });
  },
  setOrderId: (orderId) => set({ orderId }),
  setLoyaltyToken: (token) => {
    setApiLoyaltyToken(token);
    set({ loyaltyToken: token });
  },
}));

export const useOwnerSession = create<OwnerSessionState>((set) => ({
  accessToken: null,
  refreshToken: null,
  venueId: null,
  role: null,
  firstName: null,
  saveOwner: (input) => {
    setAccessToken(input.accessToken);
    set(input);
  },
  clearOwner: () => {
    setAccessToken(null);
    set({ accessToken: null, refreshToken: null, venueId: null, role: null, firstName: null });
  },
}));
