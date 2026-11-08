import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CircleHelp, LogOut, UserRound, type LucideIcon } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { ConfirmDialog } from '../kit';
import { useGoTo } from './NavRow';
import { useSignOut } from './useSignOut';

/** Help, who is signed in, and sign out, pinned under the sidebar's scrolling list. */
export function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const goTo = useGoTo();
  const signOut = useSignOut();
  const firstName = useOwnerSession((state) => state.firstName) ?? '';
  const role = useOwnerSession((state) => state.role) ?? 'owner';
  const [confirming, setConfirming] = useState(false);

  return (
    <View style={[styles.foot, { borderTopColor: theme.line }]}>
      <FooterRow
        icon={CircleHelp}
        label={t('ownerChrome.help')}
        collapsed={collapsed}
        onPress={() => goTo('/owner/help')}
      />
      <FooterRow
        icon={UserRound}
        initial={firstName ? firstName.charAt(0).toUpperCase() : undefined}
        label={firstName || t('ownerChrome.profile')}
        detail={t(`ownerSettings.roles.${role}`)}
        collapsed={collapsed}
        onPress={() => goTo('/owner/settings')}
      />
      <FooterRow
        icon={LogOut}
        label={t('ownerSettings.signOut')}
        collapsed={collapsed}
        onPress={() => setConfirming(true)}
      />
      <ConfirmDialog
        visible={confirming}
        title={t('ownerSettings.signOutTitle')}
        message={t('ownerSettings.signOutBody')}
        confirmLabel={t('ownerSettings.signOut')}
        onConfirm={() => {
          setConfirming(false);
          signOut();
        }}
        onCancel={() => setConfirming(false)}
      />
    </View>
  );
}

function FooterRow({
  icon: Icon,
  initial,
  label,
  detail,
  collapsed,
  onPress,
}: {
  icon: LucideIcon;
  /** Shown in a round chip instead of the icon, for the signed-in person. */
  initial?: string;
  label: string;
  detail?: string;
  collapsed: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={detail ? `${label}, ${detail}` : label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        collapsed && styles.rail,
        pressed && { backgroundColor: theme.wash },
      ]}
    >
      {initial ? (
        <View style={[styles.avatar, { backgroundColor: theme.tint }]}>
          <Text variant="body-strong" style={{ color: theme.badgeInk }}>
            {initial}
          </Text>
        </View>
      ) : (
        <Icon size={20} color={theme.muted} />
      )}
      {collapsed ? null : (
        <View style={styles.text}>
          <Text
            variant={initial ? 'body-strong' : 'body'}
            numberOfLines={1}
            style={[styles.label, { color: initial ? theme.text : theme.muted }]}
          >
            {label}
          </Text>
          {detail ? (
            <Text variant="caption" numberOfLines={1} style={{ color: theme.meta }}>
              {detail}
            </Text>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const AVATAR = tokens.space[8];

const styles = StyleSheet.create({
  foot: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: tokens.space[2],
    paddingBottom: tokens.space[4],
    gap: 2,
  },
  row: {
    minHeight: tokens.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingHorizontal: tokens.space[3],
    borderRadius: tokens.radius.sm,
  },
  rail: { justifyContent: 'center', paddingHorizontal: 0 },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
  label: { fontSize: tokens.owner.type.nav.size, lineHeight: tokens.owner.type.nav.line },
});
