import { StyleSheet, View, useWindowDimensions } from 'react-native';
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
 * The venue's shareable menu link and website embed snippet, side by side on wide screens.
 */
export function MenuLinkCard({ slug, venueName }: { slug: string; venueName: string }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const wide = width >= 920;
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
    <View style={[styles.wrap, wide && styles.split]}>
      <View style={styles.col}>
        <SectionLabel title={t('ownerTables.menuLink')} caps />
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <Text variant="body-strong" selectable accessibilityLabel={url} numberOfLines={1}>
            {url}
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
      </View>

      <View style={styles.col}>
        <SectionLabel title={t('ownerTables.embedTitle')} caps />
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <View style={[styles.code, { backgroundColor: theme.wash, borderColor: theme.line }]}>
            <Text variant="caption" selectable numberOfLines={1} style={styles.mono}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space[4] },
  split: { flexDirection: 'row', alignItems: 'stretch', gap: tokens.space[5] },
  col: { flex: 1, minWidth: 0, gap: tokens.space[2] },
  card: {
    flex: 1,
    justifyContent: 'space-between',
    gap: tokens.space[3],
    padding: tokens.space[4],
    borderWidth: 1,
    boxShadow: tokens.shadow.card,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
  },
  row: { flexDirection: 'row', gap: tokens.space[2], flexWrap: 'wrap' },
  code: {
    padding: tokens.space[2],
    borderRadius: tokens.radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  mono: { fontFamily: 'monospace' },
});
