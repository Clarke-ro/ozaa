import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Inbox, QrCode, ScanLine, UtensilsCrossed, type LucideIcon } from 'lucide-react-native';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { canOpen } from '../../chrome/nav';
import { Band } from './Band';
import { SectionHead } from './SectionHead';

type Shortcut = { key: string; icon: LucideIcon; href: string };

const SHORTCUTS: Shortcut[] = [
  { key: 'scan', icon: ScanLine, href: '/owner/scan' },
  { key: 'tables', icon: QrCode, href: '/owner/tables' },
  { key: 'menu', icon: UtensilsCrossed, href: '/owner/menu' },
  { key: 'feedback', icon: Inbox, href: '/owner/feedback' },
];

/**
 * The jobs people do most from Today, as one wrapping line of small white pills (icon and
 * word), like a toolbar. Only the ones this person's role may open; with none, the band is left
 * out.
 */
export function QuickActions() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const role = useOwnerSession((state) => state.role) ?? 'waiter';
  const shown = SHORTCUTS.filter((item) => canOpen(role, item.href));
  if (shown.length === 0) return null;

  return (
    <Band>
      <SectionHead title={t('ownerDash.shortcuts')} />
      <View style={styles.line}>
        {shown.map(({ key, icon: Icon, href }) => {
          const label = t(`ownerDash.quick.${key}`);
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={label}
              onPress={() => router.push(href as Href)}
              style={({ pressed }) => [
                styles.pill,
                { backgroundColor: pressed ? theme.wash : theme.surface },
              ]}
            >
              <Icon size={20} color={theme.ink} />
              <Text variant="body-strong">{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </Band>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[2] },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    minHeight: tokens.touchTarget,
    paddingHorizontal: tokens.space[4],
    borderRadius: tokens.radius.full,
  },
});
