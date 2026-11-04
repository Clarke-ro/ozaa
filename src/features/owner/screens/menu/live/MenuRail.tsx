import { Linking, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { Globe, Lock } from 'lucide-react-native';
import type { VenueSettings } from '@/lib/api/types';
import { env } from '@/lib/env';
import { isPublished, menuStyleOf } from '@/lib/menuStyle';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useSaveVenue } from '../../../data/useSaveVenue';
import { menuLink } from '../../../desk/menuLink';
import { DeskCard, SwitchRow, toast } from '../../../kit';
import { MenuStyleSection } from '../../branding/MenuStyleSection';

/**
 * Beside the live preview: the menu link, the publish switch, and the quick menu style. Each
 * change saves straight away, so the preview next to it updates as you go.
 */
export function MenuRail({ venue }: { venue: VenueSettings }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const save = useSaveVenue(venue.id);
  const url = menuLink(env.EXPO_PUBLIC_SITE_URL, venue.slug);
  const published = isPublished(venue);

  const copy = async () => {
    const ok = await Clipboard.setStringAsync(url);
    if (ok) toast.success(t('ownerTables.copied'));
    else toast.error(t('ownerTables.copyFailed'));
  };

  return (
    <View style={styles.rail}>
      <DeskCard style={styles.card}>
        <Text variant="caption" style={[styles.label, { color: theme.muted }]}>
          {t('ownerMenu.live.link')}
        </Text>
        <Text variant="body-strong" selectable numberOfLines={1}>
          {url}
        </Text>
        <View style={styles.row}>
          <Button
            label={t('ownerTables.copyLink')}
            tone="secondary"
            size="md"
            onPress={() => void copy()}
          />
          <Button
            label={t('ownerMenu.live.view')}
            tone="ghost"
            size="md"
            onPress={() => void Linking.openURL(url)}
          />
        </View>
      </DeskCard>

      <DeskCard style={styles.card}>
        <SwitchRow
          icon={published ? Globe : Lock}
          label={t('ownerMenu.live.published')}
          hint={published ? t('ownerMenu.live.publishedOn') : t('ownerMenu.live.publishedOff')}
          value={published}
          onChange={(next) => save.mutate({ published: next })}
        />
      </DeskCard>

      <MenuStyleSection
        style={menuStyleOf(venue.menuStyle)}
        onChange={(next) => save.mutate({ menuStyle: next })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rail: { gap: tokens.space[4] },
  card: { gap: tokens.space[2] },
  label: { fontFamily: 'Inter_600', textTransform: 'uppercase' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[2] },
});
