import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerFeed } from '../data/useOwnerFeed';
import { useGoTo } from './NavRow';

/** The bell in the phone bar, with this person's unread count from the notification feed. */
export function NotificationBell() {
  const theme = useTheme();
  const { t } = useTranslation();
  const goTo = useGoTo();
  const unseen = useOwnerFeed().data?.unreadCount ?? 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('ownerNotes.bellA11y', { count: unseen })}
      onPress={() => goTo('/owner/notifications')}
      style={({ pressed }) => [
        styles.bell,
        { borderColor: theme.line, backgroundColor: pressed ? theme.wash : theme.surface },
      ]}
    >
      <Bell size={20} color={theme.text} />
      {unseen > 0 ? (
        <View style={[styles.badge, { backgroundColor: theme.fill, borderColor: theme.surface }]}>
          <Text variant="caption" style={[styles.count, { color: theme.onFill }]}>
            {unseen > 99 ? '99+' : unseen}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const BADGE = tokens.owner.micro.line + tokens.space[1];

const styles = StyleSheet.create({
  bell: {
    width: tokens.touchTarget,
    height: tokens.touchTarget,
    borderRadius: tokens.radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -tokens.space[1],
    right: -tokens.space[1],
    minWidth: BADGE,
    height: BADGE,
    borderRadius: tokens.radius.full,
    borderWidth: 2,
    paddingHorizontal: tokens.space[1],
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    fontFamily: 'Inter_600',
    fontSize: tokens.owner.micro.size,
    lineHeight: tokens.owner.micro.line,
  },
});
