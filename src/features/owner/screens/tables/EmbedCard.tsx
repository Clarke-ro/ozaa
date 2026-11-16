import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Code } from 'lucide-react-native';
import { env } from '@/lib/env';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { cardStyle, toast } from '../../kit';
import { embedSnippet, menuLink } from '../../desk/menuLink';
import { IconAction } from './IconAction';

const CHIP = tokens.space[8] + tokens.space[1];

/**
 * "Add the menu to your website", folded by default: tap the row to see the code to paste into
 * the venue's own site and a Copy code button. Most owners never need it, so it stays small.
 */
export function EmbedCard({ slug, venueName }: { slug: string; venueName: string }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const snippet = embedSnippet(menuLink(env.EXPO_PUBLIC_SITE_URL, slug), venueName);
  const Chevron = open ? ChevronUp : ChevronDown;

  const copy = async () => {
    const ok = await Clipboard.setStringAsync(snippet);
    if (ok) toast.success(t('ownerTables.codeCopied'));
    else toast.error(t('ownerTables.copyFailed'));
  };

  return (
    <View style={cardStyle(theme)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('ownerTables.embedTitle')}
        aria-expanded={open}
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => [styles.head, pressed && { opacity: 0.7 }]}
      >
        <View style={[styles.chip, { backgroundColor: theme.tint }]}>
          <Code size={18} color={theme.badgeInk} />
        </View>
        <View style={styles.flex}>
          <Text variant="body-strong">{t('ownerTables.embedTitle')}</Text>
          <Text variant="caption" style={{ color: theme.muted }}>
            {t('ownerTables.embedHint')}
          </Text>
        </View>
        <Chevron size={18} color={theme.meta} />
      </Pressable>
      {open ? (
        <View style={styles.body}>
          <View style={[styles.code, { backgroundColor: theme.wash }]}>
            <Text variant="caption" selectable style={styles.mono}>
              {snippet}
            </Text>
          </View>
          <View style={styles.row}>
            <IconAction icon={Code} label={t('ownerTables.copyCode')} onPress={() => void copy()} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    padding: tokens.space[4],
  },
  chip: {
    width: CHIP,
    height: CHIP,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, gap: 2 },
  body: {
    gap: tokens.space[3],
    paddingHorizontal: tokens.space[4],
    paddingBottom: tokens.space[4],
  },
  code: { padding: tokens.space[3], borderRadius: tokens.radius.sm },
  mono: { fontFamily: 'monospace' },
  row: { flexDirection: 'row' },
});
