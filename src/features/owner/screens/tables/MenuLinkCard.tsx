import { StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { Code, Copy, Download, Share2 } from 'lucide-react-native';
import { env } from '@/lib/env';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { SectionLabel, toast } from '../../kit';
import { embedSnippet, menuLink } from '../../desk/menuLink';
import { IconAction } from './IconAction';
import { canPrint, downloadQr, shareLink } from './qrActions';

/**
 * The venue's one shareable menu link, separate from the table QR codes: for social bios and the
 * venue's own website. Guests who open it aren't at a table, so it never starts a table session.
 */
export function MenuLinkCard({ slug, venueName }: { slug: string; venueName: string }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const url = menuLink(env.EXPO_PUBLIC_SITE_URL, slug);
  const snippet = embedSnippet(url, venueName);

  const copy = async (text: string, done: string) => {
    const ok = await Clipboard.setStringAsync(text);
    if (ok) toast.success(done);
    else toast.error(t('ownerTables.copyFailed'));
  };
  const share = async () => {
    const result = await shareLink(url, venueName);
    if (result === 'copied') toast.success(t('ownerTables.copied'));
    if (result === 'failed') toast.error(t('ownerTables.shareFailed'));
  };

  return (
    <View style={styles.wrap}>
      <SectionLabel title={t('ownerTables.menuLink')} caps />
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text variant="body-strong" selectable accessibilityLabel={url}>
          {url}
        </Text>
        <Text variant="caption" style={{ color: theme.meta }}>
          {t('ownerTables.menuLinkHint')}
        </Text>
        <View style={styles.row}>
          <IconAction
            icon={Copy}
            label={t('ownerTables.copyLink')}
            onPress={() => void copy(url, t('ownerTables.copied'))}
          />
          <IconAction icon={Share2} label={t('ownerTables.share')} onPress={() => void share()} />
          {canPrint ? (
            <IconAction
              icon={Download}
              label={t('ownerTables.download')}
              onPress={() => downloadQr(url, `${venueName}-menu`.replace(/\s+/g, '-'))}
            />
          ) : null}
        </View>
      </View>

      <SectionLabel title={t('ownerTables.embedTitle')} caps />
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text variant="caption" style={{ color: theme.meta }}>
          {t('ownerTables.embedHint')}
        </Text>
        <View style={[styles.code, { backgroundColor: theme.wash, borderColor: theme.line }]}>
          <Text variant="caption" selectable style={styles.mono}>
            {snippet}
          </Text>
        </View>
        <View style={styles.row}>
          <IconAction
            icon={Code}
            label={t('ownerTables.copyCode')}
            onPress={() => void copy(snippet, t('ownerTables.codeCopied'))}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space[2], marginBottom: tokens.space[4] },
  card: {
    gap: tokens.space[3],
    padding: tokens.space[4],
    boxShadow: tokens.shadow.card,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
  },
  row: { flexDirection: 'row', gap: tokens.space[2] },
  code: {
    padding: tokens.space[3],
    borderRadius: tokens.radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  mono: { fontFamily: 'monospace' },
});
