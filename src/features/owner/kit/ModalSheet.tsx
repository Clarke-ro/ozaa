import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, SlideInDown, useReducedMotion } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { SHADOW_INK } from '@/theme/palette';

export interface ModalSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: number;
  /** Covers the whole screen on phones: for long forms like a dish. Stays a centred panel on wide screens. */
  fullScreen?: boolean;
  /** Pinned under the scroll area, e.g. the Save button, so it is always in reach. */
  footer?: ReactNode;
}

// On a tablet or desktop a full-screen form would stretch edge to edge, so it becomes a large centred panel.
const WIDE = 840;
// iOS's sheet curve: quick to start, long gentle landing, never an ease-in.
const SHEET_EASE = Easing.bezier(0.32, 0.72, 0, 1);

export function ModalSheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 540,
  fullScreen,
  footer,
}: ModalSheetProps) {
  const theme = useTheme();
  // The system Modal's slide ignores Reduce Motion, so it is swapped for a fade by hand.
  const reduce = useReducedMotion();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const full = fullScreen && width < WIDE;
  // Phones: a short sheet rises from the bottom edge, in thumb reach, like an iOS sheet. Wider
  // screens keep the centred panel.
  const bottom = !full && width < WIDE;

  const header = (
    <View
      style={[
        styles.header,
        {
          borderBottomColor: theme.line,
          paddingTop: full ? insets.top + tokens.space[2] : tokens.space[4],
        },
      ]}
    >
      <View style={styles.headerText}>
        <Text variant="title" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" style={{ color: theme.muted }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
        onPress={onClose}
        style={({ pressed }) => [
          styles.close,
          { backgroundColor: pressed ? theme.line : theme.wash },
        ]}
      >
        <X size={20} color={theme.text} />
      </Pressable>
    </View>
  );

  const body = (
    <>
      {header}
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
      >
        {children}
      </ScrollView>
      {footer ? (
        <View
          style={[
            styles.footer,
            {
              borderTopColor: theme.line,
              backgroundColor: theme.surface,
              paddingBottom:
                full || bottom ? Math.max(insets.bottom, tokens.space[3]) : tokens.space[3],
            },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </>
  );

  if (full) {
    return (
      <Modal
        visible={visible}
        animationType={reduce ? 'fade' : 'slide'}
        presentationStyle="fullScreen"
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          accessibilityViewIsModal
          style={[styles.fill, { backgroundColor: theme.surface }]}
        >
          {body}
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  // The Modal stays mounted while closing, so it fades out instead of vanishing in one frame.
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View
        style={[styles.backdrop, bottom && styles.backdropBottom, { backgroundColor: theme.scrim }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <Animated.View
          // The sheet travels up from the edge it belongs to while the dim fades in (apple-motion
          // §7, §12). Reanimated skips this when Reduce Motion is on, leaving only the fade.
          entering={
            bottom
              ? SlideInDown.duration(tokens.motion.sheet.duration).easing(SHEET_EASE)
              : undefined
          }
          style={[styles.holder, { maxWidth: bottom ? undefined : fullScreen ? 720 : maxWidth }]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            accessibilityViewIsModal
            style={[
              styles.card,
              bottom && styles.cardBottom,
              { backgroundColor: theme.surface, borderColor: theme.line },
            ]}
          >
            {body}
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: tokens.space[4] },
  backdropBottom: { justifyContent: 'flex-end', padding: 0, paddingTop: tokens.space[12] },
  holder: { width: '100%', maxHeight: '92%' },
  card: {
    width: '100%',
    // Shrinks inside the holder's 92% cap; the ScrollView inside takes up the slack.
    flexShrink: 1,
    minHeight: 0,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: SHADOW_INK,
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  // iOS sheet corners: 20 px on top, square where it meets the bottom edge.
  cardBottom: {
    borderRadius: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingHorizontal: tokens.space[4],
    paddingBottom: tokens.space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerText: { flex: 1, gap: 2 },
  close: {
    width: tokens.touchTarget,
    height: tokens.touchTarget,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { padding: tokens.space[4], gap: tokens.space[4], paddingBottom: tokens.space[8] },
  footer: {
    flexDirection: 'row',
    gap: tokens.space[2],
    paddingHorizontal: tokens.space[4],
    paddingTop: tokens.space[3],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
