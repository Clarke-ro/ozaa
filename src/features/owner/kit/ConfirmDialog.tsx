import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.backdrop, { backgroundColor: theme.scrim }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          style={StyleSheet.absoluteFill}
          onPress={onCancel}
        />

        <View
          accessibilityViewIsModal
          style={[styles.dialogCard, { backgroundColor: theme.surface, borderColor: theme.line }]}
        >
          <View style={styles.content}>
            {destructive ? (
              <View style={[styles.iconWrap, { backgroundColor: theme.errorTint }]}>
                <AlertTriangle size={24} color={theme.error} />
              </View>
            ) : null}

            <View style={styles.textCol}>
              <Text variant="title" style={styles.title}>
                {title}
              </Text>
              <Text variant="body" style={[styles.message, { color: theme.meta }]}>
                {message}
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <View style={styles.btnWrap}>
              <Button
                label={cancelLabel ?? t('common.cancel')}
                tone="secondary"
                onPress={onCancel}
                disabled={loading}
              />
            </View>
            <View style={styles.btnWrap}>
              <Button
                label={confirmLabel ?? t('common.confirm')}
                tone={destructive ? 'destructive' : 'primary'}
                onPress={onConfirm}
                loading={loading}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.space[4],
    zIndex: 120,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    padding: tokens.space[5],
    gap: tokens.space[4],
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    gap: tokens.space[3],
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textCol: {
    flex: 1,
    gap: tokens.space[1],
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: tokens.space[2],
    justifyContent: 'flex-end',
    marginTop: tokens.space[2],
  },
  btnWrap: {
    flex: 1,
  },
});
