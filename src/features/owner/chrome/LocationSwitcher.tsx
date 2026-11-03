import { useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type HostInstance,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Building2, Check, ChevronDown, ChevronRight, Plus } from 'lucide-react-native';
import { api } from '@/lib/api';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { hapticSelection } from '@/lib/haptics';
import { ownerKeys } from '../data/keys';

/**
 * Shows the active location. Tapping it drops one card from the button holding a pill per
 * location (the current one tinted and outlined), then Add location and Manage locations. `chip` sits in the Today panel; `block` heads the sidebar.
 */
export function LocationSwitcher({ variant }: { variant: 'chip' | 'block' }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const venueId = useOwnerSession((state) => state.venueId);
  const switchVenue = useOwnerSession((state) => state.switchVenue);
  const [open, setOpen] = useState(false);
  const anchor = useRef<HostInstance>(null);
  const [at, setAt] = useState({ x: 0, y: 0 });
  const { width: screenWidth } = useWindowDimensions();
  const openMenu = () => {
    // Measure the button so the menu hangs from it, wherever the button sits on screen.
    anchor.current?.measureInWindow((x, y, _width, height) => {
      setAt({ x, y: y + height + tokens.space[1] });
      setOpen(true);
    });
  };
  const menuWidth = Math.min(screenWidth - tokens.space[4] * 2, MENU_WIDTH);
  const go = (href: '/owner/business' | '/owner/business?add=1') => {
    setOpen(false);
    router.push(href);
  };

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
        ref={anchor}
        accessibilityRole="button"
        accessibilityLabel={t('ownerKit.locationA11y', { name })}
        accessibilityHint={t('ownerKit.switchLocation')}
        accessibilityState={{ expanded: open }}
        onPress={openMenu}
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

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        {/* Tapping anywhere outside the menu closes it. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('ownerKit.closeMenu')}
          style={StyleSheet.absoluteFill}
          onPress={() => setOpen(false)}
        />
        <View
          accessibilityRole="menu"
          style={[
            styles.menu,
            {
              top: at.y,
              left: Math.max(
                tokens.space[4],
                Math.min(at.x, screenWidth - menuWidth - tokens.space[4]),
              ),
              width: menuWidth,
              backgroundColor: theme.surface,
            },
          ]}
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
                    backgroundColor: selected ? theme.tint : pressed ? theme.wash : theme.surface,
                    borderColor: selected ? theme.ink : theme.line,
                  },
                ]}
              >
                <Building2 size={16} color={selected ? theme.ink : theme.text} />
                <Text variant="body-strong" numberOfLines={1} style={styles.optionCopy}>
                  {location.name}
                  {location.city ? (
                    <Text variant="caption" style={{ color: theme.muted }}>
                      {`  ${location.city}`}
                    </Text>
                  ) : null}
                </Text>
                {selected ? <Check size={18} color={theme.ink} strokeWidth={2.5} /> : null}
              </Pressable>
            );
          })}
          <Pressable
            accessibilityRole="button"
            onPress={() => go('/owner/business?add=1')}
            style={({ pressed }) => [
              styles.option,
              {
                backgroundColor: pressed ? theme.wash : theme.surface,
                borderColor: theme.line,
              },
            ]}
          >
            <Plus size={16} color={theme.ink} />
            <Text variant="body-strong" style={[styles.optionCopy, { color: theme.ink }]}>
              {t('ownerBusiness.addLocation')}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            onPress={() => go('/owner/business')}
            style={({ pressed }) => [
              styles.option,
              {
                backgroundColor: pressed ? theme.wash : theme.surface,
                borderColor: theme.line,
              },
            ]}
          >
            <Text variant="body" style={[styles.optionCopy, { color: theme.muted }]}>
              {t('ownerKit.manageLocations')}
            </Text>
            <ChevronRight size={18} color={theme.meta} />
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

// Wide enough for a long venue name and city; narrower screens use their width less the gutters.
const MENU_WIDTH = 300;

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
  // One card holds the menu; inside it each location is a pill the size of the location button.
  menu: {
    position: 'absolute',
    gap: tokens.space[2],
    padding: tokens.space[2],
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
    boxShadow: tokens.shadow.card,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    minHeight: tokens.touchTarget,
    paddingHorizontal: tokens.space[3],
    borderRadius: tokens.radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  optionCopy: { flex: 1, gap: 2 },
});
