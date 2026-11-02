import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Building2, Check, ChevronDown, ChevronRight } from 'lucide-react-native';
import { api } from '@/lib/api';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { hapticSelection } from '@/lib/haptics';
import { ModalSheet } from '../kit';
import { ownerKeys } from '../data/keys';

/** Shows the active location and lets owners with more than one switch between them. */
/** `chip` sits in the Today panel; `block` heads the sidebar on wide screens. */
export function LocationSwitcher({ variant }: { variant: 'chip' | 'block' }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const venueId = useOwnerSession((state) => state.venueId);
  const switchVenue = useOwnerSession((state) => state.switchVenue);
  const [open, setOpen] = useState(false);

  const business = useQuery({
    queryKey: ownerKeys.business(),
    queryFn: () => api.ownerGetBusiness(),
  });
  const locations = business.data?.locations ?? [];
  const active = locations.find((location) => location.id === venueId);
  // Never show a made-up venue name while loading.
  const name = active?.name ?? (business.isLoading ? '' : t('ownerKit.chooseLocation'));
  const block = variant === 'block';

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('ownerKit.locationA11y', { name })}
        accessibilityHint={t('ownerKit.switchLocation')}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          block ? styles.block : styles.chip,
          // The chip sits on the grey Today panel, so it is the white surface; the sidebar block is grey.
          {
            borderColor: theme.line,
            backgroundColor: pressed ? theme.line : block ? theme.wash : theme.surface,
          },
        ]}
      >
        <Building2 size={16} color={theme.text} />
        <View style={block ? styles.blockCopy : styles.chipCopy}>
          {block ? (
            <Text variant="caption" style={{ color: theme.meta }}>
              {t('ownerKit.location')}
            </Text>
          ) : null}
          <Text variant="body-strong" numberOfLines={1} style={styles.name}>
            {name}
          </Text>
        </View>
        <ChevronDown size={16} color={theme.meta} />
      </Pressable>

      <ModalSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={t('ownerKit.switchLocation')}
      >
        {locations.map((location) => {
          const selected = location.id === venueId;
          return (
            <Pressable
              key={location.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => {
                void hapticSelection();
                switchVenue(location.id);
                setOpen(false);
              }}
              style={({ pressed }) => [
                styles.option,
                {
                  borderColor: selected ? theme.ink : theme.line,
                  backgroundColor: pressed || selected ? theme.wash : theme.surface,
                },
              ]}
            >
              <View style={styles.optionCopy}>
                <Text variant="body-strong">{location.name}</Text>
                {location.city || location.country ? (
                  <Text variant="caption" style={{ color: theme.muted }}>
                    {[location.city, location.country].filter(Boolean).join(', ')}
                  </Text>
                ) : null}
              </View>
              {selected ? <Check size={20} color={theme.ink} strokeWidth={2.5} /> : null}
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="link"
          onPress={() => {
            setOpen(false);
            router.push('/owner/business');
          }}
          style={styles.manage}
        >
          <Text variant="body-strong" style={{ color: theme.ink }}>
            {t('ownerKit.manageLocations')}
          </Text>
          <ChevronRight size={18} color={theme.ink} />
        </Pressable>
      </ModalSheet>
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    minHeight: tokens.touchTarget,
    maxWidth: 220,
    paddingHorizontal: tokens.space[3],
    borderRadius: tokens.radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipCopy: { flexShrink: 1 },
  block: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    minHeight: 52,
    padding: tokens.space[2],
    borderRadius: tokens.radius.md,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  blockCopy: { flex: 1 },
  name: { fontSize: tokens.type.caption.size + 1 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    padding: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  optionCopy: { flex: 1, gap: 2 },
  manage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space[1],
    minHeight: tokens.touchTarget,
  },
});
