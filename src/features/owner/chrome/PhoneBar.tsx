import { Pressable, StyleSheet, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { OzaaMark } from '../kit/OzaaMark';
import { isTabRoot } from './nav';
import { NotificationBell } from './NotificationBell';
import { PlanBadge } from './PlanBadge';

// The mark is in the "micro" logo tier (32 px or less, brand.md section 1).
const MARK = tokens.space[6];
const BACK = tokens.space[10];

/**
 * Phones only: a slim bar above the page. Tab roots show the Ozaa mark and plan; detail screens
 * show Back instead, so the way out is always in the same corner. The bell sits on the right.
 */
export function PhoneBar({ bell }: { bell: boolean }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const path = usePathname();
  const insets = useSafeAreaInsets();
  const role = useOwnerSession((state) => state.role) ?? 'waiter';
  const root = isTabRoot(role, path);

  return (
    <View
      style={[
        styles.bar,
        {
          paddingTop: insets.top + tokens.space[2],
          backgroundColor: theme.surface,
          borderBottomColor: theme.line,
        },
      ]}
    >
      {root ? (
        <View style={styles.brand}>
          <OzaaMark size={MARK} />
          <Text variant="body-strong" style={styles.word}>
            {t('ownerChrome.brand')}
          </Text>
          <PlanBadge />
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('owner.back')}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/owner/more'))}
          hitSlop={4}
          style={({ pressed }) => [
            styles.back,
            { backgroundColor: pressed ? theme.line : theme.wash },
          ]}
        >
          <ChevronLeft size={22} color={theme.text} />
        </Pressable>
      )}
      <View style={styles.spacer} />
      {bell ? <NotificationBell /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: tokens.touchTarget,
    paddingHorizontal: tokens.space[4],
    paddingBottom: tokens.space[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  word: { fontFamily: fontFamily.strong },
  back: {
    width: BACK,
    height: BACK,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: { flex: 1 },
});
