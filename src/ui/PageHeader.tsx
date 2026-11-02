import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { IconButton } from './IconButton';
import { Text } from './Text';
import { useTheme } from './theme';

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  return (
    <View style={[styles.bar, { borderColor: theme.line, backgroundColor: theme.white }]}>
      <IconButton label={t('common.back')} onPress={() => router.back()}>
        <ArrowLeft color={theme.black} size={22} strokeWidth={2} />
      </IconButton>
      <View style={styles.titles}>
        <Text variant="body-strong">{title}</Text>
        {subtitle ? (
          <Text variant="caption" style={{ color: theme.meta }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.side}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 64, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, paddingHorizontal: 8 },
  titles: { flex: 1, alignItems: 'center' },
  side: { width: 44, alignItems: 'center' },
});
