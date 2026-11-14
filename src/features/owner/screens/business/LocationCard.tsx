import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MapPin, Pencil } from 'lucide-react-native';
import type { Location } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { VenueImage } from '@/ui/VenueImage';
import { fontFamily, useTheme } from '@/ui/theme';
import { cardStyle, StatusPill } from '../../kit';

/** Canvas location row: logo, name, address, tables and staff, then In use or Switch, and Edit. */
export function LocationCard({
  location,
  active,
  today,
  onSwitch,
  onEdit,
}: {
  location: Location;
  active: boolean;
  /** "Open today 11:00 to 22:00" for the location in use; other locations' hours aren't loaded. */
  today?: string;
  onSwitch: () => void;
  onEdit: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const address = [location.address1, location.city].filter(Boolean).join(', ');
  const initials = location.name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  const meta = [
    location.tableCount !== undefined
      ? t('ownerBusiness.tables', { count: location.tableCount })
      : null,
    location.staffCount !== undefined
      ? t('ownerBusiness.staff', { count: location.staffCount })
      : null,
    today,
  ].filter(Boolean);
  return (
    <View style={[cardStyle(theme), styles.row]}>
      <View style={[styles.logo, { backgroundColor: theme.wash, borderColor: theme.line }]}>
        {location.logo ? (
          <VenueImage
            url={location.logo.url}
            alt=""
            style={[StyleSheet.absoluteFill, { borderRadius: 35 }]}
          />
        ) : (
          <Text style={[styles.initials, { color: theme.muted }]}>{initials}</Text>
        )}
      </View>
      <View style={styles.flex}>
        <Text variant="body-strong" numberOfLines={1}>
          {location.name}
        </Text>
        {address ? (
          <View style={styles.place}>
            <MapPin size={13} color={theme.muted} />
            <Text variant="caption" numberOfLines={1} style={[styles.flex, { color: theme.muted }]}>
              {address}
            </Text>
          </View>
        ) : null}
        {meta.length ? (
          <Text variant="caption" numberOfLines={1} style={{ color: theme.meta }}>
            {meta.join(' · ')}
          </Text>
        ) : null}
      </View>
      {active ? (
        <StatusPill label={t('ownerBusiness.active')} tone="success" boxed icon={false} />
      ) : (
        <Button
          label={t('ownerBusiness.use')}
          tone="secondary"
          onPress={onSwitch}
          style={styles.short}
        />
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('ownerBusiness.editA11y', { name: location.name })}
        onPress={onEdit}
        style={({ pressed }) => [
          styles.edit,
          { borderColor: theme.line, backgroundColor: pressed ? theme.wash : theme.surface },
        ]}
      >
        <Pencil size={16} color={theme.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.space[5],
    paddingVertical: tokens.space[5],
    gap: tokens.space[5],
  },
  // Canvas: a 70 px round logo, or the initials on a soft square.
  logo: {
    width: 70,
    height: 70,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontSize: 18, fontFamily: fontFamily.strong },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  place: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[1] },
  short: { minHeight: 48 },
  edit: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
