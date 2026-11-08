import { Linking, Pressable, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { Link } from 'lucide-react-native';
import { env } from '@/lib/env';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { menuLink } from '../../desk/menuLink';
import { toast } from '../../kit';
import { cardStyle } from '../../kit/cardStyle';

/**
 * A small card beside a menu page: "Your live menu", the link (tap to copy it) and the page's
 * one filled button, View menu, which opens the guest menu in a new tab.
 */
export function LiveMenuCard({ slug }: { slug: string }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const url = menuLink(env.EXPO_PUBLIC_SITE_URL, slug);
  const shown = url.replace(/^https?:\/\//, '');

  const copy = async () => {
    const ok = await Clipboard.setStringAsync(url);
    if (ok) toast.success(t('ownerTables.copied'));
    else toast.error(t('ownerTables.copyFailed'));
  };

  return (
    <View style={[styles.card, cardStyle(theme)]}>
      <Text variant="caption" style={[styles.label, { color: theme.muted }]}>
        {t('ownerMenu.live.link').toUpperCase()}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t('ownerTables.copyLink')}, ${shown}`}
        onPress={() => void copy()}
        style={({ pressed }) => [
          styles.link,
          { borderColor: theme.line, backgroundColor: pressed ? theme.wash : theme.surface },
        ]}
      >
        <Text variant="body" numberOfLines={1} style={styles.url}>
          {shown}
        </Text>
        <Link size={16} color={theme.meta} />
      </Pressable>
      <Button
        label={t('ownerMenu.live.view')}
        size="md"
        onPress={() => void Linking.openURL(url)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: tokens.space[4], gap: tokens.space[3] },
  label: { fontFamily: fontFamily.strong, letterSpacing: tokens.owner.type.caps.letterSpacing },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    minHeight: tokens.touchTarget,
    paddingHorizontal: tokens.space[3],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.sm,
  },
  url: { flex: 1 },
});
