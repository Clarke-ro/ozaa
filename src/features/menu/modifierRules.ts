import type { ModifierGroup } from '@/lib/api/types';

export function validateModifiers(
  group: ModifierGroup,
  selectedOptionIds: string[]
): { valid: boolean; error?: string } {
  const count = selectedOptionIds.length;
  if (count < group.min) {
    return {
      valid: false,
      error: `Please select at least ${group.min} option${group.min === 1 ? '' : 's'}.`,
    };
  }
  if (count > group.max) {
    return {
      valid: false,
      error: `You can select at most ${group.max} option${group.max === 1 ? '' : 's'}.`,
    };
  }
  return { valid: true };
}
