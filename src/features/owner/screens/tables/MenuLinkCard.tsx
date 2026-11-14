import { StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { env } from '@/lib/env';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { cardStyle, toast } from '../../kit';
import { menuLink } from '../../desk/menuLink';
import { QrImage } from './QrImage';
import { canPrint, downloadQr, shareLink } from './qrActions';

const QR = 88;

/**
 * The menu's own link and QR code in one row (design canvas): the QR, the link with what it is
 * for, then Copy, Download QR and Share. It is not tied to a table.
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
    <View style={[cardStyle(theme), styles.card]}>
      <View accessible accessibilityLabel={t('ownerTables.menuQrA11y')} style={styles.qr}>
        <QrImage url={url} size={QR} />
      </View>
      <View style={styles.words}>
        <Text style={styles.url} selectable numberOfLines={1}>
          {shown}
        </Text>
        <Text style={[styles.hint, { color: theme.meta }]}>{t('ownerTables.menuLinkUse')}</Text>
      </View>
      <View style={styles.actions}>
        <Button
          label={t('ownerTables.copyShort')}
          tone="secondary"
          onPress={() => void copy()}
          style={styles.short}
        />
        {canPrint ? (
          <Button
            label={t('ownerTables.downloadQr')}
            tone="secondary"
            onPress={() => downloadQr(url, `${venueName}-menu`.replace(/\s+/g, '-'))}
            style={styles.short}
          />
        ) : null}
        <Button
          label={t('ownerTables.share')}
          tone="secondary"
          onPress={() => void share()}
          style={styles.short}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 20,
    rowGap: tokens.space[4],
    paddingVertical: tokens.space[4],
    paddingLeft: tokens.space[4],
    paddingRight: tokens.owner.controls.cardPadding,
  },
  qr: { borderRadius: 8, overflow: 'hidden' },
  words: { flexGrow: 1, flexShrink: 1, flexBasis: 220, minWidth: 0, gap: 4 },
  url: { fontSize: 17, lineHeight: 22, fontFamily: fontFamily.strong },
  hint: { fontSize: 14, lineHeight: 20 },
  // maxWidth keeps the buttons inside the card on a phone, where they wrap onto a second line.
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[2], maxWidth: '100%' },
  short: { minHeight: 44 },
});
