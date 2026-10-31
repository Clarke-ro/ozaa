const decisions = new Map<string, 'succeeded' | 'abandoned'>();

/** The mock checkout page records Pay or Cancel here. The payment poll reads it. */
export function decideMockCard(reference: string, result: 'succeeded' | 'abandoned'): void {
  decisions.set(reference, result);
}

export function readMockCard(reference: string): 'succeeded' | 'abandoned' | null {
  return decisions.get(reference) ?? null;
}
