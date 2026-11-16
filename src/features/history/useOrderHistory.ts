import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { OrderStatus } from '@/lib/api/types';
import { rememberOrder, updateStatus, type PastOrder } from './orderHistory';

type HistoryState = {
  orders: PastOrder[];
  remember: (order: PastOrder) => void;
  setStatus: (orderId: string, status: OrderStatus) => void;
};

/**
 * Orders placed on this phone from a venue's link, for My orders. Kept on the device (web:
 * localStorage), so they're still there tomorrow. No account needed, and no personal data.
 */
export const useOrderHistory = create<HistoryState>()(
  persist(
    (set) => ({
      orders: [],
      remember: (order) => set((state) => ({ orders: rememberOrder(state.orders, order) })),
      setStatus: (orderId, status) =>
        set((state) => ({ orders: updateStatus(state.orders, orderId, status) })),
    }),
    { name: 'cravins-my-orders', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
