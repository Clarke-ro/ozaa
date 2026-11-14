import { Pressable, StyleSheet, View } from 'react-native';
import { VenueImage } from '@/ui/VenueImage';
import { usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { useMe } from '../data/useMe';
import { useGoTo } from './NavRow';
import { isCurrent } from './nav';

/**
 * The owner button at the foot of the sidebar: who is signed in, and the way to their profile
 * and settings (Help and sign out live there too). Folded, only the photo or initial shows.
 */
export function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const goTo = useGoTo();
  const path = usePathname();
  const me = useMe();
  const sessionName = useOwnerSession((state) => state.firstName) ?? '';
  const role = useOwnerSession((state) => state.role) ?? 'owner';
  const name = me.data
    ? [me.data.firstName, me.data.lastName].filter(Boolean).join(' ')
    : sessionName;
  const roleLabel = t(`ownerSettings.roles.${role}`);
  const photo = me.data?.photo?.url;
  const here =
    isCurrent(path, '/owner/settings') ||
    isCurrent(path, '/owner/help') ||
    isCurrent(path, '/owner/profile');

  return (
    <View style={[styles.foot, { borderTopColor: theme.line }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('ownerChrome.ownerButton', {
          name: name || t('ownerChrome.profile'),
          role: roleLabel,
        })}
        accessibilityState={{ selected: here }}
        onPress={() => goTo('/owner/settings')}
        style={({ pressed }) => [
          styles.row,
          collapsed && styles.rail,
          {
            borderColor: here ? theme.text : theme.line,
            backgroundColor: here ? theme.tint : pressed ? theme.wash : theme.surface,
          },
        ]}
      >
        {photo ? (
          <VenueImage url={photo} alt="" style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: theme.tint }]}>
            <Text variant="body-strong" style={{ color: theme.badgeInk }}>
              {(name || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        {collapsed ? null : (
          <>
            <View style={styles.text}>
              <Text variant="body-strong" numberOfLines={1}>
                {name}
              </Text>
              <Text variant="caption" numberOfLines={1} style={{ color: theme.meta }}>
                {roleLabel}
              </Text>
            </View>
            <ChevronRight size={16} color={theme.meta} />
          </>
        )}
      </Pressable>
    </View>
  );
}

const AVATAR = tokens.space[8];

const styles = StyleSheet.create({
  foot: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: tokens.space[3],
    paddingBottom: tokens.space[4],
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingHorizontal: tokens.space[2],
    borderRadius: tokens.radius.md,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  rail: { justifyContent: 'center', paddingHorizontal: 0, borderWidth: 0 },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, minWidth: 0 },
});
