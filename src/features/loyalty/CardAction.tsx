import { ActivityIndicator, Pressable } from 'react-native';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/ui/theme';
import { GroupCard } from './GroupCard';
import { GroupRow } from './GroupRow';

/** One action in a card of its own, like "Use another number" or "Delete my card". */
export function CardAction({
  icon,
  label,
  onPress,
  busy = false,
  tone = 'default',
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  busy?: boolean;
  tone?: 'default' | 'danger';
}) {
  const theme = useTheme();
  return (
    <GroupCard>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        aria-busy={busy}
        aria-disabled={busy}
        disabled={busy}
        onPress={onPress}
        style={({ pressed }) => ({ backgroundColor: pressed ? theme.wash : undefined })}
      >
        <GroupRow
          icon={icon}
          title={label}
          tone={tone}
          right={
            busy ? (
              <ActivityIndicator color={theme.meta} />
            ) : (
              <ChevronRight color={theme.meta} size={18} strokeWidth={2} />
            )
          }
        />
      </Pressable>
    </GroupCard>
  );
}
