import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

/**
 * A small grey label above chips or a switch, the same size and colour as a field's own label,
 * so every control on a form is named the same way (design/brand.md section 8).
 */
export function FormLabel({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <Text variant="body-strong" style={{ fontSize: 14, lineHeight: 20, color: theme.muted }}>
      {children}
    </Text>
  );
}
