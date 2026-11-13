import { Pressable, StyleSheet } from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { AnchoredMenu, useAnchoredMenu } from './AnchoredMenu';

const MENU_WIDTH = tokens.space[16] * 3;

/**
 * A dropdown for the period a report covers ("Last 30 days"), made to sit in the page header
 * on the right of the title. The open choice is ticked as well as bold.
 */
export function PeriodSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  /** What the choice is about, e.g. "Period", read out before the current value. */
  label: string;
  value: T;
  options: readonly { id: T; label: string }[];
  onChange: (next: T) => void;
}) {
  const theme = useTheme();
  const { anchor, at, open, close } = useAnchoredMenu();
  const current = options.find((o) => o.id === value)?.label ?? '';

  return (
    <>
      <Pressable
        ref={anchor}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current}`}
        accessibilityState={{ expanded: at !== null }}
        onPress={open}
        style={({ pressed }) => [
          styles.button,
          { borderColor: theme.line, backgroundColor: pressed ? theme.wash : theme.surface },
        ]}
      >
        <Text numberOfLines={1} style={styles.label}>
          {current}
        </Text>
        <ChevronDown size={18} color={theme.text} />
      </Pressable>
      <AnchoredMenu at={at} onClose={close} label={label} width={MENU_WIDTH}>
        {options.map((option) => {
          const on = option.id === value;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="menuitem"
              accessibilityLabel={option.label}
              accessibilityState={{ selected: on }}
              onPress={() => {
                close();
                if (!on) onChange(option.id);
              }}
              style={({ pressed }) => [styles.item, pressed && { backgroundColor: theme.wash }]}
            >
              <Text variant={on ? 'body-strong' : 'body'} style={styles.flex} numberOfLines={1}>
                {option.label}
              </Text>
              {on ? <Check size={18} color={theme.ink} /> : null}
            </Pressable>
          );
        })}
      </AnchoredMenu>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    // Canvas: a 48 px pill with a light grey edge, like the secondary buttons.
    minHeight: tokens.owner.controls.height,
    paddingHorizontal: tokens.space[4],
    borderWidth: 1,
    borderRadius: tokens.radius.full,
  },
  label: { fontSize: 15, lineHeight: 20 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    minHeight: tokens.touchTarget,
    paddingHorizontal: tokens.space[3],
    borderRadius: tokens.radius.sm,
  },
  flex: { flex: 1 },
});
