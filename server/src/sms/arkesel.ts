import { isTimeout, outboundSignal } from '../http/outbound.ts';

/** Sends one text message. Arkesel in production; tests pass a fake that keeps the messages. */
export type SmsSender = (to: string, text: string) => Promise<void>;

/**
 * Arkesel's SMS API (v2), the Ghana SMS provider Clarke chose. `sender` is the name the phone
 * shows; Arkesel only sends from a sender ID approved in its dashboard (up to 11 characters).
 * Numbers go as 233XXXXXXXXX, without the plus.
 */
export function arkeselSender(options: {
  apiKey: string;
  sender: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}): SmsSender {
  const fetchFn = options.fetchFn ?? fetch;
  return async (to, text) => {
    let res: Response;
    try {
      res = await fetchFn('https://sms.arkesel.com/api/v2/sms/send', {
        method: 'POST',
        headers: { 'api-key': options.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: options.sender,
          message: text,
          recipients: [to.replace(/^\+/, '')],
        }),
        signal: outboundSignal(options.timeoutMs),
      });
    } catch (error) {
      if (isTimeout(error)) throw new Error('Arkesel took too long');
      throw error;
    }
    const data = (await res.json().catch(() => null)) as {
      status?: string;
      message?: string;
    } | null;
    // Never put the number or the message in the error: it can end up in a log.
    if (!res.ok || data?.status !== 'success')
      throw new Error(`Arkesel refused the SMS (${res.status})`);
  };
}
