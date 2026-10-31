export function generateTableCodes(start: number, end: number, prefix: string = ''): string[] {
  if (start <= 0 || end <= 0 || start > end) {
    return [];
  }
  const codes: string[] = [];
  for (let i = start; i <= end; i++) {
    codes.push(`${prefix}${i}`);
  }
  return codes;
}
