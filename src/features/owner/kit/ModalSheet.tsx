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
import { X } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

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
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  if (!visible) return null;
  const full = fullScreen && width < WIDE;

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
        accessibilityLabel="Close"
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
              paddingBottom: full ? Math.max(insets.bottom, tokens.space[3]) : tokens.space[3],
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
      <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
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

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: theme.scrim }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close overlay"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          accessibilityViewIsModal
          style={[
            styles.card,
            {
              maxWidth: fullScreen ? 720 : maxWidth,
              backgroundColor: theme.surface,
              borderColor: theme.line,
            },
          ]}
        >
          {body}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: tokens.space[4] },
  card: {
    width: '100%',
    maxHeight: '92%',
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
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
