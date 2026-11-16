import { Pressable, StyleSheet } from 'react-native';
import { EllipsisVertical, type LucideIcon } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { AnchoredMenu, useAnchoredMenu } from './AnchoredMenu';

export type RowAction = {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

const MENU_WIDTH = tokens.space[16] * 3 + tokens.space[4];

/** The "⋮" button on a list row and the small menu of actions it opens under itself. */
export function RowMenu({ label, actions }: { label: string; actions: RowAction[] }) {
  const theme = useTheme();
  const { anchor, at, open, close } = useAnchoredMenu();

  return (
    <>
      <Pressable
        ref={anchor}
        accessibilityRole="button"
        accessibilityLabel={label}
        aria-expanded={at !== null}
        onPress={open}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: pressed ? theme.line : theme.wash },
        ]}
      >
        <EllipsisVertical size={18} color={theme.text} />
      </Pressable>
      <AnchoredMenu at={at} onClose={close} label={label} width={MENU_WIDTH}>
        {actions.map(({ label: name, icon: Icon, onPress, destructive, disabled }) => {
          const ink = disabled ? theme.meta : destructive ? theme.error : theme.text;
          return (
            <Pressable
              key={name}
              accessibilityRole="menuitem"
              accessibilityLabel={name}
              aria-disabled={disabled}
              disabled={disabled}
              onPress={() => {
                close();
                onPress();
              }}
              style={({ pressed }) => [styles.item, pressed && { backgroundColor: theme.wash }]}
            >
              <Icon size={18} color={ink} />
              <Text variant="body" style={{ color: ink }} numberOfLines={1}>
                {name}
              </Text>
            </Pressable>
          );
        })}
      </AnchoredMenu>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    width: tokens.touchTarget - tokens.space[2],
    height: tokens.touchTarget - tokens.space[2],
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    minHeight: tokens.touchTarget,
    paddingHorizontal: tokens.space[3],
    borderRadius: tokens.radius.sm,
  },
});
