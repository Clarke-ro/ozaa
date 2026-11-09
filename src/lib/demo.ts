import { env } from './env';

/**
 * A demo build runs on the mock API with sample venues. Only then do screens offer sample logins,
 * sample tables, sample scores and test numbers. A build against a real server never shows them.
 */
export const DEMO = env.EXPO_PUBLIC_API_MODE === 'mock';
