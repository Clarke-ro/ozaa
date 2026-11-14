import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

/** The canvas label above a control: 14 px, semibold, dark grey. */
export function FieldLabel({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <Text variant="body-strong" style={{ fontSize: 14, lineHeight: 20, color: theme.muted }}>
      {children}
    </Text>
  );
}
