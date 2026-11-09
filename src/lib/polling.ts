/**
 * How often screens ask the server for news, in milliseconds (BUILD.md section 11, Polling).
 * One place to tune them. Polling pauses while the app is in the background (queryLifecycle.ts).
 *
 * Screens that read the same data (same query key) use the same value, so one request serves
 * them all: the sidebar counts ride on Today's and Orders' requests instead of adding their own.
 */
export const POLL_MS = {
  /** Owner desk: new tickets, waiter calls, the floor, sidebar counts. The kitchen moves fast. */
  owner: 5_000,
  /** The owner's notification bell. Less urgent than the tickets themselves. */
  ownerNotifications: 15_000,
  /** Guest order status and the venue's notes; the bell and the status page agree. */
  guest: 10_000,
  /**
   * While a guest watches something happen: a MoMo approval (Paystack suggests checking every few
   * seconds), or "on the way" showing soon after they call the waiter.
   */
  guestWaiting: 3_000,
} as const;
