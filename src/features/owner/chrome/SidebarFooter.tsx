import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CircleHelp, LogOut, UserRound, type LucideIcon } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { ThemeProvider, useTheme, type Theme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { ConfirmDialog } from '../kit';
import { useGoTo } from './NavRow';
import { useSignOut } from './useSignOut';

/** Help, who is signed in, and sign out, pinned under the sidebar's scrolling list. */
export function SidebarFooter({
  collapsed,
  dialogTheme,
}: {
  collapsed: boolean;
  /** The sidebar is always dark; the sign-out dialog sits over the page, so it uses the page's theme. */
  dialogTheme: Theme;
}) {
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
      <ThemeProvider theme={dialogTheme}>
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
      </ThemeProvider>
    </View>
  );
}

function FooterRow({
  icon: Icon,
  label,
  detail,
  collapsed,
  onPress,
}: {
  icon: LucideIcon;
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
      <Icon size={20} color={theme.muted} />
      {collapsed ? null : (
        <View style={styles.text}>
          <Text variant="body" numberOfLines={1} style={[styles.label, { color: theme.muted }]}>
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
  text: { flex: 1 },
  label: { fontSize: tokens.type.body.size - 1 },
});
