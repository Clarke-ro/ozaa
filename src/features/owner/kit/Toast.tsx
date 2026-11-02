import { useEffect } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { CircleAlert, CircleCheck } from 'lucide-react-native';
import { create } from 'zustand';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

type ToastTone = 'success' | 'error';
type ToastState = { id: number; tone: ToastTone; message: string } | null;

const useToastStore = create<{
  current: ToastState;
  show: (tone: ToastTone, message: string) => void;
  hide: () => void;
}>((set) => ({
  current: null,
  show: (tone, message) => set({ current: { id: Date.now(), tone, message } }),
  hide: () => set({ current: null }),
}));

/** Short confirmation after a save, or what went wrong. Call from anywhere: `toast.success('Menu saved')`. */
export const toast = {
  success(message: string) {
    void hapticSuccess();
    useToastStore.getState().show('success', message);
  },
  error(message: string) {
    void hapticError();
    useToastStore.getState().show('error', message);
  },
};

const SHOW_MS = 3200;

/** Mounted once in the owner chrome, above the tab bar. */
export function ToastHost({ bottom }: { bottom: number }) {
  const theme = useTheme();
  const current = useToastStore((s) => s.current);
  const hide = useToastStore((s) => s.hide);

  useEffect(() => {
    if (!current) return;
    // Screen readers do not see a toast appear, so read it out.
    AccessibilityInfo.announceForAccessibility(current.message);
    const timer = setTimeout(hide, SHOW_MS);
    return () => clearTimeout(timer);
  }, [current, hide]);

  if (!current) return null;
  const Icon = current.tone === 'success' ? CircleCheck : CircleAlert;
  const ink = current.tone === 'success' ? theme.success : theme.error;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
      {/* Reanimated swaps the slide for a plain fade when Reduce Motion is on. */}
      <Animated.View
        key={current.id}
        entering={FadeInDown.duration(200)}
        exiting={FadeOutDown.duration(150)}
      >
        <Pressable
          accessibilityRole="alert"
          accessibilityLabel={current.message}
          accessibilityHint="Tap to dismiss"
          onPress={hide}
          style={[styles.toast, { backgroundColor: theme.surface, borderColor: theme.line }]}
        >
          <Icon size={20} color={ink} />
          <Text variant="body-strong" style={styles.copy}>
            {current.message}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: tokens.space[4],
    right: tokens.space[4],
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    minHeight: 48,
    maxWidth: 480,
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  copy: { flexShrink: 1 },
});
