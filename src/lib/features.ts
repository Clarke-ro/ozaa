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

/**
 * WhatsApp order alerts (BUILD.md 4b.18). Off: Integrations shows WhatsApp as "Coming soon". On:
 * the owner can save an alerts number (VenueSettings.whatsappAlerts). Stays off until the server
 * can send WhatsApp messages (Phase 5) and Clarke picks a WhatsApp provider (BUILD.md section 17).
 */
export const WHATSAPP_ALERTS_ENABLED = false;
