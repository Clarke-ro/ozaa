import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { IconButton } from './IconButton';
import { Text } from './Text';
import { useTheme } from './theme';

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  return (
    <View style={[styles.bar, { borderColor: theme.line, backgroundColor: theme.white }]}>
      <IconButton label={t('common.back')} onPress={() => router.back()} style={styles.control}>
        <ArrowLeft color={theme.black} size={22} strokeWidth={2} />
      </IconButton>
      <View pointerEvents="none" style={styles.titles}>
        <Text variant="body-strong">{title}</Text>
        {subtitle ? (
          <Text variant="caption" numberOfLines={1} style={{ color: theme.meta }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={[styles.side, styles.control]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  titles: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  side: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  control: { zIndex: 1 },
});
