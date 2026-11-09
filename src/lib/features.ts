import Constants from 'expo-constants';

/**
 * Roadmap previews (Stock, AI waiter, Marketing, Register) show sample data, not the venue's.
 * Off unless PREVIEWS_ENABLED=true at start-up; app.config.ts copies it into `extra`.
 */
export const PREVIEWS_ENABLED: boolean = Constants.expoConfig?.extra?.previewsEnabled === true;

/**
 * Live Paystack keys (real money). Off on purpose and not read from the environment: AGENTS.md
 * says test keys only until Clarke decides otherwise, so turning this on is a code change he approves.
 */
export const LIVE_PAYMENTS_ENABLED = false;
