import { useRef, useState, type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type HostInstance,
} from 'react-native';
import { tokens } from '@/theme/tokens';
import { useTheme } from '@/ui/theme';
import { cardStyle } from './cardStyle';

const GAP = tokens.space[1];

export type MenuSpot = { top: number; right: number };

/** Measures a button so a menu can hang right-aligned under it, wherever it sits on screen. */
export function useAnchoredMenu() {
  const window = useWindowDimensions();
  const anchor = useRef<HostInstance>(null);
  const [at, setAt] = useState<MenuSpot | null>(null);
  const open = () =>
    anchor.current?.measureInWindow((x, y, width, height) => {
      // Right-aligned with the button, so the menu never runs off the right edge.
      setAt({ top: y + height + GAP, right: Math.max(window.width - (x + width), GAP) });
    });
  return { anchor, at, open, close: () => setAt(null) };
}

/**
 * The panel of a dropdown: a white card in a see-through modal, so a tap anywhere else closes
 * it, and Escape or Back closes it too.
 */
export function AnchoredMenu({
  at,
  onClose,
  label,
  width,
  children,
}: {
  at: MenuSpot | null;
  onClose: () => void;
  /** Read out for the tap-outside area that closes the menu. */
  label: string;
  width: number;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <Modal transparent visible={at !== null} onRequestClose={onClose} animationType="none">
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={label} />
      {at ? (
        <View
          accessibilityRole="menu"
          style={[
            styles.menu,
            cardStyle(theme),
            { top: at.top, right: at.right, width, boxShadow: tokens.shadow.card },
          ]}
        >
          {children}
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  menu: { position: 'absolute', padding: tokens.space[1] },
});
