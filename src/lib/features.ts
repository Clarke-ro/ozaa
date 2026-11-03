import Constants from 'expo-constants';

/**
 * Payments are switched off in this build. app.config.ts copies PAYMENTS_ENABLED into `extra`,
 * so restart Expo after changing it. The full payment build lives on the feature/payments-v1
 * branch; docs/payments-removed.md says how to bring it back.
 */
export const PAYMENTS_ENABLED: boolean = Constants.expoConfig?.extra?.paymentsEnabled === true;

/**
 * Roadmap previews (Stock, AI waiter, Marketing, Register) show sample data, not the venue's.
 * Off unless PREVIEWS_ENABLED=true at start-up; app.config.ts copies it into `extra`.
 */
export const PREVIEWS_ENABLED: boolean = Constants.expoConfig?.extra?.previewsEnabled === true;

/** Guest services that only exist for payments. Hidden on the guest page and the owner's Services. */
export const PAYMENT_SERVICES: readonly string[] = PAYMENTS_ENABLED ? [] : ['pay'];
