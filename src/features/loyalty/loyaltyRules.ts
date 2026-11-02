/** One stamp per paid order. The game stamp is separate and once per phone per day. */
export function stampsAfterPaidOrder(stamps: number): number {
  return stamps + 1;
}

export function canAwardGameStamp(lastAwardedDay: string | null, today: string): boolean {
  return lastAwardedDay !== today;
}

export function isRewardReady(stamps: number, stampsNeeded: number): boolean {
  return stamps >= stampsNeeded;
}

export function stampsAfterRedeem(stamps: number, stampsNeeded: number): number {
  return stamps - stampsNeeded;
}

export function stampsLeftPhrase(stamps: number, needed: number): string {
  const left = Math.max(0, needed - stamps);
  if (left === 0) return 'Your reward is ready.';
  if (left === 1) return `1 of ${needed}. One more and the next one is on us.`;
  return `${stamps} of ${needed}. ${left === 4 ? 'Four' : left} more and the next one is on us.`;
}
