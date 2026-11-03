import { Text } from '@/ui/Text';

/** A section heading over a GroupCard. */
export function SectionTitle({ children }: { children: string }) {
  return (
    <Text variant="display-m" accessibilityRole="header">
      {children}
    </Text>
  );
}
