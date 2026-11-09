import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { VenueSettings } from '@/lib/api/types';
import { menuStyleOf } from '@/lib/menuStyle';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { useSaveVenue } from '../../../data/useSaveVenue';
import { DeskCard } from '../../../kit';
import { MenuStyleSection } from '../../branding/MenuStyleSection';

/**
 * Beside the walk-in preview: where the table page's buttons are switched on and off, where the
 * table QR codes are, and the menu style (it applies to the dine-in menu too).
 */
export function WalkInRail({ venue }: { venue: VenueSettings }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const save = useSaveVenue(venue.id);
  return (
    <View style={styles.rail}>
      <DeskCard style={styles.card}>
        <Text variant="caption" style={[styles.label, { color: theme.muted }]}>
          {t('ownerMenu.live.walkInTitle')}
        </Text>
        <Text variant="body" style={{ color: theme.muted }}>
          {t('ownerMenu.live.walkInBody')}
        </Text>
        <View style={styles.row}>
          <Button
            label={t('ownerMenu.live.editServices')}
            tone="secondary"
            size="md"
            onPress={() => router.push('/owner/services')}
          />
          <Button
            label={t('ownerMenu.live.tableCodes')}
            tone="ghost"
            size="md"
            onPress={() => router.push('/owner/tables')}
          />
        </View>
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
  label: { fontFamily: fontFamily.strong, textTransform: 'uppercase' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[2] },
});
