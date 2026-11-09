import { Pressable, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { Copy, Download, Share2 } from 'lucide-react-native';
import { env } from '@/lib/env';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { cardStyle, toast } from '../../kit';
import { menuLink } from '../../desk/menuLink';
import { IconAction } from './IconAction';
import { QrImage } from './QrImage';
import { canPrint, downloadQr, shareLink } from './qrActions';

const QR = tokens.space[16] * 3;

/**
 * The menu's own QR code and link, for posters, flyers and social bios: a card with the QR and
 * Download / Share, then a card with the link and a Copy button. It is not tied to a table.
 */
export function MenuLinkCard({ slug, venueName }: { slug: string; venueName: string }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const url = menuLink(env.EXPO_PUBLIC_SITE_URL, slug);
  const shown = url.replace(/^https?:\/\//, '');

  const copy = async () => {
    const ok = await Clipboard.setStringAsync(url);
    if (ok) toast.success(t('ownerTables.copied'));
    else toast.error(t('ownerTables.copyFailed'));
  };
  const share = async () => {
    const result = await shareLink(url, venueName);
    if (result === 'copied') toast.success(t('ownerTables.copied'));
    if (result === 'failed') toast.error(t('ownerTables.shareFailed'));
  };

  return (
    <View style={styles.stack}>
      <View style={[styles.card, styles.qrCard, cardStyle(theme)]}>
        <View accessible accessibilityLabel={t('ownerTables.menuQrA11y')}>
          <QrImage url={url} size={QR} />
        </View>
        <View style={styles.row}>
          {canPrint ? (
            <IconAction
              icon={Download}
              label={t('ownerTables.download')}
              onPress={() => downloadQr(url, `${venueName}-menu`.replace(/\s+/g, '-'))}
            />
          ) : null}
          <IconAction icon={Share2} label={t('ownerTables.share')} onPress={() => void share()} />
        </View>
      </View>

      <View style={[styles.card, cardStyle(theme)]}>
        <Text variant="caption" style={[styles.label, { color: theme.muted }]}>
          {t('ownerTables.menuLink')}
        </Text>
        <View style={[styles.field, { backgroundColor: theme.wash }]}>
          <Text variant="body" selectable numberOfLines={1} style={styles.url}>
            {shown}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('ownerTables.copyLink')}
            onPress={() => void copy()}
            style={({ pressed }) => [
              styles.copy,
              { backgroundColor: theme.surface, borderColor: theme.line },
              pressed && { backgroundColor: theme.line },
            ]}
          >
            <Copy size={16} color={theme.text} />
            <Text variant="caption" style={styles.copyText}>
              {t('ownerTables.copyShort')}
            </Text>
          </Pressable>
        </View>
        <Text variant="caption" style={{ color: theme.muted }}>
          {t('ownerTables.menuLinkHint')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[3] },
  card: { padding: tokens.space[4], gap: tokens.space[3] },
  qrCard: { alignItems: 'center', gap: tokens.space[5], paddingTop: tokens.space[8] },
  row: { flexDirection: 'row', gap: tokens.space[2], alignSelf: 'stretch' },
  label: { fontFamily: fontFamily.strong },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    minHeight: tokens.touchTarget,
    paddingLeft: tokens.space[3],
    paddingRight: tokens.space[1],
    borderRadius: tokens.radius.sm,
  },
  url: { flex: 1 },
  copy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[1],
    minHeight: tokens.touchTarget - tokens.space[2],
    paddingHorizontal: tokens.space[3],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.sm,
  },
  copyText: { fontFamily: fontFamily.strong },
});
