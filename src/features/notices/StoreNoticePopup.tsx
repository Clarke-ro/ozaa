import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import type { StoreNotice } from '@/lib/api/types';
import { noticeKey } from '@/lib/notices';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

const seenKey = (slug: string) => `ozaa-notice-seen:${slug}`;

/**
 * The venue's popup, once per version: after a guest closes it, it stays closed on this phone
 * until the owner changes it. What we remember is the notice's own words, never anything about
 * the guest (Act 843).
 */
export function StoreNoticePopup({ slug, notice }: { slug: string; notice: StoreNotice }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const key = noticeKey(notice);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(seenKey(slug))
      .then((seen) => {
        if (alive && seen !== key) setOpen(true);
      })
      // If storage is blocked (private browsing), show it; the guest can still close it.
      .catch(() => alive && setOpen(true));
    return () => {
      alive = false;
    };
  }, [slug, key]);

  const close = () => {
    setOpen(false);
    void AsyncStorage.setItem(seenKey(slug), key).catch(() => undefined);
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('notices.close')}
        onPress={close}
        style={[styles.scrim, { backgroundColor: theme.scrim }]}
      >
        {/* Taps on the card itself don't close it. */}
        <Pressable
          accessibilityViewIsModal
          onPress={() => undefined}
          style={[styles.card, { backgroundColor: theme.surface }]}
        >
          {notice.title ? (
            <Text variant="title" accessibilityRole="header">
              {notice.title}
            </Text>
          ) : null}
          <Text variant="body" style={{ color: theme.text }}>
            {notice.text}
          </Text>
          <View style={styles.actions}>
            <Button label={t('notices.ok')} onPress={close} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: tokens.space[6] },
  card: {
    width: '100%',
    maxWidth: 360,
    gap: tokens.space[3],
    padding: tokens.space[5],
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
  },
  actions: { marginTop: tokens.space[2] },
});
