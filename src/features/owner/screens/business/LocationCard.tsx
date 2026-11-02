import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Building2, MapPin, Pencil, Plus } from 'lucide-react-native';
import type { Location } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { StatusPill } from '../../kit';

/** One location: its name and address, whether it is the one in use, and Switch or Edit. */
export function LocationCard({
  location,
  active,
  onSwitch,
  onEdit,
}: {
  location: Location;
  active: boolean;
  onSwitch: () => void;
  onEdit: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const address = [location.address1, location.city, location.country].filter(Boolean).join(', ');
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: active ? theme.ink : theme.line },
      ]}
    >
      <View style={styles.head}>
        <View style={styles.icon}>
          <Building2 size={20} color={active ? theme.ink : theme.text} />
        </View>
        <View style={styles.flex}>
          <Text variant="body-strong" numberOfLines={1}>
            {location.name}
          </Text>
          {address ? (
            <View style={styles.place}>
              <MapPin size={13} color={theme.muted} />
              <Text
                variant="caption"
                numberOfLines={1}
                style={[styles.flex, { color: theme.muted }]}
              >
                {address}
              </Text>
            </View>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('ownerBusiness.editA11y', { name: location.name })}
          onPress={onEdit}
          style={({ pressed }) => [
            styles.edit,
            { backgroundColor: pressed ? theme.wash : undefined },
          ]}
        >
          <Pencil size={18} color={theme.muted} />
        </Pressable>
      </View>
      <View style={[styles.foot, { borderColor: theme.line }]}>
        {active ? (
          <StatusPill label={t('ownerBusiness.active')} tone="success" />
        ) : (
          <Button label={t('ownerBusiness.use')} tone="secondary" size="md" onPress={onSwitch} />
        )}
      </View>
    </View>
  );
}

/** The dashed card at the end of the list that starts a new location. */
export function AddLocationCard({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.add,
        { borderColor: theme.line, backgroundColor: pressed ? theme.wash : undefined },
      ]}
    >
      <Plus size={18} color={theme.ink} />
      <Text variant="body-strong" style={{ color: theme.ink }}>
        {t('ownerBusiness.addLocation')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: tokens.space[3],
    padding: tokens.space[4],
    boxShadow: tokens.shadow.card,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  icon: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, gap: 2 },
  place: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[1] },
  edit: {
    width: tokens.touchTarget,
    height: tokens.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.full,
    margin: -tokens.space[2],
  },
  foot: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: tokens.space[3],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space[2],
    minHeight: tokens.touchTarget + tokens.space[3],
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
  },
});
