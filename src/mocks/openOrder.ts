const openByToken = new Map<string, string>();

/** The sample ticket already exists in the mock. The contract does not return its id on the session. */
export function rememberOpenOrder(token: string, orderId: string | null): void {
  if (orderId) openByToken.set(token, orderId);
}

export function peekOpenOrder(token: string): string | null {
  return openByToken.get(token) ?? null;
}
