import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { FullMenuStyle } from '@/lib/menuStyle';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme, type FontPair } from '@/ui/theme';
import { Segmented, TitledSection } from '../../kit';
import { FieldLabel } from './FieldLabel';

const FONTS: FontPair[] = ['cravins', 'serif', 'bold'];
type Scheme = FullMenuStyle['colorScheme'];

/** Heading font and whether guest pages are light, dark or follow the phone. */
export function TypeSection({
  font,
  onFont,
  scheme,
  onScheme,
}: {
  font: FontPair;
  onFont: (font: FontPair) => void;
  scheme: Scheme;
  onScheme: (scheme: Scheme) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <TitledSection title={t('ownerBranding.typeTitle')} cardStyle={styles.card}>
      <View style={styles.block}>
        <FieldLabel>{t('ownerBranding.font')}</FieldLabel>
        <Segmented<FontPair>
          equal
          label={t('ownerBranding.font')}
          value={font}
          onChange={onFont}
          options={FONTS.map((id) => ({ id, label: t(`ownerBranding.fonts.${id}`) }))}
        />
      </View>
      <View style={styles.block}>
        <FieldLabel>{t('ownerBranding.menuStyle.scheme')}</FieldLabel>
        <Segmented<Scheme>
          equal
          label={t('ownerBranding.menuStyle.scheme')}
          value={scheme}
          onChange={onScheme}
          options={[
            { id: 'light', label: t('ownerBranding.menuStyle.light') },
            { id: 'dark', label: t('ownerBranding.menuStyle.dark') },
            { id: 'auto', label: t('ownerBranding.menuStyle.auto') },
          ]}
        />
        <Text variant="caption" style={{ color: theme.meta }}>
          {t('ownerBranding.schemeHint')}
        </Text>
      </View>
    </TitledSection>
  );
}

const styles = StyleSheet.create({
  card: { padding: 20, gap: tokens.space[5] },
  block: { gap: tokens.space[2] },
});
