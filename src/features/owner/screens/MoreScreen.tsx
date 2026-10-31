import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { navFor } from '../chrome/nav';
import { OwnerPage } from '../chrome/OwnerPage';
import type { StaffRole } from '@/features/orders';

export function MoreScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const role = (useOwnerSession((state) => state.role) ?? 'waiter') as StaffRole;
  const items = navFor(role).filter((item) => !item.phone);

  return (
    <OwnerPage title={t('owner.more')}>
      <View>
        {items.map((item) => (
          <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={t(`owner.${item.id}`)} onPress={() => router.push(item.href as '/owner')} style={[styles.row, { borderColor: theme.line }]}>
            <Text variant="body-strong">{t(`owner.${item.id}`)}</Text>
          </Pressable>
        ))}
      </View>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 52, justifyContent: 'center', borderBottomWidth: 1 },
});
