import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { cardStyle } from '../../kit';

// The replies every call offers, plus the bill one, as on the canvas. The rest depend on the reason.
const SHOWN = ['now', 'twoMin', 'bill'] as const;

/** A reminder under Waiting of the quick replies a guest sees on their phone (canvas). */
export function QuickReplyStrip() {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View style={[cardStyle(theme), styles.strip]}>
      <Text style={styles.title}>{t('ownerCalls.quickStrip')}</Text>
      {SHOWN.map((key) => (
        <View key={key} style={[styles.chip, { backgroundColor: theme.wash }]}>
          <Text style={styles.chipText}>{t(`ownerCalls.quick.${key}`)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: tokens.space[4],
  },
  title: {
    flexGrow: 1,
    flexBasis: 220,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fontFamily.strong,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: tokens.space[3],
    borderRadius: tokens.radius.full,
  },
  chipText: { fontSize: 14, lineHeight: 20 },
});
