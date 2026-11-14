import { Linking, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { Link2 } from 'lucide-react-native';
import type { VenueSettings } from '@/lib/api/types';
import { env } from '@/lib/env';
import { isPublished } from '@/lib/menuStyle';
import { STATUS_TONES } from '@/theme/palette';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { useSaveVenue } from '../../../data/useSaveVenue';
import { menuLink } from '../../../desk/menuLink';
import { cardStyle, toast, Toggle } from '../../../kit';

/**
 * Under the phone on Menu (design canvas): the menu link, whether it is published, and Copy link /
 * View menu. The canvas has no other place to publish, so the switch stays here on the right.
 */
export function MenuLinkStatus({ venue }: { venue: VenueSettings }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const save = useSaveVenue(venue.id);
  const url = menuLink(env.EXPO_PUBLIC_SITE_URL, venue.slug);
  const shown = url.replace(/^https?:\/\//, '');
  const published = isPublished(venue);
  const copy = async () => {
    const ok = await Clipboard.setStringAsync(url);
    if (ok) toast.success(t('ownerTables.copied'));
    else toast.error(t('ownerTables.copyFailed'));
  };
  return (
    <View style={[cardStyle(theme), styles.card]}>
      <View style={styles.top}>
        <Link2 size={20} color={theme.text} />
        <View style={styles.flex} />
        <Toggle
          value={published}
          label={t('ownerMenu.live.published')}
          onChange={(next) => save.mutate({ published: next })}
        />
      </View>
      <View style={styles.words}>
        <Text style={styles.url} selectable numberOfLines={1}>
          {shown}
        </Text>
        <Text
          style={[
            styles.state,
            { color: published ? STATUS_TONES[theme.scheme].success.line : theme.meta },
          ]}
        >
          {published ? t('ownerMenu.live.publishedShort') : t('ownerMenu.live.unpublishedShort')}
        </Text>
      </View>
      <View style={styles.row}>
        <Button
          label={t('ownerTables.copyLink')}
          tone="secondary"
          onPress={() => void copy()}
          style={styles.small}
        />
        <Button
          label={t('ownerMenu.live.view')}
          tone="secondary"
          onPress={() => void Linking.openURL(url)}
          style={styles.small}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: tokens.space[3], padding: tokens.space[4] },
  top: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  words: { gap: 2 },
  url: { fontSize: 17, lineHeight: 22, fontFamily: fontFamily.strong },
  state: { fontSize: 14, lineHeight: 20, fontFamily: fontFamily.strong },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[2] },
  small: { minHeight: 40 },
});
